-- Additive owner-scoped reminder storage. No delivery, scheduler or operator activation.
begin;
create table if not exists private.reminder_state (
 user_id uuid primary key references public.workspaces(user_id) on delete cascade,
 revision integer not null check(revision between 0 and 2147483647)
);
alter table private.reminder_state enable row level security;
revoke all on private.reminder_state from public,anon,authenticated;

create or replace function private.valid_reminder_details(v jsonb) returns boolean language plpgsql stable set search_path='' as $$
declare due timestamptz;off integer;begin
 if jsonb_typeof(v) is distinct from 'object' or array(select jsonb_object_keys(v) order by 1) is distinct from array['applicationId','description','dueAt','kind','localStart','minutes','offsetMinutes','zone'] then return false;end if;
 if jsonb_typeof(v->'applicationId') is distinct from 'string' or length(v->>'applicationId') not between 1 and 200
  or jsonb_typeof(v->'description') is distinct from 'string' or length(v->>'description')>3000
  or (v->>'applicationId')~'[\x01-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]' or (v->>'description')~'[\x01-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]'
  or jsonb_typeof(v->'kind') is distinct from 'string' or v->>'kind' not in ('interview','follow-up')
  or jsonb_typeof(v->'localStart') is distinct from 'string' or (v->>'localStart')!~'^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$'
  or jsonb_typeof(v->'zone') is distinct from 'string' or length(v->>'zone') not between 1 and 100
  or jsonb_typeof(v->'dueAt') is distinct from 'string' or (v->>'dueAt')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:00\.000Z$'
  or jsonb_typeof(v->'offsetMinutes') is distinct from 'number' or (v->>'offsetMinutes')!~'^-?[0-9]+$'
  or jsonb_typeof(v->'minutes') is distinct from 'number' or v->>'minutes' not in ('15','30','60','90') then return false;end if;
 off:=(v->>'offsetMinutes')::integer;due:=(v->>'dueAt')::timestamptz;
 return off between -840 and 840 and to_char(due at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')=v->>'dueAt'
  and to_char((due at time zone 'UTC')+make_interval(mins=>off),'YYYY-MM-DD"T"HH24:MI')=v->>'localStart';
exception when others then return false;end$$;
revoke all on function private.valid_reminder_details(jsonb) from public,anon,authenticated;

create table if not exists public.application_reminders (
 user_id uuid not null references public.workspaces(user_id) on delete cascade,
 id uuid not null,revision integer not null check(revision between 1 and 2147483647),
 created timestamptz not null,updated timestamptz not null check(updated>=created),
 status text not null check(status in ('scheduled','completed','cancelled')),
 details jsonb not null check(private.valid_reminder_details(details)),primary key(user_id,id)
);
alter table public.application_reminders enable row level security;
revoke all on public.application_reminders from public,anon,authenticated;
grant select on public.application_reminders to authenticated;
drop policy if exists reminders_owner on public.application_reminders;
create policy reminders_owner on public.application_reminders for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));

-- Deployment alone never enables writing personal reminder content.
create or replace function private.reminder_storage_permission() returns boolean language sql security invoker set search_path='' as $$select false;$$;
revoke all on function private.reminder_storage_permission() from public,anon,authenticated;
create or replace function private.read_reminders() returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();rev integer;items jsonb;begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 select coalesce((select revision from private.reminder_state where user_id=uid),0) into rev;
 select coalesce(jsonb_agg(details||jsonb_build_object('id',id,'revision',revision,'status',status,
  'created',to_char(created at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'updated',to_char(updated at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) order by id),'[]') into items from public.application_reminders where user_id=uid;
 if jsonb_array_length(items)>100 or exists(select 1 from public.application_reminders where user_id=uid and revision>rev) then raise exception 'INVALID_WRITE';end if;
 return jsonb_build_object('format','jobmatch-reminders-state-v1','ownerId',uid,'revision',rev,'delivery','none','items',items);
end$$;
revoke all on function private.read_reminders() from public,anon,authenticated;
grant execute on function private.read_reminders() to authenticated;
create or replace function public.read_reminders() returns jsonb language sql security invoker set search_path='' as $$select private.read_reminders();$$;
revoke all on function public.read_reminders() from public,anon,authenticated;
grant execute on function public.read_reminders() to authenticated;

create or replace function private.command_reminder(p_workspace_revision integer,p_revision integer,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();id_value uuid;action text;details_value jsonb;current_workspace integer;current_revision integer;
 old public.application_reminders%rowtype;stamp timestamptz;begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if not private.reminder_storage_permission() then raise exception 'REMINDER_UNAVAILABLE';end if;
 if p_workspace_revision is null or p_workspace_revision<0 or p_revision is null or p_revision not between 0 and 2147483646 or jsonb_typeof(p_command) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 action:=p_command->>'action';
 if jsonb_typeof(p_command->'action') is distinct from 'string' or action not in ('create','reschedule','complete','cancel','delete') or jsonb_typeof(p_command->'id') is distinct from 'string' or (p_command->>'id')!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'INVALID_WRITE';end if;
 id_value:=(p_command->>'id')::uuid;
 if action in ('create','reschedule') then
  details_value:=p_command-array['action','id'];if not private.valid_reminder_details(details_value) then raise exception 'INVALID_WRITE';end if;
  -- Validate current rules only at the explicit write. Stored intent remains readable after tzdb updates.
  if not exists(select 1 from pg_timezone_names where lower(name)=lower(details_value->>'zone')) then raise exception 'INVALID_WRITE';end if;
  if to_char((details_value->>'dueAt')::timestamptz at time zone (details_value->>'zone'),'YYYY-MM-DD"T"HH24:MI')<>details_value->>'localStart'
   or extract(epoch from (((details_value->>'dueAt')::timestamptz at time zone (details_value->>'zone'))-((details_value->>'dueAt')::timestamptz at time zone 'UTC')))<>(details_value->>'offsetMinutes')::integer*60 then raise exception 'INVALID_WRITE';end if;
 elsif array(select jsonb_object_keys(p_command) order by 1) is distinct from array['action','id'] then raise exception 'INVALID_WRITE';end if;
 -- The same owner/advisory/workspace order as existing source/application writers.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into current_workspace from public.workspaces where user_id=uid for update;
 if current_workspace is distinct from p_workspace_revision then raise exception 'CONFLICT';end if;
 if not private.session_is_active() then raise exception 'AUTH';end if;
 if not private.consume_quota('service') then raise exception 'RATE';end if;
 insert into private.reminder_state(user_id,revision) values(uid,0) on conflict do nothing;
 select revision into current_revision from private.reminder_state where user_id=uid for update;
 if current_revision is distinct from p_revision then raise exception 'CONFLICT';end if;
 select * into old from public.application_reminders where user_id=uid and id=id_value;
 if action='create' then
  if old.id is not null then raise exception 'CONFLICT';end if;
  if (select count(*) from public.application_reminders where user_id=uid)>=100 then raise exception 'INVALID_WRITE';end if;
 elsif old.id is null then raise exception 'CONFLICT';end if;
 if action in ('create','reschedule') and not exists(select 1 from jsonb_array_elements(private.workspace_entities(uid)->'applications') a where a->>'id'=details_value->>'applicationId') then raise exception 'CONFLICT';end if;
 if action in ('complete','cancel') and old.status<>'scheduled' then raise exception 'CONFLICT';end if;
 stamp:=date_trunc('milliseconds',greatest(clock_timestamp(),coalesce(old.updated,clock_timestamp())));
 if action='create' then
  insert into public.application_reminders(user_id,id,revision,created,updated,status,details) values(uid,id_value,p_revision+1,stamp,stamp,'scheduled',details_value);
 elsif action='delete' then delete from public.application_reminders where user_id=uid and id=id_value;
 else update public.application_reminders set revision=p_revision+1,updated=stamp,
  status=case action when 'reschedule' then 'scheduled' when 'complete' then 'completed' else 'cancelled' end,
  details=case when action='reschedule' then details_value else details end where user_id=uid and id=id_value;end if;
 update private.reminder_state set revision=p_revision+1 where user_id=uid;
 return private.read_reminders();
end$$;
revoke all on function private.command_reminder(integer,integer,jsonb) from public,anon,authenticated;
grant execute on function private.command_reminder(integer,integer,jsonb) to authenticated;
create or replace function public.command_reminder(p_workspace_revision integer,p_revision integer,p_command jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.command_reminder(p_workspace_revision,p_revision,p_command);$$;
revoke all on function public.command_reminder(integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.command_reminder(integer,integer,jsonb) to authenticated;
do $$declare f record;begin if exists(select 1 from pg_roles where rolname='service_role') then
 revoke all on private.reminder_state,public.application_reminders from service_role;
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','public') and p.proname in ('valid_reminder_details','reminder_storage_permission','read_reminders','command_reminder') loop execute format('revoke all on function %s from service_role',f.oid::regprocedure);end loop;
end if;end$$;
commit;
