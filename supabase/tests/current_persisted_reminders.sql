-- Run after the disposable native fixture has one owner reminder. Never on production.
begin;
do $$begin
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='application_reminders' and c.relrowsecurity) or not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname='reminder_state' and c.relrowsecurity) then raise exception 'MISSING_REMINDER_RLS';end if;
 if has_table_privilege('authenticated','public.application_reminders','INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('anon','public.application_reminders','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('authenticated','private.reminder_state','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') or has_function_privilege('anon','public.command_reminder(integer,integer,jsonb)','EXECUTE') then raise exception 'UNSAFE_REMINDER_GRANT';end if;
end$$;
set local role authenticated;
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}';
do $$begin
 if (select count(*) from public.application_reminders)=0 then raise exception 'MISSING_OWNER_FIXTURE';end if;
 begin insert into public.application_reminders default values;raise exception 'DIRECT_INSERT_ALLOWED';exception when insufficient_privilege then null;end;
 begin update public.application_reminders set status='cancelled' where false;raise exception 'DIRECT_UPDATE_ALLOWED';exception when insufficient_privilege then null;end;
 begin delete from public.application_reminders where false;raise exception 'DIRECT_DELETE_ALLOWED';exception when insufficient_privilege then null;end;
 begin perform * from private.reminder_state;raise exception 'PRIVATE_COUNTER_ALLOWED';exception when insufficient_privilege then null;end;
end$$;
set local request.jwt.claims='{"sub":"22222222-2222-4222-8222-222222222222","session_id":"55555555-5555-4555-8555-555555555555"}';
do $$begin if (select count(*) from public.application_reminders)<>0 then raise exception 'FOREIGN_REMINDER_VISIBLE';end if;end$$;
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","session_id":"66666666-6666-4666-8666-666666666666"}';
do $$begin if (select count(*) from public.application_reminders)<>0 then raise exception 'REVOKED_REMINDER_VISIBLE';end if;end$$;
reset role;
set local role anon;
do $$begin
 begin perform * from public.application_reminders;raise exception 'ANON_SELECT_ALLOWED';exception when insufficient_privilege then null;end;
 begin insert into public.application_reminders default values;raise exception 'ANON_INSERT_ALLOWED';exception when insufficient_privilege then null;end;
 begin update public.application_reminders set status='cancelled' where false;raise exception 'ANON_UPDATE_ALLOWED';exception when insufficient_privilege then null;end;
 begin delete from public.application_reminders where false;raise exception 'ANON_DELETE_ALLOWED';exception when insufficient_privilege then null;end;
 begin perform public.read_reminders();raise exception 'ANON_RPC_ALLOWED';exception when insufficient_privilege then null;end;
end$$;
rollback;
