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
