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
