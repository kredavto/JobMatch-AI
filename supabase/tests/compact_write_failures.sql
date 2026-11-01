-- Fault injection is confined to this rolled-back synthetic transaction.
begin;
create temporary table qa_explicit(a uuid,b uuid,c uuid,sa uuid,sb uuid,sc uuid);
insert into qa_explicit values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
grant select on qa_explicit to authenticated;
create temporary table qa_failure_gate(stage text);
insert into qa_failure_gate values('');
grant select,update on qa_failure_gate to authenticated;
insert into auth.users(id) select a from qa_explicit union all select b from qa_explicit union all select c from qa_explicit;
insert into auth.sessions(id,user_id) select sa,a from qa_explicit union all select sb,b from qa_explicit union all select sc,c from qa_explicit;
create function pg_temp.storage_snapshot() returns jsonb language sql as $$
 select jsonb_build_object('workspace',(select to_jsonb(w) from public.workspaces w where user_id=auth.uid()),
 'canonical',public.read_workspace(),
 'history',(select jsonb_agg(to_jsonb(h) order by id) from public.fact_history h where user_id=auth.uid()),
 'audit',(select jsonb_agg(to_jsonb(a) order by id) from public.audit_log a where user_id=auth.uid()),
 'consent',(select to_jsonb(c) from public.consent_records c where user_id=auth.uid()));
$$;
create function pg_temp.fail_write_step() returns trigger language plpgsql as $$begin
 if new.user_id=auth.uid() and (select stage from qa_failure_gate)=TG_TABLE_NAME then raise exception 'QA_WRITE_FAILURE';end if;
 if TG_TABLE_NAME='profile_facts' and (select stage from qa_failure_gate)='argument_probe' then
  if new.text<>'Intent fact' then raise exception 'unexpected projection argument';end if;
  raise exception 'QA_ARGUMENT_SEEN';
 end if;
 return new;
end;$$;
create trigger qa_projection_failure after insert or update on public.profile_facts for each row execute function pg_temp.fail_write_step();
create trigger qa_history_failure after insert on public.fact_history for each row execute function pg_temp.fail_write_step();
create trigger qa_audit_failure after insert on public.audit_log for each row execute function pg_temp.fail_write_step();
create trigger qa_consent_failure before insert on public.consent_records for each row execute function pg_temp.fail_write_step();
create function pg_temp.assert_failed_write(initial boolean) returns void language plpgsql as $$
declare before_state jsonb;state jsonb;rev integer;begin
 before_state:=pg_temp.storage_snapshot();state:=public.read_workspace();rev:=coalesce((state->>'revision')::integer,0);
 begin perform public.apply_workspace_command(rev,'{"action":"fact","text":"Synthetic SQL"}');raise exception 'fault injection did not fail command';
 exception when raise_exception then if sqlerrm<>'QA_WRITE_FAILURE' then raise;end if;end;
 if pg_temp.storage_snapshot() is distinct from before_state then raise exception 'command leaked partial data';end if;
 if initial then state:='{"original":"","goal":"","vacancy":"","facts":[],"versions":[],"applications":[]}';end if;
 state:=jsonb_set(jsonb_set(state,'{original}',to_jsonb((state->>'original')||E'\nSynthetic SQL')),'{facts}',
  (state->'facts')||'[{"id":"legacy-fixture","text":"Synthetic SQL","source":"user","verified":false}]'::jsonb);
 begin perform public.save_workspace(rev,state,'fact');raise exception 'fault injection did not fail legacy writer';
 exception when raise_exception then if sqlerrm<>'QA_WRITE_FAILURE' then raise;end if;end;
 if pg_temp.storage_snapshot() is distinct from before_state then raise exception 'legacy leaked partial data';end if;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_explicit;
do $$begin
 if exists(select 1 from pg_trigger where tgrelid='public.workspaces'::regclass and tgname in ('workspace_capture_facts','workspace_capture_initial_facts','workspace_sync_entities'))
  or to_regprocedure('private.capture_fact_history()') is not null or to_regprocedure('private.sync_workspace_entities()') is not null then raise exception 'obsolete write triggers/functions retained';end if;
end;$$;
-- Both new and existing workspaces roll back completely at every persistent step.
set local role authenticated;
do $$declare target text;begin
 foreach target in array array['profile_facts','fact_history','audit_log','consent_records'] loop
  update qa_failure_gate set stage=target;perform pg_temp.assert_failed_write(true);
 end loop;
 update qa_failure_gate set stage='';
 perform public.apply_workspace_command(0,'{"action":"goal","text":"Analyst"}');
 perform public.apply_workspace_command(1,'{"action":"goal","text":"Analyst"}');
 if (select count(*) from public.fact_history)<>1 then raise exception 'initial empty history or duplicate no-op history';end if;
 foreach target in array array['profile_facts','fact_history','audit_log','consent_records'] loop
  update qa_failure_gate set stage=target;perform pg_temp.assert_failed_write(false);
 end loop;
 update qa_failure_gate set stage='';
 perform public.apply_workspace_command(2,'{"action":"fact","text":"Successful fact"}');
 if (select count(*) from public.fact_history)<>2 or public.read_workspace()#>>'{facts,0,text}'<>'Successful fact'
  or (select count(*) from public.audit_log)<>3 then raise exception 'successful explicit commit';end if;
end;$$;
reset role;
-- Sabotage only the synthetic mirror write. Projection must still use the validated argument.
create function pg_temp.sabotage_mirror() returns trigger language plpgsql as $$begin
 if (select stage from qa_failure_gate)='mirror_corruption' then
  new.payload:=new.payload||'{"facts":[]}'::jsonb;
 elsif (select stage from qa_failure_gate)='argument_probe' then
  new.payload:=new.payload-array['facts','versions','applications'];
 elsif (select stage from qa_failure_gate)='scalar_corruption' then
  new.payload:=jsonb_set(new.payload,'{goal}','"tampered"');
 end if;
 return new;
end;$$;
create trigger qa_mirror_sabotage before insert or update on public.workspaces for each row execute function pg_temp.sabotage_mirror();
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from qa_explicit;
set local role authenticated;
do $$declare before_state jsonb;target text;begin
 before_state:=pg_temp.storage_snapshot();
 update qa_failure_gate set stage='argument_probe';
 begin perform public.apply_workspace_command(0,'{"action":"fact","text":"Intent fact"}');raise exception 'argument probe did not run';
 exception when raise_exception then if sqlerrm<>'QA_ARGUMENT_SEEN' then raise;end if;end;
 if pg_temp.storage_snapshot() is distinct from before_state then raise exception 'argument probe leaked data';end if;
 foreach target in array array['mirror_corruption','scalar_corruption'] loop
  update qa_failure_gate set stage=target;
  begin perform public.apply_workspace_command(0,'{"action":"goal","text":"Expected goal"}');raise exception 'inconsistent output accepted';
  exception when check_violation then if target<>'mirror_corruption' then raise;end if;
  when raise_exception then if sqlerrm<>'PROJECTION_CONFLICT' or target<>'scalar_corruption' then raise;end if;end;
  if pg_temp.storage_snapshot() is distinct from before_state then raise exception 'postcondition failure leaked data';end if;
 end loop;
 update qa_failure_gate set stage='';
 perform public.apply_workspace_command(0,'{"action":"import","text":"Healthy second owner"}');
 if (select count(*) from public.fact_history)<>1 or public.read_workspace()#>>'{facts,0,text}'<>'Healthy second owner' then raise exception 'second owner isolation';end if;
end;$$;
reset role;
-- Existing revision zero is not a new insert: preserve its administrative baseline.
select set_config('request.jwt.claims',jsonb_build_object('sub',c,'session_id',sc)::text,true) from qa_explicit;
insert into public.workspaces(user_id,revision,payload) values(auth.uid(),0,'{"original":"","goal":"","vacancy":""}');
insert into public.fact_history(user_id,workspace_revision,kind,facts) values(auth.uid(),0,'baseline','[]');
set local role authenticated;
do $$begin
 perform public.apply_workspace_command(0,'{"action":"goal","text":"Existing zero"}');
 if (select count(*) from public.fact_history)<>1 or (select kind from public.fact_history)<>'baseline' then raise exception 'revision zero mistaken for insert';end if;
 perform public.apply_workspace_command(1,'{"action":"fact","text":"New fact after baseline"}');
 if (select count(*) from public.fact_history)<>2 or (select kind from public.fact_history order by id desc limit 1)<>'change' then raise exception 'baseline change not captured';end if;
end;$$;
reset role;
do $$begin if (private.workspace_projection_report()->'ok') is distinct from 'true'::jsonb then raise exception 'final parity';end if;end;$$;
rollback;
select 'PASS: compact projection/history without payload triggers, validated input argument, failures at projection/history/audit/consent, initial/existing command and legacy atomicity, output postconditions and owner isolation' as result;
