-- Consolidated schema for a NEW empty database only. Existing deployments use incremental migrations.
-- Initial schema for a NEW JobMatch database. Owner-only JSON workspace MVP.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table public.workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision integer not null default 0 check (revision >= 0),
 payload jsonb not null check (octet_length(payload::text) < 15000000),
 updated_at timestamptz not null default now()
);
create table public.audit_log (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null check (length(action)<100),
 created timestamptz not null default now()
);
create index audit_owner on public.audit_log(user_id);
create table public.consent_records (
 user_id uuid primary key references auth.users(id) on delete cascade,
 version text not null, created timestamptz not null default now()
);
alter table public.workspaces enable row level security;
alter table public.audit_log enable row level security;
alter table public.consent_records enable row level security;
create policy workspace_select on public.workspaces for select to authenticated using ((select auth.uid())=user_id);
create policy workspace_insert on public.workspaces for insert to authenticated with check ((select auth.uid())=user_id);
create policy workspace_update on public.workspaces for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy workspace_delete on public.workspaces for delete to authenticated using ((select auth.uid())=user_id);
create policy audit_select on public.audit_log for select to authenticated using ((select auth.uid())=user_id);
create policy audit_insert on public.audit_log for insert to authenticated with check ((select auth.uid())=user_id);
create policy consent_select on public.consent_records for select to authenticated using ((select auth.uid())=user_id);
create policy consent_insert on public.consent_records for insert to authenticated with check ((select auth.uid())=user_id);
revoke all on public.workspaces,public.audit_log,public.consent_records from anon;
grant select,insert,update,delete on public.workspaces to authenticated;
grant select,insert on public.audit_log,public.consent_records to authenticated;
create function public.save_workspace(p_revision integer,p_payload jsonb,p_action text) returns integer
language plpgsql security invoker set search_path='' as $$
declare current_revision integer; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'AUTH'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into current_revision from public.workspaces where user_id=uid for update;
 if coalesce(current_revision,0)<>p_revision then raise exception 'CONFLICT'; end if;
 insert into public.workspaces(user_id,revision,payload) values(uid,p_revision+1,p_payload)
 on conflict(user_id) do update set revision=excluded.revision,payload=excluded.payload,updated_at=now();
 insert into public.audit_log(user_id,action) values(uid,p_action);
 insert into public.consent_records(user_id,version) values(uid,'privacy-v1') on conflict do nothing;
 return p_revision+1;
end;$$;
revoke all on function public.save_workspace(integer,jsonb,text) from public,anon;
grant execute on function public.save_workspace(integer,jsonb,text) to authenticated;
-- Narrow privilege elevation: deleting one's own Auth row and its cascades.
-- No ID argument, identity comes only from verified JWT; private schema is not exposed.
create function private.delete_own_auth_user() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH'; end if;
 delete from auth.sessions where user_id=auth.uid();
 delete from auth.users where id=auth.uid();
end;$$;
revoke all on function private.delete_own_auth_user() from public,anon;
grant execute on function private.delete_own_auth_user() to authenticated;
create function public.delete_my_account() returns void language sql security invoker set search_path='' as $$select private.delete_own_auth_user();$$;
revoke all on function public.delete_my_account() from public,anon;
grant execute on function public.delete_my_account() to authenticated;

create function private.session_is_active() returns boolean language sql security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=auth.uid()); $$;
revoke all on function private.session_is_active() from public,anon;
grant execute on function private.session_is_active() to authenticated;
create function public.session_is_active() returns boolean language sql security invoker set search_path='' as $$ select private.session_is_active(); $$;
revoke all on function public.session_is_active() from public,anon;
grant execute on function public.session_is_active() to authenticated;
-- Additive, bounded storage: at most three quota rows per user, removed on account deletion.
create table private.request_quotas (
 user_id uuid not null references auth.users(id) on delete cascade,
 bucket text not null check(bucket in ('service','import','analysis')),
 window_start timestamptz not null,
 count integer not null check(count>=0),
 primary key(user_id,bucket)
);
alter table private.request_quotas enable row level security;
revoke all on private.request_quotas from public,anon,authenticated;
-- Definer privilege is required ONLY to update an otherwise inaccessible counter.
-- Callers cannot choose owner, quota, window, or reset the counter.
create function private.consume_quota(p_bucket text) returns boolean
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); cap integer; allowed boolean; now_at timestamptz:=clock_timestamp();
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH'; end if;
 cap:=case p_bucket when 'service' then 120 when 'import' then 10 when 'analysis' then 20 else null end;
 if cap is null then raise exception 'INVALID_BUCKET'; end if;
 insert into private.request_quotas(user_id,bucket,window_start,count) values(uid,p_bucket,now_at,1)
 on conflict(user_id,bucket) do update set
 count=case when request_quotas.window_start<=now_at-interval '60 seconds' then 1 else least(request_quotas.count+1,cap+1) end,
 window_start=case when request_quotas.window_start<=now_at-interval '60 seconds' then now_at else request_quotas.window_start end
 returning count<=cap into allowed;
 return allowed;
end;$$;
revoke all on function private.consume_quota(text) from public,anon;
grant execute on function private.consume_quota(text) to authenticated;
create function public.consume_quota(p_bucket text) returns boolean
language sql security invoker set search_path='' as $$select private.consume_quota(p_bucket);$$;
revoke all on function public.consume_quota(text) from public,anon;
grant execute on function public.consume_quota(text) to authenticated;

-- Independent, append-only profile fact snapshots. Dates describe capture, not verification.
create table public.fact_history (
 id integer generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 workspace_revision integer not null,
 kind text not null check(kind in ('baseline','change')),
 facts jsonb not null check(jsonb_typeof(facts)='array'),
 captured_at timestamptz not null default now()
);
create index fact_history_owner_cursor on public.fact_history(user_id,id desc);
alter table public.fact_history enable row level security;
revoke all on public.fact_history from public,anon,authenticated;
grant select on public.fact_history to authenticated;
create policy fact_history_select on public.fact_history for select to authenticated
using ((select auth.uid())=user_id and (select public.session_is_active()));
-- Existing profiles get a baseline today, never invented historical confirmation dates.
insert into public.fact_history(user_id,workspace_revision,kind,facts)
select user_id,revision,'baseline',coalesce(payload->'facts','[]'::jsonb) from public.workspaces;
-- Elevation is necessary: clients may write workspace but must not write history.
create function private.capture_fact_history() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid()<>new.user_id or not public.session_is_active() then raise exception 'AUTH'; end if;
 if TG_OP='INSERT' or coalesce(old.payload->'facts','[]'::jsonb) is distinct from coalesce(new.payload->'facts','[]'::jsonb) then
  insert into public.fact_history(user_id,workspace_revision,kind,facts)
  values(new.user_id,new.revision,'change',coalesce(new.payload->'facts','[]'::jsonb));
 end if;
 return new;
end;$$;
revoke all on function private.capture_fact_history() from public,anon,authenticated;
create trigger workspace_capture_facts after insert or update of payload on public.workspaces
for each row execute function private.capture_fact_history();

-- Expand phase: normalized relational entities + legacy JSON write compatibility.
create table public.profile_facts (
 user_id uuid not null references public.workspaces(user_id) on delete cascade,
 id text not null, position integer not null check(position>0),
 text text not null, source text not null, verified boolean not null,
 extra jsonb not null default '{}', primary key(user_id,id)
);
create table public.resume_versions (
 user_id uuid not null references public.workspaces(user_id) on delete cascade,
 id text not null, position integer not null check(position>0),
 created text not null, text text not null, vacancy text not null,
 score integer not null check(score between 0 and 100),
 evidence_ids jsonb not null check(jsonb_typeof(evidence_ids)='array'),
 extra jsonb not null default '{}', primary key(user_id,id)
);
create table public.applications (
 user_id uuid not null references public.workspaces(user_id) on delete cascade,
 id text not null, position integer not null check(position>0),
 title text not null, status text not null, note text not null, created text not null,
 resume_version_id text, version_link_present boolean not null,
 extra jsonb not null default '{}', primary key(user_id,id),
 foreign key(user_id,resume_version_id) references public.resume_versions(user_id,id)
);
create index applications_version on public.applications(user_id,resume_version_id);
create table public.application_events (
 user_id uuid not null, application_id text not null, position integer not null check(position>0),
 status text not null, date text not null, extra jsonb not null default '{}',
 primary key(user_id,application_id,position),
 foreign key(user_id,application_id) references public.applications(user_id,id) on delete cascade
);
do $$declare t text;begin
 foreach t in array array['profile_facts','resume_versions','applications','application_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id and (select public.session_is_active()))',t);
 end loop;
end;$$;
-- Invoker helper, NOT available to clients. Used by privileged trigger and migration only.
create function private.project_workspace(p_uid uuid,p jsonb) returns void
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.profile_facts(user_id,id,position,text,source,verified,extra)
 select p_uid,v->>'id',n,v->>'text',v->>'source',(v->>'verified')::boolean,v-array['id','text','source','verified']
 from jsonb_array_elements(coalesce(p->'facts','[]')) with ordinality as f(v,n)
 on conflict(user_id,id) do update set position=excluded.position,text=excluded.text,source=excluded.source,verified=excluded.verified,extra=excluded.extra
 where (profile_facts.position,profile_facts.text,profile_facts.source,profile_facts.verified,profile_facts.extra)
 is distinct from (excluded.position,excluded.text,excluded.source,excluded.verified,excluded.extra);
 delete from public.profile_facts where user_id=p_uid and not exists(select 1 from jsonb_array_elements(coalesce(p->'facts','[]')) f where f->>'id'=profile_facts.id);
 insert into public.resume_versions(user_id,id,position,created,text,vacancy,score,evidence_ids,extra)
 select p_uid,v->>'id',n,v->>'created',v->>'text',v->>'vacancy',(v->>'score')::integer,v->'evidence_ids',v-array['id','created','text','vacancy','score','evidence_ids']
 from jsonb_array_elements(coalesce(p->'versions','[]')) with ordinality as f(v,n)
 on conflict(user_id,id) do update set position=excluded.position,created=excluded.created,text=excluded.text,vacancy=excluded.vacancy,score=excluded.score,evidence_ids=excluded.evidence_ids,extra=excluded.extra
 where (resume_versions.position,resume_versions.created,resume_versions.text,resume_versions.vacancy,resume_versions.score,resume_versions.evidence_ids,resume_versions.extra)
 is distinct from (excluded.position,excluded.created,excluded.text,excluded.vacancy,excluded.score,excluded.evidence_ids,excluded.extra);
 insert into public.applications(user_id,id,position,title,status,note,created,resume_version_id,version_link_present,extra)
 select p_uid,v->>'id',n,v->>'title',v->>'status',v->>'note',v->>'created',v->>'resumeVersionId',v?'resumeVersionId',v-array['id','title','status','note','created','resumeVersionId','events']
 from jsonb_array_elements(coalesce(p->'applications','[]')) with ordinality as f(v,n)
 on conflict(user_id,id) do update set position=excluded.position,title=excluded.title,status=excluded.status,note=excluded.note,created=excluded.created,resume_version_id=excluded.resume_version_id,version_link_present=excluded.version_link_present,extra=excluded.extra
 where (applications.position,applications.title,applications.status,applications.note,applications.created,applications.resume_version_id,applications.version_link_present,applications.extra)
 is distinct from (excluded.position,excluded.title,excluded.status,excluded.note,excluded.created,excluded.resume_version_id,excluded.version_link_present,excluded.extra);
 delete from public.applications where user_id=p_uid and not exists(select 1 from jsonb_array_elements(coalesce(p->'applications','[]')) a where a->>'id'=applications.id);
 -- Parent version removal happens only after links have been updated/deleted.
 delete from public.resume_versions where user_id=p_uid and not exists(select 1 from jsonb_array_elements(coalesce(p->'versions','[]')) v where v->>'id'=resume_versions.id);
 insert into public.application_events(user_id,application_id,position,status,date,extra)
 select p_uid,a->>'id',n,e->>'status',e->>'date',e-array['status','date']
 from jsonb_array_elements(coalesce(p->'applications','[]')) a
 cross join lateral jsonb_array_elements(coalesce(a->'events','[]')) with ordinality as events(e,n)
 on conflict(user_id,application_id,position) do update set status=excluded.status,date=excluded.date,extra=excluded.extra
 where (application_events.status,application_events.date,application_events.extra) is distinct from (excluded.status,excluded.date,excluded.extra);
 delete from public.application_events where user_id=p_uid and not exists(
 select 1 from jsonb_array_elements(coalesce(p->'applications','[]')) a
 where a->>'id'=application_events.application_id and application_events.position<=jsonb_array_length(coalesce(a->'events','[]')));
end;$$;
revoke all on function private.project_workspace(uuid,jsonb) from public,anon,authenticated;
-- No external ID parameter, RLS remains active. One statement gives a consistent snapshot.
create function public.read_workspace() returns jsonb
language sql stable security invoker set search_path='' as $$
 select (w.payload-array['facts','versions','applications','revision']) || jsonb_build_object(
 'revision',w.revision,
 'facts',coalesce((select jsonb_agg(f.extra||jsonb_build_object('id',f.id,'text',f.text,'source',f.source,'verified',f.verified) order by f.position) from public.profile_facts f where f.user_id=w.user_id),'[]'),
 'versions',coalesce((select jsonb_agg(v.extra||jsonb_build_object('id',v.id,'created',v.created,'text',v.text,'vacancy',v.vacancy,'score',v.score,'evidence_ids',v.evidence_ids) order by v.position) from public.resume_versions v where v.user_id=w.user_id),'[]'),
 'applications',coalesce((select jsonb_agg(a.extra||jsonb_build_object('id',a.id,'title',a.title,'status',a.status,'note',a.note,'created',a.created,
 'events',coalesce((select jsonb_agg(e.extra||jsonb_build_object('status',e.status,'date',e.date) order by e.position) from public.application_events e where e.user_id=a.user_id and e.application_id=a.id),'[]'))
 ||case when a.version_link_present then jsonb_build_object('resumeVersionId',a.resume_version_id) else '{}'::jsonb end order by a.position) from public.applications a where a.user_id=w.user_id),'[]'))
 from public.workspaces w where w.user_id=(select auth.uid()) and (select public.session_is_active());
$$;
revoke all on function public.read_workspace() from public,anon;
grant execute on function public.read_workspace() to authenticated;
-- Preserve original payload and identifiers. Invalid rows abort migration, never silently repair.
do $$declare w record;begin
 for w in select user_id,payload from public.workspaces loop perform private.project_workspace(w.user_id,w.payload);end loop;
end;$$;
create function private.sync_workspace_entities() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid()<>new.user_id or not public.session_is_active() then raise exception 'AUTH';end if;
 if TG_OP='INSERT' or (old.payload->'facts',old.payload->'versions',old.payload->'applications') is distinct from (new.payload->'facts',new.payload->'versions',new.payload->'applications') then
  perform private.project_workspace(new.user_id,new.payload);
 end if;
 return new;
end;$$;
revoke all on function private.sync_workspace_entities() from public,anon,authenticated;
create trigger workspace_sync_entities after insert or update of payload on public.workspaces for each row execute function private.sync_workspace_entities();

create function private.trim_fact_line(s text) returns text language sql immutable security invoker set search_path='' as $$
 select btrim(s,E' \t\n\r\f\v'||U&'\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff');
$$;
revoke all on function private.trim_fact_line(text) from public,anon,authenticated;
create function private.validate_version_write(old_state jsonb,new_state jsonb,p_action text,p_revision integer) returns void language plpgsql security invoker set search_path='' as $$
declare old_facts jsonb:=old_state->'facts';old_versions jsonb:=old_state->'versions';new_versions jsonb:=new_state->'versions';n integer;candidate jsonb;original_version jsonb;snapshot jsonb;promoted text;remainder text;rendered text;
begin
  n:=jsonb_array_length(old_versions);candidate:=new_versions->n;
  if jsonb_array_length(new_versions)<>n+1 or (new_versions-n)<>old_versions or jsonb_typeof(candidate->'id') is distinct from 'string' or jsonb_typeof(candidate->'created') is distinct from 'string' or length(candidate->>'created')>100 then raise exception 'INVALID_WRITE';end if;
  if p_action='restore' then
   select v into original_version from jsonb_array_elements(old_versions) v where v->>'id'=candidate->>'restored_from';
   if original_version is null or (candidate-array['id','created','restored_from']) is distinct from (original_version-array['id','created','restored_from']) then raise exception 'INVALID_WRITE';end if;
  else
   if candidate->>'engine_version' is distinct from 'rules-v1' or candidate->'profile_revision' is distinct from to_jsonb(p_revision) or candidate->>'vacancy' is distinct from old_state->>'vacancy' or jsonb_typeof(candidate->'evidence_ids') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
   if (select count(*)<>count(distinct v) from jsonb_array_elements_text(candidate->'evidence_ids') v) or exists(select 1 from jsonb_array_elements_text(candidate->'evidence_ids') e where not exists(select 1 from jsonb_array_elements(old_facts) f where f->>'id'=e and f->'verified'='true')) then raise exception 'INVALID_WRITE';end if;
   select coalesce(jsonb_agg(f order by i),'[]') into snapshot from jsonb_array_elements(old_facts) with ordinality facts(f,i) where candidate->'evidence_ids' ? (f->>'id');
   if candidate->'evidence_snapshot' is distinct from snapshot then raise exception 'INVALID_WRITE';end if;
   if jsonb_array_length(candidate->'evidence_ids')=0 then rendered:=old_state->>'original';
   else
    select string_agg(f->>'text',E'\n' order by i) into promoted from jsonb_array_elements_text(candidate->'evidence_ids') with ordinality ids(e,i) join jsonb_array_elements(old_facts) f on f->>'id'=e;
    select coalesce(string_agg(line,E'\n' order by i),'') into remainder from regexp_split_to_table(old_state->>'original',E'\r?\n') with ordinality lines(line,i) where not exists(select 1 from jsonb_array_elements(snapshot) f where f->>'text'=private.trim_fact_line(line));
    rendered:='РЕЛЕВАНТНЫЙ ОПЫТ'||E'\n'||promoted||E'\n\nПРОФИЛЬ\n'||remainder;
   end if;
   if candidate->>'text' is distinct from rendered then raise exception 'INVALID_WRITE';end if;
  end if;

end;$$;
revoke all on function private.validate_version_write(jsonb,jsonb,text,integer) from public,anon,authenticated;

create function private.validate_application_write(old_state jsonb,new_state jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare n integer;item jsonb;prior jsonb;changes integer:=0;statuses text[]:=array['Планируется','Отклик отправлен','Просмотрено','Приглашение','Отказ','Интервью','Оффер'];
begin
  n:=jsonb_array_length(old_state->'applications');
  if jsonb_array_length(new_state->'applications') not between n and n+1 then raise exception 'INVALID_WRITE';end if;
  for item in select value from jsonb_array_elements(new_state->'applications') loop
   if jsonb_typeof(item->'status') is distinct from 'string' or not (item->>'status'=any(statuses)) or jsonb_typeof(item->'note') is distinct from 'string' or length(item->>'note')>3000 or jsonb_typeof(item->'events') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
   if jsonb_array_length(item->'events')>200 then raise exception 'INVALID_WRITE';end if;
  end loop;
  for i in 0..jsonb_array_length(new_state->'applications')-1 loop
   item:=new_state->'applications'->i;prior:=old_state->'applications'->i;
   if prior is null then
    changes:=changes+1;
    if jsonb_typeof(item->'title') is distinct from 'string' or length(item->>'title') not between 1 and 300 or jsonb_array_length(item->'events')<>1 then raise exception 'INVALID_WRITE';end if;
   elsif item is distinct from prior then
    changes:=changes+1;
    if (item-array['status','note','events','resumeVersionId']) is distinct from (prior-array['status','note','events','resumeVersionId']) then raise exception 'INVALID_WRITE';end if;
    if item->>'status'=prior->>'status' then
     if item->'events' is distinct from prior->'events' then raise exception 'INVALID_WRITE';end if;
    else
     if jsonb_array_length(item->'events')<>jsonb_array_length(prior->'events')+1 or ((item->'events')-jsonb_array_length(prior->'events'))<>prior->'events' then raise exception 'INVALID_WRITE';end if;
    end if;
   end if;
   if item is distinct from prior and item->'events'->-1->>'status' is distinct from item->>'status' then raise exception 'INVALID_WRITE';end if;
  end loop;
  if changes>1 then raise exception 'INVALID_WRITE';end if;
end;$$;
revoke all on function private.validate_application_write(jsonb,jsonb) from public,anon,authenticated;

create function private.validate_fact_write(old_state jsonb,new_state jsonb,p_action text,p_revision integer) returns void language plpgsql security invoker set search_path='' as $$
declare allowed text[];old_facts jsonb;new_facts jsonb;old_versions jsonb;new_versions jsonb;item jsonb;n integer;candidate jsonb;
begin
 allowed:=case p_action when 'import' then array['original','facts','vacancy'] when 'demo' then array['original','facts','vacancy'] when 'fact' then array['original','facts'] when 'verify' then array['facts'] when 'goal' then array['goal'] when 'vacancy' then array['vacancy'] when 'version' then array['versions'] when 'restore' then array['versions'] when 'application' then array['applications'] else null end;
 if allowed is null or (new_state-allowed) is distinct from (old_state-allowed) then raise exception 'INVALID_WRITE';end if;
 if jsonb_typeof(new_state->'original') is distinct from 'string' or length(new_state->>'original')>1100000 or jsonb_typeof(new_state->'goal') is distinct from 'string' or length(new_state->>'goal')>1000 or jsonb_typeof(new_state->'vacancy') is distinct from 'string' or length(new_state->>'vacancy')>30000 then raise exception 'INVALID_WRITE';end if;
 if jsonb_typeof(new_state->'facts') is distinct from 'array' or jsonb_typeof(new_state->'versions') is distinct from 'array' or jsonb_typeof(new_state->'applications') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
 old_facts:=old_state->'facts';new_facts:=new_state->'facts';old_versions:=old_state->'versions';new_versions:=new_state->'versions';
 if jsonb_array_length(new_facts)>500 or jsonb_array_length(new_versions)>100 or jsonb_array_length(new_state->'applications')>500 then raise exception 'INVALID_WRITE';end if;
 for item in select value from jsonb_array_elements(new_facts) loop
  if jsonb_typeof(item->'verified') is distinct from 'boolean' or jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 100 or jsonb_typeof(item->'text') is distinct from 'string' or length(item->>'text') not between 1 and 2000 or jsonb_typeof(item->'source') is distinct from 'string' or length(item->>'source')>500 then raise exception 'INVALID_WRITE';end if;
 end loop;
 if p_action in ('import','demo') then
  if length(new_state->>'original')>100000 or exists(select 1 from jsonb_array_elements(new_facts) f where f->'verified'<>'false'::jsonb) then raise exception 'INVALID_WRITE';end if;
 elsif p_action='verify' then
  if jsonb_array_length(new_facts)<>jsonb_array_length(old_facts) or exists(select 1 from jsonb_array_elements(new_facts) with ordinality f(v,i) where (v-'verified') is distinct from (old_facts->(i::integer-1)-'verified')) then raise exception 'INVALID_WRITE';end if;
 elsif p_action='fact' then
  n:=jsonb_array_length(old_facts);candidate:=new_facts->n;
  if jsonb_array_length(new_facts)<>n+1 or (new_facts-n)<>old_facts or candidate->'verified' is distinct from 'false'::jsonb or new_state->>'original' is distinct from (old_state->>'original')||E'\n'||(candidate->>'text') then raise exception 'INVALID_WRITE';end if;

 end if;
 if p_action in ('version','restore') then perform private.validate_version_write(old_state,new_state,p_action,p_revision);elsif p_action='application' then perform private.validate_application_write(old_state,new_state);end if;

end;$$;
revoke all on function private.validate_fact_write(jsonb,jsonb,text,integer) from public,anon,authenticated;

-- Contract boundary: clients can read their workspace, but may mutate only via guarded RPC.
revoke insert,update,delete,truncate,references,trigger on public.workspaces,public.audit_log,public.consent_records from authenticated;
create function private.commit_workspace(p_revision integer,p_payload jsonb,p_action text) returns integer
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); current_revision integer; old_state jsonb; new_state jsonb:=p_payload-'revision'; allowed text[];
 old_facts jsonb; new_facts jsonb; old_versions jsonb; new_versions jsonb; candidate jsonb; original_version jsonb;
 item jsonb; prior jsonb; n integer; changes integer:=0; rendered text; promoted text; remainder text; snapshot jsonb;
 statuses text[]:=array['Планируется','Отклик отправлен','Просмотрено','Приглашение','Отказ','Интервью','Оффер'];
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision,payload-'revision' into current_revision,old_state from public.workspaces where user_id=uid for update;
 if coalesce(current_revision,0)<>p_revision then raise exception 'CONFLICT';end if;
 old_state:='{"original":"","goal":"","vacancy":"","facts":[],"versions":[],"applications":[]}'::jsonb||coalesce(old_state,'{}');
 perform private.validate_fact_write(old_state,new_state,p_action,p_revision);
 insert into public.workspaces(user_id,revision,payload) values(uid,p_revision+1,new_state)
 on conflict(user_id) do update set revision=excluded.revision,payload=excluded.payload,updated_at=now();
 insert into public.audit_log(user_id,action) values(uid,p_action);
 insert into public.consent_records(user_id,version) values(uid,'privacy-v1') on conflict do nothing;
 return p_revision+1;
end;$$;
revoke all on function private.commit_workspace(integer,jsonb,text) from public,anon;
grant execute on function private.commit_workspace(integer,jsonb,text) to authenticated;
create or replace function public.save_workspace(p_revision integer,p_payload jsonb,p_action text) returns integer
language sql security invoker set search_path='' as $$select private.commit_workspace(p_revision,p_payload,p_action);$$;

alter policy workspace_select on public.workspaces using ((select auth.uid())=user_id and (select public.session_is_active()));
alter policy audit_select on public.audit_log using ((select auth.uid())=user_id and (select public.session_is_active()));
alter policy consent_select on public.consent_records using ((select auth.uid())=user_id and (select public.session_is_active()));

create or replace function private.validate_fact_write(old_state jsonb,new_state jsonb,p_action text,p_revision integer) returns void language plpgsql security invoker set search_path='' as $$
declare allowed text[];old_facts jsonb;new_facts jsonb;old_versions jsonb;new_versions jsonb;item jsonb;n integer;candidate jsonb;
begin
 allowed:=case p_action when 'import' then array['original','facts','vacancy'] when 'demo' then array['original','facts','vacancy'] when 'fact' then array['original','facts'] when 'verify' then array['facts'] when 'goal' then array['goal'] when 'vacancy' then array['vacancy'] when 'version' then array['versions'] when 'restore' then array['versions'] when 'application' then array['applications'] else null end;
 if allowed is null or (new_state-allowed) is distinct from (old_state-allowed) then raise exception 'INVALID_WRITE';end if;
 if jsonb_typeof(new_state->'original') is distinct from 'string' or length(new_state->>'original')>1100000 or jsonb_typeof(new_state->'goal') is distinct from 'string' or length(new_state->>'goal')>1000 or jsonb_typeof(new_state->'vacancy') is distinct from 'string' or length(new_state->>'vacancy')>30000 then raise exception 'INVALID_WRITE';end if;
 if jsonb_typeof(new_state->'facts') is distinct from 'array' or jsonb_typeof(new_state->'versions') is distinct from 'array' or jsonb_typeof(new_state->'applications') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
 old_facts:=old_state->'facts';new_facts:=new_state->'facts';old_versions:=old_state->'versions';new_versions:=new_state->'versions';
 if jsonb_array_length(new_facts)>500 or jsonb_array_length(new_versions)>100 or jsonb_array_length(new_state->'applications')>500 then raise exception 'INVALID_WRITE';end if;
 for item in select value from jsonb_array_elements(new_facts) loop
  if jsonb_typeof(item->'verified') is distinct from 'boolean' or jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 100 or jsonb_typeof(item->'text') is distinct from 'string' or length(item->>'text') not between 1 and 2000 or jsonb_typeof(item->'source') is distinct from 'string' or length(item->>'source')>500 then raise exception 'INVALID_WRITE';end if;
 end loop;
 if p_action in ('import','demo') then
  if length(new_state->>'original')>100000 or exists(select 1 from jsonb_array_elements(new_facts) f where f->'verified'<>'false'::jsonb) then raise exception 'INVALID_WRITE';end if;
 elsif p_action='verify' then
  if jsonb_array_length(new_facts)<>jsonb_array_length(old_facts) or exists(select 1 from jsonb_array_elements(new_facts) with ordinality f(v,i) where (v-'verified') is distinct from ((old_facts->(i::integer-1))-'verified')) then raise exception 'INVALID_WRITE';end if;
 elsif p_action='fact' then
  n:=jsonb_array_length(old_facts);candidate:=new_facts->n;
  if jsonb_array_length(new_facts)<>n+1 or (new_facts-n)<>old_facts or candidate->'verified' is distinct from 'false'::jsonb or new_state->>'original' is distinct from (old_state->>'original')||E'\n'||(candidate->>'text') then raise exception 'INVALID_WRITE';end if;

 end if;
 if p_action in ('version','restore') then perform private.validate_version_write(old_state,new_state,p_action,p_revision);elsif p_action='application' then perform private.validate_application_write(old_state,new_state);end if;

end;$$;
revoke all on function private.validate_fact_write(jsonb,jsonb,text,integer) from public,anon,authenticated;
-- Expand phase: small commands build the next state under the same owner lock as
-- legacy snapshot writes. Retain projection/history triggers and snapshot rollback.
create function public.apply_workspace_command(p_revision integer,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); current_revision integer; state jsonb; action text; ids jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_command) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 action:=p_command->>'action';
 if action in ('goal','vacancy') then
  if p_command-array['action','text']<>'{}'::jsonb or jsonb_typeof(p_command->'text') is distinct from 'string'
   or (action='goal' and length(p_command->>'text')>1000)
   or (action='vacancy' and length(p_command->>'text') not between 5 and 30000) then raise exception 'INVALID_WRITE';end if;
 elsif action='verify' then
  if p_command-array['action','ids','verified']<>'{}'::jsonb or jsonb_typeof(p_command->'verified') is distinct from 'boolean'
   or jsonb_typeof(p_command->'ids') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
  ids:=p_command->'ids';
  if jsonb_array_length(ids)>500 or exists(select 1 from jsonb_array_elements(ids) i where jsonb_typeof(i)<>'string' or length(i#>>'{}') not between 1 and 100)
   or (select count(*) from jsonb_array_elements(ids))<>(select count(distinct i) from jsonb_array_elements(ids) i) then raise exception 'INVALID_WRITE';end if;
 else raise exception 'INVALID_WRITE';end if;
 -- This serializes creation too; no missing-row race or lost update with save_workspace.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision,payload into current_revision,state from public.workspaces where user_id=uid for update;
 if coalesce(current_revision,0)<>p_revision then raise exception 'CONFLICT';end if;
 state:='{"original":"","goal":"","vacancy":"","facts":[],"versions":[],"applications":[]}'::jsonb||coalesce(state,'{}');
 if action='verify' then
  -- Missing IDs (including IDs owned by another user) fail atomically, never partially verify.
  if exists(select 1 from jsonb_array_elements_text(ids) i where not exists(select 1 from jsonb_array_elements(state->'facts') f where f->>'id'=i)) then raise exception 'INVALID_WRITE';end if;
  state:=jsonb_set(state,'{facts}',coalesce((select jsonb_agg(case when ids ? (f->>'id') then jsonb_set(f,'{verified}',p_command->'verified') else f end order by n)
   from jsonb_array_elements(state->'facts') with ordinality as facts(f,n)),'[]'::jsonb));
 else state:=jsonb_set(state,array[action],p_command->'text');end if;
 perform private.commit_workspace(p_revision,state,action);
 -- Return the exact snapshot in this transaction, not a second request that could race.
 return public.read_workspace();
end;$$;
revoke all on function public.apply_workspace_command(integer,jsonb) from public,anon;
grant execute on function public.apply_workspace_command(integer,jsonb) to authenticated;

-- Expand application writes without removing snapshot compatibility or changing read/RLS contracts.
-- Pure state transformer: callable only by the guarded owner/session RPC, never by clients.
create function private.apply_application_intent(p_state jsonb,p_command jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare item jsonb; position integer; stamp text;
 statuses text[]:=array['Планируется','Отклик отправлен','Просмотрено','Приглашение','Отказ','Интервью','Оффер'];
begin
 if jsonb_typeof(p_command) is distinct from 'object' or p_command->>'action' is distinct from 'application'
  or p_command-array['action','id','title','status','note','resumeVersionId']<>'{}'::jsonb
  or jsonb_typeof(p_command->'status') is distinct from 'string' or not (p_command->>'status'=any(statuses))
  or jsonb_typeof(p_command->'note') is distinct from 'string' or length(p_command->>'note')>3000 then raise exception 'INVALID_WRITE';end if;
 if p_command ? 'resumeVersionId' then
  if p_command->'resumeVersionId'<>'null'::jsonb then
   if jsonb_typeof(p_command->'resumeVersionId') is distinct from 'string' or length(p_command->>'resumeVersionId') not between 1 and 100 then raise exception 'INVALID_WRITE';end if;
   if not exists(select 1 from jsonb_array_elements(p_state->'versions') v where v->>'id'=p_command->>'resumeVersionId') then raise exception 'INVALID_WRITE';end if;
  end if;
 end if;
 stamp:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 if p_command ? 'id' then
  if jsonb_typeof(p_command->'id') is distinct from 'string' or length(p_command->>'id') not between 1 and 100 or p_command ? 'title' then raise exception 'INVALID_WRITE';end if;
  select a,n::integer-1 into item,position from jsonb_array_elements(p_state->'applications') with ordinality app(a,n) where a->>'id'=p_command->>'id';
  if item is null then raise exception 'INVALID_WRITE';end if;
  if item->>'status'<>p_command->>'status' then
   if jsonb_array_length(item->'events')>=200 then raise exception 'INVALID_WRITE';end if;
   item:=jsonb_set(item,'{events}',(item->'events')||jsonb_build_array(jsonb_build_object('status',p_command->>'status','date',stamp)));
  end if;
  item:=item||jsonb_build_object('status',p_command->>'status','note',p_command->>'note');
  -- Omitted version preserves both the old value and absence on a legacy row. Null unlinks.
  if p_command ? 'resumeVersionId' then item:=jsonb_set(item,'{resumeVersionId}',p_command->'resumeVersionId');end if;
  return jsonb_set(p_state,array['applications',position::text],item);
 else
  if jsonb_typeof(p_command->'title') is distinct from 'string' or length(p_command->>'title') not between 1 and 300 or jsonb_array_length(p_state->'applications')>=500 then raise exception 'INVALID_WRITE';end if;
  item:=jsonb_build_object('id',gen_random_uuid()::text,'title',p_command->>'title','status',p_command->>'status',
   'note',p_command->>'note','created',stamp,'resumeVersionId',coalesce(p_command->'resumeVersionId','null'::jsonb),
   'events',jsonb_build_array(jsonb_build_object('status',p_command->>'status','date',stamp)));
  return jsonb_set(p_state,'{applications}',(p_state->'applications')||jsonb_build_array(item));
 end if;
end;$$;
revoke all on function private.apply_application_intent(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.apply_workspace_command(p_revision integer,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); current_revision integer; state jsonb; action text; ids jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_command) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 action:=p_command->>'action';
 if action in ('goal','vacancy') then
  if p_command-array['action','text']<>'{}'::jsonb or jsonb_typeof(p_command->'text') is distinct from 'string'
   or (action='goal' and length(p_command->>'text')>1000)
   or (action='vacancy' and length(p_command->>'text') not between 5 and 30000) then raise exception 'INVALID_WRITE';end if;
 elsif action='verify' then
  if p_command-array['action','ids','verified']<>'{}'::jsonb or jsonb_typeof(p_command->'verified') is distinct from 'boolean'
   or jsonb_typeof(p_command->'ids') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
  ids:=p_command->'ids';
  if jsonb_array_length(ids)>500 or exists(select 1 from jsonb_array_elements(ids) i where jsonb_typeof(i)<>'string' or length(i#>>'{}') not between 1 and 100)
   or (select count(*) from jsonb_array_elements(ids))<>(select count(distinct i) from jsonb_array_elements(ids) i) then raise exception 'INVALID_WRITE';end if;
 elsif action='application' then
  -- Shape, ownership of referenced IDs and limits are validated after loading the locked state.
  null;
 else raise exception 'INVALID_WRITE';end if;
 -- This serializes creation too; no missing-row race or lost update with save_workspace.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision,payload into current_revision,state from public.workspaces where user_id=uid for update;
 if coalesce(current_revision,0)<>p_revision then raise exception 'CONFLICT';end if;
 state:='{"original":"","goal":"","vacancy":"","facts":[],"versions":[],"applications":[]}'::jsonb||coalesce(state,'{}');
 if action='application' then
  state:=private.apply_application_intent(state,p_command);
 elsif action='verify' then
  -- Missing IDs (including IDs owned by another user) fail atomically, never partially verify.
  if exists(select 1 from jsonb_array_elements_text(ids) i where not exists(select 1 from jsonb_array_elements(state->'facts') f where f->>'id'=i)) then raise exception 'INVALID_WRITE';end if;
  state:=jsonb_set(state,'{facts}',coalesce((select jsonb_agg(case when ids ? (f->>'id') then jsonb_set(f,'{verified}',p_command->'verified') else f end order by n)
   from jsonb_array_elements(state->'facts') with ordinality as facts(f,n)),'[]'::jsonb));
 else state:=jsonb_set(state,array[action],p_command->'text');end if;
 perform private.commit_workspace(p_revision,state,action);
 -- Return the exact snapshot in this transaction, not a second request that could race.
 return public.read_workspace();
end;$$;
revoke all on function public.apply_workspace_command(integer,jsonb) from public,anon;
grant execute on function public.apply_workspace_command(integer,jsonb) to authenticated;

-- Preserve the legacy parseFacts per-line JavaScript .length gate for supplementary characters.
create function private.utf16_length(s text) returns integer
language sql immutable strict security invoker set search_path='' as $$
 select length(s)+length(regexp_replace(s collate "C",U&'[\0001-\FFFF]','','g'));
$$;
revoke all on function private.utf16_length(text) from public,anon,authenticated;

-- Pure transformer, only called with the owner snapshot under the guarded RPC lock.
create function private.apply_profile_intent(p_state jsonb,p_command jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare action text:=p_command->>'action'; text_input text:=p_command->>'text'; lines jsonb; facts jsonb; candidate jsonb;
begin
 if jsonb_typeof(p_command) is distinct from 'object' or action not in ('import','demo','fact') or action is null
  or jsonb_typeof(p_command->'text') is distinct from 'string' then raise exception 'INVALID_WRITE';end if;
 if action='demo' then
  if p_command-array['action','text','vacancy']<>'{}'::jsonb or jsonb_typeof(p_command->'vacancy') is distinct from 'string'
   or length(p_command->>'vacancy') not between 5 and 30000 then raise exception 'INVALID_WRITE';end if;
 elsif p_command-array['action','text']<>'{}'::jsonb then raise exception 'INVALID_WRITE';end if;
 if action='fact' then
  if length(text_input) not between 2 and 2000 or jsonb_array_length(p_state->'facts')>=500 then raise exception 'INVALID_WRITE';end if;
  candidate:=jsonb_build_object('id',gen_random_uuid()::text,'text',text_input,'source','Уточнение пользователя','verified',false);
  return p_state||jsonb_build_object('original',(p_state->>'original')||E'\n'||text_input,'facts',(p_state->'facts')||jsonb_build_array(candidate));
 end if;
 if length(text_input) not between 1 and 100000 then raise exception 'INVALID_WRITE';end if;
 -- Match parseFacts: CRLF/LF split, ECMAScript trim, omit blank lines, keep duplicates/order.
 select coalesce(jsonb_agg(line order by n),'[]'::jsonb) into lines
 from (select private.trim_fact_line(raw) as line,n from regexp_split_to_table(text_input,E'\r?\n') with ordinality input(raw,n)) parsed where line<>'';
 -- Reject the full command before generating IDs or attempting a commit.
 if jsonb_array_length(lines)>500 or exists(select 1 from jsonb_array_elements_text(lines) l where private.utf16_length(l)>2000) then raise exception 'INVALID_WRITE';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',gen_random_uuid()::text,'text',line,'source','Введено пользователем','verified',false) order by n),'[]'::jsonb) into facts
 from jsonb_array_elements_text(lines) with ordinality parsed(line,n);
 return p_state||jsonb_build_object('original',text_input,'facts',facts,'vacancy',case when action='demo' then p_command->>'vacancy' else '' end);
end;$$;
revoke all on function private.apply_profile_intent(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.apply_workspace_command(p_revision integer,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); current_revision integer; state jsonb; action text; ids jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_command) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 action:=p_command->>'action';
 if action in ('goal','vacancy') then
  if p_command-array['action','text']<>'{}'::jsonb or jsonb_typeof(p_command->'text') is distinct from 'string'
   or (action='goal' and length(p_command->>'text')>1000)
   or (action='vacancy' and length(p_command->>'text') not between 5 and 30000) then raise exception 'INVALID_WRITE';end if;
 elsif action='verify' then
  if p_command-array['action','ids','verified']<>'{}'::jsonb or jsonb_typeof(p_command->'verified') is distinct from 'boolean'
   or jsonb_typeof(p_command->'ids') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
  ids:=p_command->'ids';
  if jsonb_array_length(ids)>500 or exists(select 1 from jsonb_array_elements(ids) i where jsonb_typeof(i)<>'string' or length(i#>>'{}') not between 1 and 100)
   or (select count(*) from jsonb_array_elements(ids))<>(select count(distinct i) from jsonb_array_elements(ids) i) then raise exception 'INVALID_WRITE';end if;
 elsif action in ('application','import','demo','fact') then
  -- Shape, ownership of referenced IDs and limits are validated after loading the locked state.
  null;
 else raise exception 'INVALID_WRITE';end if;
 -- This serializes creation too; no missing-row race or lost update with save_workspace.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision,payload into current_revision,state from public.workspaces where user_id=uid for update;
 if coalesce(current_revision,0)<>p_revision then raise exception 'CONFLICT';end if;
 state:='{"original":"","goal":"","vacancy":"","facts":[],"versions":[],"applications":[]}'::jsonb||coalesce(state,'{}');
 if action in ('import','demo','fact') then
  state:=private.apply_profile_intent(state,p_command);
 elsif action='application' then
  state:=private.apply_application_intent(state,p_command);
 elsif action='verify' then
  -- Missing IDs (including IDs owned by another user) fail atomically, never partially verify.
  if exists(select 1 from jsonb_array_elements_text(ids) i where not exists(select 1 from jsonb_array_elements(state->'facts') f where f->>'id'=i)) then raise exception 'INVALID_WRITE';end if;
  state:=jsonb_set(state,'{facts}',coalesce((select jsonb_agg(case when ids ? (f->>'id') then jsonb_set(f,'{verified}',p_command->'verified') else f end order by n)
   from jsonb_array_elements(state->'facts') with ordinality as facts(f,n)),'[]'::jsonb));
 else state:=jsonb_set(state,array[action],p_command->'text');end if;
 perform private.commit_workspace(p_revision,state,action);
 -- Return the exact snapshot in this transaction, not a second request that could race.
 return public.read_workspace();
end;$$;
revoke all on function public.apply_workspace_command(integer,jsonb) from public,anon;
grant execute on function public.apply_workspace_command(integer,jsonb) to authenticated;

-- Only the owner/session RPC may supply the locked state to this pure transformer.
create function private.apply_version_intent(p_state jsonb,p_revision integer,p_command jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare action text:=p_command->>'action'; candidate jsonb; ids jsonb; snapshot jsonb; metadata jsonb;
 rendered text; promoted text; remainder text; stamp text; score numeric; value numeric; key text; total integer:=0;
begin
 if jsonb_typeof(p_command) is distinct from 'object' or action is null or action not in ('version','restore')
  or jsonb_array_length(p_state->'versions')>=100 then raise exception 'INVALID_WRITE';end if;
 stamp:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 if action='restore' then
  if p_command-array['action','id']<>'{}'::jsonb or jsonb_typeof(p_command->'id') is distinct from 'string'
   or length(p_command->>'id') not between 1 and 100 then raise exception 'INVALID_WRITE';end if;
  select v into candidate from jsonb_array_elements(p_state->'versions') v where v->>'id'=p_command->>'id';
  if candidate is null then raise exception 'INVALID_WRITE';end if;
  candidate:=candidate||jsonb_build_object('id',gen_random_uuid()::text,'created',stamp,'restored_from',p_command->>'id');
 else
  if p_command-array['action','evidence_ids','score','match_metadata']<>'{}'::jsonb
   or jsonb_typeof(p_command->'evidence_ids') is distinct from 'array'
   or jsonb_typeof(p_command->'score') is distinct from 'number'
   or length(p_state->>'original')=0 or length(p_state->>'vacancy')=0 then raise exception 'INVALID_WRITE';end if;
  ids:=p_command->'evidence_ids';score:=(p_command->>'score')::numeric;metadata:=p_command->'match_metadata';
  if score not between 0 and 100 or score<>trunc(score) or jsonb_array_length(ids)>500
   or exists(select 1 from jsonb_array_elements(ids) i where jsonb_typeof(i)<>'string' or length(i#>>'{}') not between 1 and 100)
   or (select count(*) from jsonb_array_elements(ids))<>(select count(distinct i) from jsonb_array_elements(ids) i) then raise exception 'INVALID_WRITE';end if;
  if exists(select 1 from jsonb_array_elements_text(ids) i where not exists(select 1 from jsonb_array_elements(p_state->'facts') f where f->>'id'=i and f->'verified'='true'::jsonb)) then raise exception 'INVALID_WRITE';end if;
  -- Validate v1 evaluation shape/constants; relevance/score computation stays in the server engine.
  if jsonb_typeof(metadata) is distinct from 'object' or metadata-array['rules_revision','weights','contributions','requirements','outcomes']<>'{}'::jsonb
   or metadata->>'rules_revision' is distinct from 'rules-2026-10-25.1'
   or metadata->'weights' is distinct from '{"mandatory":35,"experience":25,"skills":20,"context":10,"clarity":10}'::jsonb
   or metadata->'contributions' is distinct from '{"matched":1,"partial":0.5,"missing":0,"unknown":0}'::jsonb
   or jsonb_typeof(metadata->'requirements') is distinct from 'number' or jsonb_typeof(metadata->'outcomes') is distinct from 'object'
   or (metadata->'outcomes')-array['matched','partial','missing','unknown']<>'{}'::jsonb then raise exception 'INVALID_WRITE';end if;
  value:=(metadata->>'requirements')::numeric;
  if value not between 0 and 30000 or value<>trunc(value) then raise exception 'INVALID_WRITE';end if;
  foreach key in array array['matched','partial','missing','unknown'] loop
   if jsonb_typeof(metadata#>array['outcomes',key]) is distinct from 'number' then raise exception 'INVALID_WRITE';end if;
   value:=(metadata#>>array['outcomes',key])::numeric;
   if value not between 0 and 30000 or value<>trunc(value) then raise exception 'INVALID_WRITE';end if;
   total:=total+value::integer;
  end loop;
  if total<>(metadata->>'requirements')::numeric then raise exception 'INVALID_WRITE';end if;
  select coalesce(jsonb_agg(f order by i),'[]'::jsonb) into snapshot from jsonb_array_elements(p_state->'facts') with ordinality facts(f,i) where ids ? (f->>'id');
  if jsonb_array_length(ids)=0 then rendered:=p_state->>'original';
  else
   select string_agg(f->>'text',E'\n' order by i) into promoted from jsonb_array_elements_text(ids) with ordinality selected(e,i) join jsonb_array_elements(p_state->'facts') f on f->>'id'=e;
   select coalesce(string_agg(line,E'\n' order by i),'') into remainder from regexp_split_to_table(p_state->>'original',E'\r?\n') with ordinality lines(line,i)
    where not exists(select 1 from jsonb_array_elements(snapshot) f where f->>'text'=private.trim_fact_line(line));
   rendered:='РЕЛЕВАНТНЫЙ ОПЫТ'||E'\n'||promoted||E'\n\nПРОФИЛЬ\n'||remainder;
  end if;
  candidate:=jsonb_build_object('id',gen_random_uuid()::text,'created',stamp,'text',rendered,'vacancy',p_state->>'vacancy',
   'evidence_ids',ids,'evidence_snapshot',snapshot,'profile_revision',p_revision,'engine_version','rules-v1','score',score::integer,'match_metadata',metadata);
 end if;
 return jsonb_set(p_state,'{versions}',(p_state->'versions')||jsonb_build_array(candidate));
end;$$;
revoke all on function private.apply_version_intent(jsonb,integer,jsonb) from public,anon,authenticated;

create or replace function public.apply_workspace_command(p_revision integer,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); current_revision integer; state jsonb; action text; ids jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_command) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 action:=p_command->>'action';
 if action in ('goal','vacancy') then
  if p_command-array['action','text']<>'{}'::jsonb or jsonb_typeof(p_command->'text') is distinct from 'string'
   or (action='goal' and length(p_command->>'text')>1000)
   or (action='vacancy' and length(p_command->>'text') not between 5 and 30000) then raise exception 'INVALID_WRITE';end if;
 elsif action='verify' then
  if p_command-array['action','ids','verified']<>'{}'::jsonb or jsonb_typeof(p_command->'verified') is distinct from 'boolean'
   or jsonb_typeof(p_command->'ids') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
  ids:=p_command->'ids';
  if jsonb_array_length(ids)>500 or exists(select 1 from jsonb_array_elements(ids) i where jsonb_typeof(i)<>'string' or length(i#>>'{}') not between 1 and 100)
   or (select count(*) from jsonb_array_elements(ids))<>(select count(distinct i) from jsonb_array_elements(ids) i) then raise exception 'INVALID_WRITE';end if;
 elsif action in ('application','import','demo','fact','version','restore') then
  -- Shape, ownership of referenced IDs and limits are validated after loading the locked state.
  null;
 else raise exception 'INVALID_WRITE';end if;
 -- This serializes creation too; no missing-row race or lost update with save_workspace.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision,payload into current_revision,state from public.workspaces where user_id=uid for update;
 if coalesce(current_revision,0)<>p_revision then raise exception 'CONFLICT';end if;
 state:='{"original":"","goal":"","vacancy":"","facts":[],"versions":[],"applications":[]}'::jsonb||coalesce(state,'{}');
 if action in ('version','restore') then
  state:=private.apply_version_intent(state,p_revision,p_command);
 elsif action in ('import','demo','fact') then
  state:=private.apply_profile_intent(state,p_command);
 elsif action='application' then
  state:=private.apply_application_intent(state,p_command);
 elsif action='verify' then
  -- Missing IDs (including IDs owned by another user) fail atomically, never partially verify.
  if exists(select 1 from jsonb_array_elements_text(ids) i where not exists(select 1 from jsonb_array_elements(state->'facts') f where f->>'id'=i)) then raise exception 'INVALID_WRITE';end if;
  state:=jsonb_set(state,'{facts}',coalesce((select jsonb_agg(case when ids ? (f->>'id') then jsonb_set(f,'{verified}',p_command->'verified') else f end order by n)
   from jsonb_array_elements(state->'facts') with ordinality as facts(f,n)),'[]'::jsonb));
 else state:=jsonb_set(state,array[action],p_command->'text');end if;
 perform private.commit_workspace(p_revision,state,action);
 -- Return the exact snapshot in this transaction, not a second request that could race.
 return public.read_workspace();
end;$$;
revoke all on function public.apply_workspace_command(integer,jsonb) from public,anon;
grant execute on function public.apply_workspace_command(integer,jsonb) to authenticated;

-- Administrative read-only preflight. No repair, snapshot removal or user-facing RPC.
create function private.workspace_projection_report() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare table_name text; report jsonb;
begin
 -- Refuse a partial view through RLS even if EXECUTE is explicitly granted later.
 foreach table_name in array array['public.workspaces','public.profile_facts','public.resume_versions','public.applications','public.application_events'] loop
  if not has_table_privilege(current_user,table_name,'SELECT') or row_security_active(table_name::regclass) then raise exception 'PARITY_SCOPE';end if;
 end loop;
 with facts as (
  select user_id,jsonb_agg(extra||jsonb_build_object('id',id,'text',text,'source',source,'verified',verified) order by position,id) as data from public.profile_facts group by user_id
 ), versions as (
  select user_id,jsonb_agg(extra||jsonb_build_object('id',id,'created',created,'text',text,'vacancy',vacancy,'score',score,'evidence_ids',evidence_ids) order by position,id) as data from public.resume_versions group by user_id
 ), events as (
  select user_id,application_id,jsonb_agg(extra||jsonb_build_object('status',status,'date',date) order by position) as data from public.application_events group by user_id,application_id
 ), applications as (
  select a.user_id,jsonb_agg(a.extra||jsonb_build_object('id',a.id,'title',a.title,'status',a.status,'note',a.note,'created',a.created,'events',coalesce(e.data,'[]'::jsonb))
   ||case when a.version_link_present then jsonb_build_object('resumeVersionId',a.resume_version_id) else '{}'::jsonb end order by a.position,a.id) as data
  from public.applications a left join events e on e.user_id=a.user_id and e.application_id=a.id group by a.user_id
 ), positions as (
  select position,row_number() over(partition by user_id order by position,id) as expected from public.profile_facts
  union all select position,row_number() over(partition by user_id order by position,id) from public.resume_versions
  union all select position,row_number() over(partition by user_id order by position,id) from public.applications
  union all select position,row_number() over(partition by user_id,application_id order by position) from public.application_events
 ), extras as (
  select jsonb_typeof(extra) is distinct from 'object' or extra ?| array['id','text','source','verified'] as bad from public.profile_facts
  union all select jsonb_typeof(extra) is distinct from 'object' or extra ?| array['id','created','text','vacancy','score','evidence_ids'] from public.resume_versions
  union all select jsonb_typeof(extra) is distinct from 'object' or extra ?| array['id','title','status','note','created','resumeVersionId','events'] from public.applications
  union all select jsonb_typeof(extra) is distinct from 'object' or extra ?| array['status','date'] from public.application_events
 ), orphans as (
  select 1 from public.profile_facts f where not exists(select 1 from public.workspaces w where w.user_id=f.user_id)
  union all select 1 from public.resume_versions v where not exists(select 1 from public.workspaces w where w.user_id=v.user_id)
  union all select 1 from public.applications a where not exists(select 1 from public.workspaces w where w.user_id=a.user_id)
  union all select 1 from public.application_events e where not exists(select 1 from public.applications a where a.user_id=e.user_id and a.id=e.application_id)
 ), comparison as (
  select count(*) filter(where w.payload->'facts' is distinct from coalesce(f.data,'[]'::jsonb)) as facts,
   count(*) filter(where w.payload->'versions' is distinct from coalesce(v.data,'[]'::jsonb)) as versions,
   count(*) filter(where w.payload->'applications' is distinct from coalesce(a.data,'[]'::jsonb)) as applications,
   count(*) filter(where jsonb_typeof(w.payload) is distinct from 'object' or jsonb_typeof(w.payload->'facts') is distinct from 'array'
    or jsonb_typeof(w.payload->'versions') is distinct from 'array' or jsonb_typeof(w.payload->'applications') is distinct from 'array') as payload_rows
  from public.workspaces w left join facts f on f.user_id=w.user_id left join versions v on v.user_id=w.user_id left join applications a on a.user_id=w.user_id
 )
 select jsonb_build_object('format','jobmatch-projection-parity-v1','checked',jsonb_build_object(
  'workspaces',(select count(*) from public.workspaces),'profile_facts',(select count(*) from public.profile_facts),
  'resume_versions',(select count(*) from public.resume_versions),'applications',(select count(*) from public.applications),'application_events',(select count(*) from public.application_events)),
  'mismatches',jsonb_build_object('facts',c.facts,'versions',c.versions,'applications',c.applications,'payload_rows',c.payload_rows,
   'position_rows',(select count(*) from positions where position<>expected),'extra_rows',(select count(*) from extras where bad),
   'orphan_rows',(select count(*) from orphans),'link_rows',(select count(*) from public.applications a where (not a.version_link_present and a.resume_version_id is not null)
    or (a.resume_version_id is not null and not exists(select 1 from public.resume_versions v where v.user_id=a.user_id and v.id=a.resume_version_id))))) into report from comparison c;
 return report||jsonb_build_object('ok',not exists(select 1 from jsonb_each_text(report->'mismatches') m where m.value::bigint<>0));
end;$$;
revoke all on function private.workspace_projection_report() from public,anon,authenticated;

-- One atomic DO statement also works when psql applies files without an outer BEGIN.
-- No data backfill or array removal. Pause writers while validating the existing mirror.
do $migration$
begin
 lock table public.workspaces,public.profile_facts,public.resume_versions,public.applications,public.application_events,public.fact_history in share row exclusive mode;
 if (private.workspace_projection_report()->'ok') is distinct from 'true'::jsonb then raise exception 'PROJECTION_CONFLICT';end if;

create function private.locked_workspace(p_revision integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); current_revision integer; mirror jsonb; canonical jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 then raise exception 'INVALID_WRITE';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision,payload into current_revision,mirror from public.workspaces where user_id=uid for update;
 if coalesce(current_revision,0)<>p_revision then raise exception 'CONFLICT';end if;
 if current_revision is null then
  return '{"original":"","goal":"","vacancy":"","facts":[],"versions":[],"applications":[]}'::jsonb;
 end if;
 canonical:=public.read_workspace();
 if canonical is null then raise exception 'AUTH';end if;
 if (mirror->'facts',mirror->'versions',mirror->'applications') is distinct from (canonical->'facts',canonical->'versions',canonical->'applications') then raise exception 'PROJECTION_CONFLICT';end if;
 -- Detect structural corruption that JSON reconstruction could hide.
 if exists(select 1 from public.profile_facts where user_id=uid and (jsonb_typeof(extra) is distinct from 'object' or extra ?| array['id','text','source','verified']))
  or exists(select 1 from public.resume_versions where user_id=uid and (jsonb_typeof(extra) is distinct from 'object' or extra ?| array['id','created','text','vacancy','score','evidence_ids']))
  or exists(select 1 from public.applications where user_id=uid and (jsonb_typeof(extra) is distinct from 'object' or extra ?| array['id','title','status','note','created','resumeVersionId','events'] or (not version_link_present and resume_version_id is not null)))
  or exists(select 1 from public.application_events where user_id=uid and (jsonb_typeof(extra) is distinct from 'object' or extra ?| array['status','date']))
  or exists(select 1 from (
   select position,row_number() over(order by position,id) as expected from public.profile_facts where user_id=uid
   union all select position,row_number() over(order by position,id) from public.resume_versions where user_id=uid
   union all select position,row_number() over(order by position,id) from public.applications where user_id=uid
   union all select position,row_number() over(partition by application_id order by position) from public.application_events where user_id=uid
  ) positions where position<>expected) then raise exception 'PROJECTION_CONFLICT';end if;
 return '{"original":"","goal":"","vacancy":"","facts":[],"versions":[],"applications":[]}'::jsonb||(canonical-'revision');
end;$$;
revoke all on function private.locked_workspace(integer) from public,anon,authenticated;

create or replace function private.commit_workspace(p_revision integer,p_payload jsonb,p_action text) returns integer
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); old_state jsonb; new_state jsonb:=p_payload-'revision';
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 old_state:=private.locked_workspace(p_revision);
 perform private.validate_fact_write(old_state,new_state,p_action,p_revision);
 -- Keep the complete compatibility mirror until a separately accepted storage cutover.
 insert into public.workspaces(user_id,revision,payload) values(uid,p_revision+1,new_state)
 on conflict(user_id) do update set revision=excluded.revision,payload=excluded.payload,updated_at=now();
 insert into public.audit_log(user_id,action) values(uid,p_action);
 insert into public.consent_records(user_id,version) values(uid,'privacy-v1') on conflict do nothing;
 return p_revision+1;
end;$$;
revoke all on function private.commit_workspace(integer,jsonb,text) from public,anon;
grant execute on function private.commit_workspace(integer,jsonb,text) to authenticated;

create or replace function private.capture_fact_history() returns trigger
language plpgsql security definer set search_path='' as $$
declare old_facts jsonb;new_facts jsonb:=coalesce(new.payload->'facts','[]'::jsonb);
begin
 if auth.uid() is null or auth.uid()<>new.user_id or not private.session_is_active() then raise exception 'AUTH';end if;
 if TG_OP='UPDATE' then old_facts:=coalesce(public.read_workspace()->'facts','[]'::jsonb);end if;
 if TG_OP='INSERT' or old_facts is distinct from new_facts then
  insert into public.fact_history(user_id,workspace_revision,kind,facts) values(new.user_id,new.revision,'change',new_facts);
 end if;
 return new;
end;$$;
revoke all on function private.capture_fact_history() from public,anon,authenticated;
-- UPDATE capture must precede projection. Actual INSERT capture must not fire on a failed upsert insert path.
drop trigger workspace_capture_facts on public.workspaces;
create trigger workspace_capture_facts before update of payload on public.workspaces for each row execute function private.capture_fact_history();
create trigger workspace_capture_initial_facts after insert on public.workspaces for each row execute function private.capture_fact_history();

create or replace function private.sync_workspace_entities() returns trigger
language plpgsql security definer set search_path='' as $$
declare canonical jsonb;
begin
 if auth.uid() is null or auth.uid()<>new.user_id or not public.session_is_active() then raise exception 'AUTH';end if;
 canonical:=public.read_workspace();
 if TG_OP='INSERT' or (canonical->'facts',canonical->'versions',canonical->'applications') is distinct from
  (coalesce(new.payload->'facts','[]'::jsonb),coalesce(new.payload->'versions','[]'::jsonb),coalesce(new.payload->'applications','[]'::jsonb)) then
  perform private.project_workspace(new.user_id,new.payload);
 end if;
 return new;
end;$$;
revoke all on function private.sync_workspace_entities() from public,anon,authenticated;

create or replace function public.apply_workspace_command(p_revision integer,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); state jsonb; action text; ids jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_command) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 action:=p_command->>'action';
 if action in ('goal','vacancy') then
  if p_command-array['action','text']<>'{}'::jsonb or jsonb_typeof(p_command->'text') is distinct from 'string'
   or (action='goal' and length(p_command->>'text')>1000)
   or (action='vacancy' and length(p_command->>'text') not between 5 and 30000) then raise exception 'INVALID_WRITE';end if;
 elsif action='verify' then
  if p_command-array['action','ids','verified']<>'{}'::jsonb or jsonb_typeof(p_command->'verified') is distinct from 'boolean'
   or jsonb_typeof(p_command->'ids') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
  ids:=p_command->'ids';
  if jsonb_array_length(ids)>500 or exists(select 1 from jsonb_array_elements(ids) i where jsonb_typeof(i)<>'string' or length(i#>>'{}') not between 1 and 100)
   or (select count(*) from jsonb_array_elements(ids))<>(select count(distinct i) from jsonb_array_elements(ids) i) then raise exception 'INVALID_WRITE';end if;
 elsif action in ('application','import','demo','fact','version','restore') then
  -- Shape, ownership of referenced IDs and limits are validated after loading the locked state.
  null;
 else raise exception 'INVALID_WRITE';end if;
 state:=private.locked_workspace(p_revision);
 if action in ('version','restore') then
  state:=private.apply_version_intent(state,p_revision,p_command);
 elsif action in ('import','demo','fact') then
  state:=private.apply_profile_intent(state,p_command);
 elsif action='application' then
  state:=private.apply_application_intent(state,p_command);
 elsif action='verify' then
  -- Missing IDs (including IDs owned by another user) fail atomically, never partially verify.
  if exists(select 1 from jsonb_array_elements_text(ids) i where not exists(select 1 from jsonb_array_elements(state->'facts') f where f->>'id'=i)) then raise exception 'INVALID_WRITE';end if;
  state:=jsonb_set(state,'{facts}',coalesce((select jsonb_agg(case when ids ? (f->>'id') then jsonb_set(f,'{verified}',p_command->'verified') else f end order by n)
   from jsonb_array_elements(state->'facts') with ordinality as facts(f,n)),'[]'::jsonb));
 else state:=jsonb_set(state,array[action],p_command->'text');end if;
 perform private.commit_workspace(p_revision,state,action);
 -- Return the exact snapshot in this transaction, not a second request that could race.
 return public.read_workspace();
end;$$;
revoke all on function public.apply_workspace_command(integer,jsonb) from public,anon;
grant execute on function public.apply_workspace_command(integer,jsonb) to authenticated;

end;
$migration$;

-- Atomic transition: no row rewrite, compatibility mirror and legacy RPC remain.
do $migration$
begin
 lock table public.workspaces,public.profile_facts,public.resume_versions,public.applications,public.application_events,public.fact_history in share row exclusive mode;
 if (private.workspace_projection_report()->'ok') is distinct from 'true'::jsonb then raise exception 'PROJECTION_CONFLICT';end if;

create or replace function private.commit_workspace(p_revision integer,p_payload jsonb,p_action text) returns integer
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();old_state jsonb;new_state jsonb:=p_payload-'revision';existed boolean;written_state jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 old_state:=private.locked_workspace(p_revision);
 perform private.validate_fact_write(old_state,new_state,p_action,p_revision);
 select exists(select 1 from public.workspaces where user_id=uid) into existed;
 -- Establish the FK parent and retain the full compatibility mirror.
 insert into public.workspaces(user_id,revision,payload) values(uid,p_revision+1,new_state)
 on conflict(user_id) do update set revision=excluded.revision,payload=excluded.payload,updated_at=now();
 -- Explicit validated argument, never reread NEW.payload or a configurable bypass flag.
 perform private.project_workspace(uid,new_state);
 if not existed or (old_state->'facts') is distinct from (new_state->'facts') then
  insert into public.fact_history(user_id,workspace_revision,kind,facts) values(uid,p_revision+1,'change',new_state->'facts');
 end if;
 insert into public.audit_log(user_id,action) values(uid,p_action);
 insert into public.consent_records(user_id,version) values(uid,'privacy-v1') on conflict do nothing;
 -- Detect inconsistent output as well as inconsistent input. Any failure rolls back every step.
 written_state:=private.locked_workspace(p_revision+1);
 if written_state is distinct from new_state then raise exception 'PROJECTION_CONFLICT';end if;
 return p_revision+1;
end;$$;
revoke all on function private.commit_workspace(integer,jsonb,text) from public,anon;
grant execute on function private.commit_workspace(integer,jsonb,text) to authenticated;

drop trigger workspace_capture_facts on public.workspaces;
drop trigger workspace_capture_initial_facts on public.workspaces;
drop trigger workspace_sync_entities on public.workspaces;
drop function private.capture_fact_history();
drop function private.sync_workspace_entities();

end;
$migration$;

-- Closed invoker helper; no client-visible endpoint or privilege elevation.
do $migration$
begin
create function private.workspace_entities(p_uid uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'facts',coalesce((select jsonb_agg(f.extra||jsonb_build_object('id',f.id,'text',f.text,'source',f.source,'verified',f.verified) order by f.position) from public.profile_facts f where f.user_id=w.user_id),'[]'),
 'versions',coalesce((select jsonb_agg(v.extra||jsonb_build_object('id',v.id,'created',v.created,'text',v.text,'vacancy',v.vacancy,'score',v.score,'evidence_ids',v.evidence_ids) order by v.position) from public.resume_versions v where v.user_id=w.user_id),'[]'),
 'applications',coalesce((select jsonb_agg(a.extra||jsonb_build_object('id',a.id,'title',a.title,'status',a.status,'note',a.note,'created',a.created,
 'events',coalesce((select jsonb_agg(e.extra||jsonb_build_object('status',e.status,'date',e.date) order by e.position) from public.application_events e where e.user_id=a.user_id and e.application_id=a.id),'[]'))
 ||case when a.version_link_present then jsonb_build_object('resumeVersionId',a.resume_version_id) else '{}'::jsonb end order by a.position) from public.applications a where a.user_id=w.user_id),'[]'))
 from public.workspaces w where w.user_id=p_uid;
$$;
revoke all on function private.workspace_entities(uuid) from public,anon,authenticated;
end;
$migration$;

-- Atomic cutover: block readers/writers before preflight; no new revision/history/audit.
do $migration$
declare preflight jsonb;
begin
 set local lock_timeout='10s';
 lock table public.workspaces,public.profile_facts,public.resume_versions,public.applications,public.application_events,public.fact_history in access exclusive mode;
 preflight:=private.workspace_projection_report();
 if (preflight->>'format') is distinct from 'jobmatch-projection-parity-v1'
  or (preflight->'ok') is distinct from 'true'::jsonb
  or exists(select 1 from public.workspaces where payload ? 'revision')
  or exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.workspaces'::regclass and not tgisinternal)
  or to_regprocedure('private.workspace_entities(uuid)') is null then raise exception 'PROJECTION_CONFLICT';end if;
create or replace function private.locked_workspace(p_revision integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); current_revision integer; mirror jsonb; canonical jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 then raise exception 'INVALID_WRITE';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision,payload into current_revision,mirror from public.workspaces where user_id=uid for update;
 if coalesce(current_revision,0)<>p_revision then raise exception 'CONFLICT';end if;
 if current_revision is null then
  return '{"original":"","goal":"","vacancy":"","facts":[],"versions":[],"applications":[]}'::jsonb;
 end if;
 canonical:=public.read_workspace();
 if canonical is null then raise exception 'AUTH';end if;
 if jsonb_typeof(mirror) is distinct from 'object' or mirror ?| array['facts','versions','applications','revision'] then raise exception 'PROJECTION_CONFLICT';end if;
 -- Detect structural corruption that JSON reconstruction could hide.
 if exists(select 1 from public.profile_facts where user_id=uid and (jsonb_typeof(extra) is distinct from 'object' or extra ?| array['id','text','source','verified']))
  or exists(select 1 from public.resume_versions where user_id=uid and (jsonb_typeof(extra) is distinct from 'object' or extra ?| array['id','created','text','vacancy','score','evidence_ids']))
  or exists(select 1 from public.applications where user_id=uid and (jsonb_typeof(extra) is distinct from 'object' or extra ?| array['id','title','status','note','created','resumeVersionId','events'] or (not version_link_present and resume_version_id is not null)))
  or exists(select 1 from public.application_events where user_id=uid and (jsonb_typeof(extra) is distinct from 'object' or extra ?| array['status','date']))
  or exists(select 1 from (
   select position,row_number() over(order by position,id) as expected from public.profile_facts where user_id=uid
   union all select position,row_number() over(order by position,id) from public.resume_versions where user_id=uid
   union all select position,row_number() over(order by position,id) from public.applications where user_id=uid
   union all select position,row_number() over(partition by application_id order by position) from public.application_events where user_id=uid
  ) positions where position<>expected) then raise exception 'PROJECTION_CONFLICT';end if;
 return '{"original":"","goal":"","vacancy":"","facts":[],"versions":[],"applications":[]}'::jsonb||(canonical-'revision');
end;$$;
revoke all on function private.locked_workspace(integer) from public,anon,authenticated;

create or replace function private.commit_workspace(p_revision integer,p_payload jsonb,p_action text) returns integer
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();old_state jsonb;new_state jsonb:=p_payload-'revision';existed boolean;written_state jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 old_state:=private.locked_workspace(p_revision);
 perform private.validate_fact_write(old_state,new_state,p_action,p_revision);
 -- Preserve the former full-snapshot byte budget after removing the physical mirror.
 if octet_length(new_state::text)>=15000000 then raise exception 'INVALID_WRITE';end if;
 select exists(select 1 from public.workspaces where user_id=uid) into existed;
 -- Establish the FK parent; persist scalars/unknown fields without entity arrays.
 insert into public.workspaces(user_id,revision,payload) values(uid,p_revision+1,new_state-array['facts','versions','applications'])
 on conflict(user_id) do update set revision=excluded.revision,payload=excluded.payload,updated_at=now();
 -- Explicit validated argument, never reread NEW.payload or a configurable bypass flag.
 perform private.project_workspace(uid,new_state);
 if not existed or (old_state->'facts') is distinct from (new_state->'facts') then
  insert into public.fact_history(user_id,workspace_revision,kind,facts) values(uid,p_revision+1,'change',new_state->'facts');
 end if;
 insert into public.audit_log(user_id,action) values(uid,p_action);
 insert into public.consent_records(user_id,version) values(uid,'privacy-v1') on conflict do nothing;
 -- Detect inconsistent output as well as inconsistent input. Any failure rolls back every step.
 written_state:=private.locked_workspace(p_revision+1);
 if written_state is distinct from new_state then raise exception 'PROJECTION_CONFLICT';end if;
 return p_revision+1;
end;$$;
revoke all on function private.commit_workspace(integer,jsonb,text) from public,anon;
grant execute on function private.commit_workspace(integer,jsonb,text) to authenticated;

create or replace function private.workspace_projection_report() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare table_name text;report jsonb;
begin
 foreach table_name in array array['public.workspaces','public.profile_facts','public.resume_versions','public.applications','public.application_events'] loop
  if not has_table_privilege(current_user,table_name,'SELECT') or row_security_active(table_name::regclass) then raise exception 'PARITY_SCOPE';end if;
 end loop;
 with positions as (
  select position,row_number() over(partition by user_id order by position,id) as expected from public.profile_facts
  union all select position,row_number() over(partition by user_id order by position,id) from public.resume_versions
  union all select position,row_number() over(partition by user_id order by position,id) from public.applications
  union all select position,row_number() over(partition by user_id,application_id order by position) from public.application_events
 ), extras as (
  select jsonb_typeof(extra) is distinct from 'object' or extra ?| array['id','text','source','verified'] as bad from public.profile_facts
  union all select jsonb_typeof(extra) is distinct from 'object' or extra ?| array['id','created','text','vacancy','score','evidence_ids'] from public.resume_versions
  union all select jsonb_typeof(extra) is distinct from 'object' or extra ?| array['id','title','status','note','created','resumeVersionId','events'] from public.applications
  union all select jsonb_typeof(extra) is distinct from 'object' or extra ?| array['status','date'] from public.application_events
 ), orphans as (
  select 1 from public.profile_facts f where not exists(select 1 from public.workspaces w where w.user_id=f.user_id)
  union all select 1 from public.resume_versions v where not exists(select 1 from public.workspaces w where w.user_id=v.user_id)
  union all select 1 from public.applications a where not exists(select 1 from public.workspaces w where w.user_id=a.user_id)
  union all select 1 from public.application_events e where not exists(select 1 from public.applications a where a.user_id=e.user_id and a.id=e.application_id)
 )
 select jsonb_build_object('format','jobmatch-workspace-storage-v2','checked',jsonb_build_object(
  'workspaces',(select count(*) from public.workspaces),'profile_facts',(select count(*) from public.profile_facts),
  'resume_versions',(select count(*) from public.resume_versions),'applications',(select count(*) from public.applications),'application_events',(select count(*) from public.application_events)),
  'mismatches',jsonb_build_object(
   'guard_rows',case when exists(select 1 from pg_catalog.pg_constraint where conrelid='public.workspaces'::regclass and conname='workspace_compact_payload' and contype='c' and convalidated) then 0 else 1 end,
   'payload_rows',(select count(*) from public.workspaces where jsonb_typeof(payload) is distinct from 'object' or payload ?| array['facts','versions','applications','revision']),
   'position_rows',(select count(*) from positions where position<>expected),'extra_rows',(select count(*) from extras where bad),
   'orphan_rows',(select count(*) from orphans),'link_rows',(select count(*) from public.applications a where (not a.version_link_present and a.resume_version_id is not null)
    or (a.resume_version_id is not null and not exists(select 1 from public.resume_versions v where v.user_id=a.user_id and v.id=a.resume_version_id))))) into report;
 return report||jsonb_build_object('ok',not exists(select 1 from jsonb_each_text(report->'mismatches') m where m.value::bigint<>0));
end;$$;
revoke all on function private.workspace_projection_report() from public,anon,authenticated;

 update public.workspaces set payload=payload-array['facts','versions','applications'];
 alter table public.workspaces add constraint workspace_compact_payload check(
  jsonb_typeof(payload)='object' and not (payload ?| array['facts','versions','applications','revision']));

 if (private.workspace_projection_report()->'ok') is distinct from 'true'::jsonb then raise exception 'PROJECTION_CONFLICT';end if;
end;
$migration$;
-- Independent derived profile; existing workspace/version write contracts stay intact.
create table public.structured_profiles(
 user_id uuid primary key references public.workspaces(user_id) on delete cascade,
 revision integer not null check(revision>0),
 source_workspace_revision integer not null check(source_workspace_revision>=0),
 source_original text not null check(length(source_original)<=100000),
 source_fact_ids jsonb not null check(jsonb_typeof(source_fact_ids)='array')
);
create table public.structured_profile_entries(
 user_id uuid not null references public.structured_profiles(user_id) on delete cascade,
 id uuid not null default gen_random_uuid(),
 kind text not null check(kind in ('employment','education','certification','achievement')),
 fields jsonb not null check(jsonb_typeof(fields)='object'),
 confirmed boolean not null default false,
 created timestamptz not null default now(),
 primary key(user_id,id)
);
alter table public.structured_profiles enable row level security;
alter table public.structured_profile_entries enable row level security;
revoke all on public.structured_profiles,public.structured_profile_entries from public,anon,authenticated;
grant select on public.structured_profiles,public.structured_profile_entries to authenticated;
create policy owner_read on public.structured_profiles for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));
create policy owner_read on public.structured_profile_entries for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));

create function public.read_structured_profile() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();state jsonb;profile public.structured_profiles%rowtype;fact_ids jsonb;entries jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 state:=public.read_workspace();
 fact_ids:=coalesce((select jsonb_agg(value->'id' order by n) from jsonb_array_elements(coalesce(state->'facts','[]'::jsonb)) with ordinality f(value,n)),'[]'::jsonb);
 select * into profile from public.structured_profiles where user_id=uid;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'fields',fields,'confirmed',confirmed,'created',created) order by created,id),'[]'::jsonb)
 into entries from public.structured_profile_entries where user_id=uid;
 return jsonb_build_object('format','jobmatch-structured-profile-v1','ownerId',uid,
  'revision',coalesce(profile.revision,0),'workspace_revision',coalesce((state->>'revision')::integer,0),
  'source_workspace_revision',coalesce(profile.source_workspace_revision,(state->>'revision')::integer,0),
  'source_original',coalesce(profile.source_original,state->>'original',''),
  'source_fact_ids',coalesce(profile.source_fact_ids,fact_ids),
  'source_matches',profile.user_id is null or (profile.source_original=state->>'original' and profile.source_fact_ids=fact_ids),
  'entries',entries);
end;$$;
revoke all on function public.read_structured_profile() from public,anon;
grant execute on function public.read_structured_profile() to authenticated;

create function public.command_structured_profile(p_workspace_revision integer,p_profile_revision integer,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();state jsonb;profile public.structured_profiles%rowtype;action text;fact_ids jsonb;current_source boolean;item jsonb;field_name text;start_at integer;end_at integer;quote text;record_id uuid;confirmed_value boolean;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_profile_revision is null or p_profile_revision<0 or jsonb_typeof(p_command) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 -- Same lock/order as all command/legacy workspace writers; source cannot race import.
 state:=private.locked_workspace(p_workspace_revision);
 if private.trim_fact_line(coalesce(state->>'original',''))='' or jsonb_array_length(state->'facts')=0 then raise exception 'INVALID_WRITE';end if;
 fact_ids:=coalesce((select jsonb_agg(value->'id' order by n) from jsonb_array_elements(state->'facts') with ordinality f(value,n)),'[]'::jsonb);
 select * into profile from public.structured_profiles where user_id=uid for update;
 if coalesce(profile.revision,0)<>p_profile_revision then raise exception 'CONFLICT';end if;
 current_source:=profile.user_id is null or (profile.source_original=state->>'original' and profile.source_fact_ids=fact_ids);
 action:=p_command->>'action';
 if action='add' then
  if not current_source then raise exception 'CONFLICT';end if;
  if p_command-array['action','kind','fields']<>'{}'::jsonb or jsonb_typeof(p_command->'kind') is distinct from 'string'
   or p_command->>'kind' not in ('employment','education','certification','achievement') or jsonb_typeof(p_command->'fields') is distinct from 'object'
   or (p_command->'fields')-array['title','organization','start','end','description','credential']<>'{}'::jsonb
   or not (p_command->'fields' ? (case when p_command->>'kind'='achievement' then 'description' else 'title' end))
   or (p_command->'fields' ? 'credential' and p_command->>'kind'<>'certification') then raise exception 'INVALID_WRITE';end if;
  for field_name,item in select key,value from jsonb_each(p_command->'fields') loop
   if jsonb_typeof(item) is distinct from 'object' or item-array['quote','start','end']<>'{}'::jsonb
    or jsonb_typeof(item->'quote') is distinct from 'string' or length(item->>'quote') not between 1 and 500 or private.trim_fact_line(item->>'quote')=''
    or jsonb_typeof(item->'start') is distinct from 'number' or coalesce(item->>'start','') !~ '^(0|[1-9][0-9]{0,5})$'
    or jsonb_typeof(item->'end') is distinct from 'number' or coalesce(item->>'end','') !~ '^[1-9][0-9]{0,5}$' then raise exception 'INVALID_WRITE';end if;
   start_at:=(item->>'start')::integer;end_at:=(item->>'end')::integer;quote:=item->>'quote';
   if start_at>=end_at or end_at>length(state->>'original') or end_at-start_at<>length(quote)
    or substring(state->>'original' from start_at+1 for end_at-start_at)<>quote then raise exception 'INVALID_WRITE';end if;
  end loop;
  if (select count(*) from public.structured_profile_entries where user_id=uid)>=50 then raise exception 'INVALID_WRITE';end if;
 elsif action in ('delete','confirm') then
  if p_command-(case when action='confirm' then array['action','id','confirmed'] else array['action','id'] end)<>'{}'::jsonb
   or jsonb_typeof(p_command->'id') is distinct from 'string' then raise exception 'INVALID_WRITE';end if;
  begin record_id:=(p_command->>'id')::uuid;exception when invalid_text_representation then raise exception 'INVALID_WRITE';end;
  if not exists(select 1 from public.structured_profile_entries where user_id=uid and id=record_id) then raise exception 'INVALID_WRITE';end if;
  if action='confirm' then
   if jsonb_typeof(p_command->'confirmed') is distinct from 'boolean' then raise exception 'INVALID_WRITE';end if;
   confirmed_value:=(p_command->>'confirmed')::boolean;
   if confirmed_value and not current_source then raise exception 'CONFLICT';end if;
  end if;
 elsif action='reset' then
  if p_command-array['action','confirm']<>'{}'::jsonb or p_command->>'confirm' is distinct from 'RESET_STRUCTURED_PROFILE' then raise exception 'INVALID_WRITE';end if;
 else raise exception 'INVALID_WRITE';end if;
 -- New IDs, timestamps, source and confirmation are server-owned.
 insert into public.structured_profiles(user_id,revision,source_workspace_revision,source_original,source_fact_ids)
 values(uid,1,p_workspace_revision,state->>'original',fact_ids)
 on conflict(user_id) do update set revision=public.structured_profiles.revision+1;
 if action='reset' then
  delete from public.structured_profile_entries where user_id=uid;
  update public.structured_profiles set source_workspace_revision=p_workspace_revision,source_original=state->>'original',source_fact_ids=fact_ids where user_id=uid;
 elsif action='add' then
  insert into public.structured_profile_entries(user_id,kind,fields) values(uid,p_command->>'kind',p_command->'fields');
 elsif action='delete' then
  delete from public.structured_profile_entries where user_id=uid and id=record_id;
 else
  update public.structured_profile_entries set confirmed=confirmed_value where user_id=uid and id=record_id;
 end if;
 insert into public.audit_log(user_id,action) values(uid,'structured_'||action);
 return public.read_structured_profile();
end;$$;
revoke all on function public.command_structured_profile(integer,integer,jsonb) from public,anon;
grant execute on function public.command_structured_profile(integer,integer,jsonb) to authenticated;
-- Immutable, literal versions; no model inference and no master workspace mutation.
create table public.structured_resume_versions(
 user_id uuid not null references public.workspaces(user_id) on delete cascade,
 id uuid not null default gen_random_uuid(),created timestamptz not null default now(),
 profile_revision integer not null check(profile_revision>0),workspace_revision integer not null check(workspace_revision>=0),
 template_version text not null check(template_version='structured-literal-v1'),
 preview_hash text not null check(preview_hash ~ '^[0-9a-f]{64}$'),
 text text not null check(length(text) between 1 and 200000),snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 primary key(user_id,id),unique(user_id,preview_hash)
);
alter table public.structured_resume_versions enable row level security;
revoke all on public.structured_resume_versions from public,anon,authenticated;
grant select on public.structured_resume_versions to authenticated;
create policy owner_read on public.structured_resume_versions for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));
create function private.immutable_structured_version() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'IMMUTABLE_VERSION';end;$$;
revoke all on function private.immutable_structured_version() from public,anon,authenticated;
create trigger immutable_version before update on public.structured_resume_versions for each row execute function private.immutable_structured_version();

create function private.structured_preview(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();state jsonb;profile jsonb;selected jsonb;entry jsonb;field jsonb;name text;source text;body text:='Структурированные сведения'||E'\n\n';section text;prefix text;suffix text;context text;left_at integer;right_at integer;pos integer;parts text[];part text;material bytea:=''::bytea;first boolean:=true;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 -- The same owner/workspace lock as import, legacy writes and profile commands.
 state:=private.locked_workspace(p_workspace_revision);
 perform 1 from public.structured_profiles where user_id=uid for update;
 profile:=public.read_structured_profile();
 if p_profile_revision is null or p_profile_revision<1 or (profile->>'revision')::integer<>p_profile_revision or not (profile->>'source_matches')::boolean then raise exception 'CONFLICT';end if;
 if p_entry_ids is null or cardinality(p_entry_ids) not between 1 and 50 or array_ndims(p_entry_ids)<>1 or array_position(p_entry_ids,null) is not null or (select count(distinct id) from unnest(p_entry_ids) id)<>cardinality(p_entry_ids) then raise exception 'INVALID_WRITE';end if;
 select jsonb_agg(value order by n) into selected from jsonb_array_elements(profile->'entries') with ordinality e(value,n) where (value->>'id')::uuid=any(p_entry_ids);
 if coalesce(jsonb_array_length(selected),0)<>cardinality(p_entry_ids) or exists(select 1 from jsonb_array_elements(selected) e where e->>'confirmed' is distinct from 'true') then raise exception 'INVALID_WRITE';end if;
 source:=profile->>'source_original';
 if private.trim_fact_line(source)='' or jsonb_array_length(profile->'source_fact_ids')=0 then raise exception 'INVALID_WRITE';end if;
 for entry in select value from jsonb_array_elements(selected) loop
  section:=case entry->>'kind' when 'employment' then 'Работа' when 'education' then 'Образование' when 'certification' then 'Сертификат' when 'achievement' then 'Достижение' else null end;
  if section is null then raise exception 'INVALID_WRITE';end if;
  foreach name in array array['title','organization','start','end','description','credential'] loop
   field:=entry->'fields'->name;
   if field is not null then
    if jsonb_typeof(field) is distinct from 'object' or (field->>'start')::integer<0 or (field->>'end')::integer>(length(source)) or (field->>'end')::integer<=(field->>'start')::integer or substring(source from (field->>'start')::integer+1 for (field->>'end')::integer-(field->>'start')::integer) is distinct from field->>'quote' then raise exception 'INVALID_WRITE';end if;
    prefix:=substring(source from 1 for (field->>'start')::integer);suffix:=substring(source from (field->>'end')::integer+1);
    pos:=strpos(reverse(prefix),E'\n');left_at:=case when pos>0 then length(prefix)-pos+2 else 1 end;
    pos:=strpos(suffix,E'\n');right_at:=case when pos>0 then (field->>'end')::integer+pos else length(source)+1 end;
    context:=substring(source from left_at for right_at-left_at);
    if context ~* '(^|[^[:alpha:]])(не|нет|без|никогда|изучаю|планирую|хочу|буду|собираюсь|no|not|never|cannot|can.t|don.t|doesn.t|didn.t|haven.t|hasn.t|wasn.t|weren.t|without|learning|studying|planning)([^[:alpha:]]|$)|ignore|system prompt|игнорир|инструкци|<script|plan to|want to learn|will learn' then raise exception 'UNSAFE_CONTEXT';end if;
    section:=section||E'\n'||case name when 'title' then 'Название' when 'organization' then 'Организация' when 'start' then 'Начало / дата выдачи' when 'end' then 'Окончание' when 'description' then 'Описание' else 'Номер сертификата' end||': '||(field->>'quote');
   end if;
  end loop;
  if body<>'Структурированные сведения'||E'\n\n' then body:=body||E'\n\n';end if;
  body:=body||section;
 end loop;
 if length(body)>200000 then raise exception 'INVALID_WRITE';end if;
 profile:=jsonb_set(profile,'{entries}',selected);
 parts:=array['structured-literal-v1','line-risk-v1','literal-template','null',profile->>'format',profile->>'ownerId',profile->>'revision',profile->>'workspace_revision',profile->>'source_workspace_revision',jsonb_array_length(profile->'source_fact_ids')::text]||(select array_agg(value order by n) from jsonb_array_elements_text(profile->'source_fact_ids') with ordinality f(value,n))||array[source,'true',body];
 for entry in select value from jsonb_array_elements(selected) loop
  parts:=parts||array[entry->>'id',entry->>'kind',entry->>'created','true'];
  foreach name in array array['title','organization','start','end','description','credential'] loop
   field:=entry->'fields'->name;parts:=parts||array[name,coalesce(field->>'start',''),coalesce(field->>'end',''),coalesce(field->>'quote','')];
  end loop;
 end loop;
 foreach part in array parts loop
  if not first then material:=material||'\x00'::bytea;end if;
  first:=false;material:=material||convert_to(part,'UTF8');
 end loop;
 return jsonb_build_object('template_version','structured-literal-v1','context_guard_version','line-risk-v1','generator','literal-template','model_version',null,'snapshot',profile,'text',body,'preview_hash',encode(sha256(material),'hex'));
end;$$;
revoke all on function private.structured_preview(integer,integer,uuid[]) from public,anon,authenticated;
create function public.preview_structured_version(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[]) returns jsonb
language sql security definer set search_path='' as $$select private.structured_preview(p_workspace_revision,p_profile_revision,p_entry_ids);$$;
revoke all on function public.preview_structured_version(integer,integer,uuid[]) from public,anon;
grant execute on function public.preview_structured_version(integer,integer,uuid[]) to authenticated;

create function private.structured_version_json(v public.structured_resume_versions) returns jsonb
language sql stable set search_path='' as $$select jsonb_build_object('format','jobmatch-structured-version-v1','id',v.id,'created',v.created,'template_version',v.template_version,'context_guard_version','line-risk-v1','generator','literal-template','model_version',null,'snapshot',v.snapshot,'text',v.text,'preview_hash',v.preview_hash);$$;
revoke all on function private.structured_version_json(public.structured_resume_versions) from public,anon,authenticated;
create function public.save_structured_version(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[],p_preview_hash text,p_accept text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();preview jsonb;v public.structured_resume_versions%rowtype;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_accept is distinct from 'SAVE_LITERAL_VERSION' or p_preview_hash is null or p_preview_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_WRITE';end if;
 preview:=private.structured_preview(p_workspace_revision,p_profile_revision,p_entry_ids);
 if preview->>'preview_hash'<>p_preview_hash then raise exception 'CONFLICT';end if;
 select * into v from public.structured_resume_versions where user_id=uid and preview_hash=p_preview_hash;
 if found then return private.structured_version_json(v);end if;
 if (select count(*) from public.structured_resume_versions where user_id=uid)>=20 then raise exception 'INVALID_WRITE';end if;
 insert into public.structured_resume_versions(user_id,profile_revision,workspace_revision,template_version,preview_hash,text,snapshot)
 values(uid,p_profile_revision,p_workspace_revision,preview->>'template_version',p_preview_hash,preview->>'text',preview->'snapshot') returning * into v;
 insert into public.audit_log(user_id,action) values(uid,'structured_version_save');
 return private.structured_version_json(v);
end;$$;
revoke all on function public.save_structured_version(integer,integer,uuid[],text,text) from public,anon;
grant execute on function public.save_structured_version(integer,integer,uuid[],text,text) to authenticated;
create function public.read_structured_version(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();v public.structured_resume_versions%rowtype;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 select * into v from public.structured_resume_versions where user_id=uid and id=p_id;
 if not found then return null;end if;return private.structured_version_json(v);
end;$$;
create function public.list_structured_versions() returns jsonb
language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();rows jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if (select count(*) from public.structured_resume_versions where user_id=uid)>20 then raise exception 'INVALID_WRITE';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'created',created,'template_version',template_version,'profile_revision',profile_revision,'workspace_revision',workspace_revision,'text_length',length(text),'preview_hash',preview_hash) order by created desc,id),'[]'::jsonb) into rows from public.structured_resume_versions where user_id=uid;
 return jsonb_build_object('format','jobmatch-structured-version-list-v1','ownerId',uid,'versions',rows);
end;$$;
revoke all on function public.read_structured_version(uuid),public.list_structured_versions() from public,anon;
grant execute on function public.read_structured_version(uuid),public.list_structured_versions() to authenticated;
-- Saved in-app tasks. No scheduler, email, push subscription or delivery claim.
create table public.reminder_boards(user_id uuid primary key references public.workspaces(user_id) on delete cascade,revision integer not null check(revision>0));
create table public.reminders(
 user_id uuid not null references public.reminder_boards(user_id) on delete cascade,id uuid not null default gen_random_uuid(),
 application_id text not null,title text not null check(length(title) between 1 and 200),description text not null check(length(description)<=1000),
 due_local text not null,time_zone text not null,offset_minutes integer not null check(offset_minutes between -840 and 840),due_at timestamptz not null,
 minutes integer not null check(minutes in(15,30,60,90)),status text not null check(status in('pending','completed','cancelled')),
 created timestamptz not null default now(),updated timestamptz not null default now(),primary key(user_id,id),
 foreign key(user_id,application_id) references public.applications(user_id,id) on delete cascade
);
create table public.reminder_events(
 user_id uuid not null,reminder_id uuid not null,sequence integer not null check(sequence between 1 and 50),action text not null check(action in('create','update','complete','cancel')),
 at timestamptz not null default now(),snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),primary key(user_id,reminder_id,sequence),
 foreign key(user_id,reminder_id) references public.reminders(user_id,id) on delete cascade
);
do $$declare t text;begin
 foreach t in array array['reminder_boards','reminders','reminder_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy owner_read on public.%I for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()))',t);
 end loop;
end;$$;
create function private.reminder_json(r public.reminders,p_count integer) returns jsonb
language sql stable set search_path='' set timezone='UTC' as $$select jsonb_build_object('id',r.id,'applicationId',r.application_id,'title',r.title,'description',r.description,'dueLocal',r.due_local,'timeZone',r.time_zone,'offsetMinutes',r.offset_minutes,'dueAt',r.due_at,'minutes',r.minutes,'status',r.status,'created',r.created,'updated',r.updated,'eventCount',p_count);$$;
revoke all on function private.reminder_json(public.reminders,integer) from public,anon,authenticated;
create function public.read_reminders() returns jsonb
language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();state jsonb;revision integer;rows jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 state:=public.read_workspace();select b.revision into revision from public.reminder_boards b where user_id=uid;
 if (select count(*) from public.reminders where user_id=uid)>100 then raise exception 'INVALID_WRITE';end if;
 select coalesce(jsonb_agg(private.reminder_json(r,(select count(*)::integer from public.reminder_events e where e.user_id=uid and e.reminder_id=r.id)) order by r.due_at,r.id),'[]'::jsonb) into rows from public.reminders r where user_id=uid;
 return jsonb_build_object('format','jobmatch-reminders-v1','ownerId',uid,'revision',coalesce(revision,0),'workspace_revision',coalesce((state->>'revision')::integer,0),'server_now',statement_timestamp(),'reminders',rows);
end;$$;
create function public.read_reminder_history(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();r public.reminders%rowtype;events jsonb;n integer;revision integer;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 select * into r from public.reminders where user_id=uid and id=p_id;if not found then return null;end if;
 select count(*)::integer,jsonb_agg(jsonb_build_object('sequence',sequence,'action',action,'at',at,'snapshot',snapshot) order by sequence) into n,events from public.reminder_events where user_id=uid and reminder_id=p_id;
 if n not between 1 and 50 then raise exception 'INVALID_WRITE';end if;
 select b.revision into revision from public.reminder_boards b where user_id=uid;
 return jsonb_build_object('format','jobmatch-reminder-history-v1','ownerId',uid,'revision',revision,'reminder',private.reminder_json(r,n),'events',events);
end;$$;
revoke all on function public.read_reminders(),public.read_reminder_history(uuid) from public,anon;
grant execute on function public.read_reminders(),public.read_reminder_history(uuid) to authenticated;
create function public.command_reminder(p_workspace_revision integer,p_revision integer,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();state jsonb;revision integer;action text;rid uuid;r public.reminders%rowtype;n integer;v_title text;v_description text;v_zone text;v_local text;v_due timestamptz;v_offset integer;v_minutes integer;now_at timestamptz:=clock_timestamp();app_id text;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_command) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 state:=private.locked_workspace(p_workspace_revision);
 select b.revision into revision from public.reminder_boards b where user_id=uid for update;
 if coalesce(revision,0)<>p_revision then raise exception 'CONFLICT';end if;
 action:=p_command->>'action';
 if action not in('create','update','complete','cancel','delete') or action is null then raise exception 'INVALID_WRITE';end if;
 if action<>'create' then
  if jsonb_typeof(p_command->'id') is distinct from 'string' then raise exception 'INVALID_WRITE';end if;
  begin rid:=(p_command->>'id')::uuid;exception when invalid_text_representation then raise exception 'INVALID_WRITE';end;
  select * into r from public.reminders where user_id=uid and id=rid for update;if not found then raise exception 'INVALID_WRITE';end if;
  select count(*)::integer into n from public.reminder_events where user_id=uid and reminder_id=rid;
 end if;
 if action in('create','update') then
  if p_command-(case when action='create' then array['action','applicationId','title','description','dueLocal','timeZone','offsetMinutes','dueAt','minutes','accept'] else array['action','id','title','description','dueLocal','timeZone','offsetMinutes','dueAt','minutes','accept'] end)<>'{}'::jsonb
   or p_command->>'accept' is distinct from 'SAVE_REMINDER'
   or jsonb_typeof(p_command->'title') is distinct from 'string' or length(p_command->>'title') not between 1 and 200 or private.trim_fact_line(p_command->>'title')=''
   or jsonb_typeof(p_command->'description') is distinct from 'string' or length(p_command->>'description')>1000
   or jsonb_typeof(p_command->'dueLocal') is distinct from 'string' or (p_command->>'dueLocal') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$'
   or jsonb_typeof(p_command->'dueAt') is distinct from 'string' or (p_command->>'dueAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:00.000Z$'
   or jsonb_typeof(p_command->'timeZone') is distinct from 'string' or length(p_command->>'timeZone')>100 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_command->>'timeZone')
   or jsonb_typeof(p_command->'offsetMinutes') is distinct from 'number' or (p_command->>'offsetMinutes') !~ '^-?(0|[1-9][0-9]{0,2})$'
   or jsonb_typeof(p_command->'minutes') is distinct from 'number' or p_command->>'minutes' not in('15','30','60','90') then raise exception 'INVALID_WRITE';end if;
  v_title:=p_command->>'title';v_description:=p_command->>'description';v_zone:=p_command->>'timeZone';v_local:=p_command->>'dueLocal';v_offset:=(p_command->>'offsetMinutes')::integer;v_minutes:=(p_command->>'minutes')::integer;
  begin v_due:=(p_command->>'dueAt')::timestamptz;exception when others then raise exception 'INVALID_WRITE';end;
  if v_offset not between -840 and 840 or to_char(v_due at time zone v_zone,'YYYY-MM-DD"T"HH24:MI')<>v_local or extract(epoch from((v_due at time zone v_zone)-(v_due at time zone 'UTC')))/60<>v_offset then raise exception 'INVALID_WRITE';end if;
  if action='create' then
   if jsonb_typeof(p_command->'applicationId') is distinct from 'string' then raise exception 'INVALID_WRITE';end if;
   app_id:=p_command->>'applicationId';if not exists(select 1 from public.applications where user_id=uid and id=app_id) or (select count(*) from public.reminders where user_id=uid)>=100 then raise exception 'INVALID_WRITE';end if;
  elsif r.status<>'pending' or n>=49 then raise exception 'INVALID_WRITE';end if;
 elsif action='delete' then
  if p_command-array['action','id','accept']<>'{}'::jsonb or p_command->>'accept' is distinct from 'DELETE_REMINDER' then raise exception 'INVALID_WRITE';end if;
 else
  if p_command-array['action','id']<>'{}'::jsonb or r.status<>'pending' or n>=50 then raise exception 'INVALID_WRITE';end if;
 end if;
 now_at:=clock_timestamp();if action<>'create' and now_at<r.updated then raise exception 'INVALID_WRITE';end if;
 insert into public.reminder_boards(user_id,revision) values(uid,1) on conflict(user_id) do update set revision=public.reminder_boards.revision+1;
 if action='create' then
  insert into public.reminders(user_id,application_id,title,description,due_local,time_zone,offset_minutes,due_at,minutes,status,created,updated)
  values(uid,app_id,v_title,v_description,v_local,v_zone,v_offset,v_due,v_minutes,'pending',now_at,now_at) returning * into r;n:=0;
 elsif action='update' then
  update public.reminders set title=v_title,description=v_description,due_local=v_local,time_zone=v_zone,offset_minutes=v_offset,due_at=v_due,minutes=v_minutes,updated=now_at where user_id=uid and id=rid returning * into r;
 elsif action='delete' then delete from public.reminders where user_id=uid and id=rid;
 else update public.reminders set status=case action when 'complete' then 'completed' else 'cancelled' end,updated=now_at where user_id=uid and id=rid returning * into r;
 end if;
 if action<>'delete' then insert into public.reminder_events(user_id,reminder_id,sequence,action,at,snapshot) values(uid,r.id,n+1,action,now_at,private.reminder_json(r,n+1));end if;
 insert into public.audit_log(user_id,action) values(uid,'reminder_'||action);
 return public.read_reminders();
end;$$;
revoke all on function public.command_reminder(integer,integer,jsonb) from public,anon;
grant execute on function public.command_reminder(integer,integer,jsonb) to authenticated;

-- Opt-in server-signed pre-auth quota. No production secret is seeded here.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$begin
 if not exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto' and n.nspname='extensions') then
  raise exception 'AUTH_QUOTA_REQUIRES_PGCRYPTO_IN_EXTENSIONS';
 end if;
end$$;
create table private.auth_quota_config (
 singleton boolean primary key default true check(singleton),
 signing_key bytea not null check(octet_length(signing_key)=32)
);
create table private.auth_quotas (
 scope text not null check(scope in ('credentials','mail','refresh','exchange','update')),
 subject text not null check(subject='*' or subject ~ '^[a-f0-9]{64}$'),
 bucket bigint not null,
 count integer not null check(count between 1 and 120),
 primary key(scope,subject,bucket)
);
create index auth_quotas_expiry on private.auth_quotas(bucket);
alter table private.auth_quota_config enable row level security;
alter table private.auth_quotas enable row level security;
revoke all on private.auth_quota_config,private.auth_quotas from public,anon,authenticated;

-- uid is intentionally not required: login/mail occur before there is a session.
-- HMAC authorizes only charging fixed budgets, never Auth/PII reads or writes.
create function public.consume_auth_quota(p_scope text,p_subject text,p_timestamp bigint,p_signature text) returns boolean
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare key bytea; expected bytea; current_seconds bigint; current_bucket bigint; global_max integer; subject_max integer; charged integer;
begin
 current_seconds:=floor(extract(epoch from clock_timestamp()));
 if p_scope is null or p_scope not in ('credentials','mail','refresh','exchange','update')
  or p_subject is null or p_subject !~ '^[a-f0-9]{64}$'
  or p_signature is null or p_signature !~ '^[a-f0-9]{64}$'
  or p_timestamp is null or p_timestamp<current_seconds-30 or p_timestamp>current_seconds+5 then raise exception 'AUTH_QUOTA_DENIED';end if;
 select signing_key into key from private.auth_quota_config where singleton;
 if key is null then raise exception 'AUTH_QUOTA_DENIED';end if;
 expected:=extensions.hmac(convert_to('jobmatch-auth-quota-v1'||chr(10)||p_scope||chr(10)||p_subject||chr(10)||p_timestamp::text,'UTF8'),key,'sha256');
 -- Compare keyed digests so bytea equality cannot reveal a prefix of expected MAC.
 if extensions.hmac(decode(p_signature,'hex'),key,'sha256')<>extensions.hmac(expected,key,'sha256') then raise exception 'AUTH_QUOTA_DENIED';end if;
 global_max:=case p_scope when 'credentials' then 120 when 'refresh' then 120 when 'exchange' then 60 else 30 end;
 subject_max:=case p_scope when 'credentials' then 10 when 'refresh' then 10 when 'mail' then 3 else 5 end;
 current_bucket:=floor(extract(epoch from clock_timestamp())/60);
 -- Bounded lazy expiry only after authentication. No raw identifiers are stored.
 delete from private.auth_quotas q using (select scope,subject,bucket from private.auth_quotas where bucket<current_bucket-1440 order by bucket limit 200) old
 where q.scope=old.scope and q.subject=old.subject and q.bucket=old.bucket;
 -- All instances acquire the global row first. Denied subjects still charge this budget.
 insert into private.auth_quotas values(p_scope,'*',current_bucket,1)
 on conflict(scope,subject,bucket) do update set count=private.auth_quotas.count+1 where private.auth_quotas.count<global_max returning count into charged;
 if charged is null then return false;end if;
 charged:=null;
 insert into private.auth_quotas values(p_scope,p_subject,current_bucket,1)
 on conflict(scope,subject,bucket) do update set count=private.auth_quotas.count+1 where private.auth_quotas.count<subject_max returning count into charged;
 return charged is not null;
end;$$;
revoke all on function public.consume_auth_quota(text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.consume_auth_quota(text,text,bigint,text) to anon,authenticated;

-- Aggregate outcomes only. No identity, pseudonym, signature or key column.
create table private.auth_quota_outcomes (
 scope text not null check(scope in ('credentials','mail','refresh','exchange','update')),
 bucket bigint not null,
 allowed bigint not null default 0 check(allowed between 0 and 9007199254740991),
 denied_global bigint not null default 0 check(denied_global between 0 and 9007199254740991),
 denied_subject bigint not null default 0 check(denied_subject between 0 and 9007199254740991),
 primary key(scope,bucket)
);
create index auth_quota_outcomes_expiry on private.auth_quota_outcomes(bucket);
alter table private.auth_quota_outcomes enable row level security;
revoke all on private.auth_quota_outcomes from public,anon,authenticated;
create function private.record_auth_quota_outcome(p_scope text,p_bucket bigint,p_result text) returns void
language plpgsql security invoker set search_path='' as $$begin
 if p_result is null or p_result not in ('allowed','global','subject') then raise exception 'AUTH_QUOTA_OUTCOME_INVALID';end if;
 insert into private.auth_quota_outcomes(scope,bucket,allowed,denied_global,denied_subject)
 values(p_scope,p_bucket,(p_result='allowed')::int,(p_result='global')::int,(p_result='subject')::int)
 on conflict(scope,bucket) do update set
 allowed=least(9007199254740991,private.auth_quota_outcomes.allowed+excluded.allowed),
 denied_global=least(9007199254740991,private.auth_quota_outcomes.denied_global+excluded.denied_global),
 denied_subject=least(9007199254740991,private.auth_quota_outcomes.denied_subject+excluded.denied_subject);
end$$;
revoke all on function private.record_auth_quota_outcome(text,bigint,text) from public,anon,authenticated;

create or replace function public.consume_auth_quota(p_scope text,p_subject text,p_timestamp bigint,p_signature text) returns boolean
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare key bytea; expected bytea; current_seconds bigint; current_bucket bigint; global_max integer; subject_max integer; charged integer;
begin
 current_seconds:=floor(extract(epoch from clock_timestamp()));
 if p_scope is null or p_scope not in ('credentials','mail','refresh','exchange','update')
  or p_subject is null or p_subject !~ '^[a-f0-9]{64}$'
  or p_signature is null or p_signature !~ '^[a-f0-9]{64}$'
  or p_timestamp is null or p_timestamp<current_seconds-30 or p_timestamp>current_seconds+5 then raise exception 'AUTH_QUOTA_DENIED';end if;
 select signing_key into key from private.auth_quota_config where singleton;
 if key is null then raise exception 'AUTH_QUOTA_DENIED';end if;
 expected:=extensions.hmac(convert_to('jobmatch-auth-quota-v1'||chr(10)||p_scope||chr(10)||p_subject||chr(10)||p_timestamp::text,'UTF8'),key,'sha256');
 -- Compare keyed digests so bytea equality cannot reveal a prefix of expected MAC.
 if extensions.hmac(decode(p_signature,'hex'),key,'sha256')<>extensions.hmac(expected,key,'sha256') then raise exception 'AUTH_QUOTA_DENIED';end if;
 global_max:=case p_scope when 'credentials' then 120 when 'refresh' then 120 when 'exchange' then 60 else 30 end;
 subject_max:=case p_scope when 'credentials' then 10 when 'refresh' then 10 when 'mail' then 3 else 5 end;
 current_bucket:=floor(extract(epoch from clock_timestamp())/60);
 -- Bounded lazy expiry only after authentication. No raw identifiers are stored.
 delete from private.auth_quotas q using (select scope,subject,bucket from private.auth_quotas where bucket<current_bucket-1440 order by bucket limit 200) old
 where q.scope=old.scope and q.subject=old.subject and q.bucket=old.bucket;
 -- All instances acquire the global row first. Denied subjects still charge this budget.
 insert into private.auth_quotas values(p_scope,'*',current_bucket,1)
 on conflict(scope,subject,bucket) do update set count=private.auth_quotas.count+1 where private.auth_quotas.count<global_max returning count into charged;
 if charged is null then perform private.record_auth_quota_outcome(p_scope,current_bucket,'global');return false;end if;
 charged:=null;
 insert into private.auth_quotas values(p_scope,p_subject,current_bucket,1)
 on conflict(scope,subject,bucket) do update set count=private.auth_quotas.count+1 where private.auth_quotas.count<subject_max returning count into charged;
 perform private.record_auth_quota_outcome(p_scope,current_bucket,case when charged is null then 'subject' else 'allowed' end);
 return charged is not null;
end;$$;
revoke all on function public.consume_auth_quota(text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.consume_auth_quota(text,text,bigint,text) to anon,authenticated;

-- Administrative DB functions only: not exposed through a public RPC or app route.
create function private.auth_quota_status() returns jsonb
language sql stable security invoker set search_path='' as $$
 with time as(select floor(extract(epoch from statement_timestamp())/60)::bigint as bucket),
 scopes(scope) as(values('credentials'),('mail'),('refresh'),('exchange'),('update'))
 select jsonb_build_object('version',1,'bucket',time.bucket,
  'config_present',exists(select 1 from private.auth_quota_config),
  'expired_counters',(select count(*) from private.auth_quotas where bucket<time.bucket-1440),
  'expired_outcomes',(select count(*) from private.auth_quota_outcomes where bucket<time.bucket-1440),
  'scopes',(select jsonb_agg(jsonb_build_object('scope',s.scope,
    'allowed',coalesce(o.allowed,0),'denied_global',coalesce(o.denied_global,0),'denied_subject',coalesce(o.denied_subject,0)) order by s.scope)
   from scopes s left join lateral(select sum(allowed)::bigint as allowed,sum(denied_global)::bigint as denied_global,sum(denied_subject)::bigint as denied_subject
     from private.auth_quota_outcomes where scope=s.scope and bucket between time.bucket-59 and time.bucket) o on true))
 from time;
$$;
revoke all on function private.auth_quota_status() from public,anon,authenticated;
create function private.purge_auth_quotas(p_limit integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare cutoff bigint:=floor(extract(epoch from statement_timestamp())/60)-1440; counters integer; outcomes integer;
begin
 if p_limit is null or p_limit not between 1 and 1000 then raise exception 'AUTH_QUOTA_PURGE_INVALID';end if;
 with expired as(select scope,subject,bucket from private.auth_quotas where bucket<cutoff order by bucket,scope,subject limit p_limit for update skip locked),
 deleted as(delete from private.auth_quotas q using expired e where(q.scope,q.subject,q.bucket)=(e.scope,e.subject,e.bucket) returning 1)
 select count(*) into counters from deleted;
 with expired as(select scope,bucket from private.auth_quota_outcomes where bucket<cutoff order by bucket,scope limit p_limit for update skip locked),
 deleted as(delete from private.auth_quota_outcomes q using expired e where(q.scope,q.bucket)=(e.scope,e.bucket) returning 1)
 select count(*) into outcomes from deleted;
 return jsonb_build_object('version',1,'deleted_counters',counters,'deleted_outcomes',outcomes);
end$$;
revoke all on function private.purge_auth_quotas(integer) from public,anon,authenticated;


-- Explicit reported acceptance. CLI-created filename; no notice or acceptance is seeded.
do $$begin
 if to_regprocedure('extensions.digest(bytea,text)') is null or to_regprocedure('private.session_is_active()') is null or to_regclass('public.consent_records') is null then raise exception 'CONSENT_REQUIRES_REVIEWED_BASELINE';end if;
end$$;
create table private.processing_notices (
 version text not null check(version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'),
 locale text not null check(locale in ('ru','en')),
 body text not null check(length(body) between 1 and 16000 and octet_length(body)<=64000 and length(btrim(body,E' \t\n\r'))>0 and body !~ E'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]'),
 sha256 text not null check(sha256=encode(extensions.digest(convert_to(body,'UTF8'),'sha256'),'hex')),
 operator_reference text not null check(length(operator_reference) between 1 and 500),
 active boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),
 primary key(version,locale)
);
create unique index processing_notice_active_locale on private.processing_notices(locale) where active;
alter table private.processing_notices enable row level security;
revoke all on private.processing_notices from public,anon,authenticated;
create function private.freeze_processing_notice() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if row(new.version,new.locale,new.body,new.sha256,new.operator_reference,new.created_at) is distinct from row(old.version,old.locale,old.body,old.sha256,old.operator_reference,old.created_at) then raise exception 'IMMUTABLE_NOTICE';end if;
 return new;
end;$$;
revoke all on function private.freeze_processing_notice() from public,anon,authenticated;
create trigger processing_notice_frozen before update on private.processing_notices for each row execute function private.freeze_processing_notice();

create table public.processing_consent_receipts (
 id uuid not null default gen_random_uuid() unique,
 user_id uuid not null references auth.users(id) on delete cascade,
 sequence integer not null check(sequence between 1 and 200),
 command_id uuid not null,
 notice_version text not null,
 notice_locale text not null,
 notice_text text not null check(length(notice_text) between 1 and 16000 and octet_length(notice_text)<=64000 and notice_text !~ E'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]'),
 notice_sha256 text not null check(notice_sha256=encode(extensions.digest(convert_to(notice_text,'UTF8'),'sha256'),'hex')),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(user_id,sequence),
 unique(user_id,command_id),
 unique(user_id,notice_version,notice_locale),
 foreign key(notice_version,notice_locale) references private.processing_notices(version,locale)
);
create index consent_receipt_notice on public.processing_consent_receipts(notice_version,notice_locale);
alter table public.processing_consent_receipts enable row level security;
revoke all on public.processing_consent_receipts from public,anon,authenticated;
grant select on public.processing_consent_receipts to authenticated;
create policy processing_consent_receipts_select on public.processing_consent_receipts for select to authenticated
 using ((select auth.uid())=user_id and (select public.session_is_active()));
create function private.freeze_consent_receipt() returns trigger language plpgsql security invoker set search_path='' as $$begin raise exception 'IMMUTABLE_CONSENT_RECEIPT';end;$$;
revoke all on function private.freeze_consent_receipt() from public,anon,authenticated;
create trigger consent_receipt_frozen before update on public.processing_consent_receipts for each row execute function private.freeze_consent_receipt();
-- Clients have no INSERT/UPDATE/DELETE/TRUNCATE; deleting the Auth owner cascades the journal.

create function private.processing_notice_json(p_version text,p_locale text,p_body text,p_sha256 text) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('version',p_version,'locale',p_locale,'text',p_body,'sha256',p_sha256,'digestFormat','utf8-sha256-v1');
$$;
revoke all on function private.processing_notice_json(text,text,text,text) from public,anon,authenticated;
create function private.consent_receipt_json(r public.processing_consent_receipts) returns jsonb
language sql stable security invoker set search_path='' set timezone='UTC' as $$
 select jsonb_build_object('format','jobmatch-consent-receipt-v1','id',r.id,'ownerId',r.user_id,'sequence',r.sequence,'commandId',r.command_id,
  'notice',private.processing_notice_json(r.notice_version,r.notice_locale,r.notice_text,r.notice_sha256),
  'recordedAt',r.recorded_at,'provenance','authenticated-user-report','assurance','not-a-signature-or-legal-approval');
$$;
revoke all on function private.consent_receipt_json(public.processing_consent_receipts) from public,anon,authenticated;

-- Narrow private definer: read only this active account's journal and published notice.
create function private.read_consent_receipts(p_locale text,p_after integer,p_through integer) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();head integer;total integer;boundary integer;items jsonb;last_at integer;notice jsonb;legacy jsonb;latest jsonb;current_receipt jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_locale is null or p_locale not in ('ru','en') or p_after is null or p_after not between 0 and 200 or (p_through is not null and p_through not between 0 and 200) then raise exception 'INVALID_WRITE';end if;
 select coalesce(max(sequence),0),count(*) into head,total from public.processing_consent_receipts where user_id=uid;
 if head<>total then raise exception 'CONSENT_LEDGER_INTEGRITY';end if;
 boundary:=coalesce(p_through,head);
 if boundary>head or p_after>boundary then raise exception 'CONFLICT';end if;
 select private.processing_notice_json(version,locale,body,sha256) into notice from private.processing_notices where locale=p_locale and active;
 select private.consent_receipt_json(r) into current_receipt from public.processing_consent_receipts r where user_id=uid and notice_version=notice->>'version' and notice_locale=p_locale and sequence<=boundary;
 select jsonb_build_object('kind','legacy-workspace-observation','version',version,'observedAt',created) into legacy from public.consent_records where user_id=uid;
 select private.consent_receipt_json(r) into latest from public.processing_consent_receipts r where user_id=uid and sequence=boundary;
 select coalesce(jsonb_agg(private.consent_receipt_json(r::public.processing_consent_receipts) order by sequence),'[]'::jsonb),max(sequence) into items,last_at
 from (select * from public.processing_consent_receipts where user_id=uid and sequence>p_after and sequence<=boundary order by sequence limit 20) r;
 return jsonb_build_object('format','jobmatch-consent-page-v1','ownerId',uid,'through',boundary,'notice',notice,'legacyObservation',legacy,'latestReceipt',latest,'noticeReceipt',current_receipt,
  'rows',items,'nextAfter',case when last_at<boundary then last_at else null end);
end;$$;
revoke all on function private.read_consent_receipts(text,integer,integer) from public,anon;
grant execute on function private.read_consent_receipts(text,integer,integer) to authenticated;
create function public.read_consent_receipts(p_locale text,p_after integer default 0,p_through integer default null) returns jsonb
language sql security invoker set search_path='' as $$select private.read_consent_receipts(p_locale,p_after,p_through);$$;
revoke all on function public.read_consent_receipts(text,integer,integer) from public,anon;
grant execute on function public.read_consent_receipts(text,integer,integer) to authenticated;

-- No owner, text or timestamp parameter. A signed-in caller explicitly reports acceptance.
create function private.accept_processing_notice(p_expected_sequence integer,p_command_id uuid,p_notice_version text,p_notice_locale text,p_notice_sha256 text,p_acknowledged boolean) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();head integer;total integer;previous public.processing_consent_receipts;published private.processing_notices;receipt public.processing_consent_receipts;
begin
 if uid is null then raise exception 'AUTH';end if;
 -- Prevent a concurrent session revocation from committing before this write.
 perform 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=uid for share;
 if not found then raise exception 'AUTH';end if;
 if p_expected_sequence is null or p_expected_sequence not between 0 and 200 or p_command_id is null or p_notice_version is null or p_notice_version !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'
  or p_notice_locale is null or p_notice_locale not in ('ru','en') or p_notice_sha256 is null or p_notice_sha256 !~ '^[a-f0-9]{64}$' or p_acknowledged is distinct from true then raise exception 'INVALID_WRITE';end if;
 perform pg_advisory_xact_lock(hashtextextended('consent-receipts:'||uid::text,0));
 select coalesce(max(sequence),0),count(*) into head,total from public.processing_consent_receipts where user_id=uid;
 if head<>total then raise exception 'CONSENT_LEDGER_INTEGRITY';end if;
 select * into previous from public.processing_consent_receipts where user_id=uid and command_id=p_command_id;
 if found then
  if previous.sequence<>p_expected_sequence+1 or previous.notice_version<>p_notice_version or previous.notice_locale<>p_notice_locale or previous.notice_sha256<>p_notice_sha256 then raise exception 'CONFLICT';end if;
  return private.consent_receipt_json(previous);
 end if;
 if head<>p_expected_sequence or exists(select 1 from public.processing_consent_receipts where user_id=uid and notice_version=p_notice_version and notice_locale=p_notice_locale) then raise exception 'CONFLICT';end if;
 if head>=200 then raise exception 'CONSENT_HISTORY_LIMIT';end if;
 select * into published from private.processing_notices where version=p_notice_version and locale=p_notice_locale and active for share;
 if not found or published.sha256<>p_notice_sha256 then raise exception 'CONFLICT';end if;
 insert into public.processing_consent_receipts(user_id,sequence,command_id,notice_version,notice_locale,notice_text,notice_sha256)
 values(uid,head+1,p_command_id,published.version,published.locale,published.body,published.sha256) returning * into receipt;
 return private.consent_receipt_json(receipt);
end;$$;
revoke all on function private.accept_processing_notice(integer,uuid,text,text,text,boolean) from public,anon;
grant execute on function private.accept_processing_notice(integer,uuid,text,text,text,boolean) to authenticated;
create function public.accept_processing_notice(p_expected_sequence integer,p_command_id uuid,p_notice_version text,p_notice_locale text,p_notice_sha256 text,p_acknowledged boolean) returns jsonb
language sql security invoker set search_path='' as $$select private.accept_processing_notice(p_expected_sequence,p_command_id,p_notice_version,p_notice_locale,p_notice_sha256,p_acknowledged);$$;
revoke all on function public.accept_processing_notice(integer,uuid,text,text,text,boolean) from public,anon;
grant execute on function public.accept_processing_notice(integer,uuid,text,text,text,boolean) to authenticated;

-- Sensitive account deletion also requires a currently active, locked session.
create or replace function private.delete_own_auth_user() returns void
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'AUTH';end if;
 perform 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=uid for update;
 if not found then raise exception 'AUTH';end if;
 delete from auth.sessions where user_id=uid;
 delete from auth.users where id=uid;
end;$$;
revoke all on function private.delete_own_auth_user() from public,anon;
grant execute on function private.delete_own_auth_user() to authenticated;

-- Frozen English structured outlines; legacy Russian functions/text/hash are untouched.
do $$begin
 if to_regprocedure('private.structured_preview(integer,integer,uuid[])') is null
    or to_regclass('public.structured_resume_versions') is null
    or to_regprocedure('private.session_is_active()') is null then
  raise exception 'STRUCTURED_VERSION_BASELINE_REQUIRED';
 end if;
end;$$;
alter table public.structured_resume_versions drop constraint structured_resume_versions_template_version_check;
alter table public.structured_resume_versions add constraint structured_resume_versions_template_version_check
 check(template_version in ('structured-literal-v1','structured-literal-en-v1'));

create function private.structured_english_preview(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();legacy jsonb;profile jsonb;selected jsonb;entry jsonb;field jsonb;name text;source text;body text:='Structured information'||E'\n\n';section text;parts text[];part text;material bytea:=''::bytea;first boolean:=true;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 perform 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=uid for share;
 if not found then raise exception 'AUTH';end if;
 -- Reuse the frozen source/confirmation/context/selection/revision validation under its owner lock.
 legacy:=private.structured_preview(p_workspace_revision,p_profile_revision,p_entry_ids);
 profile:=legacy->'snapshot';selected:=profile->'entries';source:=profile->>'source_original';
 for entry in select value from jsonb_array_elements(selected) loop
  section:=case entry->>'kind' when 'employment' then 'Employment' when 'education' then 'Education' when 'certification' then 'Certification' when 'achievement' then 'Achievement' else null end;
  if section is null then raise exception 'INVALID_WRITE';end if;
  foreach name in array array['title','organization','start','end','description','credential'] loop
   field:=entry->'fields'->name;
   if field is not null then
    section:=section||E'\n'||case name when 'title' then 'Title' when 'organization' then 'Organization' when 'start' then 'Start / issue date' when 'end' then 'End' when 'description' then 'Description' else 'Credential number' end||': '||(field->>'quote');
   end if;
  end loop;
  if body<>'Structured information'||E'\n\n' then body:=body||E'\n\n';end if;
  body:=body||section;
 end loop;
 if length(body)>200000 then raise exception 'INVALID_WRITE';end if;
 parts:=array['structured-literal-en-v1','line-risk-v1','literal-template','null',profile->>'format',profile->>'ownerId',profile->>'revision',profile->>'workspace_revision',profile->>'source_workspace_revision',jsonb_array_length(profile->'source_fact_ids')::text]||(select array_agg(value order by n) from jsonb_array_elements_text(profile->'source_fact_ids') with ordinality f(value,n))||array[source,'true',body];
 for entry in select value from jsonb_array_elements(selected) loop
  parts:=parts||array[entry->>'id',entry->>'kind',entry->>'created','true'];
  foreach name in array array['title','organization','start','end','description','credential'] loop
   field:=entry->'fields'->name;parts:=parts||array[name,coalesce(field->>'start',''),coalesce(field->>'end',''),coalesce(field->>'quote','')];
  end loop;
 end loop;
 foreach part in array parts loop
  if not first then material:=material||'\x00'::bytea;end if;
  first:=false;material:=material||convert_to(part,'UTF8');
 end loop;
 return jsonb_build_object('template_version','structured-literal-en-v1','context_guard_version','line-risk-v1','generator','literal-template','model_version',null,'snapshot',profile,'text',body,'preview_hash',encode(sha256(material),'hex'));
end;$$;
revoke all on function private.structured_english_preview(integer,integer,uuid[]) from public,anon;
grant execute on function private.structured_english_preview(integer,integer,uuid[]) to authenticated;
create function public.preview_structured_english_version(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[]) returns jsonb
language sql security invoker set search_path='' as $$select private.structured_english_preview(p_workspace_revision,p_profile_revision,p_entry_ids);$$;
revoke all on function public.preview_structured_english_version(integer,integer,uuid[]) from public,anon;
grant execute on function public.preview_structured_english_version(integer,integer,uuid[]) to authenticated;

create function private.save_structured_english_version(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[],p_preview_hash text,p_accept text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();preview jsonb;v public.structured_resume_versions%rowtype;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_accept is distinct from 'SAVE_LITERAL_VERSION' or p_preview_hash is null or p_preview_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_WRITE';end if;
 preview:=private.structured_english_preview(p_workspace_revision,p_profile_revision,p_entry_ids);
 if preview->>'preview_hash'<>p_preview_hash then raise exception 'CONFLICT';end if;
 select * into v from public.structured_resume_versions where user_id=uid and preview_hash=p_preview_hash;
 if found then return private.structured_version_json(v);end if;
 if (select count(*) from public.structured_resume_versions where user_id=uid)>=20 then raise exception 'INVALID_WRITE';end if;
 insert into public.structured_resume_versions(user_id,profile_revision,workspace_revision,template_version,preview_hash,text,snapshot)
 values(uid,p_profile_revision,p_workspace_revision,preview->>'template_version',p_preview_hash,preview->>'text',preview->'snapshot') returning * into v;
 insert into public.audit_log(user_id,action) values(uid,'structured_version_save');
 return private.structured_version_json(v);
end;$$;
revoke all on function private.save_structured_english_version(integer,integer,uuid[],text,text) from public,anon;
grant execute on function private.save_structured_english_version(integer,integer,uuid[],text,text) to authenticated;
create function public.save_structured_english_version(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[],p_preview_hash text,p_accept text) returns jsonb
language sql security invoker set search_path='' as $$select private.save_structured_english_version(p_workspace_revision,p_profile_revision,p_entry_ids,p_preview_hash,p_accept);$$;
revoke all on function public.save_structured_english_version(integer,integer,uuid[],text,text) from public,anon;
grant execute on function public.save_structured_english_version(integer,integer,uuid[],text,text) to authenticated;

-- Explicit English ordinary literal framing; preserve untagged Russian/default and exact restore.
do $$begin
 if to_regprocedure('private.apply_version_intent(jsonb,integer,jsonb)') is null
    or to_regprocedure('private.validate_version_write(jsonb,jsonb,text,integer)') is null
    or to_regclass('public.resume_versions') is null then raise exception 'ORDINARY_VERSION_BASELINE_REQUIRED';end if;
end;$$;
create or replace function private.apply_version_intent(p_state jsonb,p_revision integer,p_command jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare action text:=p_command->>'action'; candidate jsonb; ids jsonb; snapshot jsonb; metadata jsonb;
 rendered text; promoted text; remainder text; stamp text; score numeric; value numeric; key text; total integer:=0;
begin
 if jsonb_typeof(p_command) is distinct from 'object' or action is null or action not in ('version','restore')
  or jsonb_array_length(p_state->'versions')>=100 then raise exception 'INVALID_WRITE';end if;
 stamp:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 if action='restore' then
  if p_command-array['action','id']<>'{}'::jsonb or jsonb_typeof(p_command->'id') is distinct from 'string'
   or length(p_command->>'id') not between 1 and 100 then raise exception 'INVALID_WRITE';end if;
  select v into candidate from jsonb_array_elements(p_state->'versions') v where v->>'id'=p_command->>'id';
  if candidate is null then raise exception 'INVALID_WRITE';end if;
  candidate:=candidate||jsonb_build_object('id',gen_random_uuid()::text,'created',stamp,'restored_from',p_command->>'id');
 else
  if p_command-array['action','evidence_ids','score','match_metadata','template_version']<>'{}'::jsonb
   or jsonb_typeof(p_command->'evidence_ids') is distinct from 'array'
   or jsonb_typeof(p_command->'score') is distinct from 'number'
   or length(p_state->>'original')=0 or length(p_state->>'vacancy')=0 then raise exception 'INVALID_WRITE';end if;
  if p_command ? 'template_version' and p_command->>'template_version' is distinct from 'ordinary-literal-en-v1' then raise exception 'INVALID_WRITE';end if;
  ids:=p_command->'evidence_ids';score:=(p_command->>'score')::numeric;metadata:=p_command->'match_metadata';
  if score not between 0 and 100 or score<>trunc(score) or jsonb_array_length(ids)>500
   or exists(select 1 from jsonb_array_elements(ids) i where jsonb_typeof(i)<>'string' or length(i#>>'{}') not between 1 and 100)
   or (select count(*) from jsonb_array_elements(ids))<>(select count(distinct i) from jsonb_array_elements(ids) i) then raise exception 'INVALID_WRITE';end if;
  if exists(select 1 from jsonb_array_elements_text(ids) i where not exists(select 1 from jsonb_array_elements(p_state->'facts') f where f->>'id'=i and f->'verified'='true'::jsonb)) then raise exception 'INVALID_WRITE';end if;
  -- Validate v1 evaluation shape/constants; relevance/score computation stays in the server engine.
  if jsonb_typeof(metadata) is distinct from 'object' or metadata-array['rules_revision','weights','contributions','requirements','outcomes']<>'{}'::jsonb
   or metadata->>'rules_revision' is distinct from 'rules-2026-10-25.1'
   or metadata->'weights' is distinct from '{"mandatory":35,"experience":25,"skills":20,"context":10,"clarity":10}'::jsonb
   or metadata->'contributions' is distinct from '{"matched":1,"partial":0.5,"missing":0,"unknown":0}'::jsonb
   or jsonb_typeof(metadata->'requirements') is distinct from 'number' or jsonb_typeof(metadata->'outcomes') is distinct from 'object'
   or (metadata->'outcomes')-array['matched','partial','missing','unknown']<>'{}'::jsonb then raise exception 'INVALID_WRITE';end if;
  value:=(metadata->>'requirements')::numeric;
  if value not between 0 and 30000 or value<>trunc(value) then raise exception 'INVALID_WRITE';end if;
  foreach key in array array['matched','partial','missing','unknown'] loop
   if jsonb_typeof(metadata#>array['outcomes',key]) is distinct from 'number' then raise exception 'INVALID_WRITE';end if;
   value:=(metadata#>>array['outcomes',key])::numeric;
   if value not between 0 and 30000 or value<>trunc(value) then raise exception 'INVALID_WRITE';end if;
   total:=total+value::integer;
  end loop;
  if total<>(metadata->>'requirements')::numeric then raise exception 'INVALID_WRITE';end if;
  select coalesce(jsonb_agg(f order by i),'[]'::jsonb) into snapshot from jsonb_array_elements(p_state->'facts') with ordinality facts(f,i) where ids ? (f->>'id');
  if jsonb_array_length(ids)=0 then rendered:=p_state->>'original';
  else
   select string_agg(f->>'text',E'\n' order by i) into promoted from jsonb_array_elements_text(ids) with ordinality selected(e,i) join jsonb_array_elements(p_state->'facts') f on f->>'id'=e;
   select coalesce(string_agg(line,E'\n' order by i),'') into remainder from regexp_split_to_table(p_state->>'original',E'\r?\n') with ordinality lines(line,i)
    where not exists(select 1 from jsonb_array_elements(snapshot) f where f->>'text'=private.trim_fact_line(line));
   rendered:=case when p_command->>'template_version'='ordinary-literal-en-v1' then 'RELEVANT EXPERIENCE'||E'\n'||promoted||E'\n\nPROFILE\n'||remainder else 'РЕЛЕВАНТНЫЙ ОПЫТ'||E'\n'||promoted||E'\n\nПРОФИЛЬ\n'||remainder end;
  end if;
  candidate:=jsonb_build_object('id',gen_random_uuid()::text,'created',stamp,'text',rendered,'vacancy',p_state->>'vacancy',
   'evidence_ids',ids,'evidence_snapshot',snapshot,'profile_revision',p_revision,'engine_version','rules-v1','score',score::integer,'match_metadata',metadata);
  if p_command->>'template_version'='ordinary-literal-en-v1' then candidate:=candidate||jsonb_build_object('template_version','ordinary-literal-en-v1');end if;
 end if;
 return jsonb_set(p_state,'{versions}',(p_state->'versions')||jsonb_build_array(candidate));
end;$$;
revoke all on function private.apply_version_intent(jsonb,integer,jsonb) from public,anon,authenticated;
create or replace function private.validate_version_write(old_state jsonb,new_state jsonb,p_action text,p_revision integer) returns void language plpgsql security invoker set search_path='' as $$
declare old_facts jsonb:=old_state->'facts';old_versions jsonb:=old_state->'versions';new_versions jsonb:=new_state->'versions';n integer;candidate jsonb;original_version jsonb;snapshot jsonb;promoted text;remainder text;rendered text;
begin
  n:=jsonb_array_length(old_versions);candidate:=new_versions->n;
  if jsonb_array_length(new_versions)<>n+1 or (new_versions-n)<>old_versions or jsonb_typeof(candidate->'id') is distinct from 'string' or jsonb_typeof(candidate->'created') is distinct from 'string' or length(candidate->>'created')>100 then raise exception 'INVALID_WRITE';end if;
  if p_action='restore' then
   select v into original_version from jsonb_array_elements(old_versions) v where v->>'id'=candidate->>'restored_from';
   if original_version is null or (candidate-array['id','created','restored_from']) is distinct from (original_version-array['id','created','restored_from']) then raise exception 'INVALID_WRITE';end if;
  else
   if candidate ? 'template_version' and candidate->>'template_version' is distinct from 'ordinary-literal-en-v1' then raise exception 'INVALID_WRITE';end if;
   if candidate->>'engine_version' is distinct from 'rules-v1' or candidate->'profile_revision' is distinct from to_jsonb(p_revision) or candidate->>'vacancy' is distinct from old_state->>'vacancy' or jsonb_typeof(candidate->'evidence_ids') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
   if (select count(*)<>count(distinct v) from jsonb_array_elements_text(candidate->'evidence_ids') v) or exists(select 1 from jsonb_array_elements_text(candidate->'evidence_ids') e where not exists(select 1 from jsonb_array_elements(old_facts) f where f->>'id'=e and f->'verified'='true')) then raise exception 'INVALID_WRITE';end if;
   select coalesce(jsonb_agg(f order by i),'[]') into snapshot from jsonb_array_elements(old_facts) with ordinality facts(f,i) where candidate->'evidence_ids' ? (f->>'id');
   if candidate->'evidence_snapshot' is distinct from snapshot then raise exception 'INVALID_WRITE';end if;
   if jsonb_array_length(candidate->'evidence_ids')=0 then rendered:=old_state->>'original';
   else
    select string_agg(f->>'text',E'\n' order by i) into promoted from jsonb_array_elements_text(candidate->'evidence_ids') with ordinality ids(e,i) join jsonb_array_elements(old_facts) f on f->>'id'=e;
    select coalesce(string_agg(line,E'\n' order by i),'') into remainder from regexp_split_to_table(old_state->>'original',E'\r?\n') with ordinality lines(line,i) where not exists(select 1 from jsonb_array_elements(snapshot) f where f->>'text'=private.trim_fact_line(line));
    rendered:=case when candidate->>'template_version'='ordinary-literal-en-v1' then 'RELEVANT EXPERIENCE'||E'\n'||promoted||E'\n\nPROFILE\n'||remainder else 'РЕЛЕВАНТНЫЙ ОПЫТ'||E'\n'||promoted||E'\n\nПРОФИЛЬ\n'||remainder end;
   end if;
   if candidate->>'text' is distinct from rendered then raise exception 'INVALID_WRITE';end if;
  end if;

end;$$;
revoke all on function private.validate_version_write(jsonb,jsonb,text,integer) from public,anon,authenticated;
