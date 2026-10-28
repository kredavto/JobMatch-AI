-- Synthetic fixtures in a rolled-back transaction; no provider API or persistent account changes.
begin;
create temporary table qa_versions(a uuid,b uuid,sa uuid,sb uuid,version_id text,foreign_fact text,metadata jsonb);
insert into qa_versions values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null,null,
 '{"rules_revision":"rules-2026-10-25.1","weights":{"mandatory":35,"experience":25,"skills":20,"context":10,"clarity":10},"contributions":{"matched":1,"partial":0.5,"missing":0,"unknown":0},"requirements":1,"outcomes":{"matched":1,"partial":0,"missing":0,"unknown":0}}');
grant select,update on qa_versions to authenticated;
insert into auth.users(id) select a from qa_versions union all select b from qa_versions;
insert into auth.sessions(id,user_id) select sa,a from qa_versions union all select sb,b from qa_versions;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_versions;
set local role authenticated;
do $$declare s jsonb;before_state jsonb;next_state jsonb;v jsonb;legacy jsonb;restored jsonb;cmd jsonb;bad jsonb;meta jsonb;
 raw text:=E' Python\r\nSQL \r\nOther\r\n SQL ';sid text;pid text;uid text;vid text;rev integer;audits bigint;histories bigint;begin
 select metadata into meta from qa_versions;
 s:=public.apply_workspace_command(0,jsonb_build_object('action','import','text',raw));pid:=s#>>'{facts,0,id}';sid:=s#>>'{facts,1,id}';uid:=s#>>'{facts,2,id}';
 s:=public.apply_workspace_command(1,jsonb_build_object('action','verify','ids',jsonb_build_array(pid,sid),'verified',true));
 s:=public.apply_workspace_command(2,'{"action":"vacancy","text":"SQL analyst"}');before_state:=s;
 histories:=(select count(*) from public.fact_history);
 cmd:=jsonb_build_object('action','version','evidence_ids',jsonb_build_array(sid,pid),'score',100,'match_metadata',meta);
 s:=public.apply_workspace_command(3,cmd);v:=s->'versions'->0;vid:=v->>'id';
 if vid::uuid is null or v->>'created' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
  or v->>'text' is distinct from E'РЕЛЕВАНТНЫЙ ОПЫТ\nSQL\nPython\n\nПРОФИЛЬ\nOther'
  or v->'evidence_ids' is distinct from jsonb_build_array(sid,pid)
  or v->'evidence_snapshot' is distinct from jsonb_build_array(before_state->'facts'->0,before_state->'facts'->1)
  or v->'profile_revision' is distinct from '3'::jsonb or v->>'engine_version'<>'rules-v1' or v->'match_metadata' is distinct from meta
  or v->>'vacancy'<>'SQL analyst' or v->'score' is distinct from '100'::jsonb then raise exception 'version construction/provenance failed';end if;
 if (s-array['versions','revision']) is distinct from (before_state-array['versions','revision']) or (select count(*) from public.fact_history)<>histories
  or (select text from public.resume_versions where id=vid) is distinct from v->>'text' then raise exception 'version changed unrelated state/projection';end if;
 -- Empty selection preserves exact original CRLF/whitespace, not the promoted rendering.
 s:=public.apply_workspace_command(4,cmd||'{"evidence_ids":[],"score":100.0}');
 if s#>>'{versions,1,text}' is distinct from raw or s#>'{versions,1,evidence_snapshot}'<>'[]'::jsonb then raise exception 'empty selection changed original';end if;
 -- An old writer can append a version with compatibility fields and missing metadata.
 legacy:=(v-'match_metadata')||jsonb_build_object('id','legacy-v1','created','2026-10-28','profile_revision',5,'future',jsonb_build_object('keep',true));
 perform public.save_workspace(5,jsonb_set(s,'{versions}',(s->'versions')||jsonb_build_array(legacy)),'version');s:=public.read_workspace();
 audits:=(select count(*) from public.audit_log);histories:=(select count(*) from public.fact_history);
 for bad in select value from jsonb_array_elements(jsonb_build_array(
  cmd||jsonb_build_object('evidence_ids',jsonb_build_array(uid)),cmd||'{"evidence_ids":["foreign"]}',
  cmd||jsonb_build_object('evidence_ids',jsonb_build_array(sid,sid)),cmd||'{"evidence_ids":null}',cmd||'{"evidence_ids":[1]}',
  cmd||jsonb_build_object('evidence_ids',jsonb_build_array(repeat('x',101))),
  cmd||'{"score":-1}',cmd||'{"score":101}',cmd||'{"score":0.5}',cmd||'{"score":"100"}',cmd||'{"score":null}',
  cmd||'{"text":"forged"}',cmd||'{"evidence_snapshot":[]}',cmd||'{"created":"forged"}',cmd||'{"id":"chosen"}',
  cmd||'{"vacancy":"forged"}',cmd||'{"profile_revision":0}',cmd||'{"engine_version":"forged"}',cmd||'{"versions":[]}',
  cmd||'{"user_id":"foreign"}',cmd||'{"match_metadata":null}',
  jsonb_set(cmd,'{match_metadata,rules_revision}','"forged"'),jsonb_set(cmd,'{match_metadata,weights,mandatory}','30'),
  jsonb_set(cmd,'{match_metadata,contributions,partial}','1'),jsonb_set(cmd,'{match_metadata,requirements}','2'),
  jsonb_set(cmd,'{match_metadata,outcomes,matched}','-1'),jsonb_set(cmd,'{match_metadata,outcomes,matched}','0.5'),
  jsonb_set(cmd,'{match_metadata,outcomes,matched}','"1"'),jsonb_set(cmd,'{match_metadata,outcomes}','null'),
  jsonb_set(cmd,'{match_metadata,extra}','true'),jsonb_set(cmd,'{match_metadata,outcomes,extra}','0'),
  '{"action":"restore","id":"foreign"}'::jsonb,'{"action":"restore","id":null}'::jsonb,
  '{"action":"restore","id":"legacy-v1","text":"forged"}'::jsonb
 )) loop
  begin perform public.apply_workspace_command((s->>'revision')::integer,bad);raise exception 'invalid version command accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 end loop;
 if public.read_workspace() is distinct from s or (select count(*) from public.audit_log)<>audits or (select count(*) from public.fact_history)<>histories
  or (select count(*) from public.resume_versions)<>jsonb_array_length(s->'versions') then raise exception 'rejection leaked state/audit/history/projection';end if;
 -- Both writers serialize revisions; a race cannot attach an evaluation to the next revision.
 rev:=(s->>'revision')::integer;next_state:=jsonb_set(s,'{goal}','"legacy goal"');
 perform public.save_workspace(rev,next_state,'goal');next_state:=public.read_workspace();
 begin perform public.apply_workspace_command(rev,cmd);raise exception 'stale version accepted';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 s:=public.apply_workspace_command((next_state->>'revision')::integer,cmd);
 begin perform public.save_workspace((next_state->>'revision')::integer,next_state,'goal');raise exception 'stale legacy accepted';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 s:=public.apply_workspace_command((s->>'revision')::integer,jsonb_build_object('action','application','title','Role','status','Планируется','note','','resumeVersionId',vid));before_state:=s;
 s:=public.apply_workspace_command((s->>'revision')::integer,'{"action":"import","text":"Rust"}');
 begin perform public.apply_workspace_command((s->>'revision')::integer,cmd||'{"evidence_ids":[]}');raise exception 'version without saved vacancy accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 s:=public.apply_workspace_command((s->>'revision')::integer,'{"action":"restore","id":"legacy-v1"}');restored:=s->'versions'->-1;
 if (restored-array['id','created','restored_from']) is distinct from (legacy-array['id','created','restored_from'])
  or restored->>'restored_from'<>'legacy-v1' or restored ? 'match_metadata' or restored->>'id'='legacy-v1'
  or s->'applications' is distinct from before_state->'applications' or s->'versions'->0 is distinct from v then raise exception 'restore rewrote history/links/optional fields';end if;
 next_state:=s;s:=public.apply_workspace_command((s->>'revision')::integer,jsonb_build_object('action','restore','id',restored->>'id'));
 if s->'versions'->-1->>'restored_from' is distinct from restored->>'id'
  or ((s->'versions'->-1)-array['id','created','restored_from']) is distinct from (restored-array['id','created','restored_from']) then raise exception 'restore chain lost immediate source';end if;
 update qa_versions set version_id=vid,foreign_fact=sid;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from qa_versions;
do $$declare s jsonb;cmd jsonb;begin
 begin perform public.apply_workspace_command(0,jsonb_build_object('action','restore','id',(select version_id from qa_versions)));raise exception 'foreign restore accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if public.read_workspace() is not null then raise exception 'foreign restore created workspace';end if;
 s:=public.apply_workspace_command(0,'{"action":"import","text":"SQL"}');s:=public.apply_workspace_command(1,'{"action":"vacancy","text":"SQL role"}');
 cmd:=jsonb_build_object('action','version','evidence_ids',(select jsonb_build_array(foreign_fact) from qa_versions),'score',100,'match_metadata',(select metadata from qa_versions));
 begin perform public.apply_workspace_command(2,cmd);raise exception 'foreign evidence accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 begin perform public.apply_workspace_command(2,jsonb_set(cmd,'{evidence_ids}',jsonb_build_array(s#>>'{facts,0,id}')));raise exception 'unverified evidence accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if public.read_workspace() is distinct from s then raise exception 'foreign evidence leaked writes';end if;
 if has_function_privilege('anon','public.apply_workspace_command(integer,jsonb)','EXECUTE') or has_function_privilege('authenticated','private.apply_version_intent(jsonb,integer,jsonb)','EXECUTE') then raise exception 'RPC/helper grants incorrect';end if;
end;$$;
reset role;
delete from auth.sessions where id in (select sb from qa_versions);
set local role authenticated;
do $$begin
 begin perform public.apply_workspace_command(2,'{"action":"restore","id":"legacy-v1"}');raise exception 'revoked accepted';exception when raise_exception then if sqlerrm<>'AUTH' then raise;end if;end;
end;$$;
reset role;
-- Both actions share the 100-version cap; a 100th unchanged-text version is still valid.
do $$declare s jsonb;cmd jsonb;bad jsonb;begin
 s:=jsonb_build_object('original','SQL','vacancy','SQL','facts','[]'::jsonb,'versions',(select jsonb_agg(jsonb_build_object('id','v'||i,'created','2026-10-28','text','SQL')) from generate_series(1,99) i));
 cmd:=jsonb_build_object('action','version','evidence_ids','[]'::jsonb,'score',100,'match_metadata',(select metadata from qa_versions));
 s:=private.apply_version_intent(s,99,cmd);
 if jsonb_array_length(s->'versions')<>100 then raise exception '100th version rejected';end if;
 for bad in select value from jsonb_array_elements(jsonb_build_array(cmd,'{"action":"restore","id":"v1"}'::jsonb)) loop
  begin perform private.apply_version_intent(s,100,bad);raise exception '101st version accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 end loop;
end;$$;
rollback;
select 'PASS: SQL version construction/evidence, exact rendering, immutable restore/provenance, owner/session, metadata shape, revision races, cap and atomic rejection' as result;
