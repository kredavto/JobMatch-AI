-- Synthetic notice/acceptance for the 21-table restore fixture only.
begin;
insert into private.processing_notices(version,locale,body,sha256,operator_reference,active)
values('synthetic-restore-v1','ru',E'SYNTHETIC RESTORE ONLY 😀\r\nNo operator/legal approval.',encode(extensions.digest(convert_to(E'SYNTHETIC RESTORE ONLY 😀\r\nNo operator/legal approval.','UTF8'),'sha256'),'hex'),'CI SYNTHETIC ONLY',true);
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}';
set local role authenticated;
select public.accept_processing_notice(0,'66666666-6666-4666-8666-666666666666','synthetic-restore-v1','ru',(public.read_consent_receipts('ru')#>>'{notice,sha256}'),true);
commit;
