do $$begin
 if private.ordinary_english_permission() is distinct from false then raise exception 'English write permission is not default off';end if;
 if has_function_privilege('anon','public.ordinary_english_ready()','execute') or has_function_privilege('anon','private.ordinary_english_ready()','execute') or has_function_privilege('authenticated','private.ordinary_english_permission()','execute') then raise exception 'Unexpected capability grant';end if;
 if not has_function_privilege('authenticated','public.ordinary_english_ready()','execute') or not has_function_privilege('authenticated','private.ordinary_english_ready()','execute') then raise exception 'Missing authenticated capability grant';end if;
 if (select prosecdef from pg_proc where oid='public.ordinary_english_ready()'::regprocedure) or not (select prosecdef from pg_proc where oid='private.ordinary_english_ready()'::regprocedure) then raise exception 'Wrong capability security context';end if;
 if exists(select 1 from pg_proc where oid in ('public.ordinary_english_ready()'::regprocedure,'private.ordinary_english_ready()'::regprocedure,'private.ordinary_english_permission()'::regprocedure) and not coalesce(proconfig,'{}')@>array['search_path=""']) then raise exception 'Unsafe capability search path';end if;
end$$;
set role anon;
do $$begin
 begin perform public.ordinary_english_ready();raise exception 'Anonymous capability was callable';exception when insufficient_privilege then null;end;
end$$;
reset role;
