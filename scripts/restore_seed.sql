-- Synthetic, reproducible data. No mailbox or external Auth requests.
begin;
insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into auth.identities values ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111');
insert into auth.sessions values ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111');
insert into auth.refresh_tokens values (1,'11111111-1111-4111-8111-111111111111');
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}',true);
do $$declare state jsonb:='{
 "original":"SQL\nПример опыта", "goal":"Analyst", "vacancy":"SQL",
 "facts":[{"id":"f1","text":"SQL","source":"original","verified":true}],
 "versions":[{"id":"v1","text":"SQL","created":"2026-10-28T00:00:00Z","vacancy":"SQL","score":100,"evidence_ids":["f1"],"evidence_snapshot":[{"id":"f1","text":"SQL","source":"original","verified":true}]}],
 "applications":[{"id":"a1","title":"Synthetic vacancy","note":"Пример\nзаметки","created":"2026-10-28","status":"Планируется","resumeVersionId":"v1","events":[{"status":"Планируется","date":"2026-10-28"}]}]
}';stored jsonb;begin
 stored:=state;
 if exists(select 1 from pg_constraint where conrelid='public.workspaces'::regclass and conname='workspace_compact_payload') then
  stored:=state-array['facts','versions','applications'];
 end if;
 insert into public.workspaces(user_id,revision,payload) values(auth.uid(),1,stored);
 if not exists(select 1 from pg_trigger where tgrelid='public.workspaces'::regclass and tgname='workspace_sync_entities' and not tgisinternal) then
  perform private.project_workspace(auth.uid(),state);
  insert into public.fact_history(user_id,workspace_revision,kind,facts) values(auth.uid(),1,'change',state->'facts');
 end if;
end;$$;
insert into public.audit_log(user_id,action) values(auth.uid(),'restore-fixture');
insert into public.consent_records(user_id,version) values(auth.uid(),'synthetic-test');
set local role authenticated;
select public.consume_quota('service');
commit;
