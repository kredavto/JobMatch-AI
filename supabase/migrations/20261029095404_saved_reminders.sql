-- Saved in-app tasks. No scheduler, email, push subscription or delivery claim.
create table public.reminder_boards(user_id uuid primary key references public.workspaces(user_id) on delete cascade,revision integer not null check(revision>0));
create table public.reminders(
 user_id uuid not null references public.reminder_boards(user_id) on delete cascade,id uuid not null default gen_random_uuid(),
 application_id text not null,title text not null check(length(title) between 1 and 200),description text not null check(length(description)<=1000),
 due_local text not null,time_zone text not null,offset_minutes integer not null check(offset_minutes between -840 and 840),due_at timestamptz not null,
 minutes integer not null check(minutes in(15,30,60,90)),status text not null check(status in('pending','completed','cancelled')),
 created timestamptz not null default now(),updated timestamptz not null default now(),primary key(user_id,id),
 foreign key(user_id,application_id) references public.applications(user_id,id) on delete cascade
);
create table public.reminder_events(
 user_id uuid not null,reminder_id uuid not null,sequence integer not null check(sequence between 1 and 50),action text not null check(action in('create','update','complete','cancel')),
 at timestamptz not null default now(),snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),primary key(user_id,reminder_id,sequence),
 foreign key(user_id,reminder_id) references public.reminders(user_id,id) on delete cascade
);
do $$declare t text;begin
 foreach t in array array['reminder_boards','reminders','reminder_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy owner_read on public.%I for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()))',t);
 end loop;
end;$$;
create function private.reminder_json(r public.reminders,p_count integer) returns jsonb
language sql stable set search_path='' set timezone='UTC' as $$select jsonb_build_object('id',r.id,'applicationId',r.application_id,'title',r.title,'description',r.description,'dueLocal',r.due_local,'timeZone',r.time_zone,'offsetMinutes',r.offset_minutes,'dueAt',r.due_at,'minutes',r.minutes,'status',r.status,'created',r.created,'updated',r.updated,'eventCount',p_count);$$;
revoke all on function private.reminder_json(public.reminders,integer) from public,anon,authenticated;
create function public.read_reminders() returns jsonb
language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();state jsonb;revision integer;rows jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 state:=public.read_workspace();select b.revision into revision from public.reminder_boards b where user_id=uid;
 if (select count(*) from public.reminders where user_id=uid)>100 then raise exception 'INVALID_WRITE';end if;
 select coalesce(jsonb_agg(private.reminder_json(r,(select count(*)::integer from public.reminder_events e where e.user_id=uid and e.reminder_id=r.id)) order by r.due_at,r.id),'[]'::jsonb) into rows from public.reminders r where user_id=uid;
 return jsonb_build_object('format','jobmatch-reminders-v1','ownerId',uid,'revision',coalesce(revision,0),'workspace_revision',coalesce((state->>'revision')::integer,0),'server_now',statement_timestamp(),'reminders',rows);
end;$$;
create function public.read_reminder_history(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();r public.reminders%rowtype;events jsonb;n integer;revision integer;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 select * into r from public.reminders where user_id=uid and id=p_id;if not found then return null;end if;
 select count(*)::integer,jsonb_agg(jsonb_build_object('sequence',sequence,'action',action,'at',at,'snapshot',snapshot) order by sequence) into n,events from public.reminder_events where user_id=uid and reminder_id=p_id;
 if n not between 1 and 50 then raise exception 'INVALID_WRITE';end if;
 select b.revision into revision from public.reminder_boards b where user_id=uid;
 return jsonb_build_object('format','jobmatch-reminder-history-v1','ownerId',uid,'revision',revision,'reminder',private.reminder_json(r,n),'events',events);
end;$$;
revoke all on function public.read_reminders(),public.read_reminder_history(uuid) from public,anon;
grant execute on function public.read_reminders(),public.read_reminder_history(uuid) to authenticated;
create function public.command_reminder(p_workspace_revision integer,p_revision integer,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();state jsonb;revision integer;action text;rid uuid;r public.reminders%rowtype;n integer;v_title text;v_description text;v_zone text;v_local text;v_due timestamptz;v_offset integer;v_minutes integer;now_at timestamptz:=clock_timestamp();app_id text;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_command) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 state:=private.locked_workspace(p_workspace_revision);
 select b.revision into revision from public.reminder_boards b where user_id=uid for update;
 if coalesce(revision,0)<>p_revision then raise exception 'CONFLICT';end if;
 action:=p_command->>'action';
 if action not in('create','update','complete','cancel','delete') or action is null then raise exception 'INVALID_WRITE';end if;
 if action<>'create' then
  if jsonb_typeof(p_command->'id') is distinct from 'string' then raise exception 'INVALID_WRITE';end if;
  begin rid:=(p_command->>'id')::uuid;exception when invalid_text_representation then raise exception 'INVALID_WRITE';end;
  select * into r from public.reminders where user_id=uid and id=rid for update;if not found then raise exception 'INVALID_WRITE';end if;
  select count(*)::integer into n from public.reminder_events where user_id=uid and reminder_id=rid;
 end if;
 if action in('create','update') then
  if p_command-(case when action='create' then array['action','applicationId','title','description','dueLocal','timeZone','offsetMinutes','dueAt','minutes','accept'] else array['action','id','title','description','dueLocal','timeZone','offsetMinutes','dueAt','minutes','accept'] end)<>'{}'::jsonb
   or p_command->>'accept' is distinct from 'SAVE_REMINDER'
   or jsonb_typeof(p_command->'title') is distinct from 'string' or length(p_command->>'title') not between 1 and 200 or private.trim_fact_line(p_command->>'title')=''
   or jsonb_typeof(p_command->'description') is distinct from 'string' or length(p_command->>'description')>1000
   or jsonb_typeof(p_command->'dueLocal') is distinct from 'string' or (p_command->>'dueLocal') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$'
   or jsonb_typeof(p_command->'dueAt') is distinct from 'string' or (p_command->>'dueAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:00.000Z$'
   or jsonb_typeof(p_command->'timeZone') is distinct from 'string' or length(p_command->>'timeZone')>100 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_command->>'timeZone')
   or jsonb_typeof(p_command->'offsetMinutes') is distinct from 'number' or (p_command->>'offsetMinutes') !~ '^-?(0|[1-9][0-9]{0,2})$'
   or jsonb_typeof(p_command->'minutes') is distinct from 'number' or p_command->>'minutes' not in('15','30','60','90') then raise exception 'INVALID_WRITE';end if;
  v_title:=p_command->>'title';v_description:=p_command->>'description';v_zone:=p_command->>'timeZone';v_local:=p_command->>'dueLocal';v_offset:=(p_command->>'offsetMinutes')::integer;v_minutes:=(p_command->>'minutes')::integer;
  begin v_due:=(p_command->>'dueAt')::timestamptz;exception when others then raise exception 'INVALID_WRITE';end;
  if v_offset not between -840 and 840 or to_char(v_due at time zone v_zone,'YYYY-MM-DD"T"HH24:MI')<>v_local or extract(epoch from((v_due at time zone v_zone)-(v_due at time zone 'UTC')))/60<>v_offset then raise exception 'INVALID_WRITE';end if;
  if action='create' then
   if jsonb_typeof(p_command->'applicationId') is distinct from 'string' then raise exception 'INVALID_WRITE';end if;
   app_id:=p_command->>'applicationId';if not exists(select 1 from public.applications where user_id=uid and id=app_id) or (select count(*) from public.reminders where user_id=uid)>=100 then raise exception 'INVALID_WRITE';end if;
  elsif r.status<>'pending' or n>=49 then raise exception 'INVALID_WRITE';end if;
 elsif action='delete' then
  if p_command-array['action','id','accept']<>'{}'::jsonb or p_command->>'accept' is distinct from 'DELETE_REMINDER' then raise exception 'INVALID_WRITE';end if;
 else
  if p_command-array['action','id']<>'{}'::jsonb or r.status<>'pending' or n>=50 then raise exception 'INVALID_WRITE';end if;
 end if;
 now_at:=clock_timestamp();if action<>'create' and now_at<r.updated then raise exception 'INVALID_WRITE';end if;
 insert into public.reminder_boards(user_id,revision) values(uid,1) on conflict(user_id) do update set revision=public.reminder_boards.revision+1;
 if action='create' then
  insert into public.reminders(user_id,application_id,title,description,due_local,time_zone,offset_minutes,due_at,minutes,status,created,updated)
  values(uid,app_id,v_title,v_description,v_local,v_zone,v_offset,v_due,v_minutes,'pending',now_at,now_at) returning * into r;n:=0;
 elsif action='update' then
  update public.reminders set title=v_title,description=v_description,due_local=v_local,time_zone=v_zone,offset_minutes=v_offset,due_at=v_due,minutes=v_minutes,updated=now_at where user_id=uid and id=rid returning * into r;
 elsif action='delete' then delete from public.reminders where user_id=uid and id=rid;
 else update public.reminders set status=case action when 'complete' then 'completed' else 'cancelled' end,updated=now_at where user_id=uid and id=rid returning * into r;
 end if;
 if action<>'delete' then insert into public.reminder_events(user_id,reminder_id,sequence,action,at,snapshot) values(uid,r.id,n+1,action,now_at,private.reminder_json(r,n+1));end if;
 insert into public.audit_log(user_id,action) values(uid,'reminder_'||action);
 return public.read_reminders();
end;$$;
revoke all on function public.command_reminder(integer,integer,jsonb) from public,anon;
grant execute on function public.command_reminder(integer,integer,jsonb) to authenticated;
