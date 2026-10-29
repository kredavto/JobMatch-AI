begin;
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}';
set local role authenticated;
select public.command_structured_profile(1,0,'{"action":"add","kind":"employment","fields":{"title":{"quote":"SQL","start":0,"end":3}}}');
commit;
