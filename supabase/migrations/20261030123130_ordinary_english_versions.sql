-- Explicit English ordinary literal framing; preserve untagged Russian/default and exact restore.
do $$begin
 if to_regprocedure('private.apply_version_intent(jsonb,integer,jsonb)') is null
    or to_regprocedure('private.validate_version_write(jsonb,jsonb,text,integer)') is null
    or to_regclass('public.resume_versions') is null then raise exception 'ORDINARY_VERSION_BASELINE_REQUIRED';end if;
end;$$;
create or replace function private.apply_version_intent(p_state jsonb,p_revision integer,p_command jsonb) returns jsonb
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
  if p_command-array['action','evidence_ids','score','match_metadata','template_version']<>'{}'::jsonb
   or jsonb_typeof(p_command->'evidence_ids') is distinct from 'array'
   or jsonb_typeof(p_command->'score') is distinct from 'number'
   or length(p_state->>'original')=0 or length(p_state->>'vacancy')=0 then raise exception 'INVALID_WRITE';end if;
  if p_command ? 'template_version' and p_command->>'template_version' is distinct from 'ordinary-literal-en-v1' then raise exception 'INVALID_WRITE';end if;
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
   rendered:=case when p_command->>'template_version'='ordinary-literal-en-v1' then 'RELEVANT EXPERIENCE'||E'\n'||promoted||E'\n\nPROFILE\n'||remainder else 'РЕЛЕВАНТНЫЙ ОПЫТ'||E'\n'||promoted||E'\n\nПРОФИЛЬ\n'||remainder end;
  end if;
  candidate:=jsonb_build_object('id',gen_random_uuid()::text,'created',stamp,'text',rendered,'vacancy',p_state->>'vacancy',
   'evidence_ids',ids,'evidence_snapshot',snapshot,'profile_revision',p_revision,'engine_version','rules-v1','score',score::integer,'match_metadata',metadata);
  if p_command->>'template_version'='ordinary-literal-en-v1' then candidate:=candidate||jsonb_build_object('template_version','ordinary-literal-en-v1');end if;
 end if;
 return jsonb_set(p_state,'{versions}',(p_state->'versions')||jsonb_build_array(candidate));
end;$$;
revoke all on function private.apply_version_intent(jsonb,integer,jsonb) from public,anon,authenticated;
create or replace function private.validate_version_write(old_state jsonb,new_state jsonb,p_action text,p_revision integer) returns void language plpgsql security invoker set search_path='' as $$
declare old_facts jsonb:=old_state->'facts';old_versions jsonb:=old_state->'versions';new_versions jsonb:=new_state->'versions';n integer;candidate jsonb;original_version jsonb;snapshot jsonb;promoted text;remainder text;rendered text;
begin
  n:=jsonb_array_length(old_versions);candidate:=new_versions->n;
  if jsonb_array_length(new_versions)<>n+1 or (new_versions-n)<>old_versions or jsonb_typeof(candidate->'id') is distinct from 'string' or jsonb_typeof(candidate->'created') is distinct from 'string' or length(candidate->>'created')>100 then raise exception 'INVALID_WRITE';end if;
  if p_action='restore' then
   select v into original_version from jsonb_array_elements(old_versions) v where v->>'id'=candidate->>'restored_from';
   if original_version is null or (candidate-array['id','created','restored_from']) is distinct from (original_version-array['id','created','restored_from']) then raise exception 'INVALID_WRITE';end if;
  else
   if candidate ? 'template_version' and candidate->>'template_version' is distinct from 'ordinary-literal-en-v1' then raise exception 'INVALID_WRITE';end if;
   if candidate->>'engine_version' is distinct from 'rules-v1' or candidate->'profile_revision' is distinct from to_jsonb(p_revision) or candidate->>'vacancy' is distinct from old_state->>'vacancy' or jsonb_typeof(candidate->'evidence_ids') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
   if (select count(*)<>count(distinct v) from jsonb_array_elements_text(candidate->'evidence_ids') v) or exists(select 1 from jsonb_array_elements_text(candidate->'evidence_ids') e where not exists(select 1 from jsonb_array_elements(old_facts) f where f->>'id'=e and f->'verified'='true')) then raise exception 'INVALID_WRITE';end if;
   select coalesce(jsonb_agg(f order by i),'[]') into snapshot from jsonb_array_elements(old_facts) with ordinality facts(f,i) where candidate->'evidence_ids' ? (f->>'id');
   if candidate->'evidence_snapshot' is distinct from snapshot then raise exception 'INVALID_WRITE';end if;
   if jsonb_array_length(candidate->'evidence_ids')=0 then rendered:=old_state->>'original';
   else
    select string_agg(f->>'text',E'\n' order by i) into promoted from jsonb_array_elements_text(candidate->'evidence_ids') with ordinality ids(e,i) join jsonb_array_elements(old_facts) f on f->>'id'=e;
    select coalesce(string_agg(line,E'\n' order by i),'') into remainder from regexp_split_to_table(old_state->>'original',E'\r?\n') with ordinality lines(line,i) where not exists(select 1 from jsonb_array_elements(snapshot) f where f->>'text'=private.trim_fact_line(line));
    rendered:=case when candidate->>'template_version'='ordinary-literal-en-v1' then 'RELEVANT EXPERIENCE'||E'\n'||promoted||E'\n\nPROFILE\n'||remainder else 'РЕЛЕВАНТНЫЙ ОПЫТ'||E'\n'||promoted||E'\n\nПРОФИЛЬ\n'||remainder end;
   end if;
   if candidate->>'text' is distinct from rendered then raise exception 'INVALID_WRITE';end if;
  end if;

end;$$;
revoke all on function private.validate_version_write(jsonb,jsonb,text,integer) from public,anon,authenticated;
