\set ON_ERROR_STOP on
-- Disposable native PostgreSQL fixture. The key and Auth implementation are synthetic.
begin;
create temporary table ap_users(a uuid,b uuid,sa uuid,sb uuid,receipt uuid);
insert into ap_users values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null);
grant all on ap_users to authenticated;
insert into auth.users select a from ap_users union all select b from ap_users;
insert into auth.sessions(id,user_id) select sa,a from ap_users union all select sb,b from ap_users;
insert into private.ai_profile_signing_config values(true,decode(repeat('ab',32),'hex')) on conflict(singleton) do nothing;
do $$begin if (select signing_key from private.ai_profile_signing_config where singleton) is distinct from decode(repeat('ab',32),'hex') then raise exception 'SYNTHETIC_KEY_REQUIRED';end if;end$$;
create function pg_temp.ap_sign(body jsonb) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('payload',body::text,'signature',encode(extensions.hmac(convert_to('jobmatch-ai-profile-receipt-v1'||chr(10)||body::text,'UTF8'),decode(repeat('ab',32),'hex'),'sha256'),'hex'));
$$;
create function pg_temp.ap_receipt(p jsonb) returns jsonb language sql security definer set search_path='' as $$
 with stamp as materialized(select floor(extract(epoch from clock_timestamp()))::bigint as issued)
 select pg_temp.ap_sign(jsonb_build_object('format','jobmatch-ai-profile-receipt-v1','id',gen_random_uuid(),
 'issuerKeyId',encode(extensions.digest(decode(repeat('ab',32),'hex'),'sha256'),'hex'),
 'issuedAt',stamp.issued,'expiresAt',stamp.issued+600,
 'source',jsonb_build_object('ownerId',p->'ownerId','workspaceRevision',p->'workspace_revision','profileRevision',p->'revision','sourceWorkspaceRevision',p->'source_workspace_revision','sourceOriginal',p->'source_original','sourceFactIds',p->'source_fact_ids'),
 'preview','{"format":"jobmatch-ai-profile-preview-v1","contractVersion":"paragraph-quotes-v2","promptVersion":"profile-paragraph-quotes-v2","semanticAssessment":"not-performed","acceptance":"not-accepted","origin":{"model":"synthetic-fixture","operatorDeclaredModelDigest":"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","modelIdentityVerified":false},"sourceBlocks":{"eligible":2,"excluded":0,"total":2},"candidates":[{"blockId":0,"kind":"employment","context":{"id":0,"quote":"😀 Engineer at Orbit.","start":0,"end":20},"fields":{"title":{"quote":"Engineer","start":2,"end":10},"organization":{"quote":"Orbit","start":14,"end":19}},"unknownFields":["start","end","description","credential"],"dateInterpretation":"not-performed","warnings":[]},{"blockId":1,"kind":"employment","context":{"id":1,"quote":"Analyst at River.","start":22,"end":39},"fields":{"title":{"quote":"Analyst","start":22,"end":29},"organization":{"quote":"River","start":33,"end":38}},"unknownFields":["start","end","description","credential"],"dateInterpretation":"not-performed","warnings":[]}]}'::jsonb)) from stamp;
$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from ap_users;
set local role authenticated;
select public.apply_workspace_command(0,jsonb_build_object('action','import','text',E'😀 Engineer at Orbit.\n\nAnalyst at River.'));
do $$declare before_profile jsonb:=public.read_structured_profile();signed jsonb:=pg_temp.ap_receipt(before_profile);body jsonb;bad jsonb;result jsonb;entry uuid;rev integer;before_audit bigint;bad_indices integer[];begin
 if public.ai_profile_signing_ready(((signed->>'payload')::jsonb->>'issuerKeyId')) is distinct from true then raise exception 'READINESS';end if;
 if public.ai_profile_signing_ready('PRIVATE') is distinct from false then raise exception 'READINESS_INPUT';end if;
 before_audit:=(select count(*) from public.audit_log);
 for bad_indices in select * from (values(array[]::integer[]),(array[0,0]),(array[1,0]),(array[-1]),(array[2]),(array[0,null])) a(indices) loop
  begin perform public.accept_ai_profile_candidates(1,0,signed->>'payload',signed->>'signature',bad_indices,'SAVE_REVIEWED_AI_FIELDS');raise exception 'ACCEPTED_BAD_SELECTION';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 end loop;
 begin perform public.accept_ai_profile_candidates(1,0,signed->>'payload',signed->>'signature',array[0],'PRIVATE');raise exception 'MISSING_ACCEPT';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 for bad in select value from jsonb_array_elements(jsonb_build_array(
  jsonb_set(signed,'{signature}',to_jsonb(repeat('0',64))),
  jsonb_set(signed,'{payload}',to_jsonb((signed->>'payload')||' ')),
  pg_temp.ap_sign(jsonb_set((signed->>'payload')::jsonb,'{format}','"PRIVATE"')),
  pg_temp.ap_sign(jsonb_set((signed->>'payload')::jsonb,'{id}','null')),
  pg_temp.ap_sign(jsonb_set((signed->>'payload')::jsonb,'{source,ownerId}',to_jsonb((select b from ap_users)))),
  pg_temp.ap_sign(jsonb_set((signed->>'payload')::jsonb,'{preview,origin,modelIdentityVerified}','true')),
  pg_temp.ap_sign(jsonb_set((signed->>'payload')::jsonb,'{preview,origin,model}','null')),
  pg_temp.ap_sign(jsonb_set((signed->>'payload')::jsonb,'{preview,acceptance}','"accepted"')),
  pg_temp.ap_sign(jsonb_set((signed->>'payload')::jsonb,'{preview,contractVersion}','"paragraph-quotes-v1"')),
  pg_temp.ap_sign(jsonb_set((signed->>'payload')::jsonb,'{expiresAt}',to_jsonb(((signed->>'payload')::jsonb->>'issuedAt')::bigint+601))),
  pg_temp.ap_sign(jsonb_set(jsonb_set((signed->>'payload')::jsonb,'{issuedAt}',to_jsonb(floor(extract(epoch from clock_timestamp()))::bigint-601)),'{expiresAt}',to_jsonb(floor(extract(epoch from clock_timestamp()))::bigint-1))),
  pg_temp.ap_sign(jsonb_set(jsonb_set((signed->>'payload')::jsonb,'{issuedAt}',to_jsonb(floor(extract(epoch from clock_timestamp()))::bigint+20)),'{expiresAt}',to_jsonb(floor(extract(epoch from clock_timestamp()))::bigint+620)))
 )) loop
  begin perform public.accept_ai_profile_candidates(1,0,bad->>'payload',bad->>'signature',array[0],'SAVE_REVIEWED_AI_FIELDS');raise exception 'ACCEPTED_BAD_RECEIPT';exception when others then if sqlerrm<>'AI_PROFILE_RECEIPT_INVALID' then raise;end if;end;
 end loop;
 for body in select value from jsonb_array_elements(jsonb_build_array(
  jsonb_set((signed->>'payload')::jsonb,'{source,workspaceRevision}','2'),
  jsonb_set((signed->>'payload')::jsonb,'{source,profileRevision}','1'),
  jsonb_set((signed->>'payload')::jsonb,'{source,sourceWorkspaceRevision}','0'),
  jsonb_set((signed->>'payload')::jsonb,'{source,sourceOriginal}','"PRIVATE"'),
  jsonb_set((signed->>'payload')::jsonb,'{source,sourceFactIds}','["PRIVATE"]')
 )) loop
  bad:=pg_temp.ap_sign(body);
  begin perform public.accept_ai_profile_candidates(1,0,bad->>'payload',bad->>'signature',array[0],'SAVE_REVIEWED_AI_FIELDS');raise exception 'ACCEPTED_STALE_SOURCE';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 end loop;
 -- Valid MAC, but the second field is invalid: the first add and both audit effects must roll back.
 bad:=pg_temp.ap_sign(jsonb_set((signed->>'payload')::jsonb,'{preview,candidates,1,fields,title,start}','0'));
 begin perform public.accept_ai_profile_candidates(1,0,bad->>'payload',bad->>'signature',array[0,1],'SAVE_REVIEWED_AI_FIELDS');raise exception 'PARTIAL_BATCH';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if public.read_structured_profile() is distinct from before_profile or exists(select 1 from public.ai_profile_acceptances) or (select count(*) from public.audit_log)<>before_audit then raise exception 'REJECTION_CHANGED_DATA';end if;
 result:=public.accept_ai_profile_candidates(1,0,signed->>'payload',signed->>'signature',array[0,1],'SAVE_REVIEWED_AI_FIELDS');
 if (result->'profile'->>'revision')::integer<>2 or jsonb_array_length(result->'profile'->'entries')<>2
  or exists(select 1 from jsonb_array_elements(result->'profile'->'entries') e where (e->>'confirmed')::boolean)
  or (public.read_workspace()->>'revision')::integer<>1
  or exists(select 1 from jsonb_array_elements(public.read_workspace()->'facts') f where (f->>'verified')::boolean)
  or result->'record'->'modelIdentityVerified' is distinct from 'false'::jsonb
  or result->'record'->>'modelAcceptance' is distinct from 'not-accepted'
  or result->'record'->>'payloadSha256'<>encode(sha256(convert_to(signed->>'payload','UTF8')),'hex')
  or result->'record'->'selectedIndices'<>'[0,1]'::jsonb then raise exception 'BATCH_RESULT_OR_AUTO_CONFIRM';end if;
 update ap_users set receipt=(result->'record'->>'id')::uuid;
 if public.read_ai_profile_acceptance((result->'record'->>'id')::uuid) is distinct from result->'record' or jsonb_array_length(public.list_ai_profile_acceptances()->'items')<>1 then raise exception 'READBACK';end if;
 begin perform public.accept_ai_profile_candidates(1,0,signed->>'payload',signed->>'signature',array[0,1],'SAVE_REVIEWED_AI_FIELDS');raise exception 'REPLAY';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 bad:=pg_temp.ap_sign(jsonb_set((pg_temp.ap_receipt(public.read_structured_profile())->>'payload')::jsonb,'{id}',result->'record'->'id'));
 begin perform public.accept_ai_profile_candidates(1,2,bad->>'payload',bad->>'signature',array[0],'SAVE_REVIEWED_AI_FIELDS');raise exception 'NONCE_REPLAY';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 -- Bounded history is enforced even if entries are explicitly deleted between accepted batches.
 for i in 1..49 loop
  rev:=(public.read_structured_profile()->>'revision')::integer;signed:=pg_temp.ap_receipt(public.read_structured_profile());
  result:=public.accept_ai_profile_candidates(1,rev,signed->>'payload',signed->>'signature',array[0],'SAVE_REVIEWED_AI_FIELDS');
  entry:=(result->'record'->'entryIds'->>0)::uuid;
  perform public.command_structured_profile(1,rev+1,jsonb_build_object('action','delete','id',entry));
 end loop;
 before_profile:=public.read_structured_profile();signed:=pg_temp.ap_receipt(before_profile);rev:=(before_profile->>'revision')::integer;
 begin perform public.accept_ai_profile_candidates(1,rev,signed->>'payload',signed->>'signature',array[0],'SAVE_REVIEWED_AI_FIELDS');raise exception 'HISTORY_LIMIT';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 if jsonb_array_length(public.list_ai_profile_acceptances()->'items')<>50 or public.read_structured_profile() is distinct from before_profile then raise exception 'LIMIT_PARTIAL';end if;
 begin update public.ai_profile_acceptances set signature=repeat('0',64);raise exception 'DIRECT_UPDATE';exception when insufficient_privilege then null;end;
 begin delete from public.ai_profile_acceptances;raise exception 'DIRECT_DELETE';exception when insufficient_privilege then null;end;
 begin perform signing_key from private.ai_profile_signing_config;raise exception 'KEY_LEAK';exception when insufficient_privilege then null;end;
end;$$;
reset role;
do $$begin begin update public.ai_profile_acceptances set created=created+interval '1 second';raise exception 'MUTABLE_RECORD';exception when others then if sqlerrm<>'IMMUTABLE_AI_PROFILE_ACCEPTANCE' then raise;end if;end;end$$;
update private.ai_profile_signing_config set signing_key=decode(repeat('cd',32),'hex');
set local role authenticated;
do $$declare signed jsonb:=pg_temp.ap_receipt(public.read_structured_profile());begin
 if public.read_ai_profile_acceptance((select receipt from ap_users)) is null then raise exception 'ROTATION_LOST_HISTORY';end if;
 begin perform public.accept_ai_profile_candidates(1,(public.read_structured_profile()->>'revision')::integer,signed->>'payload',signed->>'signature',array[0],'SAVE_REVIEWED_AI_FIELDS');raise exception 'ROTATION_OLD_SIGNATURE';exception when others then if sqlerrm<>'AI_PROFILE_RECEIPT_INVALID' then raise;end if;end;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from ap_users;
do $$begin if exists(select 1 from public.ai_profile_acceptances) or public.read_ai_profile_acceptance((select receipt from ap_users)) is not null or public.list_ai_profile_acceptances()->'items'<>'[]'::jsonb then raise exception 'CROSS_OWNER_LEAK';end if;end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from ap_users;
delete from auth.sessions where id=(select sa from ap_users);
set local role authenticated;
do $$begin
 begin perform public.list_ai_profile_acceptances();raise exception 'REVOKED_READ';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 begin perform public.accept_ai_profile_candidates(1,100,'{}',repeat('0',64),array[0],'SAVE_REVIEWED_AI_FIELDS');raise exception 'REVOKED_WRITE';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 if exists(select 1 from public.ai_profile_acceptances) then raise exception 'REVOKED_RLS';end if;
end$$;
reset role;
delete from auth.users where id=(select a from ap_users);
do $$begin if exists(select 1 from public.ai_profile_acceptances where user_id=(select a from ap_users)) then raise exception 'ACCOUNT_CASCADE';end if;end$$;
rollback;
