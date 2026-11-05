-- Retain English-aware reads/restore and every row; close new English formatting only.
begin;
create or replace function private.ordinary_english_permission() returns boolean language sql stable security invoker set search_path='' as $$select false;$$;
revoke all on function private.ordinary_english_permission() from public,anon,authenticated;
commit;
