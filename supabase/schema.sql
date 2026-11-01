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

-- Saved letter versions: source-only change; no key is seeded and no provider operation is performed.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$begin if not exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto' and n.nspname='extensions') then raise exception 'LETTER_REQUIRES_PGCRYPTO_IN_EXTENSIONS';end if;end$$;
create table private.letter_signing_config(singleton boolean primary key default true check(singleton),signing_key bytea not null check(octet_length(signing_key)=32));
alter table private.letter_signing_config enable row level security;
revoke all on private.letter_signing_config from public,anon,authenticated;
create table public.saved_letter_versions(
 user_id uuid not null references public.workspaces(user_id) on delete cascade,
 id uuid not null,version integer not null check(version between 1 and 50),created timestamptz not null,
 payload text not null check(octet_length(payload) between 1 and 262144),signature text not null check(signature~'^[a-f0-9]{64}$'),
 payload_sha256 text not null check(payload_sha256~'^[a-f0-9]{64}$' and payload_sha256=encode(extensions.digest(convert_to(payload,'UTF8'),'sha256'),'hex')),
 primary key(user_id,id),unique(user_id,version)
);
alter table public.saved_letter_versions enable row level security;
revoke all on public.saved_letter_versions from public,anon,authenticated;
grant select on public.saved_letter_versions to authenticated;
create policy saved_letters_owner on public.saved_letter_versions for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));
create function private.freeze_saved_letter() returns trigger language plpgsql set search_path='' as $$begin raise exception 'IMMUTABLE_SAVED_LETTER';end$$;
revoke all on function private.freeze_saved_letter() from public,anon,authenticated;
create trigger saved_letter_frozen before update on public.saved_letter_versions for each row execute function private.freeze_saved_letter();

create function private.letter_signing_ready(p_key_id text) returns boolean language plpgsql security definer set search_path='' as $$
declare key bytea;begin
 if auth.uid() is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_key_id is null or p_key_id!~'^[a-f0-9]{64}$' then return false;end if;
 select signing_key into key from private.letter_signing_config where singleton;
 return key is not null and encode(extensions.digest(key,'sha256'),'hex')=p_key_id;
end$$;
revoke all on function private.letter_signing_ready(text) from public,anon,authenticated;
grant execute on function private.letter_signing_ready(text) to authenticated;
create function public.letter_signing_ready(p_key_id text) returns boolean language sql security invoker set search_path='' as $$select private.letter_signing_ready(p_key_id);$$;
revoke all on function public.letter_signing_ready(text) from public,anon,authenticated;
grant execute on function public.letter_signing_ready(text) to authenticated;

create function private.saved_letter_json(r public.saved_letter_versions) returns jsonb language sql stable set search_path='' set timezone='UTC' as $$
 select jsonb_build_object('format','jobmatch-saved-letter-version-v1','ownerId',r.user_id,'id',r.id,'version',r.version,'created',r.created,
 'receipt',jsonb_build_object('payload',r.payload,'signature',r.signature),'payloadSha256',r.payload_sha256,'issuer','server-key-holder',
 'sourceVerification','current-at-acceptance','receiptSignature','verified-at-acceptance','contentReview','reported-user-review','semanticAssessment','not-performed','modelVersion',null);
$$;
revoke all on function private.saved_letter_json(public.saved_letter_versions) from public,anon,authenticated;
create function private.read_saved_letters() returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();items jsonb;revision integer;begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 select coalesce(max(version),0),coalesce(jsonb_agg(jsonb_build_object('id',id,'version',version,'created',created,
 'workspaceRevision',(payload::jsonb#>>'{source,workspaceRevision}')::integer,'templateVersion',payload::jsonb#>>'{snapshot,templateVersion}',
 'style',payload::jsonb#>>'{snapshot,style}','edited',(payload::jsonb#>>'{snapshot,review,edited}')::boolean,'payloadSha256',payload_sha256) order by version desc),'[]'::jsonb)
 into revision,items from public.saved_letter_versions where user_id=uid;
 return jsonb_build_object('format','jobmatch-saved-letters-state-v1','ownerId',uid,'revision',revision,'items',items);
end$$;
revoke all on function private.read_saved_letters() from public,anon,authenticated;
grant execute on function private.read_saved_letters() to authenticated;
create function public.read_saved_letters() returns jsonb language sql security invoker set search_path='' as $$select private.read_saved_letters();$$;
revoke all on function public.read_saved_letters() from public,anon,authenticated;
grant execute on function public.read_saved_letters() to authenticated;
create function private.read_saved_letter(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();result jsonb;begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 select private.saved_letter_json(r) into result from public.saved_letter_versions r where user_id=uid and id=p_id;return result;
end$$;
revoke all on function private.read_saved_letter(uuid) from public,anon,authenticated;
grant execute on function private.read_saved_letter(uuid) to authenticated;
create function public.read_saved_letter(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.read_saved_letter(p_id);$$;
revoke all on function public.read_saved_letter(uuid) from public,anon,authenticated;
grant execute on function public.read_saved_letter(uuid) to authenticated;

create function private.accept_saved_letter(p_workspace_revision integer,p_letter_revision integer,p_payload text,p_signature text,p_accept text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();key bytea;expected bytea;body jsonb;src jsonb;snap jsonb;facts jsonb;selected jsonb;fact jsonb;current_fact jsonb;state jsonb;
 issued bigint;expires bigint;current_revision integer;current_letters integer;accepted_at timestamptz;nonce uuid;record public.saved_letter_versions%rowtype;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_accept is distinct from 'SAVE_REVIEWED_LETTER_VERSION' or p_workspace_revision is null or p_workspace_revision<0 or p_letter_revision is null or p_letter_revision not between 0 and 49
  or p_payload is null or octet_length(p_payload) not between 1 and 262144 or p_signature is null or p_signature!~'^[a-f0-9]{64}$' then raise exception 'INVALID_WRITE';end if;
 -- Rotation conflicts with this shared row lock; no historical key is exported.
 select signing_key into key from private.letter_signing_config where singleton for share;
 if key is null then raise exception 'LETTER_UNAVAILABLE';end if;
 expected:=extensions.hmac(convert_to('jobmatch-letter-receipt-v1'||chr(10)||p_payload,'UTF8'),key,'sha256');
 if extensions.hmac(expected,key,'sha256')<>extensions.hmac(decode(p_signature,'hex'),key,'sha256') then raise exception 'INVALID_WRITE';end if;
 begin
  body:=p_payload::jsonb;src:=body->'source';snap:=body->'snapshot';
  if jsonb_typeof(body) is distinct from 'object' or jsonb_typeof(src) is distinct from 'object' or jsonb_typeof(snap) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
  if array(select jsonb_object_keys(body) order by 1) is distinct from array['expiresAt','format','id','issuedAt','issuerKeyId','snapshot','source']
   or array(select jsonb_object_keys(src) order by 1) is distinct from array['letterRevision','originalSha256','ownerId','workspaceRevision']
   or body->>'format' is distinct from 'jobmatch-letter-receipt-v1' or body->>'issuerKeyId' is distinct from encode(extensions.digest(key,'sha256'),'hex')
   or (src->>'ownerId')::uuid is distinct from uid or src->>'originalSha256'!~'^[a-f0-9]{64}$'
   or jsonb_typeof(body->'id') is distinct from 'string' or jsonb_typeof(body->'issuedAt') is distinct from 'number' or jsonb_typeof(body->'expiresAt') is distinct from 'number'
   or body->>'issuedAt'!~'^[0-9]+$' or body->>'expiresAt'!~'^[0-9]+$'
   or jsonb_typeof(src->'workspaceRevision') is distinct from 'number' or jsonb_typeof(src->'letterRevision') is distinct from 'number'
   or src->>'workspaceRevision'!~'^[0-9]+$' or src->>'letterRevision'!~'^[0-9]+$'
   or (src->>'workspaceRevision')::integer is distinct from p_workspace_revision or (src->>'letterRevision')::integer is distinct from p_letter_revision
   or snap->>'format' is distinct from 'jobmatch-local-letter-snapshot-v1' or snap->>'trust' is distinct from 'unsigned-editable-local-snapshot'
   or snap->>'templateVersion' is distinct from 'main-ru-letter-81cb1a6-v1' or jsonb_typeof(snap->'style') is distinct from 'string' or snap->>'style' not in ('professional','brief','confident','executive')
   or jsonb_typeof(snap->'generated') is distinct from 'string' or jsonb_typeof(snap->'text') is distinct from 'string'
   or length(snap->>'generated') not between 1 and 15000 or length(snap->>'text') not between 1 and 15000
   or snap#>>'{review,format}' is distinct from 'literal-edit-audit-v1' or snap#>>'{review,coverage}' is distinct from 'bounded-lexical-only'
   or snap#>>'{review,semanticAssessment}' is distinct from 'not-performed' or snap#>'{approval,wholeLetter}' is distinct from 'true'::jsonb
   or snap#>'{review,edited}' is distinct from to_jsonb((snap->>'generated')<>(snap->>'text')) then raise exception 'INVALID_WRITE';end if;
  nonce:=(body->>'id')::uuid;issued:=(body->>'issuedAt')::bigint;expires:=(body->>'expiresAt')::bigint;
  if issued>9007199254740391 or expires<>issued+600 then raise exception 'INVALID_WRITE';end if;
  facts:=snap#>'{source,facts}';selected:=snap->'selection';
  if jsonb_typeof(facts) is distinct from 'array' or jsonb_typeof(selected) is distinct from 'array' or jsonb_array_length(facts) not between 1 and 5
   or jsonb_array_length(facts)<>jsonb_array_length(selected) or jsonb_typeof(snap#>'{source,vacancy}') is distinct from 'string'
   or length(snap#>>'{source,vacancy}') not between 1 and 30000 then raise exception 'INVALID_WRITE';end if;
  if (select count(distinct f->>'id') from jsonb_array_elements(facts) f)<>jsonb_array_length(facts)
   or (select count(distinct s) from jsonb_array_elements_text(selected) s)<>jsonb_array_length(selected) then raise exception 'INVALID_WRITE';end if;
 exception when data_exception then raise exception 'INVALID_WRITE';end;
 -- Same advisory/workspace order as legacy and command writers; no source can race acceptance.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into current_revision from public.workspaces where user_id=uid for update;
 if current_revision is distinct from p_workspace_revision then raise exception 'CONFLICT';end if;
 select coalesce(max(version),0) into current_letters from public.saved_letter_versions where user_id=uid;
 if current_letters<>p_letter_revision then raise exception 'CONFLICT';end if;
 state:=public.read_workspace();
 if src->>'originalSha256' is distinct from encode(extensions.digest(convert_to(state->>'original','UTF8'),'sha256'),'hex') or snap#>>'{source,vacancy}' is distinct from state->>'vacancy' then raise exception 'CONFLICT';end if;
 for fact in select value from jsonb_array_elements(facts) loop
  if jsonb_typeof(fact) is distinct from 'object' or fact->'verified' is distinct from 'true'::jsonb or jsonb_typeof(fact->'id') is distinct from 'string'
   or jsonb_typeof(fact->'text') is distinct from 'string' or jsonb_typeof(fact->'source') is distinct from 'string'
   or length(fact->>'id') not between 1 and 200 or length(fact->>'text') not between 1 and 2000 or length(fact->>'source') not between 1 and 2000
   or not selected ? ('edit-'||(fact->>'id')) then raise exception 'INVALID_WRITE';end if;
  select jsonb_build_object('id',f->'id','text',f->'text','source',f->'source','verified',f->'verified') into current_fact from jsonb_array_elements(state->'facts') f where f->>'id'=fact->>'id';
  if current_fact is distinct from fact then raise exception 'CONFLICT';end if;
 end loop;
 accepted_at:=clock_timestamp();
 if issued>extract(epoch from accepted_at)+5 or expires<=extract(epoch from accepted_at) then raise exception 'INVALID_WRITE';end if;
 if not private.session_is_active() then raise exception 'AUTH';end if;
 insert into public.saved_letter_versions(user_id,id,version,created,payload,signature,payload_sha256)
 values(uid,nonce,p_letter_revision+1,accepted_at,p_payload,p_signature,encode(extensions.digest(convert_to(p_payload,'UTF8'),'sha256'),'hex')) returning * into record;
 insert into public.audit_log(user_id,action) values(uid,'saved-letter-accept');
 return jsonb_build_object('state',private.read_saved_letters(),'record',private.saved_letter_json(record));
end$$;
revoke all on function private.accept_saved_letter(integer,integer,text,text,text) from public,anon,authenticated;
grant execute on function private.accept_saved_letter(integer,integer,text,text,text) to authenticated;
create function public.accept_saved_letter(p_workspace_revision integer,p_letter_revision integer,p_payload text,p_signature text,p_accept text) returns jsonb
language sql security invoker set search_path='' as $$select private.accept_saved_letter(p_workspace_revision,p_letter_revision,p_payload,p_signature,p_accept);$$;
revoke all on function public.accept_saved_letter(integer,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.accept_saved_letter(integer,integer,text,text,text) to authenticated;
-- Existing projects can have automatic service-role grants; application RPCs use user JWTs only.
do $$declare r record;begin if exists(select 1 from pg_roles where rolname='service_role') then
 execute 'revoke all on private.letter_signing_config,public.saved_letter_versions from service_role';
 for r in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('freeze_saved_letter','letter_signing_ready','saved_letter_json','read_saved_letters','read_saved_letter','accept_saved_letter') loop
 execute format('revoke all on function %s from service_role',r.oid::regprocedure);end loop;
end if;end$$;

-- Main-compatible manual source profile. Default native storage capability is OFF.
-- Retraction/deletion/clear remain available to the owner when creation is disabled.
begin;
create table public.source_profiles(
 user_id uuid primary key references public.workspaces(user_id) on delete cascade,
 revision integer not null check(revision>0),
 source_workspace_revision integer,
 source_original text,
 source_fact_ids jsonb,
 check((source_original is null and source_workspace_revision is null and source_fact_ids is null) or
  (source_original is not null and source_workspace_revision is not null and source_fact_ids is not null and
   source_workspace_revision>=0 and length(source_original) between 1 and 100000 and private.trim_fact_line(source_original)<>'' and
   jsonb_typeof(source_fact_ids)='array' and jsonb_array_length(source_fact_ids) between 1 and 500))
);
create table public.source_profile_entries(
 user_id uuid not null references public.source_profiles(user_id) on delete cascade,
 id uuid not null default gen_random_uuid(),kind text not null check(kind in ('employment','education','certification','achievement')),
 fields jsonb not null check(jsonb_typeof(fields)='object'),confirmed boolean not null default false,
 created timestamptz not null default clock_timestamp(),primary key(user_id,id)
);
alter table public.source_profiles enable row level security;
alter table public.source_profile_entries enable row level security;
revoke all on public.source_profiles,public.source_profile_entries from public,anon,authenticated;
grant select on public.source_profiles,public.source_profile_entries to authenticated;
create policy source_profile_owner on public.source_profiles for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));
create policy source_entry_owner on public.source_profile_entries for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));

-- An operator may explicitly GRANT this capability after storage approval. No key/config row.
-- The guarded command checks the authenticated role's ACL, never definer current_user.
create function private.source_profile_storage_permission() returns boolean language sql security invoker set search_path='' as $$select true;$$;
revoke all on function private.source_profile_storage_permission() from public,anon,authenticated;
create function private.source_profile_storage_ready() returns boolean language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not private.session_is_active() then raise exception 'AUTH';end if;
 return has_function_privilege('authenticated','private.source_profile_storage_permission()','EXECUTE');
end$$;
revoke all on function private.source_profile_storage_ready() from public,anon,authenticated;
grant execute on function private.source_profile_storage_ready() to authenticated;
create function public.source_profile_storage_ready() returns boolean language sql security invoker set search_path='' as $$select private.source_profile_storage_ready();$$;
revoke all on function public.source_profile_storage_ready() from public,anon,authenticated;
grant execute on function public.source_profile_storage_ready() to authenticated;

create function private.read_source_profile() returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();state jsonb;p public.source_profiles%rowtype;ids jsonb;entries jsonb;captured boolean;begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 state:=public.read_workspace();
 ids:=coalesce((select jsonb_agg(f.value->'id' order by f.n) from jsonb_array_elements(coalesce(state->'facts','[]'::jsonb)) with ordinality f(value,n)),'[]'::jsonb);
 select * into p from public.source_profiles where user_id=uid;captured:=p.source_original is not null;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'fields',fields,'confirmed',confirmed,'created',created) order by created,id),'[]'::jsonb)
 into entries from public.source_profile_entries where user_id=uid;
 return jsonb_build_object('format','jobmatch-source-profile-v1','ownerId',uid,'revision',coalesce(p.revision,0),
 'workspace_revision',coalesce((state->>'revision')::integer,0),'source_workspace_revision',coalesce(p.source_workspace_revision,(state->>'revision')::integer,0),
 'source_original',coalesce(p.source_original,state->>'original',''),'source_fact_ids',coalesce(p.source_fact_ids,ids),
 'source_captured',captured,'source_matches',not captured or(p.source_original=state->>'original' and p.source_fact_ids=ids),'entries',entries,
 'sourceVerification','exact-ranges-only','semanticAssessment','not-performed','modelVersion',null);
end$$;
revoke all on function private.read_source_profile() from public,anon,authenticated;
grant execute on function private.read_source_profile() to authenticated;
create function public.read_source_profile() returns jsonb language sql security invoker set search_path='' as $$select private.read_source_profile();$$;
revoke all on function public.read_source_profile() from public,anon,authenticated;
grant execute on function public.read_source_profile() to authenticated;

create function private.command_source_profile(p_workspace_revision integer,p_profile_revision integer,p_command jsonb,p_accept text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();state jsonb;p public.source_profiles%rowtype;ids jsonb;action text;store boolean;current_source boolean;
 current_revision integer;item jsonb;field_name text;start_at integer;end_at integer;quote text;record_id uuid;confirmed_value boolean;begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_workspace_revision is null or p_workspace_revision<0 or p_profile_revision is null or p_profile_revision not between 0 and 2147483646
  or jsonb_typeof(p_command) is distinct from 'object' or octet_length(p_command::text)>40000 or jsonb_typeof(p_command->'action') is distinct from 'string' then raise exception 'INVALID_WRITE';end if;
 action:=p_command->>'action';
 if action='add' then
  if (p_command-array['action','kind','fields'])<>'{}'::jsonb or jsonb_typeof(p_command->'kind') is distinct from 'string'
   or p_command->>'kind' not in ('employment','education','certification','achievement') or jsonb_typeof(p_command->'fields') is distinct from 'object'
   or ((p_command->'fields')-array['title','organization','start','end','description','credential'])<>'{}'::jsonb
   or not((p_command->'fields')?(case when p_command->>'kind'='achievement' then 'description' else 'title' end))
   or ((p_command->'fields')?'credential' and p_command->>'kind'<>'certification') then raise exception 'INVALID_WRITE';end if;
 elsif action in ('confirm','delete') then
  if (p_command-(case when action='confirm' then array['action','id','confirmed'] else array['action','id'] end))<>'{}'::jsonb
   or jsonb_typeof(p_command->'id') is distinct from 'string' then raise exception 'INVALID_WRITE';end if;
  begin record_id:=(p_command->>'id')::uuid;exception when invalid_text_representation then raise exception 'INVALID_WRITE';end;
  if action='confirm' then
   if jsonb_typeof(p_command->'confirmed') is distinct from 'boolean' then raise exception 'INVALID_WRITE';end if;
   confirmed_value:=(p_command->>'confirmed')::boolean;
  end if;
 elsif action in ('reset','clear') then
  if (p_command-array['action','confirm'])<>'{}'::jsonb or p_command->>'confirm' is distinct from(case when action='reset' then 'RESET_SOURCE_PROFILE' else 'CLEAR_SOURCE_PROFILE_DATA' end) then raise exception 'INVALID_WRITE';end if;
 else raise exception 'INVALID_WRITE';end if;
 store:=action in ('add','reset') or(action='confirm' and confirmed_value);
 if p_accept is distinct from(case when store then 'STORE_REVIEWED_SOURCE_PROFILE' else 'REMOVE_SOURCE_PROFILE_DATA' end) then raise exception 'INVALID_WRITE';end if;
 if store and not has_function_privilege('authenticated','private.source_profile_storage_permission()','EXECUTE') then raise exception 'SOURCE_PROFILE_UNAVAILABLE';end if;
 -- Same advisory/workspace lock order as letter, command and legacy writers.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into current_revision from public.workspaces where user_id=uid for update;
 if current_revision is distinct from p_workspace_revision then raise exception 'CONFLICT';end if;
 state:=public.read_workspace();
 ids:=coalesce((select jsonb_agg(f.value->'id' order by f.n) from jsonb_array_elements(coalesce(state->'facts','[]'::jsonb)) with ordinality f(value,n)),'[]'::jsonb);
 select * into p from public.source_profiles where user_id=uid for update;
 if coalesce(p.revision,0)<>p_profile_revision then raise exception 'CONFLICT';end if;
 current_source:=p.source_original is null or(p.source_original=state->>'original' and p.source_fact_ids=ids);
 if store and(private.trim_fact_line(coalesce(state->>'original',''))='' or length(state->>'original')>100000 or jsonb_array_length(ids) not between 1 and 500) then raise exception 'INVALID_WRITE';end if;
 if action='add' then
  if not current_source then raise exception 'CONFLICT';end if;
  for field_name,item in select key,value from jsonb_each(p_command->'fields') loop
   if jsonb_typeof(item) is distinct from 'object' or (item-array['quote','start','end'])<>'{}'::jsonb
    or jsonb_typeof(item->'quote') is distinct from 'string' or length(item->>'quote') not between 1 and 500 or private.trim_fact_line(item->>'quote')=''
    or jsonb_typeof(item->'start') is distinct from 'number' or coalesce(item->>'start','')!~'^(0|[1-9][0-9]{0,5})$'
    or jsonb_typeof(item->'end') is distinct from 'number' or coalesce(item->>'end','')!~'^[1-9][0-9]{0,5}$' then raise exception 'INVALID_WRITE';end if;
   start_at:=(item->>'start')::integer;end_at:=(item->>'end')::integer;quote:=item->>'quote';
   if start_at>=end_at or end_at>length(state->>'original') or end_at-start_at<>length(quote)
    or substring(state->>'original' from start_at+1 for end_at-start_at)<>quote then raise exception 'INVALID_WRITE';end if;
  end loop;
  if (select count(*) from public.source_profile_entries where user_id=uid)>=50
   or exists(select 1 from public.source_profile_entries where user_id=uid and kind=p_command->>'kind' and fields=p_command->'fields') then raise exception 'INVALID_WRITE';end if;
 elsif action in ('confirm','delete') then
  if not exists(select 1 from public.source_profile_entries where user_id=uid and id=record_id) then raise exception 'INVALID_WRITE';end if;
  if action='confirm' and confirmed_value and not current_source then raise exception 'CONFLICT';end if;
 elsif action='clear' and p.user_id is null then raise exception 'INVALID_WRITE';end if;
 if not private.session_is_active() then raise exception 'AUTH';end if;
 if action in ('add','reset') then
  insert into public.source_profiles(user_id,revision,source_workspace_revision,source_original,source_fact_ids)
  values(uid,1,p_workspace_revision,state->>'original',ids)
  on conflict(user_id) do update set revision=public.source_profiles.revision+1,
   source_workspace_revision=case when public.source_profiles.source_original is null or action='reset' then excluded.source_workspace_revision else public.source_profiles.source_workspace_revision end,
   source_original=case when public.source_profiles.source_original is null or action='reset' then excluded.source_original else public.source_profiles.source_original end,
   source_fact_ids=case when public.source_profiles.source_original is null or action='reset' then excluded.source_fact_ids else public.source_profiles.source_fact_ids end;
 else update public.source_profiles set revision=revision+1 where user_id=uid;end if;
 if action='reset' then delete from public.source_profile_entries where user_id=uid;
 elsif action='clear' then
  delete from public.source_profile_entries where user_id=uid;
  update public.source_profiles set source_workspace_revision=null,source_original=null,source_fact_ids=null where user_id=uid;
 elsif action='add' then insert into public.source_profile_entries(user_id,kind,fields) values(uid,p_command->>'kind',p_command->'fields');
 elsif action='delete' then delete from public.source_profile_entries where user_id=uid and id=record_id;
 else update public.source_profile_entries set confirmed=confirmed_value where user_id=uid and id=record_id;end if;
 insert into public.audit_log(user_id,action) values(uid,'source-profile-'||action);
 return private.read_source_profile();
end$$;
revoke all on function private.command_source_profile(integer,integer,jsonb,text) from public,anon,authenticated;
grant execute on function private.command_source_profile(integer,integer,jsonb,text) to authenticated;
create function public.command_source_profile(p_workspace_revision integer,p_profile_revision integer,p_command jsonb,p_accept text) returns jsonb
language sql security invoker set search_path='' as $$select private.command_source_profile(p_workspace_revision,p_profile_revision,p_command,p_accept);$$;
revoke all on function public.command_source_profile(integer,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.command_source_profile(integer,integer,jsonb,text) to authenticated;
do $$declare f record;begin if exists(select 1 from pg_roles where rolname='service_role') then
 execute 'revoke all on public.source_profiles,public.source_profile_entries from service_role';
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('source_profile_storage_permission','source_profile_storage_ready','read_source_profile','command_source_profile') loop
  execute format('revoke all on function %s from service_role',f.oid::regprocedure);
 end loop;
end if;end$$;
commit;

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
