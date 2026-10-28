-- Transaction-only synthetic fixtures. No provider calls or persistent account changes.
begin;
create temporary table qa_profile(a uuid,b uuid,sa uuid,sb uuid,foreign_fact text);
insert into qa_profile values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null);
grant select,update on qa_profile to authenticated;
insert into auth.users(id) select a from qa_profile union all select b from qa_profile;
insert into auth.sessions(id,user_id) select sa,a from qa_profile union all select sb,b from qa_profile;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_profile;
set local role authenticated;
do $$declare s jsonb;next_state jsonb;before_state jsonb;raw text;ids jsonb;fid text;candidate jsonb;v jsonb;bad jsonb;rev integer;confirmed_revision integer;audits bigint;histories bigint;begin
 raw:=E'\tSQL \r\n\r\n'||U&'\FEFFv\00A0'||E'\n😀\nSQL\nline\rinside\n'||U&'\0085keep\0085'||E'\n'||U&'\200Bkeep\200B';
 s:=public.apply_workspace_command(0,jsonb_build_object('action','import','text',raw));
 if s->>'original' is distinct from raw or s->>'vacancy'<>'' or (s->>'revision')::integer<>1 then raise exception 'import did not preserve raw input';end if;
 if (select jsonb_agg(f->'text' order by n) from jsonb_array_elements(s->'facts') with ordinality facts(f,n))
  is distinct from '["SQL","v","😀","SQL","line\rinside","\u0085keep\u0085","\u200bkeep\u200b"]'::jsonb then raise exception 'line order/duplicates/Unicode trim differs';end if;
 if exists(select 1 from jsonb_array_elements(s->'facts') f where f->'verified' is distinct from 'false'::jsonb or f->>'source'<>'Введено пользователем' or (f->>'id')::uuid is null)
  or (select count(distinct f->>'id') from jsonb_array_elements(s->'facts') f)<>jsonb_array_length(s->'facts') then raise exception 'facts not fresh/unconfirmed';end if;
 -- Build real historical evidence through the existing legacy version gate.
 s:=public.apply_workspace_command(1,'{"action":"import","text":"SQL\nPython"}');fid:=s#>>'{facts,0,id}';
 s:=public.apply_workspace_command(2,jsonb_build_object('action','verify','ids',jsonb_build_array(fid),'verified',true));confirmed_revision:=3;
 s:=public.apply_workspace_command(3,'{"action":"vacancy","text":"SQL analyst"}');
 v:=jsonb_build_object('id','profile-history-v1','created','2026-10-28','text',E'РЕЛЕВАНТНЫЙ ОПЫТ\nSQL\n\nПРОФИЛЬ\nPython','vacancy','SQL analyst','score',100,
  'evidence_ids',jsonb_build_array(fid),'evidence_snapshot',jsonb_build_array(s->'facts'->0),'profile_revision',4,'engine_version','rules-v1');
 perform public.save_workspace(4,jsonb_set(s,'{versions}',jsonb_build_array(v)),'version');s:=public.read_workspace();
 s:=public.apply_workspace_command(5,'{"action":"application","title":"SQL role","status":"Планируется","note":"","resumeVersionId":"profile-history-v1"}');
 s:=public.apply_workspace_command(6,'{"action":"goal","text":"Analyst"}');before_state:=s;
 s:=public.apply_workspace_command(7,'{"action":"import","text":"SQL\nRust"}');
 if s->>'vacancy'<>'' or (s-array['original','facts','vacancy','revision']) is distinct from (before_state-array['original','facts','vacancy','revision'])
  or s->'versions'->0 is distinct from v then raise exception 'reimport changed history/apps/goal';end if;
 if exists(select 1 from jsonb_array_elements(s->'facts') f where f->'verified'<>'false'::jsonb or f->>'id'=fid)
  or exists(select 1 from public.profile_facts where id=fid) then raise exception 'reimport kept confirmed identity';end if;
 if (select facts->0->>'verified' from public.fact_history where workspace_revision=confirmed_revision)<>'true'
  or (select facts->0->>'verified' from public.fact_history order by id desc limit 1)<>'false'
  or (select text from public.resume_versions where id='profile-history-v1') is distinct from v->>'text' then raise exception 'historical evidence overwritten';end if;
 ids:=(select jsonb_agg(f->'id') from jsonb_array_elements(s->'facts') f);
 s:=public.apply_workspace_command(8,'{"action":"import","text":"SQL\nRust"}');
 if exists(select 1 from jsonb_array_elements(s->'facts') f where ids ? (f->>'id')) then raise exception 'same-text reimport reused IDs';end if;
 before_state:=s;raw:=E'  v\r\nSQL😀  ';
 s:=public.apply_workspace_command(9,jsonb_build_object('action','fact','text',raw));candidate:=s->'facts'->-1;
 if s->>'original' is distinct from (before_state->>'original')||E'\n'||raw or candidate->>'text' is distinct from raw
  or candidate->>'source'<>'Уточнение пользователя' or candidate->'verified' is distinct from 'false'::jsonb
  or ((s->'facts')-2) is distinct from before_state->'facts'
  or (s-array['original','facts','revision']) is distinct from (before_state-array['original','facts','revision']) then raise exception 'fact append changed prior state or text';end if;
 s:=public.apply_workspace_command(10,'{"action":"import","text":" \t\r\n"}');
 if s->'facts'<>'[]'::jsonb or s->'versions' is distinct from before_state->'versions' then raise exception 'whitespace-only legacy input changed';end if;
 s:=public.apply_workspace_command(11,'{"action":"demo","text":"Demo v\nSales","vacancy":"Demo vacancy"}');
 if s->>'vacancy'<>'Demo vacancy' or s#>>'{facts,0,text}'<>'Demo v' or s->'applications' is distinct from before_state->'applications' then raise exception 'demo failed';end if;
 -- Legacy writes and new commands share revisions in both directions.
 rev:=(s->>'revision')::integer;next_state:=jsonb_set(s,'{goal}','"legacy goal"');
 perform public.save_workspace(rev,next_state,'goal');next_state:=public.read_workspace();
 begin perform public.apply_workspace_command(rev,'{"action":"fact","text":"stale"}');raise exception 'stale command accepted';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 s:=public.apply_workspace_command((next_state->>'revision')::integer,'{"action":"fact","text":"New fact"}');
 begin perform public.save_workspace((next_state->>'revision')::integer,next_state,'goal');raise exception 'stale snapshot accepted';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 audits:=(select count(*) from public.audit_log);histories:=(select count(*) from public.fact_history);
 for bad in select value from jsonb_array_elements(jsonb_build_array(
  '{"action":"import","text":""}'::jsonb,'{"action":"import","text":null}'::jsonb,'{"action":"import","text":3}'::jsonb,
  '{"action":"import","text":"SQL","facts":[]}'::jsonb,'{"action":"import","text":"SQL","vacancy":"injected"}'::jsonb,
  '{"action":"fact","text":"SQL","verified":true}'::jsonb,'{"action":"fact","text":"SQL","source":"forged"}'::jsonb,
  '{"action":"fact","text":"SQL","id":"foreign"}'::jsonb,'{"action":"fact","text":"SQL","user_id":"foreign"}'::jsonb,
  '{"action":"fact","text":"x"}'::jsonb,'{"action":"fact","text":"😀"}'::jsonb,'{"action":"demo","text":"SQL"}'::jsonb,'{"action":"demo","text":"SQL","vacancy":"x"}'::jsonb,
  jsonb_build_object('action','import','text',repeat('x',100001)),jsonb_build_object('action','import','text',repeat('😀',1000)||'x'),
  jsonb_build_object('action','fact','text',repeat('😀',2000)||'x'),jsonb_build_object('action','import','text',repeat(E'x\n',501))
 )) loop
  begin perform public.apply_workspace_command((s->>'revision')::integer,bad);raise exception 'invalid profile command accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 end loop;
 if public.read_workspace() is distinct from s or (select count(*) from public.audit_log)<>audits or (select count(*) from public.fact_history)<>histories then raise exception 'rejection leaked state/history/audit';end if;
 -- Raw/fact limits follow Zod code points; imported lines retain the legacy UTF-16 gate.
 s:=public.apply_workspace_command((s->>'revision')::integer,jsonb_build_object('action','import','text',repeat(' ',99999)||'v'));
 if s#>>'{facts,0,text}'<>'v' then raise exception 'raw limit/trim failed';end if;
 s:=public.apply_workspace_command((s->>'revision')::integer,jsonb_build_object('action','import','text',repeat('😀',1000)));
 s:=public.apply_workspace_command((s->>'revision')::integer,jsonb_build_object('action','fact','text',repeat('😀',2000)));
 if jsonb_array_length(s->'facts')<>2 then raise exception 'UTF16 exact line/fact limit failed';end if;
 s:=public.apply_workspace_command((s->>'revision')::integer,jsonb_build_object('action','import','text',repeat(E'x\n',500)));
 if jsonb_array_length(s->'facts')<>500 then raise exception '500th fact rejected';end if;
 begin perform public.apply_workspace_command((s->>'revision')::integer,'{"action":"fact","text":"501st"}');raise exception '501st fact accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if public.read_workspace() is distinct from s then raise exception 'fact cap leaked writes';end if;
 update qa_profile set foreign_fact=s#>>'{facts,0,id}';
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from qa_profile;
do $$begin
 begin perform public.apply_workspace_command(0,jsonb_build_object('action','verify','ids',(select jsonb_build_array(foreign_fact) from qa_profile),'verified',true));raise exception 'foreign fact accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if public.read_workspace() is not null then raise exception 'foreign ID created workspace';end if;
 if public.apply_workspace_command(0,'{"action":"fact","text":"Own fact"}')#>>'{facts,0,text}'<>'Own fact' then raise exception 'first fact failed';end if;
 if has_function_privilege('anon','public.apply_workspace_command(integer,jsonb)','EXECUTE')
  or has_function_privilege('authenticated','private.apply_profile_intent(jsonb,jsonb)','EXECUTE')
  or has_function_privilege('authenticated','private.utf16_length(text)','EXECUTE') then raise exception 'helper/RPC grants incorrect';end if;
end;$$;
reset role;
delete from auth.sessions where id in (select sb from qa_profile);
set local role authenticated;
do $$begin
 begin perform public.apply_workspace_command(1,'{"action":"import","text":"revoked"}');raise exception 'revoked accepted';exception when raise_exception then if sqlerrm<>'AUTH' then raise;end if;end;
end;$$;
reset role;
do $$begin
 if private.utf16_length('SQL😀')<>5 or private.trim_fact_line(E'\vdev\v')<>'dev' then raise exception 'Unicode primitive mismatch';end if;
end;$$;
rollback;
select 'PASS: profile import/fact/demo, Unicode/UTF16, fresh unconfirmed IDs, historical evidence/apps, revisions, owner/session, limits and atomic rejection' as result;
