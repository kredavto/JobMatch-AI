-- Closed rollback retains immutable records, structural readers and the legacy
-- namespace guard. Source protocol only; no provider/CLI installation performed.
begin;
create or replace function private.rewrite_storage_configuration() returns text language sql stable security invoker set search_path='' as $$select null::text;$$;
revoke all on function private.rewrite_storage_configuration() from public,anon,authenticated;
do $$begin if exists(select 1 from pg_roles where rolname='service_role') then revoke all on function private.rewrite_storage_configuration() from service_role;end if;end$$;
commit;
