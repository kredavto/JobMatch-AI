\set ON_ERROR_STOP on
begin;
create temporary table oe_users(a uuid,b uuid,sa uuid,sb uuid,version_id text);
insert into oe_users values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null);
grant all on oe_users to authenticated;
insert into auth.users select a from oe_users union all select b from oe_users;
insert into auth.sessions(id,user_id) select sa,a from oe_users union all select sb,b from oe_users;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from oe_users;
set local role authenticated;
do $$declare s jsonb;prior jsonb;r jsonb;e jsonb;cmd jsonb;bad jsonb;audits bigint;candidate jsonb;begin
 s:=public.apply_workspace_command(0,'{"action":"import","text":"SQL\nRésumé — 42%"}');
 s:=public.apply_workspace_command(1,'{"action":"vacancy","text":"SQL role"}');
 s:=public.apply_workspace_command(2,jsonb_build_object('action','verify','ids',jsonb_build_array(s#>>'{facts,0,id}'),'verified',true));
 cmd:=jsonb_build_object('action','version','evidence_ids',jsonb_build_array(s#>>'{facts,0,id}'),'score',100,'match_metadata','{"rules_revision":"rules-2026-10-25.1","weights":{"mandatory":35,"experience":25,"skills":20,"context":10,"clarity":10},"contributions":{"matched":1,"partial":0.5,"missing":0,"unknown":0},"requirements":1,"outcomes":{"matched":1,"partial":0,"missing":0,"unknown":0}}'::jsonb);
 s:=public.apply_workspace_command(3,cmd);r:=s->'versions'->-1;
 if r ? 'template_version' or r->>'text'<>E'РЕЛЕВАНТНЫЙ ОПЫТ\nSQL\n\nПРОФИЛЬ\nRésumé — 42%' then raise exception 'RUSSIAN_CHANGED';end if;
 cmd:=cmd||'{"template_version":"ordinary-literal-en-v1"}';
 prior:=s;s:=public.apply_workspace_command(4,cmd);e:=s->'versions'->-1;
 if e->>'template_version'<>'ordinary-literal-en-v1' or e->>'text'<>E'RELEVANT EXPERIENCE\nSQL\n\nPROFILE\nRésumé — 42%'
    or s->'versions'->0 is distinct from r or s->'facts' is distinct from prior->'facts'
    or (e-array['id','created','text','template_version','profile_revision']) is distinct from (r-array['id','created','text','profile_revision']) then raise exception 'ENGLISH_CONSTRUCTION';end if;
 update oe_users set version_id=e->>'id';
 prior:=s;audits:=(select count(*) from public.audit_log);
 for bad in select jsonb_set(cmd,'{template_version}',value) from jsonb_array_elements('["en","ordinary-literal-v1","ordinary-literal-en-v2",null]') loop
  begin perform public.apply_workspace_command(5,bad);raise exception 'BAD_TAG_ACCEPTED';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 end loop;
 if public.read_workspace() is distinct from prior or (select count(*) from public.audit_log)<>audits then raise exception 'PARTIAL_REJECTION';end if;
 -- Full-snapshot compatibility writer is subject to the same exact English reconstruction gate.
 candidate:=e||jsonb_build_object('id',gen_random_uuid()::text,'profile_revision',5,'text',r->>'text');
 begin perform public.save_workspace(5,jsonb_set(s,'{versions}',s->'versions'||jsonb_build_array(candidate)),'version');raise exception 'FALSE_ENGLISH_TAG';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 s:=public.apply_workspace_command(5,jsonb_build_object('action','restore','id',e->>'id'));
 if ((s->'versions'->-1)-array['id','created','restored_from']) is distinct from (e-array['id','created','restored_from'])
    or s->'versions'->1 is distinct from e or s->'versions'->0 is distinct from r then raise exception 'RESTORE_RETAGGED';end if;
 s:=public.apply_workspace_command(6,jsonb_set(cmd,'{evidence_ids}','[]'::jsonb));
 if s->'versions'->-1->>'text'<>s->>'original' or s->'versions'->-1->>'template_version'<>'ordinary-literal-en-v1' then raise exception 'EMPTY_EDITS_CHANGED_SOURCE';end if;
 -- A no-version command round-trips all metadata and rows through normalized extra storage.
 prior:=s;s:=public.apply_workspace_command(7,'{"action":"goal","text":"New goal"}');
 if s->'versions' is distinct from prior->'versions' then raise exception 'CANONICAL_EXTRA_LOST';end if;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from oe_users;
do $$begin
 if public.read_workspace() is not null then raise exception 'OWNER_LEAK';end if;
 begin perform public.apply_workspace_command(0,jsonb_build_object('action','restore','id',(select version_id from oe_users)));raise exception 'FOREIGN_RESTORE';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
end;$$;
reset role;
delete from auth.sessions where id=(select sa from oe_users);
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from oe_users;
set local role authenticated;
do $$begin
 begin perform public.apply_workspace_command(8,'{"action":"version","template_version":"ordinary-literal-en-v1"}');raise exception 'REVOKED';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
end;$$;
reset role;
do $$declare s jsonb;cmd jsonb;begin
 s:=jsonb_build_object('original',E'SQL\r\n42%','vacancy','SQL','facts','[]'::jsonb,'versions',(select jsonb_agg(jsonb_build_object('id','v'||i,'created','2026-10-28','text','SQL')) from generate_series(1,99) i));
 cmd:=jsonb_build_object('action','version','template_version','ordinary-literal-en-v1','evidence_ids','[]'::jsonb,'score',100,'match_metadata','{"rules_revision":"rules-2026-10-25.1","weights":{"mandatory":35,"experience":25,"skills":20,"context":10,"clarity":10},"contributions":{"matched":1,"partial":0.5,"missing":0,"unknown":0},"requirements":1,"outcomes":{"matched":1,"partial":0,"missing":0,"unknown":0}}'::jsonb);
 s:=private.apply_version_intent(s,99,cmd);
 if jsonb_array_length(s->'versions')<>100 or s->'versions'->-1->>'text'<>E'SQL\r\n42%' then raise exception 'CAP_OR_LITERAL';end if;
 begin perform private.apply_version_intent(s,100,cmd);raise exception 'CAP';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if has_function_privilege('authenticated','private.apply_version_intent(jsonb,integer,jsonb)','execute') or has_function_privilege('anon','public.apply_workspace_command(integer,jsonb)','execute') then raise exception 'GRANTS';end if;
end;$$;
rollback;
select 'PASS: English/Russian literal construction, shared cap, exact restore, legacy writer tag gate, unknown-tag atomic refusal, canonical extra, owner/session and grants' as result;
