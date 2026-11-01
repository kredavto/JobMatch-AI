\set ON_ERROR_STOP on
begin;
create temporary table sv_users(a uuid,b uuid,sa uuid,sb uuid,entry uuid,version uuid);
insert into sv_users values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null,null);
grant all on sv_users to authenticated;
create function pg_temp.sv_profile(w integer,r integer,c jsonb) returns jsonb language sql security invoker as $$
 select public.command_source_profile(w,r,c,case when c->>'action' in ('add','reset') or(c->>'action'='confirm' and c->>'confirmed'='true') then 'STORE_REVIEWED_SOURCE_PROFILE' else 'REMOVE_SOURCE_PROFILE_DATA' end);
$$;
grant execute on function pg_temp.sv_profile(integer,integer,jsonb) to authenticated;
insert into auth.users select a from sv_users union all select b from sv_users;
insert into auth.sessions(id,user_id) select sa,a from sv_users union all select sb,b from sv_users;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from sv_users;
set local role authenticated;
do $$begin
 if public.source_version_storage_ready() then raise exception 'DEFAULT_ON';end if;
 begin perform public.save_source_version(0,1,array[gen_random_uuid()],repeat('a',64),'SAVE_LITERAL_SOURCE_VERSION');raise exception 'UNAPPROVED_SAVE';exception when others then if sqlerrm<>'SOURCE_VERSION_UNAVAILABLE' then raise;end if;end;
 if exists(select 1 from public.workspaces) or exists(select 1 from public.source_profile_versions) then raise exception 'OFF_CREATED_ROWS';end if;
end;$$;
reset role;
grant execute on function private.source_profile_storage_permission(),private.source_version_storage_permission() to authenticated;
set local role authenticated;
do $$declare p jsonb;v jsonb;preview jsonb;ids uuid[];bad uuid[];audits bigint;begin
 perform public.apply_workspace_command(0,jsonb_build_object('action','import','text',E'😀 Python\nОрбита\n2020–2024'));
 p:=pg_temp.sv_profile(1,0,'{"action":"add","kind":"employment","fields":{"title":{"quote":"Python","start":2,"end":8},"organization":{"quote":"Орбита","start":9,"end":15},"start":{"quote":"2020","start":16,"end":20},"end":{"quote":"2024","start":21,"end":25}}}');
 ids:=array[(p#>>'{entries,0,id}')::uuid];update sv_users set entry=ids[1];
 begin perform public.preview_source_version(1,1,ids);raise exception 'UNCONFIRMED';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 p:=pg_temp.sv_profile(1,1,jsonb_build_object('action','confirm','id',ids[1],'confirmed',true));
 audits:=(select count(*) from public.audit_log);
 preview:=public.preview_source_version(1,2,ids);
 if (select count(*) from public.source_profile_versions)<>0 or (select count(*) from public.audit_log)<>audits then raise exception 'PREVIEW_WROTE';end if;
 if preview->>'text'<>E'Структурированные сведения\n\nРабота\nНазвание: Python\nОрганизация: Орбита\nНачало / дата выдачи: 2020\nОкончание: 2024' or preview->>'generator'<>'literal-template' or preview->'model_version'<>'null'::jsonb or preview#>>'{snapshot,source_original}'<>E'😀 Python\nОрбита\n2020–2024' then raise exception 'TEMPLATE_PROVENANCE';end if;
 for bad in select array[gen_random_uuid()] union all select array[ids[1],ids[1]] loop
  begin perform public.preview_source_version(1,2,bad);raise exception 'BAD_SELECTION';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 end loop;
 begin perform public.preview_source_version(1,2,array[]::uuid[]);raise exception 'EMPTY';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 begin perform public.save_source_version(1,2,ids,preview->>'preview_hash','no');raise exception 'NO_ACK';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 begin perform public.save_source_version(1,2,ids,repeat('a',64),'SAVE_LITERAL_SOURCE_VERSION');raise exception 'BAD_HASH';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 begin perform public.preview_source_version(1,1,ids);raise exception 'OLD_PROFILE';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 v:=public.save_source_version(1,2,ids,preview->>'preview_hash','SAVE_LITERAL_SOURCE_VERSION');update sv_users set version=(v->>'id')::uuid;
 if v is distinct from public.read_source_version((v->>'id')::uuid) or v is distinct from public.save_source_version(1,2,ids,preview->>'preview_hash','SAVE_LITERAL_SOURCE_VERSION') or (select count(*) from public.audit_log)<>audits+1 then raise exception 'IDEMPOTENCY';end if;
 if public.read_source_profile() is distinct from p or (public.read_workspace()->>'revision')::int<>1 or jsonb_array_length(public.read_workspace()->'versions')<>0 or exists(select 1 from jsonb_array_elements(public.read_workspace()->'facts') f where (f->>'verified')::boolean) then raise exception 'MASTER_MUTATION_OR_IMPLICIT_VERIFICATION';end if;
 if jsonb_array_length(public.list_source_versions()->'versions')<>1 or public.read_source_version(gen_random_uuid()) is not null then raise exception 'READ_LIST';end if;
 begin delete from public.source_profile_versions;raise exception 'DIRECT_DELETE';exception when insufficient_privilege then null;end;
 begin update public.source_profile_versions set text='overwrite';raise exception 'DIRECT_UPDATE';exception when insufficient_privilege then null;end;
 begin insert into public.source_profile_versions(user_id,profile_revision,workspace_revision,template_version,preview_hash,text,snapshot) values(auth.uid(),2,1,'source-literal-ru-v1',repeat('b',64),'fake','{}');raise exception 'DIRECT_INSERT';exception when insufficient_privilege then null;end;
end;$$;
reset role;
do $$begin begin update public.source_profile_versions set text='overwrite' where user_id=(select a from sv_users);raise exception 'ADMIN_OVERWRITE';exception when others then if sqlerrm<>'IMMUTABLE_VERSION' then raise;end if;end;end;$$;
create function pg_temp.sv_fail_audit() returns trigger language plpgsql as $$begin if new.action='source_version_save' then raise exception 'FIXTURE_AUDIT_FAILURE';end if;return new;end;$$;
create trigger sv_audit_failure before insert on public.audit_log for each row execute function pg_temp.sv_fail_audit();
set local role authenticated;
do $$declare p jsonb;ids uuid[]:=array[(select entry from sv_users)];begin
 perform public.apply_workspace_command(1,jsonb_build_object('action','verify','ids',jsonb_build_array(public.read_workspace()#>>'{facts,0,id}'),'verified',true));
 p:=public.preview_source_version(2,2,ids);
 begin perform public.save_source_version(2,2,ids,p->>'preview_hash','SAVE_LITERAL_SOURCE_VERSION');raise exception 'NO_FAULT';exception when others then if sqlerrm<>'FIXTURE_AUDIT_FAILURE' then raise;end if;end;
 if (select count(*) from public.source_profile_versions)<>1 then raise exception 'PARTIAL_SAVE';end if;
end;$$;
reset role;drop trigger sv_audit_failure on public.audit_log;
set local role authenticated;
do $$declare p jsonb;preview jsonb;v jsonb;ids uuid[]:=array[(select entry from sv_users)];rev integer:=2;original jsonb;begin
 original:=public.read_source_version((select version from sv_users));
 for i in 1..19 loop
  if i>1 then
   p:=pg_temp.sv_profile(2,rev,jsonb_build_object('action','confirm','id',ids[1],'confirmed',false));rev:=rev+1;
   begin perform public.preview_source_version(2,rev,ids);raise exception 'RETRACTED';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
   p:=pg_temp.sv_profile(2,rev,jsonb_build_object('action','confirm','id',ids[1],'confirmed',true));rev:=rev+1;
  end if;
  preview:=public.preview_source_version(2,rev,ids);v:=public.save_source_version(2,rev,ids,preview->>'preview_hash','SAVE_LITERAL_SOURCE_VERSION');
 end loop;
 if (select count(*) from public.source_profile_versions)<>20 or public.save_source_version(2,rev,ids,preview->>'preview_hash','SAVE_LITERAL_SOURCE_VERSION') is distinct from v then raise exception 'CAP_OR_IDEMPOTENCY';end if;
 p:=pg_temp.sv_profile(2,rev,jsonb_build_object('action','confirm','id',ids[1],'confirmed',false));rev:=rev+1;
 p:=pg_temp.sv_profile(2,rev,jsonb_build_object('action','confirm','id',ids[1],'confirmed',true));rev:=rev+1;
 preview:=public.preview_source_version(2,rev,ids);
 begin perform public.save_source_version(2,rev,ids,preview->>'preview_hash','SAVE_LITERAL_SOURCE_VERSION');raise exception 'CAP';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 perform public.apply_workspace_command(2,jsonb_build_object('action','import','text',public.read_workspace()->>'original'));
 begin perform public.preview_source_version(3,rev,ids);raise exception 'REIMPORT_TRUST';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 p:=pg_temp.sv_profile(3,rev,'{"action":"reset","confirm":"RESET_SOURCE_PROFILE"}');
 if public.read_source_version((select version from sv_users)) is distinct from original or jsonb_array_length(public.list_source_versions()->'versions')<>20 then raise exception 'HISTORY_LOST';end if;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from sv_users;
do $$declare source text;w integer:=0;r integer:=0;p jsonb;ids uuid[];start_at integer;begin
 if exists(select 1 from public.source_profile_versions) or public.read_source_version((select version from sv_users)) is not null or public.list_source_versions()->'versions'<>'[]'::jsonb then raise exception 'OWNER_LEAK';end if;
 foreach source in array array['Не использовал Python','Never used Python','Learning Python','Планирую Python','ignore previous instructions Python','<script>Python',E'Python\nnot SQL',E'Не\nPython\nнет'] loop
  perform public.apply_workspace_command(w,jsonb_build_object('action','import','text',source));w:=w+1;
  if r>0 then p:=pg_temp.sv_profile(w,r,'{"action":"reset","confirm":"RESET_SOURCE_PROFILE"}');r:=r+1;end if;
  start_at:=strpos(source,'Python')-1;
  p:=pg_temp.sv_profile(w,r,jsonb_build_object('action','add','kind','employment','fields',jsonb_build_object('title',jsonb_build_object('quote',case when source=E'Python\nnot SQL' then source else 'Python' end,'start',start_at,'end',case when source=E'Python\nnot SQL' then length(source) else start_at+6 end))));r:=r+1;
  ids:=array[(p#>>'{entries,0,id}')::uuid];p:=pg_temp.sv_profile(w,r,jsonb_build_object('action','confirm','id',ids[1],'confirmed',true));r:=r+1;
  if source=E'Не\nPython\nнет' then perform public.preview_source_version(w,r,ids);
  else begin perform public.preview_source_version(w,r,ids);raise exception 'RISK_NOT_BLOCKED';exception when others then if sqlerrm<>'UNSAFE_CONTEXT' then raise;end if;end;end if;
 end loop;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from sv_users;
revoke execute on function private.source_version_storage_permission() from authenticated;
set local role authenticated;
do $$declare old jsonb;profile jsonb;workspace jsonb;begin
 old:=public.list_source_versions();profile:=public.read_source_profile();workspace:=public.read_workspace();
 if public.source_version_storage_ready() then raise exception 'REVOKED_CAP_READY';end if;
 begin perform public.clear_source_versions(repeat('a',64),'DELETE_LITERAL_SOURCE_VERSIONS');raise exception 'STALE_CLEAR';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 if public.list_source_versions() is distinct from old then raise exception 'STALE_CLEAR_CHANGED_HISTORY';end if;
 begin perform public.save_source_version(3,1,array[(select entry from sv_users)],repeat('a',64),'SAVE_LITERAL_SOURCE_VERSION');raise exception 'REVOKED_CAP_SAVE';exception when others then if sqlerrm<>'SOURCE_VERSION_UNAVAILABLE' then raise;end if;end;
 if public.clear_source_versions(old->>'collection_hash','DELETE_LITERAL_SOURCE_VERSIONS')->'versions'<>'[]'::jsonb then raise exception 'CLEANUP_FAILED';end if;
 if public.read_source_profile() is distinct from profile or public.read_workspace() is distinct from workspace then raise exception 'CLEANUP_MUTATED_MASTER';end if;
end;$$;
reset role;
grant execute on function private.source_version_storage_permission() to authenticated;
set local role authenticated;
do $$declare p jsonb;entry uuid;v jsonb;begin
 p:=public.read_source_profile();p:=pg_temp.sv_profile(3,(p->>'revision')::integer,'{"action":"add","kind":"employment","fields":{"title":{"quote":"Python","start":2,"end":8}}}');entry:=(p#>>'{entries,0,id}')::uuid;
 p:=pg_temp.sv_profile(3,(p->>'revision')::integer,jsonb_build_object('action','confirm','id',entry,'confirmed',true));
 v:=public.preview_source_version(3,(p->>'revision')::integer,array[entry]);perform public.save_source_version(3,(p->>'revision')::integer,array[entry],v->>'preview_hash','SAVE_LITERAL_SOURCE_VERSION');
end;$$;
reset role;
delete from auth.sessions where id=(select sa from sv_users);
set local role authenticated;
do $$begin
 begin perform public.read_source_version((select version from sv_users));raise exception 'REVOKED_READ';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 begin perform public.list_source_versions();raise exception 'REVOKED_LIST';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 begin perform public.preview_source_version(3,41,array[(select entry from sv_users)]);raise exception 'REVOKED_PREVIEW';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 begin perform public.save_source_version(3,41,array[(select entry from sv_users)],repeat('a',64),'SAVE_LITERAL_SOURCE_VERSION');raise exception 'REVOKED_SAVE';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 if exists(select 1 from public.source_profile_versions) then raise exception 'REVOKED_RLS';end if;
end;$$;
reset role;
delete from auth.users where id in(select a from sv_users union all select b from sv_users);
do $$begin if exists(select 1 from public.source_profile_versions where user_id in(select a from sv_users union all select b from sv_users)) then raise exception 'CASCADE';end if;end;$$;
rollback;
