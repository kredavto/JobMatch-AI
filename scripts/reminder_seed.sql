begin;
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}';
set local role authenticated;
select public.command_reminder(1,0,'{"action":"create","applicationId":"a1","title":"Synthetic task","description":"No delivery","dueLocal":"2026-10-28T10:30","timeZone":"Europe/Moscow","offsetMinutes":180,"dueAt":"2026-10-28T07:30:00.000Z","minutes":30,"accept":"SAVE_REMINDER"}');
commit;
