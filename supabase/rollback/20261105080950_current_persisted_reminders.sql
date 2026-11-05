-- Close writes atomically; retain all data, owner reads/exports and monotonic revision.
begin;
create or replace function private.reminder_storage_permission() returns boolean language sql security invoker set search_path='' as $$select false;$$;
revoke all on function private.reminder_storage_permission() from public,anon,authenticated;
revoke all on function public.command_reminder(integer,integer,jsonb) from public,anon,authenticated;
revoke all on function private.command_reminder(integer,integer,jsonb) from public,anon,authenticated;
commit;
