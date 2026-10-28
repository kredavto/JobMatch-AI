-- Synthetic transaction only. Deliberate corruption and administrative repairs roll back.
begin;
create temporary table qa_canonical(a uuid,b uuid,sa uuid,sb uuid);
insert into qa_canonical values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
grant select on qa_canonical to authenticated;
insert into auth.users(id) select a from qa_canonical union all select b from qa_canonical;
insert into auth.sessions(id,user_id) select sa,a from qa_canonical union all select sb,b from qa_canonical;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_canonical;
create function pg_temp.assert_blocked() returns void language plpgsql as $$
declare s jsonb;raw jsonb;rev integer;histories bigint;audits bigint;
begin
 s:=public.read_workspace();rev:=(s->>'revision')::int;
 select payload into raw from public.workspaces where user_id=auth.uid();
 select count(*) into histories from public.fact_history where user_id=auth.uid();
 select count(*) into audits from public.audit_log where user_id=auth.uid();
 begin perform public.apply_workspace_command(rev-1,'{"action":"goal","text":"stale"}');raise exception 'stale accepted';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 begin perform public.apply_workspace_command(rev,'{"action":"goal","text":"blocked"}');raise exception 'command repaired corruption';exception when raise_exception then if sqlerrm<>'PROJECTION_CONFLICT' then raise;end if;end;
 begin perform public.save_workspace(rev,s,'goal');raise exception 'legacy repaired corruption';exception when raise_exception then if sqlerrm<>'PROJECTION_CONFLICT' then raise;end if;end;
 if public.read_workspace() is distinct from s or (select payload from public.workspaces where user_id=auth.uid()) is distinct from raw
  or (select count(*) from public.fact_history where user_id=auth.uid())<>histories
  or (select count(*) from public.audit_log where user_id=auth.uid())<>audits then raise exception 'failed writes changed state';end if;
end;$$;
set local role authenticated;
do $$declare s jsonb;n bigint;begin
 s:=public.apply_workspace_command(0,'{"action":"goal","text":"Analyst"}');
 if (select count(*) from public.fact_history)<>1 then raise exception 'initial insert capture count';end if;
 s:=public.apply_workspace_command(1,'{"action":"goal","text":"Analyst 2"}');
 if (select count(*) from public.fact_history)<>1 then raise exception 'upsert double capture';end if;
 s:=public.apply_workspace_command(2,'{"action":"import","text":"SQL"}');
 if (select count(*) from public.fact_history)<>2 then raise exception 'import capture count';end if;
 s:=public.apply_workspace_command(3,jsonb_build_object('action','verify','ids',jsonb_build_array(s#>>'{facts,0,id}'),'verified',true));
 if (select count(*) from public.fact_history)<>3 then raise exception 'verify capture count';end if;
 s:=public.apply_workspace_command(4,jsonb_build_object('action','verify','ids',jsonb_build_array(s#>>'{facts,0,id}'),'verified',true));
 if (select count(*) from public.fact_history)<>3 then raise exception 'unchanged facts captured';end if;
 perform public.save_workspace(5,s||'{"goal":"Legacy compatible"}','goal');
 if (select count(*) from public.fact_history)<>3 then raise exception 'legacy upsert double capture';end if;
 begin perform private.locked_workspace(6);raise exception 'private helper exposed';exception when insufficient_privilege then null;end;
 if has_function_privilege('anon','private.locked_workspace(integer)','EXECUTE') or has_function_privilege('authenticated','private.locked_workspace(integer)','EXECUTE') then raise exception 'helper grants';end if;
end;$$;
reset role;
-- Add version/application/event fixtures through the compatible writer; preserve absent links.
do $$declare s jsonb;begin
 s:=public.read_workspace();
 s:=s||'{"versions":[{"id":"canonical-v","created":"2026-10-28","text":"SQL","vacancy":"","score":0,"evidence_ids":[],"evidence_snapshot":[],"profile_revision":6,"engine_version":"rules-v1"}]}';
 perform public.save_workspace(6,s,'version');s:=public.read_workspace();
 s:=s||'{"applications":[{"id":"canonical-a","title":"Job","status":"Планируется","note":"","created":"2026-10-28","events":[{"status":"Планируется","date":"2026-10-28"}]}]}';
 perform public.save_workspace(7,s,'application');
 perform public.apply_workspace_command(8,'{"action":"restore","id":"canonical-v"}');
end;$$;
-- Values, invisible extras/positions and hidden version association must all block both writers.
do $$declare raw jsonb;uid uuid;probe text;begin
 uid:=auth.uid();select payload into raw from public.workspaces where user_id=uid;
 for probe in select unnest(array[
  'update public.profile_facts set text=''Changed'' where user_id=auth.uid()',
  'update public.profile_facts set extra=''[]'' where user_id=auth.uid()',
  'update public.profile_facts set extra='' {"text":"hidden"}'' where user_id=auth.uid()',
  'update public.resume_versions set extra='' {"score":999}'' where user_id=auth.uid()',
  'update public.applications set extra='' {"note":"hidden"}'' where user_id=auth.uid()',
  'update public.application_events set extra='' {"date":"hidden"}'' where user_id=auth.uid()',
  'update public.profile_facts set position=10 where user_id=auth.uid()',
  'update public.resume_versions set position=10 where user_id=auth.uid()',
  'update public.resume_versions set position=1 where user_id=auth.uid()',
  'update public.applications set position=10 where user_id=auth.uid()',
  'update public.application_events set position=10 where user_id=auth.uid()',
  'update public.applications set resume_version_id=''canonical-v'' where user_id=auth.uid()'
 ]) loop
  execute probe;perform pg_temp.assert_blocked();perform private.project_workspace(uid,raw);
 end loop;
end;$$;
-- An unhealthy owner must not block another owner's independent command.
update public.profile_facts set text='Unhealthy owner' where user_id=auth.uid();
set local role authenticated;
select pg_temp.assert_blocked();
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from qa_canonical;
set local role authenticated;
select public.apply_workspace_command(0,'{"action":"import","text":"Healthy owner"}');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_canonical;
do $$begin perform private.project_workspace(auth.uid(),(select payload from public.workspaces where user_id=auth.uid()));end;$$;
-- Prove history compares normalized old facts, not OLD.payload. These are administrative fixtures.
do $$declare s jsonb;n bigint;begin
 select count(*) into n from public.fact_history where user_id=auth.uid();
 update public.profile_facts set text='Canonical SQL' where user_id=auth.uid();s:=public.read_workspace();
 update public.workspaces set payload=s-'revision' where user_id=auth.uid();
 if (select count(*) from public.fact_history where user_id=auth.uid())<>n then raise exception 'history read stale payload';end if;
 update public.profile_facts set text='Different SQL' where user_id=auth.uid();
 update public.workspaces set payload=payload where user_id=auth.uid();
 if (select count(*) from public.fact_history where user_id=auth.uid())<>n+1
  or (select text from public.profile_facts where user_id=auth.uid())<>'Canonical SQL' then raise exception 'canonical history/projection comparison skipped';end if;
 if (private.workspace_projection_report()->'ok') is distinct from 'true'::jsonb then raise exception 'fixture parity';end if;
end;$$;
delete from auth.sessions where id in(select sa from qa_canonical);
set local role authenticated;
do $$begin
 begin perform public.apply_workspace_command(8,'{"action":"goal","text":"revoked"}');raise exception 'revoked session accepted';exception when raise_exception then if sqlerrm<>'AUTH' then raise;end if;end;
end;$$;
reset role;
rollback;
select 'PASS: canonical boundary, exact history capture, legacy compatibility, atomic corruption rejection, owner isolation, normalized trigger inputs and private grants' as result;
