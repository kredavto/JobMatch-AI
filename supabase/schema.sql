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
