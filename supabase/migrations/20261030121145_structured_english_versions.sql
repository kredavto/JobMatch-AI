-- Frozen English structured outlines; legacy Russian functions/text/hash are untouched.
do $$begin
 if to_regprocedure('private.structured_preview(integer,integer,uuid[])') is null
    or to_regclass('public.structured_resume_versions') is null
    or to_regprocedure('private.session_is_active()') is null then
  raise exception 'STRUCTURED_VERSION_BASELINE_REQUIRED';
 end if;
end;$$;
alter table public.structured_resume_versions drop constraint structured_resume_versions_template_version_check;
alter table public.structured_resume_versions add constraint structured_resume_versions_template_version_check
 check(template_version in ('structured-literal-v1','structured-literal-en-v1'));

create function private.structured_english_preview(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();legacy jsonb;profile jsonb;selected jsonb;entry jsonb;field jsonb;name text;source text;body text:='Structured information'||E'\n\n';section text;parts text[];part text;material bytea:=''::bytea;first boolean:=true;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 perform 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=uid for share;
 if not found then raise exception 'AUTH';end if;
 -- Reuse the frozen source/confirmation/context/selection/revision validation under its owner lock.
 legacy:=private.structured_preview(p_workspace_revision,p_profile_revision,p_entry_ids);
 profile:=legacy->'snapshot';selected:=profile->'entries';source:=profile->>'source_original';
 for entry in select value from jsonb_array_elements(selected) loop
  section:=case entry->>'kind' when 'employment' then 'Employment' when 'education' then 'Education' when 'certification' then 'Certification' when 'achievement' then 'Achievement' else null end;
  if section is null then raise exception 'INVALID_WRITE';end if;
  foreach name in array array['title','organization','start','end','description','credential'] loop
   field:=entry->'fields'->name;
   if field is not null then
    section:=section||E'\n'||case name when 'title' then 'Title' when 'organization' then 'Organization' when 'start' then 'Start / issue date' when 'end' then 'End' when 'description' then 'Description' else 'Credential number' end||': '||(field->>'quote');
   end if;
  end loop;
  if body<>'Structured information'||E'\n\n' then body:=body||E'\n\n';end if;
  body:=body||section;
 end loop;
 if length(body)>200000 then raise exception 'INVALID_WRITE';end if;
 parts:=array['structured-literal-en-v1','line-risk-v1','literal-template','null',profile->>'format',profile->>'ownerId',profile->>'revision',profile->>'workspace_revision',profile->>'source_workspace_revision',jsonb_array_length(profile->'source_fact_ids')::text]||(select array_agg(value order by n) from jsonb_array_elements_text(profile->'source_fact_ids') with ordinality f(value,n))||array[source,'true',body];
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
 return jsonb_build_object('template_version','structured-literal-en-v1','context_guard_version','line-risk-v1','generator','literal-template','model_version',null,'snapshot',profile,'text',body,'preview_hash',encode(sha256(material),'hex'));
end;$$;
revoke all on function private.structured_english_preview(integer,integer,uuid[]) from public,anon;
grant execute on function private.structured_english_preview(integer,integer,uuid[]) to authenticated;
create function public.preview_structured_english_version(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[]) returns jsonb
language sql security invoker set search_path='' as $$select private.structured_english_preview(p_workspace_revision,p_profile_revision,p_entry_ids);$$;
revoke all on function public.preview_structured_english_version(integer,integer,uuid[]) from public,anon;
grant execute on function public.preview_structured_english_version(integer,integer,uuid[]) to authenticated;

create function private.save_structured_english_version(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[],p_preview_hash text,p_accept text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();preview jsonb;v public.structured_resume_versions%rowtype;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_accept is distinct from 'SAVE_LITERAL_VERSION' or p_preview_hash is null or p_preview_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_WRITE';end if;
 preview:=private.structured_english_preview(p_workspace_revision,p_profile_revision,p_entry_ids);
 if preview->>'preview_hash'<>p_preview_hash then raise exception 'CONFLICT';end if;
 select * into v from public.structured_resume_versions where user_id=uid and preview_hash=p_preview_hash;
 if found then return private.structured_version_json(v);end if;
 if (select count(*) from public.structured_resume_versions where user_id=uid)>=20 then raise exception 'INVALID_WRITE';end if;
 insert into public.structured_resume_versions(user_id,profile_revision,workspace_revision,template_version,preview_hash,text,snapshot)
 values(uid,p_profile_revision,p_workspace_revision,preview->>'template_version',p_preview_hash,preview->>'text',preview->'snapshot') returning * into v;
 insert into public.audit_log(user_id,action) values(uid,'structured_version_save');
 return private.structured_version_json(v);
end;$$;
revoke all on function private.save_structured_english_version(integer,integer,uuid[],text,text) from public,anon;
grant execute on function private.save_structured_english_version(integer,integer,uuid[],text,text) to authenticated;
create function public.save_structured_english_version(p_workspace_revision integer,p_profile_revision integer,p_entry_ids uuid[],p_preview_hash text,p_accept text) returns jsonb
language sql security invoker set search_path='' as $$select private.save_structured_english_version(p_workspace_revision,p_profile_revision,p_entry_ids,p_preview_hash,p_accept);$$;
revoke all on function public.save_structured_english_version(integer,integer,uuid[],text,text) from public,anon;
grant execute on function public.save_structured_english_version(integer,integer,uuid[],text,text) to authenticated;
