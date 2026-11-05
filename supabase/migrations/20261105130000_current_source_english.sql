-- Additive English literal framing for the current source-profile archive. No model.
begin;
do $$begin
 if to_regclass('public.reminder_state') is null or to_regprocedure('public.ordinary_english_ready()') is null
  or (select md5(prosrc) from pg_proc where oid=to_regprocedure('private.source_version_preview(integer,integer,uuid[])')) is distinct from '9ba4ccd648b8ef7fd21c4b2e1c91e06d'
  or (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.save_source_version(integer,integer,uuid[],text,text)')) is distinct from 'e4168ec677e78c86ab47eaeff7a16203' then
  raise exception 'SOURCE_ENGLISH_PREDECESSOR_REQUIRED';
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.source_profile_versions'::regclass and conname='source_profile_versions_template_version_check'
  and pg_get_constraintdef(oid) in ('CHECK ((template_version = ''source-literal-ru-v1''::text))', 'CHECK ((template_version = ANY (ARRAY[''source-literal-ru-v1''::text, ''source-literal-en-v1''::text])))')) then
  raise exception 'SOURCE_ENGLISH_CONSTRAINT_REQUIRED';
 end if;
 if to_regprocedure('private.source_version_preview_english(integer,integer,uuid[])') is not null and (select md5(prosrc) from pg_proc where oid=to_regprocedure('private.source_version_preview_english(integer,integer,uuid[])')) is distinct from '644aefb02137dc8c5b62d4865f7b9ab6' then raise exception 'SOURCE_ENGLISH_EXISTING_BODY_REQUIRED';end if;
 if to_regprocedure('public.save_source_version_english(integer,integer,uuid[],text,text)') is not null and (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.save_source_version_english(integer,integer,uuid[],text,text)')) is distinct from 'e35f81ce480f53f21d48cc7d6a7b0473' then raise exception 'SOURCE_ENGLISH_EXISTING_BODY_REQUIRED';end if;
end;$$;
-- Reapplying closes new English construction. Existing mixed history stays readable.
create or replace function private.source_version_english_permission() returns boolean language sql stable security invoker set search_path='' as $$select false;$$;
revoke all on function private.source_version_english_permission() from public,anon,authenticated,service_role;
alter table public.source_profile_versions drop constraint source_profile_versions_template_version_check;
alter table public.source_profile_versions add constraint source_profile_versions_template_version_check check(template_version in ('source-literal-ru-v1','source-literal-en-v1'));
create or replace function private.source_version_english_ready() returns boolean language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or not private.session_is_active() then raise exception 'AUTH';end if;
 return private.source_version_english_permission();
end;$$;
revoke all on function private.source_version_english_ready() from public,anon,service_role;
grant execute on function private.source_version_english_ready() to authenticated;
create or replace function public.source_version_english_ready() returns boolean language sql stable security invoker set search_path='' as $$select private.source_version_english_ready();$$;
revoke all on function public.source_version_english_ready() from public,anon,service_role;
grant execute on function public.source_version_english_ready() to authenticated;
create or replace function private.source_version_preview_english(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();state jsonb;profile jsonb;selected jsonb;entry jsonb;field jsonb;name text;source text;body text:='Structured information'||E'\n\n';section text;prefix text;suffix text;context text;left_at integer;right_at integer;pos integer;parts text[];part text;material bytea:=''::bytea;first boolean:=true;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 -- The same owner/workspace lock as import, legacy writes and profile commands.
 state:=private.locked_workspace(p_workspace_revision);
 if not private.source_version_english_permission() then raise exception 'SOURCE_ENGLISH_UNAVAILABLE';end if;

 perform 1 from public.source_profiles where user_id=uid for update;
 profile:=public.read_source_profile();
 if p_profile_revision is null or p_profile_revision<1 or (profile->>'revision')::integer<>p_profile_revision or not (profile->>'source_captured')::boolean or not (profile->>'source_matches')::boolean then raise exception 'CONFLICT';end if;
 if p_entry_ids is null or cardinality(p_entry_ids) not between 1 and 50 or array_ndims(p_entry_ids)<>1 or array_position(p_entry_ids,null) is not null or (select count(distinct id) from unnest(p_entry_ids) id)<>cardinality(p_entry_ids) then raise exception 'INVALID_WRITE';end if;
 select jsonb_agg(value order by n) into selected from jsonb_array_elements(profile->'entries') with ordinality e(value,n) where (value->>'id')::uuid=any(p_entry_ids);
 if coalesce(jsonb_array_length(selected),0)<>cardinality(p_entry_ids) or exists(select 1 from jsonb_array_elements(selected) e where e->>'confirmed' is distinct from 'true') then raise exception 'INVALID_WRITE';end if;
 source:=profile->>'source_original';
 if private.trim_fact_line(source)='' or jsonb_array_length(profile->'source_fact_ids')=0 then raise exception 'INVALID_WRITE';end if;
 for entry in select value from jsonb_array_elements(selected) loop
  if jsonb_typeof(entry->'fields') is distinct from 'object' or ((entry->'fields')-array['title','organization','start','end','description','credential'])<>'{}'::jsonb
   or not((entry->'fields')?(case when entry->>'kind'='achievement' then 'description' else 'title' end))
   or ((entry->'fields')?'credential' and entry->>'kind'<>'certification')
   or coalesce(entry->>'created','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then raise exception 'INVALID_WRITE';end if;
  section:=case entry->>'kind' when 'employment' then 'Employment' when 'education' then 'Education' when 'certification' then 'Certification' when 'achievement' then 'Achievement' else null end;
  if section is null then raise exception 'INVALID_WRITE';end if;
  foreach name in array array['title','organization','start','end','description','credential'] loop
   field:=entry->'fields'->name;
   if field is not null then
    if jsonb_typeof(field) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
    if (field-array['quote','start','end'])<>'{}'::jsonb or jsonb_typeof(field->'quote') is distinct from 'string'
     or length(field->>'quote') not between 1 and 500 or private.trim_fact_line(field->>'quote')=''
     or jsonb_typeof(field->'start') is distinct from 'number' or jsonb_typeof(field->'end') is distinct from 'number'
     or coalesce(field->>'start','')!~'^(0|[1-9][0-9]{0,5})$' or coalesce(field->>'end','')!~'^[1-9][0-9]{0,5}$' then raise exception 'INVALID_WRITE';end if;
    if (field->>'start')::integer<0 or (field->>'end')::integer>length(source) or (field->>'end')::integer<=(field->>'start')::integer
     or substring(source from (field->>'start')::integer+1 for (field->>'end')::integer-(field->>'start')::integer) is distinct from field->>'quote' then raise exception 'INVALID_WRITE';end if;
    prefix:=substring(source from 1 for (field->>'start')::integer);suffix:=substring(source from (field->>'end')::integer+1);
    pos:=strpos(reverse(prefix),E'\n');left_at:=case when pos>0 then length(prefix)-pos+2 else 1 end;
    pos:=strpos(suffix,E'\n');right_at:=case when pos>0 then (field->>'end')::integer+pos else length(source)+1 end;
    context:=substring(source from left_at for right_at-left_at);
    if translate(context,'ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ','abcdefghijklmnopqrstuvwxyzабвгдеёжзийклмнопрстуфхцчшщъыьэюя') ~ '(^|[^a-zа-яё])(не|нет|без|никогда|изучаю|планирую|хочу|буду|собираюсь|no|not|never|cannot|can.t|don.t|doesn.t|didn.t|haven.t|hasn.t|wasn.t|weren.t|without|learning|studying|planning)([^a-zа-яё]|$)|ignore|system prompt|игнорир|инструкци|<script|plan to|want to learn|will learn' then raise exception 'UNSAFE_CONTEXT';end if;
    section:=section||E'\n'||case name when 'title' then 'Title' when 'organization' then 'Organization' when 'start' then 'Start / issue date' when 'end' then 'End' when 'description' then 'Description' else 'Credential number' end||': '||(field->>'quote');
   end if;
  end loop;
  if body<>'Structured information'||E'\n\n' then body:=body||E'\n\n';end if;
  body:=body||section;
 end loop;
 if length(body)>200000 then raise exception 'INVALID_WRITE';end if;
 profile:=jsonb_set(profile,'{entries}',selected);
 parts:=array['source-literal-en-v1','ascii-cyrillic-line-v1','literal-template','null',profile->>'format',profile->>'ownerId',profile->>'revision',profile->>'workspace_revision',profile->>'source_workspace_revision',jsonb_array_length(profile->'source_fact_ids')::text]||(select array_agg(value order by n) from jsonb_array_elements_text(profile->'source_fact_ids') with ordinality f(value,n))||array[source,'true','true',profile->>'sourceVerification',profile->>'semanticAssessment','null',body];
 for entry in select value from jsonb_array_elements(selected) loop
  parts:=parts||array[entry->>'id',entry->>'kind',entry->>'created','true'];
  foreach name in array array['title','organization','start','end','description','credential'] loop
   field:=entry->'fields'->name;parts:=parts||array[name,coalesce(field->>'start',''),coalesce(field->>'end',''),coalesce(field->>'quote','')];
  end loop;
 end loop;
 foreach part in array parts loop
  if not first then material:=material||'\x00'::bytea;end if;
  first:=false;material:=material||convert_to(part,'UTF8');
 end loop;
 if not private.source_version_english_permission() then raise exception 'SOURCE_ENGLISH_UNAVAILABLE';end if;
 return jsonb_build_object('template_version','source-literal-en-v1','context_guard_version','ascii-cyrillic-line-v1','generator','literal-template','model_version',null,'snapshot',profile,'text',body,'preview_hash',encode(sha256(material),'hex'));
end;$$;
create or replace function public.preview_source_version_english(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[]) returns jsonb
language sql security definer set search_path='' as $$select private.source_version_preview_english(p_workspace_revision,p_profile_revision,p_entry_ids);$$;
revoke all on function private.source_version_preview_english(integer,integer,uuid[]) from public,anon,authenticated,service_role;
revoke all on function public.preview_source_version_english(integer,integer,uuid[]) from public,anon,service_role;
grant execute on function public.preview_source_version_english(integer,integer,uuid[]) to authenticated;
create or replace function public.save_source_version_english(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[],p_preview_hash text,p_accept text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();preview jsonb;v public.source_profile_versions%rowtype;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_accept is distinct from 'SAVE_LITERAL_SOURCE_VERSION' or p_preview_hash is null or p_preview_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_WRITE';end if;
 if not (has_function_privilege('authenticated','private.source_version_storage_permission()','EXECUTE') and has_function_privilege('authenticated','private.source_profile_storage_permission()','EXECUTE')) then raise exception 'SOURCE_VERSION_UNAVAILABLE';end if;
 if not private.source_version_english_permission() then raise exception 'SOURCE_ENGLISH_UNAVAILABLE';end if;

 preview:=private.source_version_preview_english(p_workspace_revision,p_profile_revision,p_entry_ids);
 if not private.session_is_active() then raise exception 'AUTH';end if;
 if not (has_function_privilege('authenticated','private.source_version_storage_permission()','EXECUTE') and has_function_privilege('authenticated','private.source_profile_storage_permission()','EXECUTE')) then raise exception 'SOURCE_VERSION_UNAVAILABLE';end if;
 if not private.source_version_english_permission() then raise exception 'SOURCE_ENGLISH_UNAVAILABLE';end if;

 if preview->>'preview_hash'<>p_preview_hash then raise exception 'CONFLICT';end if;
 select * into v from public.source_profile_versions where user_id=uid and preview_hash=p_preview_hash;
 if found then if not private.session_is_active() then raise exception 'AUTH';end if;return private.source_version_json(v);end if;
 if (select count(*) from public.source_profile_versions where user_id=uid)>=20 then raise exception 'INVALID_WRITE';end if;
 insert into public.source_profile_versions(user_id,profile_revision,workspace_revision,template_version,preview_hash,text,snapshot)
 values(uid,p_profile_revision,p_workspace_revision,preview->>'template_version',p_preview_hash,preview->>'text',preview->'snapshot') returning * into v;
 insert into public.audit_log(user_id,action) values(uid,'source_version_save');
 if not private.session_is_active() then raise exception 'AUTH';end if;
 if not (has_function_privilege('authenticated','private.source_version_storage_permission()','EXECUTE') and has_function_privilege('authenticated','private.source_profile_storage_permission()','EXECUTE')) then raise exception 'SOURCE_VERSION_UNAVAILABLE';end if;
 if not private.source_version_english_permission() then raise exception 'SOURCE_ENGLISH_UNAVAILABLE';end if;

 return private.source_version_json(v);
end;$$;
revoke all on function public.save_source_version_english(integer,integer,uuid[],text,text) from public,anon,service_role;
grant execute on function public.save_source_version_english(integer,integer,uuid[],text,text) to authenticated;
commit;
