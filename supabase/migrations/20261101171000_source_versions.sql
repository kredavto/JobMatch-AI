-- Current manual source-profile literal snapshots; no model/semantic verification.
begin;
do $$begin
 if to_regclass('public.source_profiles') is null or to_regclass('public.source_profile_entries') is null
  or to_regprocedure('public.read_source_profile()') is null or to_regprocedure('private.source_profile_storage_permission()') is null
  or to_regprocedure('private.locked_workspace(integer)') is null or to_regprocedure('private.workspace_entities(uuid)') is null then
  raise exception 'SOURCE_VERSION_PREDECESSOR_REQUIRED';
 end if;
end;$$;
-- Immutable, literal versions; no model inference and no master workspace mutation.
create table public.source_profile_versions(
 user_id uuid not null references public.workspaces(user_id) on delete cascade,
 id uuid not null default gen_random_uuid(),created timestamptz not null default now(),
 profile_revision integer not null check(profile_revision>0),workspace_revision integer not null check(workspace_revision>=0),
 template_version text not null check(template_version='source-literal-ru-v1'),
 preview_hash text not null check(preview_hash ~ '^[0-9a-f]{64}$'),
 text text not null check(length(text) between 1 and 200000),snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 primary key(user_id,id),unique(user_id,preview_hash)
);
alter table public.source_profile_versions enable row level security;
revoke all on public.source_profile_versions from public,anon,authenticated;
grant select on public.source_profile_versions to authenticated;
create policy owner_read on public.source_profile_versions for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));
create function private.immutable_source_version() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'IMMUTABLE_VERSION';end;$$;
revoke all on function private.immutable_source_version() from public,anon,authenticated;
create trigger immutable_version before update on public.source_profile_versions for each row execute function private.immutable_source_version();

create function private.source_version_storage_permission() returns boolean language sql security invoker set search_path='' as $$select true;$$;
revoke all on function private.source_version_storage_permission() from public,anon,authenticated;
create function public.source_version_storage_ready() returns boolean language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not private.session_is_active() then raise exception 'AUTH';end if;
 return (has_function_privilege('authenticated','private.source_version_storage_permission()','EXECUTE') and has_function_privilege('authenticated','private.source_profile_storage_permission()','EXECUTE'));
end;$$;
revoke all on function public.source_version_storage_ready() from public,anon;
grant execute on function public.source_version_storage_ready() to authenticated;
create function private.source_version_collection_hash(uid uuid,rows jsonb) returns text language plpgsql immutable set search_path='' as $$
declare parts text[]:=array['jobmatch-source-version-collection-v1',uid::text,jsonb_array_length(rows)::text];r jsonb;part text;material bytea:=''::bytea;first boolean:=true;begin
 for r in select value from jsonb_array_elements(rows) loop
  parts:=parts||array[r->>'id',r->>'created',r->>'template_version',r->>'profile_revision',r->>'workspace_revision',r->>'text_length',r->>'preview_hash'];
 end loop;
 foreach part in array parts loop
  if not first then material:=material||'\x00'::bytea;end if;
  first:=false;material:=material||convert_to(part,'UTF8');
 end loop;
 return encode(sha256(material),'hex');
end;$$;
revoke all on function private.source_version_collection_hash(uuid,jsonb) from public,anon,authenticated;

create function private.source_version_preview(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();state jsonb;profile jsonb;selected jsonb;entry jsonb;field jsonb;name text;source text;body text:='Структурированные сведения'||E'\n\n';section text;prefix text;suffix text;context text;left_at integer;right_at integer;pos integer;parts text[];part text;material bytea:=''::bytea;first boolean:=true;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 -- The same owner/workspace lock as import, legacy writes and profile commands.
 state:=private.locked_workspace(p_workspace_revision);
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
  section:=case entry->>'kind' when 'employment' then 'Работа' when 'education' then 'Образование' when 'certification' then 'Сертификат' when 'achievement' then 'Достижение' else null end;
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
    section:=section||E'\n'||case name when 'title' then 'Название' when 'organization' then 'Организация' when 'start' then 'Начало / дата выдачи' when 'end' then 'Окончание' when 'description' then 'Описание' else 'Номер сертификата' end||': '||(field->>'quote');
   end if;
  end loop;
  if body<>'Структурированные сведения'||E'\n\n' then body:=body||E'\n\n';end if;
  body:=body||section;
 end loop;
 if length(body)>200000 then raise exception 'INVALID_WRITE';end if;
 profile:=jsonb_set(profile,'{entries}',selected);
 parts:=array['source-literal-ru-v1','ascii-cyrillic-line-v1','literal-template','null',profile->>'format',profile->>'ownerId',profile->>'revision',profile->>'workspace_revision',profile->>'source_workspace_revision',jsonb_array_length(profile->'source_fact_ids')::text]||(select array_agg(value order by n) from jsonb_array_elements_text(profile->'source_fact_ids') with ordinality f(value,n))||array[source,'true','true',profile->>'sourceVerification',profile->>'semanticAssessment','null',body];
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
 return jsonb_build_object('template_version','source-literal-ru-v1','context_guard_version','ascii-cyrillic-line-v1','generator','literal-template','model_version',null,'snapshot',profile,'text',body,'preview_hash',encode(sha256(material),'hex'));
end;$$;
revoke all on function private.source_version_preview(integer,integer,uuid[]) from public,anon,authenticated;
create function public.preview_source_version(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[]) returns jsonb
language sql security definer set search_path='' as $$select private.source_version_preview(p_workspace_revision,p_profile_revision,p_entry_ids);$$;
revoke all on function public.preview_source_version(integer,integer,uuid[]) from public,anon;
grant execute on function public.preview_source_version(integer,integer,uuid[]) to authenticated;

create function private.source_version_json(v public.source_profile_versions) returns jsonb
language sql stable set search_path='' as $$select jsonb_build_object('format','jobmatch-source-version-v1','id',v.id,'created',v.created,'source_status','at-save-only','template_version',v.template_version,'context_guard_version','ascii-cyrillic-line-v1','generator','literal-template','model_version',null,'snapshot',v.snapshot,'text',v.text,'preview_hash',v.preview_hash);$$;
revoke all on function private.source_version_json(public.source_profile_versions) from public,anon,authenticated;
create function public.save_source_version(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[],p_preview_hash text,p_accept text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();preview jsonb;v public.source_profile_versions%rowtype;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_accept is distinct from 'SAVE_LITERAL_SOURCE_VERSION' or p_preview_hash is null or p_preview_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_WRITE';end if;
 if not (has_function_privilege('authenticated','private.source_version_storage_permission()','EXECUTE') and has_function_privilege('authenticated','private.source_profile_storage_permission()','EXECUTE')) then raise exception 'SOURCE_VERSION_UNAVAILABLE';end if;
 preview:=private.source_version_preview(p_workspace_revision,p_profile_revision,p_entry_ids);
 if not private.session_is_active() then raise exception 'AUTH';end if;
 if not (has_function_privilege('authenticated','private.source_version_storage_permission()','EXECUTE') and has_function_privilege('authenticated','private.source_profile_storage_permission()','EXECUTE')) then raise exception 'SOURCE_VERSION_UNAVAILABLE';end if;
 if preview->>'preview_hash'<>p_preview_hash then raise exception 'CONFLICT';end if;
 select * into v from public.source_profile_versions where user_id=uid and preview_hash=p_preview_hash;
 if found then if not private.session_is_active() then raise exception 'AUTH';end if;return private.source_version_json(v);end if;
 if (select count(*) from public.source_profile_versions where user_id=uid)>=20 then raise exception 'INVALID_WRITE';end if;
 insert into public.source_profile_versions(user_id,profile_revision,workspace_revision,template_version,preview_hash,text,snapshot)
 values(uid,p_profile_revision,p_workspace_revision,preview->>'template_version',p_preview_hash,preview->>'text',preview->'snapshot') returning * into v;
 insert into public.audit_log(user_id,action) values(uid,'source_version_save');
 if not private.session_is_active() then raise exception 'AUTH';end if;
 if not (has_function_privilege('authenticated','private.source_version_storage_permission()','EXECUTE') and has_function_privilege('authenticated','private.source_profile_storage_permission()','EXECUTE')) then raise exception 'SOURCE_VERSION_UNAVAILABLE';end if;
 return private.source_version_json(v);
end;$$;
revoke all on function public.save_source_version(integer,integer,uuid[],text,text) from public,anon;
grant execute on function public.save_source_version(integer,integer,uuid[],text,text) to authenticated;
create function public.read_source_version(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();v public.source_profile_versions%rowtype;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 select * into v from public.source_profile_versions where user_id=uid and id=p_id;
 if not found then return null;end if;return private.source_version_json(v);
end;$$;
create function public.list_source_versions() returns jsonb
language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();rows jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if (select count(*) from public.source_profile_versions where user_id=uid)>20 then raise exception 'INVALID_WRITE';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'created',created,'template_version',template_version,'profile_revision',profile_revision,'workspace_revision',workspace_revision,'text_length',length(text),'preview_hash',preview_hash) order by created desc,id),'[]'::jsonb) into rows from public.source_profile_versions where user_id=uid;
 return jsonb_build_object('format','jobmatch-source-version-list-v1','ownerId',uid,'versions',rows,'collection_hash',private.source_version_collection_hash(uid,rows));
end;$$;
revoke all on function public.read_source_version(uuid),public.list_source_versions() from public,anon;
grant execute on function public.read_source_version(uuid),public.list_source_versions() to authenticated;

-- Cleanup remains available when new storage permission is revoked. It never reads/copies
-- the current master/profile, and a stale reviewed list cannot delete a later addition.
create function public.clear_source_versions(p_collection_hash text,p_accept text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();state jsonb;removed integer;begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_accept is distinct from 'DELETE_LITERAL_SOURCE_VERSIONS' or p_collection_hash is null or p_collection_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_WRITE';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if not private.session_is_active() then raise exception 'AUTH';end if;
 state:=public.list_source_versions();
 if state->>'collection_hash' is distinct from p_collection_hash then raise exception 'CONFLICT';end if;
 delete from public.source_profile_versions where user_id=uid;
 get diagnostics removed=row_count;
 if removed>0 then insert into public.audit_log(user_id,action) values(uid,'source_versions_clear');end if;
 if not private.session_is_active() then raise exception 'AUTH';end if;
 return public.list_source_versions();
end;$$;
revoke all on function public.clear_source_versions(text,text) from public,anon;
grant execute on function public.clear_source_versions(text,text) to authenticated;
commit;
