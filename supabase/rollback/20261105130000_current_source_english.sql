-- Close only future English construction; retain mixed immutable history and readers.
begin;
create or replace function private.source_version_english_permission() returns boolean language sql stable security invoker set search_path='' as $$select false;$$;
revoke all on function private.source_version_english_permission() from public,anon,authenticated;
do $$begin if exists(select 1 from pg_roles where rolname='service_role') then revoke all on function private.source_version_english_permission() from service_role;end if;end$$;
commit;
