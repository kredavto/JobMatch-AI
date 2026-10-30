\set ON_ERROR_STOP on
begin;
-- Synthetic accounts/text only, isolated from the shared restore fixtures.
insert into auth.users values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
insert into auth.sessions values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('dddddddd-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
set local request.jwt.claims='{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","session_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
do $$declare p jsonb;begin
 if exists(select 1 from private.processing_notices) or exists(select 1 from public.processing_consent_receipts) then raise exception 'UNSEEDED_PROTOCOL_REQUIRED';end if;
 p:=public.read_consent_receipts('ru');
 if p->'notice'<>'null'::jsonb or p->'legacyObservation'<>'null'::jsonb or p->'rows'<>'[]'::jsonb or p->>'through'<>'0' then raise exception 'EMPTY_PROTOCOL';end if;
 if exists(select 1 from public.consent_records where user_id=auth.uid()) then raise exception 'READ_BACKFILLED_LEGACY';end if;
 if has_function_privilege('anon','public.accept_processing_notice(integer,uuid,text,text,text,boolean)','EXECUTE') or has_function_privilege('anon','public.read_consent_receipts(text,integer,integer)','EXECUTE') then raise exception 'ANON_EXECUTE';end if;
 if has_table_privilege('authenticated','public.processing_consent_receipts','INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('authenticated','private.processing_notices','SELECT') then raise exception 'CLIENT_GRANTS';end if;
 if not(select relrowsecurity from pg_class where oid='public.processing_consent_receipts'::regclass) or not(select relrowsecurity from pg_class where oid='private.processing_notices'::regclass) then raise exception 'RLS';end if;
end$$;
insert into private.processing_notices(version,locale,body,sha256,operator_reference,active)
select 'synthetic-v1',locale,body,encode(extensions.digest(convert_to(body,'UTF8'),'sha256'),'hex'),'CI SYNTHETIC ONLY; no legal approval',true
from (values('ru',E'SYNTHETIC ONLY — не юридический текст 😀\r\nТочные байты.  '),('en',E'SYNTHETIC ONLY — no legal approval 😀\nExact bytes.')) n(locale,body);
insert into public.consent_records values(auth.uid(),'privacy-v1','2020-01-01T00:00:00Z');
set local role authenticated;
do $$declare p jsonb;r jsonb;again jsonb;h text;before_at timestamptz:=clock_timestamp();begin
 p:=public.read_consent_receipts('ru');h:=p#>>'{notice,sha256}';
 if p#>>'{legacyObservation,kind}'<>'legacy-workspace-observation' or p#>>'{legacyObservation,observedAt}' not like '2020-%' or p->>'through'<>'0' then raise exception 'LEGACY_REINTERPRETED';end if;
 begin perform public.accept_processing_notice(0,'11111111-1111-4111-8111-111111111111','synthetic-v1','ru',h,false);raise exception 'SHOULD_REJECT';exception when others then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 begin perform public.accept_processing_notice(0,'11111111-1111-4111-8111-111111111111','synthetic-v1','ru',repeat('0',64),true);raise exception 'SHOULD_REJECT';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 r:=public.accept_processing_notice(0,'11111111-1111-4111-8111-111111111111','synthetic-v1','ru',h,true);
 if r->>'ownerId'<>auth.uid()::text or r->>'sequence'<>'1' or r#>>'{notice,text}'<>E'SYNTHETIC ONLY — не юридический текст 😀\r\nТочные байты.  ' or (r->>'recordedAt')::timestamptz<before_at then raise exception 'ACCEPT_BINDING_OR_TIME';end if;
 if r->>'provenance'<>'authenticated-user-report' or r->>'assurance'<>'not-a-signature-or-legal-approval' then raise exception 'ASSURANCE';end if;
 again:=public.accept_processing_notice(0,'11111111-1111-4111-8111-111111111111','synthetic-v1','ru',h,true);
 if again<>r then raise exception 'IDEMPOTENT_ACK_CHANGED';end if;
 begin perform public.accept_processing_notice(1,'11111111-1111-4111-8111-111111111111','synthetic-v1','ru',h,true);raise exception 'SHOULD_REJECT';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 begin perform public.accept_processing_notice(1,'22222222-2222-4222-8222-222222222222','synthetic-v1','ru',h,true);raise exception 'SHOULD_REJECT';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 p:=public.read_consent_receipts('en');h:=p#>>'{notice,sha256}';
 begin perform public.accept_processing_notice(0,'22222222-2222-4222-8222-222222222222','synthetic-v1','en',h,true);raise exception 'SHOULD_REJECT';exception when others then if sqlerrm<>'CONFLICT' then raise;end if;end;
 perform public.accept_processing_notice(1,'22222222-2222-4222-8222-222222222222','synthetic-v1','en',h,true);
 p:=public.read_consent_receipts('ru');
 if p->>'through'<>'2' or jsonb_array_length(p->'rows')<>2 or p->'nextAfter'<>'null'::jsonb or p#>>'{latestReceipt,sequence}'<>'2' then raise exception 'JOURNAL';end if;
 begin update public.processing_consent_receipts set recorded_at=now();raise exception 'DIRECT_UPDATE';exception when insufficient_privilege then null;end;
 begin delete from public.processing_consent_receipts;raise exception 'DIRECT_DELETE';exception when insufficient_privilege then null;end;
 begin perform * from private.processing_notices;raise exception 'DRAFT_VISIBLE';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 begin update private.processing_notices set body=body||' Changed';raise exception 'MUTABLE_NOTICE';exception when others then if sqlerrm<>'IMMUTABLE_NOTICE' then raise;end if;end;
 begin update public.processing_consent_receipts set recorded_at=now();raise exception 'MUTABLE_RECEIPT';exception when others then if sqlerrm<>'IMMUTABLE_CONSENT_RECEIPT' then raise;end if;end;
end$$;
update private.processing_notices set active=false where locale='ru';
set local role authenticated;
do $$declare p jsonb;h text;begin
 p:=public.read_consent_receipts('ru');if p->'notice'<>'null'::jsonb or jsonb_array_length(p->'rows')<>2 then raise exception 'RETIRED_HISTORY_LOST';end if;
 h:=p#>>'{rows,0,notice,sha256}';
 -- An exact replay still acknowledges the original event, even after retirement.
 perform public.accept_processing_notice(0,'11111111-1111-4111-8111-111111111111','synthetic-v1','ru',h,true);
end$$;
set local request.jwt.claims='{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","session_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd"}';
do $$declare p jsonb;begin
 if exists(select 1 from public.processing_consent_receipts) then raise exception 'OTHER_OWNER_VISIBLE';end if;
 p:=public.read_consent_receipts('en');if p->>'through'<>'0' or p->'rows'<>'[]'::jsonb then raise exception 'OTHER_OWNER_RPC';end if;
end$$;
reset role;
-- Populate a separate bounded journal to exercise full pagination and lifetime ceiling.
insert into private.processing_notices(version,locale,body,sha256,operator_reference)
select 'synthetic-limit-'||i,'en','SYNTHETIC PAGE '||i,encode(extensions.digest(convert_to('SYNTHETIC PAGE '||i,'UTF8'),'sha256'),'hex'),'CI ONLY' from generate_series(1,200) s(i);
insert into public.processing_consent_receipts(user_id,sequence,command_id,notice_version,notice_locale,notice_text,notice_sha256)
select 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',i,gen_random_uuid(),n.version,n.locale,n.body,n.sha256 from generate_series(1,200) s(i) join private.processing_notices n on n.version='synthetic-limit-'||i;
set local role authenticated;
do $$declare p jsonb;begin
 p:=public.read_consent_receipts('en');if p->>'through'<>'200' or jsonb_array_length(p->'rows')<>20 or p->>'nextAfter'<>'20' then raise exception 'PAGE_START';end if;
 p:=public.read_consent_receipts('en',20,41);if p->>'through'<>'41' or p#>>'{rows,0,sequence}'<>'21' or p->>'nextAfter'<>'40' then raise exception 'SNAPSHOT_PAGE';end if;
 p:=public.read_consent_receipts('en',40,41);if jsonb_array_length(p->'rows')<>1 or p->'nextAfter'<>'null'::jsonb or p#>>'{latestReceipt,sequence}'<>'41' then raise exception 'SNAPSHOT_END';end if;
 begin perform public.accept_processing_notice(200,'33333333-3333-4333-8333-333333333333','synthetic-v1','en',(public.read_consent_receipts('en')#>>'{notice,sha256}'),true);raise exception 'SHOULD_REJECT';exception when others then if sqlerrm<>'CONSENT_HISTORY_LIMIT' then raise;end if;end;
end$$;
reset role;
-- Revoked sessions cannot read the journal, append, or delete the Auth owner.
delete from auth.sessions where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
set local request.jwt.claims='{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","session_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
set local role authenticated;
do $$begin
 if exists(select 1 from public.processing_consent_receipts) then raise exception 'REVOKED_RLS';end if;
 begin perform public.read_consent_receipts('ru');raise exception 'SHOULD_REJECT';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 begin perform public.accept_processing_notice(2,'33333333-3333-4333-8333-333333333333','synthetic-v1','en',repeat('0',64),true);raise exception 'SHOULD_REJECT';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
 begin perform public.delete_my_account();raise exception 'SHOULD_REJECT';exception when others then if sqlerrm<>'AUTH' then raise;end if;end;
end$$;
reset role;
do $$begin if not exists(select 1 from auth.users where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') or (select count(*) from public.processing_consent_receipts where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>2 then raise exception 'REVOKED_DELETE_MUTATED';end if;end$$;
insert into auth.sessions values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
set local role authenticated;
select public.delete_my_account();
reset role;
do $$begin
 if exists(select 1 from public.processing_consent_receipts where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') or exists(select 1 from public.consent_records where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'ACCOUNT_CASCADE';end if;
 if (select count(*) from public.processing_consent_receipts where user_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>200 or not exists(select 1 from private.processing_notices) then raise exception 'OTHER_OWNER_OR_NOTICE_DELETED';end if;
end$$;
rollback;
