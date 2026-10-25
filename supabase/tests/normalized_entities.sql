-- Run on a disposable database or transaction; all synthetic data is rolled back.
begin;
create temporary table qa_entities(a uuid,b uuid,sa uuid,sb uuid);
insert into qa_entities values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
grant select on qa_entities to authenticated;
insert into auth.users(id) select a from qa_entities union all select b from qa_entities;
insert into auth.sessions(id,user_id) select sa,a from qa_entities union all select sb,b from qa_entities;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_entities;
set local role authenticated;
reset role;
insert into public.workspaces(user_id,revision,payload) values(auth.uid(),1,'{
 "original":"SQL\nPython", "goal":"Analyst", "vacancy":"SQL", "legacy_extra":"keep",
 "facts":[{"id":"ev-1","text":"SQL","source":"original","verified":true},{"id":"ev-2","text":"Python","source":"user","verified":false}],
 "versions":[{"id":"v1","text":"SQL","created":"2026-10-25T00:00:00.000Z","vacancy":"SQL","score":100,"evidence_ids":["ev-1"],"evidence_snapshot":[{"id":"ev-1","text":"SQL","source":"original","verified":true}]},{"id":"v0","text":"Original","created":"2026-10-24T00:00:00Z","vacancy":"SQL","score":0,"evidence_ids":[]}],
 "applications":[{"id":"a1","title":"Acme","note":"note","created":"2026-10-25T00:00:00Z","status":"Приглашение","resumeVersionId":"v1","events":[{"status":"Планируется","date":"2026-10-24"},{"status":"Приглашение","date":"2026-10-25"}]},{"id":"a2","title":"Legacy","note":"","created":"2026-10-24","status":"Планируется","events":[]},{"id":"a3","title":"Unlinked","note":"","created":"2026-10-24","status":"Планируется","resumeVersionId":null,"events":[]}]
}');
set local role authenticated;
do $$declare t text;begin
 if public.read_workspace() is distinct from (select payload||jsonb_build_object('revision',revision) from public.workspaces) then raise exception 'roundtrip changed content/order/optional fields';end if;
 if (select count(*) from public.profile_facts)<>2 or (select count(*) from public.resume_versions)<>2 or (select count(*) from public.applications)<>3 or (select count(*) from public.application_events)<>2 then raise exception 'projection counts';end if;
 foreach t in array array['profile_facts','resume_versions','applications','application_events','workspaces','audit_log','consent_records'] loop
  begin execute format('delete from public.%I',t);raise exception 'direct delete allowed';exception when insufficient_privilege then null;end;
  if has_table_privilege('authenticated','public.'||t,'INSERT') or has_table_privilege('authenticated','public.'||t,'UPDATE') then raise exception 'direct write grants';end if;
 end loop;
 begin perform private.project_workspace(auth.uid(),'{}');raise exception 'internal helper exposed';exception when insufficient_privilege then null;end;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from qa_entities;
do $$begin
 if public.read_workspace() is not null or exists(select 1 from public.profile_facts) or exists(select 1 from public.resume_versions) or exists(select 1 from public.applications) or exists(select 1 from public.application_events) then raise exception 'foreign owner data exposed';end if;
end;$$;
reset role;
insert into public.workspaces(user_id,revision,payload) values(auth.uid(),1,'{"facts":[],"versions":[{"id":"vB","text":"foreign","created":"2026-10-25","vacancy":"other","score":0,"evidence_ids":[]}],"applications":[]}');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_entities;
do $$declare p jsonb;begin
 select payload into p from public.workspaces;
 begin
  perform public.save_workspace(1,jsonb_set(p,'{applications,0,resumeVersionId}','"vB"'),'application');
  raise exception 'foreign version accepted';
 exception when foreign_key_violation then null;end;
 if (select revision from public.workspaces)<>1 or (select text from public.profile_facts where id='ev-1')<>'SQL' or (select count(*) from public.fact_history)<>1 then raise exception 'failed transaction leaked changes';end if;
 begin perform public.save_workspace(0,p,'import');raise exception 'stale revision accepted';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 -- Reimport current facts without changing historical version evidence.
 perform public.save_workspace(1,jsonb_set(p,'{facts}','[{"id":"new-fact","text":"New skill","source":"user","verified":false}]'),'import');
 if (select count(*) from public.profile_facts)<>1 then raise exception 'removed facts retained';end if;
 if public.read_workspace()#>>'{versions,0,evidence_snapshot,0,text}'<>'SQL' then raise exception 'historical evidence overwritten';end if;
 if public.read_workspace() is distinct from (select payload||jsonb_build_object('revision',revision) from public.workspaces) then raise exception 'post-update mismatch';end if;
 -- Whole-state deletion is now intentionally rejected by the write boundary.
 select payload into p from public.workspaces;
 begin perform public.save_workspace(2,jsonb_set(jsonb_set(p,'{applications}','[]'),'{versions}','[]'),'test');raise exception 'unscoped deletion accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;

end;$$;
reset role;
delete from auth.sessions where id=(select sa from qa_entities);
set local role authenticated;
do $$begin if public.read_workspace() is not null or exists(select 1 from public.profile_facts) then raise exception 'revoked session access';end if;end;$$;
reset role;
delete from auth.users where id in (select a from qa_entities union all select b from qa_entities);
do $$begin
 if exists(select 1 from public.profile_facts where user_id in (select a from qa_entities union all select b from qa_entities)) or exists(select 1 from public.resume_versions where user_id in (select a from qa_entities union all select b from qa_entities)) then raise exception 'account cascade failed';end if;
end;$$;
set local role anon;
do $$begin
 begin perform public.read_workspace();raise exception 'anonymous RPC access';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'PASS: lossless legacy roundtrip, order, optional fields, relational links, RLS, rollback, version evidence, removals, session revocation and account cascade' as result;
