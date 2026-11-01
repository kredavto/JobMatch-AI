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
