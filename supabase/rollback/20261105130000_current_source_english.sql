-- Close only future English construction; retain mixed immutable history and readers.
begin;
create or replace function private.source_version_english_permission() returns boolean language sql stable security invoker set search_path='' as $$select false;$$;
revoke all on function private.source_version_english_permission() from public,anon,authenticated,service_role;
commit;
