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
