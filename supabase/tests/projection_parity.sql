-- Disposable fixtures only. Corruption probes are rolled back; no repair is performed by the report.
begin;
create temporary table qa_parity(a uuid,b uuid,sa uuid,sb uuid);
insert into qa_parity values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
insert into auth.users(id) select a from qa_parity union all select b from qa_parity;
insert into auth.sessions(id,user_id) select sa,a from qa_parity union all select sb,b from qa_parity;
create function pg_temp.assert_parity() returns void language plpgsql as $$declare r jsonb;begin
 r:=private.workspace_projection_report();
 if r->'ok' is distinct from 'true'::jsonb then raise exception 'Unexpected parity mismatch: %',r->'mismatches';end if;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_parity;
do $$declare s jsonb;next_state jsonb;r jsonb;meta jsonb;vid text;aid text;fid text;uid uuid;raw jsonb;item jsonb;rev integer;audits bigint;histories bigint;begin
 select a into uid from qa_parity;
 meta:='{"rules_revision":"rules-2026-10-25.1","weights":{"mandatory":35,"experience":25,"skills":20,"context":10,"clarity":10},"contributions":{"matched":1,"partial":0.5,"missing":0,"unknown":0},"requirements":1,"outcomes":{"matched":1,"partial":0,"missing":0,"unknown":0}}';
 perform pg_temp.assert_parity();
 s:=public.apply_workspace_command(0,'{"action":"import","text":"SQL\nPython"}');perform pg_temp.assert_parity();
 s:=public.apply_workspace_command(1,'{"action":"goal","text":"Analyst"}');perform pg_temp.assert_parity();
 s:=public.apply_workspace_command(2,'{"action":"fact","text":"Excel"}');perform pg_temp.assert_parity();
 s:=public.apply_workspace_command(3,jsonb_build_object('action','verify','ids',jsonb_build_array(s#>>'{facts,0,id}'),'verified',true));perform pg_temp.assert_parity();
 s:=public.apply_workspace_command(4,'{"action":"vacancy","text":"SQL role"}');perform pg_temp.assert_parity();
 s:=public.apply_workspace_command(5,jsonb_build_object('action','version','evidence_ids',jsonb_build_array(s#>>'{facts,0,id}'),'score',100,'match_metadata',meta));perform pg_temp.assert_parity();vid:=s#>>'{versions,0,id}';
 s:=public.apply_workspace_command(6,jsonb_build_object('action','application','title','Parity role','status','Планируется','note','','resumeVersionId',vid));perform pg_temp.assert_parity();aid:=s#>>'{applications,0,id}';
 s:=public.apply_workspace_command(7,jsonb_build_object('action','restore','id',vid));perform pg_temp.assert_parity();
 s:=public.apply_workspace_command(8,'{"action":"demo","text":"Demo SQL","vacancy":"Demo role"}');perform pg_temp.assert_parity();
 -- Unknown compatibility fields and null/absence distinctions must remain lossless.
 next_state:=jsonb_set(s,'{facts,0,future_fact}','{"keep":true}');
 perform public.save_workspace(9,next_state,'import');s:=public.read_workspace();perform pg_temp.assert_parity();
 item:=jsonb_build_object('id','legacy-parity-v','created','2026-10-28','text',s->>'original','vacancy',s->>'vacancy','score',0,'evidence_ids','[]'::jsonb,
  'evidence_snapshot','[]'::jsonb,'profile_revision',10,'engine_version','rules-v1','future_version',jsonb_build_object('keep',true));
 perform public.save_workspace(10,jsonb_set(s,'{versions}',(s->'versions')||jsonb_build_array(item)),'version');s:=public.read_workspace();perform pg_temp.assert_parity();
 item:='{"id":"legacy-absent","title":"Legacy","status":"Планируется","note":"","created":"2026-10-28","future_app":"keep","events":[{"status":"Планируется","date":"2026-10-28","future_event":"keep"}]}';
 perform public.save_workspace(11,jsonb_set(s,'{applications}',(s->'applications')||jsonb_build_array(item)),'application');s:=public.read_workspace();perform pg_temp.assert_parity();
 item:=(item-'future_app')||'{"id":"legacy-null","resumeVersionId":null}';
 perform public.save_workspace(12,jsonb_set(s,'{applications}',(s->'applications')||jsonb_build_array(item)),'application');s:=public.read_workspace();perform pg_temp.assert_parity();
 select payload,revision into raw,rev from public.workspaces where user_id=uid;fid:=s#>>'{facts,0,id}';
 audits:=(select count(*) from public.audit_log);histories:=(select count(*) from public.fact_history);
 -- A same-count value change must be detected and must not be repaired by reading the report.
 update public.profile_facts set text='SENSITIVE_SYNTHETIC' where user_id=uid and id=fid;
 r:=private.workspace_projection_report();
 if r->'ok'<>'false'::jsonb or (r#>>'{mismatches,facts}')::int<1 or r::text like '%SENSITIVE%' or r::text like '%'||uid::text||'%' then raise exception 'fact mismatch/privacy failed';end if;
 if (select text from public.profile_facts where user_id=uid and id=fid)<>'SENSITIVE_SYNTHETIC' or (select revision from public.workspaces where user_id=uid)<>rev
  or (select count(*) from public.audit_log)<>audits or (select count(*) from public.fact_history)<>histories then raise exception 'report wrote or repaired data';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 delete from public.profile_facts where user_id=uid and id=fid;
 if (private.workspace_projection_report()#>>'{mismatches,facts}')::int<1 or exists(select 1 from public.profile_facts where user_id=uid and id=fid) then raise exception 'missing row not detected/read repaired it';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 insert into public.profile_facts(user_id,id,position,text,source,verified) values(uid,'excess',100,'SENSITIVE_SYNTHETIC','fixture',false);
 r:=private.workspace_projection_report();
 if (r#>>'{mismatches,facts}')::int<1 or (r#>>'{mismatches,position_rows}')::int<1 then raise exception 'excess row not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.resume_versions set score=99 where user_id=uid and id=vid;
 if (private.workspace_projection_report()#>>'{mismatches,versions}')::int<1 then raise exception 'version mismatch not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.applications set note='SENSITIVE_SYNTHETIC' where user_id=uid and id=aid;
 if (private.workspace_projection_report()#>>'{mismatches,applications}')::int<1 then raise exception 'application mismatch not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.application_events set date='2099-01-01' where user_id=uid and application_id=aid and position=1;
 if (private.workspace_projection_report()#>>'{mismatches,applications}')::int<1 then raise exception 'event mismatch not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 -- Aggregated JSON can still match while positions or hidden extra fields are corrupt.
 update public.profile_facts set position=2 where user_id=uid and id=fid;r:=private.workspace_projection_report();
 if r#>'{mismatches,facts}'<>'0'::jsonb or (r#>>'{mismatches,position_rows}')::int<1 then raise exception 'invisible position gap not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.resume_versions set position=1 where user_id=uid;
 if (private.workspace_projection_report()#>>'{mismatches,position_rows}')::int<1 then raise exception 'duplicate position not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.application_events set position=10 where user_id=uid and application_id=aid and position=1;r:=private.workspace_projection_report();
 if r#>'{mismatches,applications}'<>'0'::jsonb or (r#>>'{mismatches,position_rows}')::int<1 then raise exception 'event position gap not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.profile_facts set extra=extra||'{"text":"SENSITIVE_SYNTHETIC"}' where user_id=uid and id=fid;r:=private.workspace_projection_report();
 if r#>'{mismatches,facts}'<>'0'::jsonb or (r#>>'{mismatches,extra_rows}')::int<1 then raise exception 'shadowed fact extra not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.resume_versions set extra=extra||'{"score":1}' where user_id=uid and id=vid;r:=private.workspace_projection_report();
 if r#>'{mismatches,versions}'<>'0'::jsonb or (r#>>'{mismatches,extra_rows}')::int<1 then raise exception 'shadowed version extra not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.applications set extra=extra||'{"note":"SENSITIVE_SYNTHETIC"}' where user_id=uid and id=aid;r:=private.workspace_projection_report();
 if r#>'{mismatches,applications}'<>'0'::jsonb or (r#>>'{mismatches,extra_rows}')::int<1 then raise exception 'shadowed application extra not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.application_events set extra=extra||'{"date":"SENSITIVE_SYNTHETIC"}' where user_id=uid and application_id=aid;r:=private.workspace_projection_report();
 if r#>'{mismatches,applications}'<>'0'::jsonb or (r#>>'{mismatches,extra_rows}')::int<1 then raise exception 'shadowed event extra not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.profile_facts set extra='[]' where user_id=uid and id=fid;
 if (private.workspace_projection_report()#>>'{mismatches,extra_rows}')::int<1 then raise exception 'non-object extra not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.applications set resume_version_id=vid where user_id=uid and id='legacy-absent';r:=private.workspace_projection_report();
 if r#>'{mismatches,applications}'<>'0'::jsonb or (r#>>'{mismatches,link_rows}')::int<1 then raise exception 'hidden association not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.workspaces set payload=payload-'facts' where user_id=uid;
 if (private.workspace_projection_report()#>>'{mismatches,payload_rows}')::int<1 then raise exception 'missing snapshot array not detected';end if;
 update public.workspaces set payload=raw where user_id=uid;perform pg_temp.assert_parity();
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from qa_parity;
select public.apply_workspace_command(0,'{"action":"import","text":"Other owner"}');
do $$declare r jsonb;begin
 r:=private.workspace_projection_report();
 if (r#>>'{checked,workspaces}')::int<2 or r->'ok'<>'true'::jsonb then raise exception 'full dataset scan failed';end if;
 if has_function_privilege('anon','private.workspace_projection_report()','EXECUTE') or has_function_privilege('authenticated','private.workspace_projection_report()','EXECUTE') then raise exception 'administrative report exposed';end if;
end;$$;
set local role authenticated;
do $$begin
 begin perform private.workspace_projection_report();raise exception 'client report allowed';exception when insufficient_privilege then null;end;
end;$$;
reset role;
-- Even a deliberately granted limited role must fail instead of reporting only its visible rows.
create role qa_parity_limited nologin;
grant usage on schema public,private to qa_parity_limited;
grant select on public.workspaces,public.profile_facts,public.resume_versions,public.applications,public.application_events to qa_parity_limited;
grant execute on function private.workspace_projection_report() to qa_parity_limited;
set local role qa_parity_limited;
do $$begin
 begin perform private.workspace_projection_report();raise exception 'partial RLS scan accepted';exception when raise_exception then if sqlerrm<>'PARITY_SCOPE' then raise;end if;end;
end;$$;
reset role;
rollback;
begin isolation level repeatable read read only;
select private.workspace_projection_report();
commit;
select 'PASS: all commands/legacy parity, counts-only nonrepairing report, value/missing/excess rows, positions, hidden extras/links, scope/grants and read-only execution' as result;
