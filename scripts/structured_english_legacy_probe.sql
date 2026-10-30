-- Fixed, synthetic fixture only: row and frozen legacy-function fingerprints plus native preview.
select md5(coalesce(jsonb_agg(to_jsonb(v) order by v.user_id,v.id)::text,'')) from public.structured_resume_versions v;
select md5(string_agg(pg_get_functiondef(p.oid)||coalesce(p.proacl::text,''),E'\n' order by p.oid))
 from pg_proc p where p.oid in('private.structured_preview(integer,integer,uuid[])'::regprocedure,'public.preview_structured_version(integer,integer,uuid[])'::regprocedure,'public.save_structured_version(integer,integer,uuid[],text,text)'::regprocedure);
set request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}';
set role authenticated;
select md5(public.preview_structured_version(1,2,array[(public.read_structured_profile()#>>'{entries,0,id}')::uuid])::text);
