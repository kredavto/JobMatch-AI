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
