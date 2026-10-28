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
