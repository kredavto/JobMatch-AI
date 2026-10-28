-- Compact-mode synthetic fixtures. All corruption probes and explicit fixture repairs roll back.
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
 raw:=s-'revision';rev:=(s->>'revision')::integer;fid:=s#>>'{facts,0,id}';
 audits:=(select count(*) from public.audit_log);histories:=(select count(*) from public.fact_history);
 if (private.workspace_projection_report()->>'format')<>'jobmatch-workspace-storage-v2' then raise exception 'wrong storage mode';end if;
 if exists(select 1 from public.workspaces where payload ?| array['facts','versions','applications','revision']) then raise exception 'entity arrays retained';end if;
 if private.workspace_entities(uid) is distinct from jsonb_build_object('facts',s->'facts','versions',s->'versions','applications',s->'applications') then raise exception 'administrative snapshot differs';end if;
 -- There is no duplicate truth in compact mode. A valid row value change remains canonical.
 update public.profile_facts set text='SENSITIVE_SYNTHETIC' where user_id=uid and id=fid;
 r:=private.workspace_projection_report();
 if r->'ok'<>'true'::jsonb or r::text like '%SENSITIVE%' or (select text from public.profile_facts where user_id=uid and id=fid)<>'SENSITIVE_SYNTHETIC' then raise exception 'structural report contract/privacy';end if;
 if (select revision from public.workspaces where user_id=uid)<>rev or (select count(*) from public.audit_log)<>audits
  or (select count(*) from public.fact_history)<>histories then raise exception 'report changed data';end if;
 perform private.project_workspace(uid,raw);
 -- Aggregated JSON can still match while positions or hidden extra fields are corrupt.
 update public.profile_facts set position=2 where user_id=uid and id=fid;r:=private.workspace_projection_report();
 if (r#>>'{mismatches,position_rows}')::int<1 then raise exception 'invisible position gap not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.resume_versions set position=1 where user_id=uid;
 if (private.workspace_projection_report()#>>'{mismatches,position_rows}')::int<1 then raise exception 'duplicate position not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.application_events set position=10 where user_id=uid and application_id=aid and position=1;r:=private.workspace_projection_report();
 if (r#>>'{mismatches,position_rows}')::int<1 then raise exception 'event position gap not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.profile_facts set extra=extra||'{"text":"SENSITIVE_SYNTHETIC"}' where user_id=uid and id=fid;r:=private.workspace_projection_report();
 if (r#>>'{mismatches,extra_rows}')::int<1 then raise exception 'shadowed fact extra not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.resume_versions set extra=extra||'{"score":1}' where user_id=uid and id=vid;r:=private.workspace_projection_report();
 if (r#>>'{mismatches,extra_rows}')::int<1 then raise exception 'shadowed version extra not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.applications set extra=extra||'{"note":"SENSITIVE_SYNTHETIC"}' where user_id=uid and id=aid;r:=private.workspace_projection_report();
 if (r#>>'{mismatches,extra_rows}')::int<1 then raise exception 'shadowed application extra not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.application_events set extra=extra||'{"date":"SENSITIVE_SYNTHETIC"}' where user_id=uid and application_id=aid;r:=private.workspace_projection_report();
 if (r#>>'{mismatches,extra_rows}')::int<1 then raise exception 'shadowed event extra not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.profile_facts set extra='[]' where user_id=uid and id=fid;
 if (private.workspace_projection_report()#>>'{mismatches,extra_rows}')::int<1 then raise exception 'non-object extra not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 update public.applications set resume_version_id=vid where user_id=uid and id='legacy-absent';r:=private.workspace_projection_report();
 if (r#>>'{mismatches,link_rows}')::int<1 then raise exception 'hidden association not detected';end if;
 perform private.project_workspace(uid,raw);perform pg_temp.assert_parity();
 -- Compact storage must not remove the old 15 MB full-state budget.
 begin
  perform public.save_workspace(rev,jsonb_set(s,'{facts,0,future_bulk}',to_jsonb(repeat('x',15000000))),'import');
  raise exception 'aggregate byte budget lost';
 exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if public.read_workspace() is distinct from s then raise exception 'byte budget rejection changed state';end if;
 -- A missing storage guard must be visible even while all payloads remain valid.
 alter table public.workspaces drop constraint workspace_compact_payload;
 if private.workspace_projection_report()#>>'{mismatches,guard_rows}'<>'1' then raise exception 'missing guard invisible';end if;
 alter table public.workspaces add constraint workspace_compact_payload check(
  jsonb_typeof(payload)='object' and not (payload ?| array['facts','versions','applications','revision']));
 -- A physical constraint rejects reintroduction of arrays or a second revision source.
 for item in select value from jsonb_array_elements('[{"facts":[]},{"versions":[]},{"applications":[]},{"revision":1}]') loop
  begin update public.workspaces set payload=payload||item where user_id=uid;raise exception 'forbidden payload field accepted';exception when check_violation then null;end;
 end loop;
 if public.read_workspace() is distinct from s then raise exception 'failed constraint changed state';end if;
end;$$;
set local role authenticated;
do $$begin
 begin perform private.workspace_entities(auth.uid());raise exception 'administrative snapshot exposed';exception when insufficient_privilege then null;end;
end;$$;
reset role;
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
select 'PASS: compact commands/legacy, lossless fields/order, forbidden storage arrays/revision, structural counts-only report, hidden extras/links, private snapshot and scope/grants' as result;
