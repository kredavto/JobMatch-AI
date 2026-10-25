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
