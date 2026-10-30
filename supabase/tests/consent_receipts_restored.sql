\set ON_ERROR_STOP on
begin;
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}';
set local role authenticated;
do $$declare p jsonb;begin
 p:=public.read_consent_receipts('ru');
 if p->>'through'<>'1' or p#>>'{rows,0,notice,text}'<>E'SYNTHETIC RESTORE ONLY 😀\r\nNo operator/legal approval.' or p#>>'{noticeReceipt,commandId}'<>'66666666-6666-4666-8666-666666666666' then raise exception 'RESTORED_CONSENT_MISMATCH';end if;
 if p#>>'{legacyObservation,kind}'<>'legacy-workspace-observation' then raise exception 'LEGACY_PROMOTED';end if;
end$$;
rollback;
