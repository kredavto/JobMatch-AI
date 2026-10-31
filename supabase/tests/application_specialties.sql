-- Owned disposable fixtures, native PostgreSQL guards, rollback: no provider or mail.
begin;
create temporary table qa_specialties(a uuid,b uuid,sa uuid,sb uuid,app text);
insert into qa_specialties values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null);
grant select,update on qa_specialties to authenticated;
insert into auth.users(id) select a from qa_specialties union all select b from qa_specialties;
insert into auth.sessions(id,user_id) select sa,a from qa_specialties union all select sb,b from qa_specialties;
do $$begin
 if has_function_privilege('anon','public.apply_workspace_command(integer,jsonb)','execute')
  or has_function_privilege('authenticated','private.valid_application_specialty(jsonb)','execute')
  or has_function_privilege('authenticated','private.validate_application_write(jsonb,jsonb)','execute')
  or has_function_privilege('authenticated','private.apply_application_intent(jsonb,jsonb)','execute') then raise exception 'specialty privilege boundary failed';end if;
 if exists(select 1 from pg_proc where oid in ('private.valid_application_specialty(jsonb)'::regprocedure,'private.validate_application_write(jsonb,jsonb)'::regprocedure,'private.apply_application_intent(jsonb,jsonb)'::regprocedure)
  and (prosecdef or not coalesce('search_path=""'=any(proconfig),false))) then raise exception 'specialty function security mode failed';end if;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_specialties;
set local role authenticated;
do $$declare s jsonb;r jsonb;item jsonb;app_id text;begin
 s:=public.apply_workspace_command(0,'{"action":"application","title":"SYNTHETIC SQL role","status":"Планируется","note":"keep"}');
 item:=s->'applications'->0;app_id:=item->>'id';update qa_specialties set app=app_id;
 if item ? 'specialty' then raise exception 'omitted label was invented';end if;
 r:=public.apply_workspace_command(1,jsonb_build_object('action','application','id',app_id,'status','Планируется','note','keep','specialty','QA'));
 if r->'applications'->0 is distinct from item||'{"specialty":"QA"}' or (r-array['revision','applications']) is distinct from (s-array['revision','applications'])
  or r->>'revision'<>'2' then raise exception 'label write changed unrelated data';end if;
 if (select extra->>'specialty' from public.applications where id=app_id)<>'QA' then raise exception 'label not projected to canonical extra';end if;
 -- A command from an old client omits specialty and must preserve it.
 s:=public.apply_workspace_command(2,jsonb_build_object('action','application','id',app_id,'status','Планируется','note','updated note'));
 if s#>>'{applications,0,specialty}'<>'QA' then raise exception 'old command erased label';end if;
 -- Full-snapshot compatibility also preserves the property and unrelated metadata.
 r:=jsonb_set(s,'{applications,0,note}','"legacy update"');perform public.save_workspace(3,r,'application');s:=public.read_workspace();
 if s#>>'{applications,0,specialty}'<>'QA' then raise exception 'old snapshot erased label';end if;
 begin
  perform public.save_workspace(4,jsonb_set(s,'{applications,0}',(s->'applications'->0)-'specialty'),'application');
  raise exception 'dropping label accepted';
 exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if public.read_workspace() is distinct from s then raise exception 'rejected snapshot wrote data';end if;
 -- Empty string is an explicit clear; lifecycle and event history do not change.
 r:=public.apply_workspace_command(4,jsonb_build_object('action','application','id',app_id,'status','Планируется','note','legacy update','specialty',''));
 if r->'applications'->0 is distinct from (s->'applications'->0)||'{"specialty":""}' then raise exception 'clear changed lifecycle';end if;
end;$$;
reset role;
-- Simulate previously allowed unknown metadata; migration never rewrites these rows.
update public.applications set extra=jsonb_set(extra,'{specialty}','{"legacy":["opaque"]}') where user_id=(select a from qa_specialties) and id=(select app from qa_specialties);
set local role authenticated;
do $$declare s jsonb;r jsonb;bad jsonb;item jsonb;app_id text;audits bigint;begin
 s:=public.read_workspace();app_id:=s#>>'{applications,0,id}';
 r:=public.apply_workspace_command(5,jsonb_build_object('action','application','id',app_id,'status','Планируется','note','legacy metadata survives'));
 if r#>'{applications,0,specialty}' is distinct from '{"legacy":["opaque"]}'::jsonb then raise exception 'unknown metadata was rewritten';end if;
 s:=r;
 foreach bad in array array['null'::jsonb,'3'::jsonb,'{}'::jsonb,'[]'::jsonb,'true'::jsonb,to_jsonb(' leading'::text),to_jsonb('trailing '::text),to_jsonb(U&'\00a0QA'),to_jsonb(U&'QA\feff'),to_jsonb(E'QA\nengineer'),to_jsonb(E'QA\tengineer'),to_jsonb(U&'QA\007f'),to_jsonb(U&'QA\009f'),to_jsonb(repeat('x',121)),to_jsonb(repeat(chr(128512),121))] loop
  select count(*) into audits from public.audit_log;
  begin
   perform public.apply_workspace_command(6,jsonb_build_object('action','application','id',app_id,'status','Планируется','note','legacy metadata survives','specialty',bad));
   raise exception 'invalid command label accepted';
  exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
  begin
   perform public.save_workspace(6,jsonb_set(s,'{applications,0,specialty}',bad),'application');
   raise exception 'invalid legacy label write accepted';
  exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
  if public.read_workspace() is distinct from s or (select count(*) from public.audit_log)<>audits then raise exception 'invalid label partially wrote';end if;
 end loop;
 -- The same code-point bound as JavaScript, including astral characters.
 r:=public.apply_workspace_command(6,jsonb_build_object('action','application','id',app_id,'status','Планируется','note','legacy metadata survives','specialty',repeat(chr(128512),120)));
 if length(r#>>'{applications,0,specialty}')<>120 then raise exception 'Unicode label boundary failed';end if;
 s:=r;
 begin
  perform public.apply_workspace_command(6,jsonb_build_object('action','application','id',app_id,'status','Планируется','note','stale','specialty','Other'));
  raise exception 'stale writer accepted';
 exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 if public.read_workspace() is distinct from s then raise exception 'stale writer partially wrote';end if;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from qa_specialties;
set local role authenticated;
do $$declare s jsonb;begin
 s:=public.apply_workspace_command(0,'{"action":"application","title":"SYNTHETIC other owner","status":"Планируется","note":"own","specialty":"QA"}');
 begin
  perform public.apply_workspace_command(1,jsonb_build_object('action','application','id',(select app from qa_specialties),'status','Планируется','note','own','specialty','foreign'));
  raise exception 'foreign label write accepted';
 exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if public.read_workspace() is distinct from s or exists(select 1 from public.applications where user_id=(select a from qa_specialties)) then raise exception 'owner/RLS isolation failed';end if;
end;$$;
reset role;
delete from auth.sessions where id=(select sa from qa_specialties);
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_specialties;
set local role authenticated;
do $$begin
 begin
  perform public.apply_workspace_command(7,jsonb_build_object('action','application','id',(select app from qa_specialties),'status','Планируется','note','revoked','specialty','revoked'));
  raise exception 'revoked session label write accepted';
 exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 if exists(select 1 from public.applications where user_id=(select a from qa_specialties)) then raise exception 'revoked session could read';end if;
end;$$;
reset role;
rollback;
