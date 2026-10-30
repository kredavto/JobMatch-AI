\set ON_ERROR_STOP on
begin;
create temporary table mixed_user(uid uuid,sid uuid);
insert into mixed_user values(gen_random_uuid(),gen_random_uuid());
insert into auth.users select uid from mixed_user;
insert into auth.sessions(id,user_id) select sid,uid from mixed_user;
select set_config('request.jwt.claims',jsonb_build_object('sub',uid,'session_id',sid)::text,true) from mixed_user;
set local role authenticated;
do $$declare p jsonb;ru jsonb;en jsonb;r jsonb;e jsonb;ids uuid[];begin
 perform public.apply_workspace_command(0,'{"action":"import","text":"😀 Python — 42%"}');
 p:=public.command_structured_profile(1,0,'{"action":"add","kind":"achievement","fields":{"description":{"quote":"Python — 42%","start":2,"end":14}}}');
 ids:=array[(p#>>'{entries,0,id}')::uuid];
 perform public.command_structured_profile(1,1,jsonb_build_object('action','confirm','id',ids[1],'confirmed',true));
 ru:=public.preview_structured_version(1,2,ids);en:=public.preview_structured_english_version(1,2,ids);
 if ru->'snapshot' is distinct from en->'snapshot' or ru->>'preview_hash'=en->>'preview_hash'
    or en->>'text'<>E'Structured information\n\nAchievement\nDescription: Python — 42%' then raise exception 'TEMPLATE_BINDING';end if;
 begin perform public.save_structured_english_version(1,2,ids,ru->>'preview_hash','SAVE_LITERAL_VERSION');raise exception 'RU_HASH_AS_EN';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 begin perform public.save_structured_version(1,2,ids,en->>'preview_hash','SAVE_LITERAL_VERSION');raise exception 'EN_HASH_AS_RU';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 r:=public.save_structured_version(1,2,ids,ru->>'preview_hash','SAVE_LITERAL_VERSION');
 e:=public.save_structured_english_version(1,2,ids,en->>'preview_hash','SAVE_LITERAL_VERSION');
 if r->>'id'=e->>'id' or jsonb_array_length(public.list_structured_versions()->'versions')<>2
    or public.read_structured_version((r->>'id')::uuid) is distinct from r
    or public.read_structured_version((e->>'id')::uuid) is distinct from e then raise exception 'MIXED_HISTORY';end if;
 if public.save_structured_version(1,2,ids,ru->>'preview_hash','SAVE_LITERAL_VERSION') is distinct from r
    or public.save_structured_english_version(1,2,ids,en->>'preview_hash','SAVE_LITERAL_VERSION') is distinct from e then raise exception 'MIXED_REPLAY';end if;
end;$$;
reset role;
do $$declare n text;begin
 foreach n in array array['public.preview_structured_english_version(integer,integer,uuid[])','public.save_structured_english_version(integer,integer,uuid[],text,text)','private.structured_english_preview(integer,integer,uuid[])','private.save_structured_english_version(integer,integer,uuid[],text,text)'] loop
  if has_function_privilege('anon',n,'execute') or not has_function_privilege('authenticated',n,'execute') then raise exception 'FUNCTION_GRANTS';end if;
 end loop;
 if exists(select 1 from pg_proc where oid in('public.preview_structured_english_version(integer,integer,uuid[])'::regprocedure,'public.save_structured_english_version(integer,integer,uuid[],text,text)'::regprocedure) and prosecdef) then raise exception 'PUBLIC_DEFINER';end if;
end;$$;
rollback;
