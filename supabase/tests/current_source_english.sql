do $$begin
 if private.source_version_english_permission() is distinct from false then raise exception 'English write permission is not default off';end if;
 if has_function_privilege('anon','public.source_version_english_ready()','execute') or has_function_privilege('anon','private.source_version_english_ready()','execute') or has_function_privilege('authenticated','private.source_version_english_permission()','execute') then raise exception 'Unexpected capability grant';end if;
 if not has_function_privilege('authenticated','public.source_version_english_ready()','execute') or not has_function_privilege('authenticated','private.source_version_english_ready()','execute') then raise exception 'Missing authenticated capability grant';end if;
 if (select prosecdef from pg_proc where oid='public.source_version_english_ready()'::regprocedure) or not (select prosecdef from pg_proc where oid='private.source_version_english_ready()'::regprocedure) then raise exception 'Wrong capability security context';end if;
 if exists(select 1 from pg_proc where oid in ('public.source_version_english_ready()'::regprocedure,'private.source_version_english_ready()'::regprocedure,'private.source_version_english_permission()'::regprocedure) and not coalesce(proconfig,'{}')@>array['search_path=""']) then raise exception 'Unsafe capability search path';end if;
 if has_function_privilege('authenticated','private.source_version_preview_english(integer,integer,uuid[])','execute') then raise exception 'Private renderer was callable';end if;
 if has_function_privilege('anon','public.preview_source_version_english(integer,integer,uuid[])','execute') or has_function_privilege('anon','public.save_source_version_english(integer,integer,uuid[],text,text)','execute') then raise exception 'Anonymous writer was callable';end if;
end$$;
set role anon;
do $$begin
 begin perform public.source_version_english_ready();raise exception 'Anonymous capability was callable';exception when insufficient_privilege then null;end;
end$$;
reset role;
