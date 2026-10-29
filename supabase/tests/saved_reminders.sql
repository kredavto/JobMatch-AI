\set ON_ERROR_STOP on
begin;
create temporary table rm_users(a uuid,b uuid,sa uuid,sb uuid,app text,rid uuid,pending_id uuid,rev integer);
insert into rm_users values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null,null,null,0);
grant all on rm_users to authenticated;
insert into auth.users select a from rm_users union all select b from rm_users;
insert into auth.sessions(id,user_id) select sa,a from rm_users union all select sb,b from rm_users;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from rm_users;
set local role authenticated;
do $$declare state jsonb;board jsonb;history jsonb;command jsonb;bad jsonb;rid uuid;fold_id uuid;rev integer:=0;before_state jsonb;begin
 state:=public.apply_workspace_command(0,'{"action":"application","title":"Synthetic vacancy","status":"Планируется","note":""}');update rm_users set app=state#>>'{applications,0,id}';
 board:=public.read_reminders();if board->>'revision'<>'0' or board->'reminders'<>'[]'::jsonb then raise exception 'INITIAL';end if;
 command:=jsonb_build_object('action','create','applicationId',state#>>'{applications,0,id}','title','Контакт','description','Проверить статус','dueLocal','2026-10-28T10:30','timeZone','Europe/Moscow','offsetMinutes',180,'dueAt','2026-10-28T07:30:00.000Z','minutes',30,'accept','SAVE_REMINDER');
 for bad in select value from jsonb_array_elements(jsonb_build_array(command||'{"ownerId":"invented"}',command||'{"id":"00000000-0000-4000-8000-000000000001"}',command-'accept',command||'{"accept":"no"}',command||'{"applicationId":"foreign"}',command||'{"title":"   "}',command||'{"offsetMinutes":60}',command||'{"dueLocal":"2026-02-30T10:30"}',command||'{"timeZone":"Missing/Zone"}',command||'{"dueAt":"2026-10-28T07:30:00Z"}',command||'{"dueLocal":"2026-03-29T02:30","timeZone":"Europe/Berlin","offsetMinutes":60,"dueAt":"2026-03-29T01:30:00.000Z"}')) loop
  begin perform public.command_reminder(1,0,bad);raise exception 'BAD_INPUT_ACCEPTED';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 end loop;
 if public.read_reminders()->>'revision'<>'0' then raise exception 'FAILED_WRITE_MUTATED';end if;
 board:=public.command_reminder(1,0,command);rev:=1;rid:=(board#>>'{reminders,0,id}')::uuid;update rm_users set rid=(board#>>'{reminders,0,id}')::uuid;
 history:=public.read_reminder_history(rid);
 if history#>>'{reminder,status}'<>'pending' or history#>>'{reminder,eventCount}'<>'1' or history#>>'{events,0,action}'<>'create' or history#>'{events,0,snapshot}' is distinct from history->'reminder' then raise exception 'CREATE_HISTORY';end if;
 begin perform public.command_reminder(1,0,command);raise exception 'STALE_REVISION';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 begin perform public.command_reminder(0,1,command);raise exception 'STALE_WORKSPACE';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 board:=public.command_reminder(1,rev,(command-'applicationId')||jsonb_build_object('action','update','id',rid,'dueLocal','2026-10-28T10:30','timeZone','Asia/Kathmandu','offsetMinutes',345,'dueAt','2026-10-28T04:45:00.000Z'));rev:=rev+1;
 history:=public.read_reminder_history(rid);if history#>>'{events,0,snapshot,timeZone}'<>'Europe/Moscow' or history#>>'{events,1,snapshot,timeZone}'<>'Asia/Kathmandu' then raise exception 'HISTORY_OVERWRITTEN';end if;
 board:=public.command_reminder(1,rev,jsonb_build_object('action','cancel','id',rid));rev:=rev+1;
 begin perform public.command_reminder(1,rev,jsonb_build_object('action','complete','id',rid));raise exception 'TERMINAL';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 begin perform public.command_reminder(1,rev,jsonb_build_object('action','delete','id',rid));raise exception 'DELETE_ACK';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 -- Both real instants in a DST fold are valid only with their matching offsets.
 board:=public.command_reminder(1,rev,command||'{"dueLocal":"2026-10-25T02:30","timeZone":"Europe/Berlin","offsetMinutes":120,"dueAt":"2026-10-25T00:30:00.000Z"}');rev:=rev+1;
 select id into fold_id from public.reminders where due_at='2026-10-25T00:30:00Z';
 board:=public.command_reminder(1,rev,command||'{"dueLocal":"2026-10-25T02:30","timeZone":"Europe/Berlin","offsetMinutes":60,"dueAt":"2026-10-25T01:30:00.000Z"}');rev:=rev+1;
 update rm_users set pending_id=(select id from public.reminders where due_at='2026-10-25T01:30:00Z');
 for i in 1..48 loop board:=public.command_reminder(1,rev,(command-'applicationId')||jsonb_build_object('action','update','id',fold_id,'description','change '||i));rev:=rev+1;end loop;
 begin perform public.command_reminder(1,rev,(command-'applicationId')||jsonb_build_object('action','update','id',fold_id));raise exception 'HISTORY_LIMIT';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 board:=public.command_reminder(1,rev,jsonb_build_object('action','complete','id',fold_id));rev:=rev+1;
 history:=public.read_reminder_history(fold_id);if jsonb_array_length(history->'events')<>50 or history#>>'{reminder,status}'<>'completed' then raise exception 'TERMINAL_SLOT_LOST';end if;
 for i in 1..97 loop board:=public.command_reminder(1,rev,command);rev:=rev+1;end loop;
 begin perform public.command_reminder(1,rev,command);raise exception 'TASK_CAP';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if jsonb_array_length(public.read_reminders()->'reminders')<>100 or(public.read_workspace()->>'revision')::int<>1 then raise exception 'CAP_OR_WORKSPACE';end if;
 before_state:=public.read_reminder_history(rid);
 board:=public.command_reminder(1,rev,jsonb_build_object('action','delete','id',rid,'accept','DELETE_REMINDER'));rev:=rev+1;
 if public.read_reminder_history(rid) is not null or exists(select 1 from public.reminder_events where reminder_id=rid) then raise exception 'DELETE_HISTORY_REMAINS';end if;
 board:=public.command_reminder(1,rev,command);rev:=rev+1;update rm_users set rev=(board->>'revision')::integer;
 begin delete from public.reminders;raise exception 'DIRECT_DELETE';exception when insufficient_privilege then null;end;
 begin update public.reminder_events set action='cancel';raise exception 'DIRECT_HISTORY';exception when insufficient_privilege then null;end;
end;$$;
reset role;
create function pg_temp.rm_fail_audit() returns trigger language plpgsql as $$begin if new.action like 'reminder_%' then raise exception 'FIXTURE_AUDIT_FAILURE';end if;return new;end;$$;
create trigger rm_audit_failure before insert on public.audit_log for each row execute function pg_temp.rm_fail_audit();
set local role authenticated;
do $$declare before_history jsonb:=public.read_reminder_history((select pending_id from rm_users));before_revision integer:=(public.read_reminders()->>'revision')::integer;begin
 begin perform public.command_reminder(1,before_revision,jsonb_build_object('action','cancel','id',(select pending_id from rm_users)));raise exception 'NO_AUDIT_FAULT';exception when others then if sqlerrm<>'FIXTURE_AUDIT_FAILURE' then raise;end if;end;
 if public.read_reminder_history((select pending_id from rm_users)) is distinct from before_history or(public.read_reminders()->>'revision')::integer<>before_revision then raise exception 'PARTIAL_WRITE';end if;
end;$$;
reset role;drop trigger rm_audit_failure on public.audit_log;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from rm_users;
set local role authenticated;
do $$begin
 if exists(select 1 from public.reminder_boards) or exists(select 1 from public.reminders) or exists(select 1 from public.reminder_events) or public.read_reminder_history((select pending_id from rm_users)) is not null or public.read_reminders()->'reminders'<>'[]'::jsonb then raise exception 'OWNER_LEAK';end if;
 begin perform public.command_reminder(0,0,jsonb_build_object('action','cancel','id',(select pending_id from rm_users)));raise exception 'FOREIGN_WRITE';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from rm_users;
delete from auth.sessions where id=(select sa from rm_users);
set local role authenticated;
do $$begin
 begin perform public.read_reminders();raise exception 'REVOKED_READ';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 begin perform public.read_reminder_history((select pending_id from rm_users));raise exception 'REVOKED_HISTORY';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 begin perform public.command_reminder(1,(select rev from rm_users),'{}');raise exception 'REVOKED_WRITE';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 if exists(select 1 from public.reminders) or exists(select 1 from public.reminder_events) then raise exception 'REVOKED_RLS';end if;
end;$$;
reset role;
delete from auth.users where id in(select a from rm_users union all select b from rm_users);
do $$begin
 if exists(select 1 from public.reminder_boards where user_id in(select a from rm_users union all select b from rm_users)) or exists(select 1 from public.reminders where user_id in(select a from rm_users union all select b from rm_users)) or exists(select 1 from public.reminder_events where user_id in(select a from rm_users union all select b from rm_users)) then raise exception 'CASCADE';end if;
 if has_function_privilege('anon','public.command_reminder(integer,integer,jsonb)','execute') or has_function_privilege('anon','public.read_reminders()','execute') or has_function_privilege('anon','public.read_reminder_history(uuid)','execute') then raise exception 'ANON_GRANT';end if;
end;$$;
rollback;
