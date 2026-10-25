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
