\set ON_ERROR_STOP on
begin;
create temporary table sp_users(a uuid,b uuid,sa uuid,sb uuid,entry uuid);
insert into sp_users values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null);
grant all on sp_users to authenticated;
insert into auth.users select a from sp_users union all select b from sp_users;
insert into auth.sessions(id,user_id) select sa,a from sp_users union all select sb,b from sp_users;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from sp_users;
set local role authenticated;
do $$declare state jsonb;profile jsonb;command jsonb;bad jsonb;record_uuid uuid;before_audit bigint;begin
 state:=public.apply_workspace_command(0,jsonb_build_object('action','import','text',E'😀 Python\nОрбита\n2020–2024\nBSc'));
 profile:=public.read_structured_profile();
 if (profile->>'revision')::int<>0 or profile->'entries'<>'[]'::jsonb then raise exception 'INITIAL';end if;
 command:='{"action":"add","kind":"employment","fields":{"title":{"quote":"Python","start":2,"end":8},"organization":{"quote":"Орбита","start":9,"end":15},"start":{"quote":"2020","start":16,"end":20},"end":{"quote":"2024","start":21,"end":25}}}';
 profile:=public.command_structured_profile(1,0,command);
 record_uuid:=(profile#>>'{entries,0,id}')::uuid;update sp_users set entry=record_uuid;
 if (profile->>'revision')::int<>1 or(profile#>>'{entries,0,confirmed}')::boolean then raise exception 'AUTO_CONFIRM';end if;
 profile:=public.command_structured_profile(1,1,jsonb_build_object('action','confirm','id',record_uuid,'confirmed',true));
 if not(profile#>>'{entries,0,confirmed}')::boolean or (public.read_workspace()->>'revision')::int<>1 then raise exception 'CONFIRM_OR_WORKSPACE_CHANGE';end if;
 before_audit:=(select count(*) from public.audit_log);
 for bad in select value from jsonb_array_elements('[
 {"action":"add","kind":"employment","confirmed":true,"fields":{"title":{"quote":"Python","start":2,"end":8}}},
 {"action":"add","kind":"employment","fields":{"title":{"quote":"Python","start":1,"end":7}}},
 {"action":"add","kind":"employment","fields":{"title":{"quote":"Pythox","start":2,"end":8}}},
 {"action":"add","kind":"employment","fields":{"title":{"quote":"Python","start":2.1,"end":8}}},
 {"action":"add","kind":"employment","fields":{"title":{"quote":"Python","start":2,"end":800001}}},
 {"action":"add","kind":"employment","fields":{"title":{"quote":"Python","start":2,"end":8},"salary":{"quote":"Python","start":2,"end":8}}},
 {"action":"add","kind":"employment","fields":{}},
 {"action":"add","kind":"achievement","fields":{"title":{"quote":"Python","start":2,"end":8}}},
 {"action":"add","kind":"education","fields":{"title":{"quote":"Python","start":2,"end":8},"credential":{"quote":"Python","start":2,"end":8}}},
 {"action":"confirm","id":"00000000-0000-4000-8000-000000000001","confirmed":true},
 {"action":"reset","confirm":"no"},{"action":"unsupported"}
 ]') loop
  begin perform public.command_structured_profile(1,2,bad);raise exception 'SHOULD_REJECT';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 end loop;
 begin perform public.command_structured_profile(1,1,command);raise exception 'SHOULD_CONFLICT';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 if public.read_structured_profile() is distinct from profile or (select count(*) from public.audit_log)<>before_audit then raise exception 'PARTIAL_WRITE';end if;
 -- Verifying facts changes workspace revision but not source identity.
 state:=public.apply_workspace_command(1,jsonb_build_object('action','verify','ids',jsonb_build_array(state#>>'{facts,0,id}'),'verified',true));
 if not(public.read_structured_profile()->>'source_matches')::boolean then raise exception 'UNRELATED_STALE';end if;
 -- Reimport of identical text gets new fact IDs; no hidden inheritance of confirmations.
 state:=public.apply_workspace_command(2,jsonb_build_object('action','import','text',state->>'original'));
 profile:=public.read_structured_profile();
 if(profile->>'source_matches')::boolean or jsonb_array_length(profile->'entries')<>1 then raise exception 'REIMPORT_LOST_OR_TRUSTED';end if;
 begin perform public.command_structured_profile(3,2,jsonb_build_object('action','confirm','id',record_uuid,'confirmed',true));raise exception 'STALE_CONFIRM';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 profile:=public.command_structured_profile(3,2,jsonb_build_object('action','confirm','id',record_uuid,'confirmed',false));
 profile:=public.command_structured_profile(3,3,'{"action":"reset","confirm":"RESET_STRUCTURED_PROFILE"}');
 if not(profile->>'source_matches')::boolean or profile->'entries'<>'[]'::jsonb or (profile->>'revision')::int<>4 then raise exception 'RESET';end if;
 -- Other record types and the 50-entry cap share the same proof checks.
 profile:=public.command_structured_profile(3,4,'{"action":"add","kind":"education","fields":{"title":{"quote":"BSc","start":26,"end":29}}}');
 profile:=public.command_structured_profile(3,5,'{"action":"add","kind":"certification","fields":{"title":{"quote":"Python","start":2,"end":8},"credential":{"quote":"2024","start":21,"end":25}}}');
 profile:=public.command_structured_profile(3,6,'{"action":"add","kind":"achievement","fields":{"description":{"quote":"Python","start":2,"end":8}}}');
 for i in 1..47 loop profile:=public.command_structured_profile(3,6+i,command);end loop;
 begin perform public.command_structured_profile(3,54,command);raise exception 'LIMIT';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if jsonb_array_length(public.read_structured_profile()->'entries')<>50 then raise exception 'LIMIT_CORRUPTION';end if;
 begin delete from public.structured_profiles;raise exception 'DIRECT_WRITE';exception when insufficient_privilege then null;end;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from sp_users;
do $$begin
 if exists(select 1 from public.structured_profile_entries) or exists(select 1 from public.structured_profiles) or public.read_structured_profile()->'entries'<>'[]'::jsonb then raise exception 'OWNER_LEAK';end if;
end;$$;
reset role;
-- Fault after changing profile/entry must roll everything back.
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from sp_users;
create function pg_temp.fail_audit() returns trigger language plpgsql as $$begin if new.action like 'structured_%' then raise exception 'FIXTURE_AUDIT_FAILURE';end if;return new;end$$;
create trigger sp_audit_failure before insert on public.audit_log for each row execute function pg_temp.fail_audit();
set local role authenticated;
do $$declare before_state jsonb:=public.read_structured_profile();begin
 begin perform public.command_structured_profile(3,54,jsonb_build_object('action','delete','id',before_state#>>'{entries,0,id}'));raise exception 'NO_FAULT';exception when others then if sqlerrm<>'FIXTURE_AUDIT_FAILURE' then raise;end if;end;
 if public.read_structured_profile() is distinct from before_state then raise exception 'FAULT_PARTIAL';end if;
end;$$;
reset role;
delete from auth.sessions where id=(select sa from sp_users);
set local role authenticated;
do $$begin
 begin perform public.read_structured_profile();raise exception 'REVOKED_READ';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 begin perform public.command_structured_profile(3,54,'{"action":"reset","confirm":"RESET_STRUCTURED_PROFILE"}');raise exception 'REVOKED_WRITE';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 if exists(select 1 from public.structured_profile_entries) then raise exception 'REVOKED_ROWS';end if;
end;$$;
reset role;
delete from auth.users where id=(select a from sp_users);
do $$begin if exists(select 1 from public.structured_profiles where user_id=(select a from sp_users)) or exists(select 1 from public.structured_profile_entries where user_id=(select a from sp_users)) then raise exception 'CASCADE';end if;end$$;
rollback;
