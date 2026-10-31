begin;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}',true);
set local role authenticated;
do $$declare s jsonb;begin
 s:=public.read_workspace();
 if not exists(select 1 from jsonb_array_elements(s->'applications') a where a->>'id'='a1' and a->>'specialty'='SYNTHETIC analyst')
  or not exists(select 1 from public.applications where id='a1' and extra->>'specialty'='SYNTHETIC analyst') then raise exception 'restored specialty read mismatch';end if;
end;$$;
rollback;
