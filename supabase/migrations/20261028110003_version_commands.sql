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
