-- Existing synthetic restore fixture only. Used before the incremental function migration.
update public.applications set extra=extra||'{"specialty":{"legacy":["opaque"]}}'::jsonb
where user_id='11111111-1111-4111-8111-111111111111' and id='a1';
do $$begin
 if not exists(select 1 from public.applications where user_id='11111111-1111-4111-8111-111111111111' and id='a1' and extra->'specialty'='{"legacy":["opaque"]}'::jsonb) then raise exception 'synthetic specialty upgrade fixture missing';end if;
end;$$;
