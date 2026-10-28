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
