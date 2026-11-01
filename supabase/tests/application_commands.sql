-- Disposable fixtures and rollback; no mail, provider API or real account required.
begin;
create temporary table qa_applications(a uuid,b uuid,sa uuid,sb uuid,application_id text);
insert into qa_applications values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null);
grant select,update on qa_applications to authenticated;
insert into auth.users(id) select a from qa_applications union all select b from qa_applications;
insert into auth.sessions(id,user_id) select sa,a from qa_applications union all select sb,b from qa_applications;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_applications;
set local role authenticated;
do $$declare s jsonb;next_state jsonb;item jsonb;prior jsonb;command jsonb;bad jsonb;app_id text;rev integer;audits bigint;histories bigint;begin
 s:=public.apply_workspace_command(0,'{"action":"goal","text":"Analyst"}');
 s:=s||'{"original":"SQL","facts":[],"vacancy":"SQL analyst"}';
 perform public.save_workspace(1,s,'import');s:=public.read_workspace();
 -- A legacy version ID is valid: command references are opaque owned identifiers, not UUID-only.
 s:=jsonb_set(s,'{versions}','[{"id":"legacy-v1","created":"2026-10-28","text":"SQL","vacancy":"SQL analyst","score":0,"evidence_ids":[],"evidence_snapshot":[],"profile_revision":2,"engine_version":"rules-v1"}]');
 perform public.save_workspace(2,s,'version');s:=public.read_workspace();
 next_state:=public.apply_workspace_command(3,'{"action":"application","title":"SQL role","status":"Планируется","note":"first","resumeVersionId":"legacy-v1"}');
 item:=next_state->'applications'->0;app_id:=item->>'id';
 if app_id::uuid is null or item->>'created' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
  or item->>'created' is distinct from item#>>'{events,0,date}' or item#>>'{events,0,status}'<>'Планируется'
  or jsonb_array_length(item->'events')<>1 or item->>'resumeVersionId'<>'legacy-v1' then raise exception 'server lifecycle fields failed';end if;
 if (next_state-array['applications','revision']) is distinct from (s-array['applications','revision']) then raise exception 'unrelated state changed';end if;
 if (select resume_version_id from public.applications where id=app_id)<>'legacy-v1' or (select count(*) from public.application_events where application_id=app_id)<>1 then raise exception 'projection failed';end if;
 update qa_applications set application_id=app_id;
 s:=next_state;prior:=item;
 command:=jsonb_build_object('action','application','id',app_id,'status','Интервью','note','call');
 s:=public.apply_workspace_command((s->>'revision')::integer,command);item:=s->'applications'->0;
 if jsonb_array_length(item->'events')<>2 or item->'events'->0 is distinct from prior->'events'->0
  or item->>'created' is distinct from prior->>'created' or item->>'id'<>app_id or item->>'resumeVersionId'<>'legacy-v1'
  or item#>>'{events,1,status}'<>'Интервью' then raise exception 'status append or version preservation failed';end if;
 prior:=item;
 s:=public.apply_workspace_command((s->>'revision')::integer,command||'{"note":"updated note"}');item:=s->'applications'->0;
 if item->'events' is distinct from prior->'events' or item->>'note'<>'updated note' then raise exception 'note duplicated events';end if;
 -- Explicit null unlinks; omitted association preserves both existing value and legacy absence.
 s:=public.apply_workspace_command((s->>'revision')::integer,command||'{"resumeVersionId":null}');
 if s#>'{applications,0,resumeVersionId}' is distinct from 'null'::jsonb or (select resume_version_id from public.applications where id=app_id) is not null then raise exception 'unlink failed';end if;
 s:=public.apply_workspace_command((s->>'revision')::integer,command||'{"resumeVersionId":"legacy-v1"}');
 -- Exercise legacy -> command -> legacy compatibility, preserving unknown app/event fields.
 item:='{"id":"legacy-a2","title":"Legacy role","status":"Планируется","note":"old","created":"2026-10-28","future":{"keep":true},"events":[{"status":"Планируется","date":"2026-10-28","future_event":"keep"}]}';
 next_state:=jsonb_set(s,'{applications}',(s->'applications')||jsonb_build_array(item));
 perform public.save_workspace((s->>'revision')::integer,next_state,'application');s:=public.read_workspace();
 s:=public.apply_workspace_command((s->>'revision')::integer,'{"action":"application","id":"legacy-a2","status":"Планируется","note":"new"}');
 if s#>'{applications,1}' is distinct from jsonb_set(item,'{note}','"new"') or (s->'applications'->1) ? 'resumeVersionId' then raise exception 'legacy fields changed';end if;
 rev:=(s->>'revision')::integer;
 next_state:=jsonb_set(s,'{applications,1,note}','"legacy update"');
 perform public.save_workspace(rev,next_state,'application');s:=public.read_workspace();
 begin perform public.apply_workspace_command(rev,command);raise exception 'stale command accepted';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 next_state:=public.apply_workspace_command((s->>'revision')::integer,command);
 begin perform public.save_workspace((s->>'revision')::integer,s,'application');raise exception 'stale snapshot accepted';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 s:=next_state;audits:=(select count(*) from public.audit_log);histories:=(select count(*) from public.fact_history);
 for bad in select value from jsonb_array_elements(jsonb_build_array(
  command||'{"id":"missing"}',command||'{"resumeVersionId":"foreign-v"}',command||'{"resumeVersionId":""}',
  command||'{"resumeVersionId":1}',command||'{"title":"renamed"}',command||'{"id":null}',command||'{"note":null}',
  command||'{"note":false}',command-'note',command||jsonb_build_object('note',repeat('x',3001)),
  command||'{"status":"unknown"}',command||'{"events":[]}',command||'{"created":"forged"}',
  command||'{"user_id":"foreign"}',command||'{"applications":[]}',command||'{"resumeVersionId":{"id":"legacy-v1"}}',
  '{"action":"application","title":"","status":"Планируется","note":""}'::jsonb,
  jsonb_build_object('action','application','title',repeat('x',301),'status','Планируется','note','')
 )) loop
  begin perform public.apply_workspace_command((s->>'revision')::integer,bad);raise exception 'invalid command accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 end loop;
 if public.read_workspace() is distinct from s or (select count(*) from public.audit_log)<>audits or (select count(*) from public.fact_history)<>histories then raise exception 'rejection leaked writes';end if;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from qa_applications;
do $$declare app_id text;begin
 select application_id into app_id from qa_applications;
 begin perform public.apply_workspace_command(0,jsonb_build_object('action','application','id',app_id,'status','Оффер','note','foreign'));raise exception 'foreign app accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 begin perform public.apply_workspace_command(0,'{"action":"application","title":"Foreign version","status":"Планируется","note":"","resumeVersionId":"legacy-v1"}');raise exception 'foreign version accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if public.read_workspace() is not null then raise exception 'foreign command created workspace';end if;
 -- A tracker-only user can create an unlinked application without importing a profile.
 if public.apply_workspace_command(0,'{"action":"application","title":"Own role","status":"Планируется","note":""}')#>'{applications,0,resumeVersionId}' is distinct from 'null'::jsonb then raise exception 'tracker-only creation failed';end if;
end;$$;
reset role;
delete from auth.sessions where id in (select sb from qa_applications);
set local role authenticated;
do $$begin
 begin perform public.apply_workspace_command(1,'{"action":"application","title":"Revoked","status":"Планируется","note":""}');raise exception 'revoked accepted';exception when raise_exception then if sqlerrm<>'AUTH' then raise;end if;end;
 if has_function_privilege('anon','public.apply_workspace_command(integer,jsonb)','EXECUTE') or has_function_privilege('authenticated','private.apply_application_intent(jsonb,jsonb)','EXECUTE') then raise exception 'incorrect RPC/helper grants';end if;
end;$$;
reset role;
-- Boundary tests on synthetic values exercise both array caps without writing 500 real rows.
do $$declare s jsonb;item jsonb;next_state jsonb;command jsonb;begin
 item:='{"id":"a","title":"Job","status":"Планируется","note":"","created":"2026-10-28","events":[]}';
 s:=jsonb_build_object('applications',jsonb_build_array(jsonb_set(item,'{events}',(select jsonb_agg(jsonb_build_object('status','Планируется','date','2026-10-28')) from generate_series(1,199)))),'versions','[]'::jsonb);
 command:='{"action":"application","id":"a","status":"Интервью","note":""}';
 s:=private.apply_application_intent(s,command);
 if jsonb_array_length(s#>'{applications,0,events}')<>200 then raise exception '200th event failed';end if;
 begin perform private.apply_application_intent(s,command||'{"status":"Оффер"}');raise exception 'event cap accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 next_state:=private.apply_application_intent(s,command||'{"note":"at cap"}');
 if next_state#>'{applications,0,events}' is distinct from s#>'{applications,0,events}' or next_state#>>'{applications,0,note}'<>'at cap' then raise exception 'note update at event cap failed';end if;
 s:=jsonb_build_object('applications',(select jsonb_agg(item||jsonb_build_object('id','a'||i)) from generate_series(1,500) i),'versions','[]'::jsonb);
 command:='{"action":"application","title":"501st","status":"Планируется","note":""}';
 begin perform private.apply_application_intent(s,command);raise exception 'application cap accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
end;$$;
-- Installed Zod 4.6.7 and PostgreSQL length both count Unicode code points.
-- Astral/combining text is preserved, never truncated or normalised.
do $$declare s jsonb;item jsonb;command jsonb;begin
 s:='{"applications":[],"versions":[]}';
 command:=jsonb_build_object('action','application','title',repeat('😀',300),'status','Планируется','note',repeat('😀',3000));
 item:=private.apply_application_intent(s,command)->'applications'->0;
 if item->>'title'<>repeat('😀',300) or item->>'note'<>repeat('😀',3000) then raise exception 'astral text changed';end if;
 begin perform private.apply_application_intent(s,command||jsonb_build_object('title',repeat('😀',301)));raise exception 'title overflow';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 begin perform private.apply_application_intent(s,command||jsonb_build_object('note',repeat('😀',3001)));raise exception 'note overflow';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 command:=command||jsonb_build_object('title',U&'e\0301👩‍💻','note',E'Line1\r\nLine2');
 item:=private.apply_application_intent(s,command)->'applications'->0;
 if item->>'title'<>command->>'title' or item->>'note'<>command->>'note' then raise exception 'source normalised';end if;
end;$$;
rollback;
select 'PASS: application lifecycle, append-only events, ownership/session, links, revisions, limits, atomic rejection, projection and snapshot compatibility' as result;
