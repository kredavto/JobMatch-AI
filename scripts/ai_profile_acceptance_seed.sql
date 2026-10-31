-- ONLY disposable native fixture databases: public synthetic key and source, no actual-model/user/legal acceptance.
begin;
do $$begin
 if current_database() not in ('structured_full','jobmatch_ai_profile_full')
  or (select array_agg(column_name::text order by ordinal_position) from information_schema.columns where table_schema='auth' and table_name='users') is distinct from array['id']::text[]
  then raise exception 'DISPOSABLE_AI_PROFILE_FIXTURE_REQUIRED';end if;
end$$;
insert into private.ai_profile_signing_config values(true,decode(repeat('ab',32),'hex')) on conflict(singleton) do nothing;
do $$begin if (select signing_key from private.ai_profile_signing_config where singleton) is distinct from decode(repeat('ab',32),'hex') then raise exception 'SYNTHETIC_KEY_REQUIRED';end if;end$$;
insert into auth.users values('66666666-6666-4666-8666-666666666666');
insert into auth.sessions values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','66666666-6666-4666-8666-666666666666');
set local request.jwt.claims='{"sub":"66666666-6666-4666-8666-666666666666","session_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
do $$declare p jsonb;body jsonb;raw text;sig text;issued bigint:=floor(extract(epoch from clock_timestamp()));result jsonb;begin
 perform public.apply_workspace_command(0,'{"action":"import","text":"SQL"}');
 p:=public.read_structured_profile();
 body:=jsonb_build_object('format','jobmatch-ai-profile-receipt-v1','id',gen_random_uuid(),'issuerKeyId',encode(extensions.digest(decode(repeat('ab',32),'hex'),'sha256'),'hex'),'issuedAt',issued,'expiresAt',issued+600,
 'source',jsonb_build_object('ownerId',p->'ownerId','workspaceRevision',p->'workspace_revision','profileRevision',p->'revision','sourceWorkspaceRevision',p->'source_workspace_revision','sourceOriginal',p->'source_original','sourceFactIds',p->'source_fact_ids'),
 'preview','{"format":"jobmatch-ai-profile-preview-v1","contractVersion":"paragraph-quotes-v2","promptVersion":"profile-paragraph-quotes-v2","semanticAssessment":"not-performed","acceptance":"not-accepted","origin":{"model":"synthetic-restore-seed","operatorDeclaredModelDigest":"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","modelIdentityVerified":false},"sourceBlocks":{"eligible":1,"excluded":0,"total":1},"candidates":[{"blockId":0,"kind":"employment","context":{"id":0,"quote":"SQL","start":0,"end":3},"fields":{"title":{"quote":"SQL","start":0,"end":3}},"unknownFields":["organization","start","end","description","credential"],"dateInterpretation":"not-performed","warnings":[]}]}'::jsonb);
 raw:=body::text;sig:=encode(extensions.hmac(convert_to('jobmatch-ai-profile-receipt-v1'||chr(10)||raw,'UTF8'),decode(repeat('ab',32),'hex'),'sha256'),'hex');
 result:=public.accept_ai_profile_candidates(1,0,raw,sig,array[0],'SAVE_REVIEWED_AI_FIELDS');
 if (result->'profile'->>'revision')::integer<>1 or (result->'profile'->'entries'->0->>'confirmed')::boolean then raise exception 'SYNTHETIC_SEED_FAILED';end if;
end$$;
commit;
