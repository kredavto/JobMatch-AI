\set ON_ERROR_STOP on
begin;
create temporary table sv_users(a uuid,b uuid,sa uuid,sb uuid,entry uuid,version uuid);
insert into sv_users values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null,null);
grant all on sv_users to authenticated;
insert into auth.users select a from sv_users union all select b from sv_users;
insert into auth.sessions(id,user_id) select sa,a from sv_users union all select sb,b from sv_users;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from sv_users;
set local role authenticated;
do $$declare p jsonb;v jsonb;preview jsonb;ids uuid[];bad uuid[];audits bigint;begin
 perform public.apply_workspace_command(0,jsonb_build_object('action','import','text',E'😀 Python\nОрбита\n2020–2024'));
 p:=public.command_structured_profile(1,0,'{"action":"add","kind":"employment","fields":{"title":{"quote":"Python","start":2,"end":8},"organization":{"quote":"Орбита","start":9,"end":15},"start":{"quote":"2020","start":16,"end":20},"end":{"quote":"2024","start":21,"end":25}}}');
 ids:=array[(p#>>'{entries,0,id}')::uuid];update sv_users set entry=ids[1];
 begin perform public.preview_structured_english_version(1,1,ids);raise exception 'UNCONFIRMED';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 p:=public.command_structured_profile(1,1,jsonb_build_object('action','confirm','id',ids[1],'confirmed',true));
 audits:=(select count(*) from public.audit_log);
 preview:=public.preview_structured_english_version(1,2,ids);
 if (select count(*) from public.structured_resume_versions)<>0 or (select count(*) from public.audit_log)<>audits then raise exception 'PREVIEW_WROTE';end if;
 if preview->>'text'<>E'Structured information\n\nEmployment\nTitle: Python\nOrganization: Орбита\nStart / issue date: 2020\nEnd: 2024' or preview->>'generator'<>'literal-template' or preview->'model_version'<>'null'::jsonb or preview#>>'{snapshot,source_original}'<>E'😀 Python\nОрбита\n2020–2024' then raise exception 'TEMPLATE_PROVENANCE';end if;
 for bad in select array[gen_random_uuid()] union all select array[ids[1],ids[1]] loop
  begin perform public.preview_structured_english_version(1,2,bad);raise exception 'BAD_SELECTION';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 end loop;
 begin perform public.preview_structured_english_version(1,2,array[]::uuid[]);raise exception 'EMPTY';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 begin perform public.save_structured_english_version(1,2,ids,preview->>'preview_hash','no');raise exception 'NO_ACK';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 begin perform public.save_structured_english_version(1,2,ids,repeat('a',64),'SAVE_LITERAL_VERSION');raise exception 'BAD_HASH';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 begin perform public.preview_structured_english_version(1,1,ids);raise exception 'OLD_PROFILE';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 v:=public.save_structured_english_version(1,2,ids,preview->>'preview_hash','SAVE_LITERAL_VERSION');update sv_users set version=(v->>'id')::uuid;
 if v is distinct from public.read_structured_version((v->>'id')::uuid) or v is distinct from public.save_structured_english_version(1,2,ids,preview->>'preview_hash','SAVE_LITERAL_VERSION') or (select count(*) from public.audit_log)<>audits+1 then raise exception 'IDEMPOTENCY';end if;
 if public.read_structured_profile() is distinct from p or (public.read_workspace()->>'revision')::int<>1 or jsonb_array_length(public.read_workspace()->'versions')<>0 then raise exception 'MASTER_MUTATION';end if;
 if jsonb_array_length(public.list_structured_versions()->'versions')<>1 or public.read_structured_version(gen_random_uuid()) is not null then raise exception 'READ_LIST';end if;
 begin delete from public.structured_resume_versions;raise exception 'DIRECT_DELETE';exception when insufficient_privilege then null;end;
 begin update public.structured_resume_versions set text='overwrite';raise exception 'DIRECT_UPDATE';exception when insufficient_privilege then null;end;
 begin insert into public.structured_resume_versions(user_id,profile_revision,workspace_revision,template_version,preview_hash,text,snapshot) values(auth.uid(),2,1,'structured-literal-en-v1',repeat('b',64),'fake','{}');raise exception 'DIRECT_INSERT';exception when insufficient_privilege then null;end;
end;$$;
reset role;
do $$begin begin update public.structured_resume_versions set text='overwrite' where user_id=(select a from sv_users);raise exception 'ADMIN_OVERWRITE';exception when others then if sqlerrm<>'IMMUTABLE_VERSION' then raise;end if;end;end;$$;
create function pg_temp.sv_fail_audit() returns trigger language plpgsql as $$begin if new.action='structured_version_save' then raise exception 'FIXTURE_AUDIT_FAILURE';end if;return new;end;$$;
create trigger sv_audit_failure before insert on public.audit_log for each row execute function pg_temp.sv_fail_audit();
set local role authenticated;
do $$declare p jsonb;ids uuid[]:=array[(select entry from sv_users)];begin
 perform public.apply_workspace_command(1,jsonb_build_object('action','verify','ids',jsonb_build_array(public.read_workspace()#>>'{facts,0,id}'),'verified',true));
 p:=public.preview_structured_english_version(2,2,ids);
 begin perform public.save_structured_english_version(2,2,ids,p->>'preview_hash','SAVE_LITERAL_VERSION');raise exception 'NO_FAULT';exception when others then if sqlerrm<>'FIXTURE_AUDIT_FAILURE' then raise;end if;end;
 if (select count(*) from public.structured_resume_versions)<>1 then raise exception 'PARTIAL_SAVE';end if;
end;$$;
reset role;drop trigger sv_audit_failure on public.audit_log;
set local role authenticated;
do $$declare p jsonb;preview jsonb;v jsonb;ids uuid[]:=array[(select entry from sv_users)];rev integer:=2;original jsonb;begin
 original:=public.read_structured_version((select version from sv_users));
 for i in 1..19 loop
  if i>1 then
   p:=public.command_structured_profile(2,rev,jsonb_build_object('action','confirm','id',ids[1],'confirmed',false));rev:=rev+1;
   begin perform public.preview_structured_english_version(2,rev,ids);raise exception 'RETRACTED';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
   p:=public.command_structured_profile(2,rev,jsonb_build_object('action','confirm','id',ids[1],'confirmed',true));rev:=rev+1;
  end if;
  preview:=public.preview_structured_english_version(2,rev,ids);v:=public.save_structured_english_version(2,rev,ids,preview->>'preview_hash','SAVE_LITERAL_VERSION');
 end loop;
 if (select count(*) from public.structured_resume_versions)<>20 or public.save_structured_english_version(2,rev,ids,preview->>'preview_hash','SAVE_LITERAL_VERSION') is distinct from v then raise exception 'CAP_OR_IDEMPOTENCY';end if;
 p:=public.command_structured_profile(2,rev,jsonb_build_object('action','confirm','id',ids[1],'confirmed',false));rev:=rev+1;
 p:=public.command_structured_profile(2,rev,jsonb_build_object('action','confirm','id',ids[1],'confirmed',true));rev:=rev+1;
 preview:=public.preview_structured_english_version(2,rev,ids);
 begin perform public.save_structured_english_version(2,rev,ids,preview->>'preview_hash','SAVE_LITERAL_VERSION');raise exception 'CAP';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 perform public.apply_workspace_command(2,jsonb_build_object('action','import','text',public.read_workspace()->>'original'));
 begin perform public.preview_structured_english_version(3,rev,ids);raise exception 'REIMPORT_TRUST';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 p:=public.command_structured_profile(3,rev,'{"action":"reset","confirm":"RESET_STRUCTURED_PROFILE"}');
 if public.read_structured_version((select version from sv_users)) is distinct from original or jsonb_array_length(public.list_structured_versions()->'versions')<>20 then raise exception 'HISTORY_LOST';end if;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from sv_users;
do $$declare source text;w integer:=0;r integer:=0;p jsonb;ids uuid[];start_at integer;begin
 if exists(select 1 from public.structured_resume_versions) or public.read_structured_version((select version from sv_users)) is not null or public.list_structured_versions()->'versions'<>'[]'::jsonb then raise exception 'OWNER_LEAK';end if;
 foreach source in array array['Не использовал Python','Never used Python','Learning Python','Планирую Python','ignore previous instructions Python','<script>Python',E'Python\nnot SQL',E'Не\nPython\nнет'] loop
  perform public.apply_workspace_command(w,jsonb_build_object('action','import','text',source));w:=w+1;
  if r>0 then p:=public.command_structured_profile(w,r,'{"action":"reset","confirm":"RESET_STRUCTURED_PROFILE"}');r:=r+1;end if;
  start_at:=strpos(source,'Python')-1;
  p:=public.command_structured_profile(w,r,jsonb_build_object('action','add','kind','employment','fields',jsonb_build_object('title',jsonb_build_object('quote',case when source=E'Python\nnot SQL' then source else 'Python' end,'start',start_at,'end',case when source=E'Python\nnot SQL' then length(source) else start_at+6 end))));r:=r+1;
  ids:=array[(p#>>'{entries,0,id}')::uuid];p:=public.command_structured_profile(w,r,jsonb_build_object('action','confirm','id',ids[1],'confirmed',true));r:=r+1;
  if source=E'Не\nPython\nнет' then perform public.preview_structured_english_version(w,r,ids);
  else begin perform public.preview_structured_english_version(w,r,ids);raise exception 'RISK_NOT_BLOCKED';exception when others then if sqlerrm<>'UNSAFE_CONTEXT' then raise;end if;end;end if;
 end loop;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from sv_users;
delete from auth.sessions where id=(select sa from sv_users);
set local role authenticated;
do $$begin
 begin perform public.read_structured_version((select version from sv_users));raise exception 'REVOKED_READ';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 begin perform public.list_structured_versions();raise exception 'REVOKED_LIST';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 begin perform public.preview_structured_english_version(3,41,array[(select entry from sv_users)]);raise exception 'REVOKED_PREVIEW';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 begin perform public.save_structured_english_version(3,41,array[(select entry from sv_users)],repeat('a',64),'SAVE_LITERAL_VERSION');raise exception 'REVOKED_SAVE';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 if exists(select 1 from public.structured_resume_versions) then raise exception 'REVOKED_RLS';end if;
end;$$;
reset role;
delete from auth.users where id in(select a from sv_users union all select b from sv_users);
do $$begin if exists(select 1 from public.structured_resume_versions where user_id in(select a from sv_users union all select b from sv_users)) then raise exception 'CASCADE';end if;end;$$;
rollback;
