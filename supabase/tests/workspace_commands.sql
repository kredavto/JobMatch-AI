-- Disposable transaction: no provider accounts, mail, or production data.
begin;
create temporary table qa_commands(a uuid,b uuid,sa uuid,sb uuid);
insert into qa_commands values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
grant select on qa_commands to authenticated;
insert into auth.users(id) select a from qa_commands union all select b from qa_commands;
insert into auth.sessions(id,user_id) select sa,a from qa_commands union all select sb,b from qa_commands;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_commands;
set local role authenticated;
do $$declare s jsonb;next_state jsonb;bad jsonb;before_audit bigint;before_history bigint;begin
 s:=public.apply_workspace_command(0,'{"action":"goal","text":"Analyst"}');
 if s->>'goal'<>'Analyst' or (s->>'revision')::int<>1 then raise exception 'new workspace command failed';end if;
 -- Legacy import stays compatible with command revisions; extra fields must survive.
 s:=s||'{"original":"SQL\nPython","facts":[{"id":"f1","text":"SQL","source":"input","verified":false,"extra":"keep"},{"id":"f2","text":"Python","source":"input","verified":false}]}';
 perform public.save_workspace(1,s,'import');
 s:=public.read_workspace();
 next_state:=public.apply_workspace_command(2,'{"action":"verify","ids":["f1"],"verified":true}');
 if next_state is distinct from jsonb_set(jsonb_set(s,'{facts,0,verified}','true'),'{revision}','3') then raise exception 'unrelated state changed';end if;
 if (select verified from public.profile_facts where id='f1') is distinct from true then raise exception 'projection not updated';end if;
 if (select facts->0->>'verified' from public.fact_history order by id desc limit 1)<>'true' then raise exception 'history not updated';end if;
 s:=public.apply_workspace_command(3,'{"action":"vacancy","text":"SQL analyst"}');
 if s#>>'{facts,0,extra}'<>'keep' or s->>'vacancy'<>'SQL analyst' then raise exception 'snapshot lost';end if;
 before_audit:=(select count(*) from public.audit_log);before_history:=(select count(*) from public.fact_history);
 for bad in select value from jsonb_array_elements('[
 {"action":"verify","ids":["f1","foreign"],"verified":false},
 {"action":"verify","ids":["f1","f1"],"verified":false},
 {"action":"verify","ids":[1],"verified":false},
 {"action":"verify","ids":[],"verified":"true"},
 {"action":"verify","ids":null,"verified":false},
 {"action":"goal","text":null},
 {"action":"goal","text":"ok","facts":[]},
 {"action":"goal","text":"ok","user_id":"foreign"},
 {"action":"vacancy","text":"SQL"},
 {"action":"unsupported","text":"SQL"}, {}, null
 ]') loop
  begin perform public.apply_workspace_command(4,bad);raise exception 'invalid command accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 end loop;
 begin perform public.apply_workspace_command(3,'{"action":"goal","text":"stale"}');raise exception 'stale accepted';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 if public.read_workspace() is distinct from s or (select count(*) from public.audit_log)<>before_audit or (select count(*) from public.fact_history)<>before_history then raise exception 'failed command leaked writes';end if;
 -- Opposite direction: stale snapshot writer must fail after command.
 begin perform public.save_workspace(3,s,'goal');raise exception 'stale snapshot accepted';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 next_state:=public.apply_workspace_command(4,'{"action":"verify","ids":["f1"],"verified":false}');
 if next_state#>>'{facts,0,verified}'<>'false' then raise exception 'unverify failed';end if;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from qa_commands;
do $$begin
 begin perform public.apply_workspace_command(0,'{"action":"verify","ids":["f1"],"verified":true}');raise exception 'foreign fact accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if public.read_workspace() is not null then raise exception 'foreign command created workspace';end if;
end;$$;
reset role;
delete from auth.sessions where id in (select sb from qa_commands);
set local role authenticated;
do $$begin
 begin perform public.apply_workspace_command(0,'{"action":"goal","text":"revoked"}');raise exception 'revoked accepted';exception when raise_exception then if sqlerrm<>'AUTH' then raise;end if;end;
 if has_function_privilege('anon','public.apply_workspace_command(integer,jsonb)','EXECUTE') then raise exception 'public RPC grant';end if;
end;$$;
rollback;
select 'PASS: command ownership/session, revisions, atomic rejection, projection/history, snapshot compatibility' as result;
