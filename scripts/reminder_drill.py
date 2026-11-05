#!/usr/bin/env python3
"""Disposable PG17 owner reminder lifecycle and restore. Never a provider restore."""
from storage_fixture import source_english_schema_predecessor, ordinary_english_schema_predecessor
import concurrent.futures
import hashlib
import json
import os
import sys
import tempfile
import uuid
from pathlib import Path
from backup_manifest import snapshot, compare
from saved_letter_drill import ROOT, OWNER, OTHER, SESSION, OTHER_SESSION, literal, run, sql

MIGRATION = 'supabase/migrations/20261105080950_current_persisted_reminders.sql'
BASE_SHA256 = 'a62dfd0b2400e99eefb06a894b046539e6c76beb2cf782c217f58696011af969'
ENABLE = "create or replace function private.reminder_storage_permission() returns boolean language sql security invoker set search_path='' as $$select true;$$;"


def allowed(env):
    return env.get('JOBMATCH_LOCAL_REMINDERS') == '1' and env.get('PGHOST') in ('127.0.0.1', '::1') and not any(env.get(k) for k in ('PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGOPTIONS'))


def statement(revision, command, workspace=1):
    return 'select public.command_reminder(' + str(workspace) + ',' + str(revision) + ',' + literal(json.dumps(command, ensure_ascii=False)) + '::jsonb);'


def read(target, user=OWNER, session=SESSION):
    return sql(target, 'select public.read_reminders();', user=user, session=session)


def command(rid=None, **changes):
    return dict(action='create', id=rid or str(uuid.uuid4()), applicationId='a1', kind='interview', localStart='2026-11-01T01:30', zone='America/New_York', offsetMinutes=-300, dueAt='2026-11-01T06:30:00.000Z', minutes=30, description='Synthetic literal 🧑‍💻\nNo mail', **changes)


def apply(target, folder, before, cmd):
    after = sql(target, statement(before['revision'], cmd), user=OWNER)
    a, b = folder/'reminder-input.json', folder/'reminder-output.json'
    a.write_text(json.dumps(dict(before=before, after=after, command=cmd, workspaceRevision=1), ensure_ascii=False))
    run(['node', str(ROOT/'tests/fixtures/reminder-native.cjs'), str(a), str(b)], dict(os.environ))
    if json.loads(b.read_text()) != {'valid': True}:
        raise ValueError('Actual reminder codec refused native result')
    return after


def manifest(target, destination):
    old = os.environ.copy()
    try:
        os.environ.update(target)
        snapshot(destination, include_letters=True, include_source_profile=True, include_source_versions=True, logical_workspaces=True, include_reminders=True)
    finally:
        os.environ.clear()
        os.environ.update(old)
    return json.loads(destination.read_text())


def definitions(target):
    return sql(target, "select jsonb_agg(jsonb_build_object('name',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'acl',p.proacl::text) order by p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('reminder_storage_permission','read_reminders','command_reminder','valid_reminder_details');")


def main():
    if not allowed(os.environ):
        print('FAIL: owned loopback reminder fixture required; provider/service overrides refused.', file=sys.stderr)
        return 2
    environment = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10')
    names = ['jobmatch_reminders_' + uuid.uuid4().hex for _ in range(3)]
    created, stage = [], 'setup'
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-reminders-') as temporary:
            folder = Path(temporary)
            addon = (ROOT/MIGRATION).read_bytes()
            full = ordinary_english_schema_predecessor(source_english_schema_predecessor((ROOT/'supabase/schema.sql').read_bytes()))
            if full.count(addon) != 1 or not full.endswith(b'\n'+addon):
                raise ValueError('Unexpected reminder additive suffix')
            predecessor = full[:-len(addon)-1]
            if hashlib.sha256(predecessor).hexdigest() != BASE_SHA256:
                raise ValueError('Frozen current predecessor differs')
            base = folder/'base.sql'
            base.write_bytes(predecessor)
            for name in names:
                run(['createdb', '--', name], environment)
                created.append(name)
            upgrade, clean, restored = [dict(environment, PGDATABASE=name) for name in names]
            for target, schema in ((upgrade, base), (clean, ROOT/'supabase/schema.sql')):
                for path in (ROOT/'scripts/restore_fixture.sql', schema, ROOT/'scripts/restore_seed.sql'):
                    run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(path)], target)
                sql(target, 'insert into auth.sessions values('+literal(OTHER_SESSION)+','+literal(OTHER)+');')
            source_before = sql(upgrade, 'select public.read_workspace();', user=OWNER)
            stage = 'populated-upgrade-and-consolidated-schema'
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT/MIGRATION)], upgrade)
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT/'supabase/migrations/20261105111200_current_ordinary_english.sql')], upgrade)
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT/'supabase/migrations/20261105130000_current_source_english.sql')], upgrade)
            if source_before != sql(upgrade, 'select public.read_workspace();', user=OWNER):
                raise ValueError('Migration changed current workspace')
            for target in (upgrade, clean):
                before = read(target)
                if before != dict(format='jobmatch-reminders-state-v1', ownerId=OWNER, revision=0, delivery='none', items=[]):
                    raise ValueError('Invalid pure empty read')
                c = command()
                sql(target, statement(0, c), user=OWNER, failure='REMINDER_UNAVAILABLE')
                if read(target) != before:
                    raise ValueError('Disabled write changed state')
                sql(target, ENABLE)
                state = apply(target, folder, before, c)
                stage = 'roles-owner-revocation-and-invalid-time'
                run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT/'supabase/tests/current_persisted_reminders.sql')], target)
                if read(target, OTHER, OTHER_SESSION)['items']:
                    raise ValueError('Foreign read exposed data')
                sql(target, statement(state['revision'], dict(action='cancel', id=c['id'])), user=OTHER, session=OTHER_SESSION, failure='CONFLICT')
                sql(target, statement(state['revision'], dict(action='cancel', id=c['id'])), user=OWNER, session=str(uuid.uuid4()), failure='AUTH')
                for change in (dict(offsetMinutes=-240), dict(localStart='2026-03-08T02:30'), dict(zone='Unknown/Zone'), dict(dueAt='2026-11-01T05:30:00.000Z'), dict(minutes=45), dict(mail=True), dict(description='x'*3001), dict(id='not-uuid')):
                    bad = {**c, "id": str(uuid.uuid4()), **change}
                    sql(target, statement(state['revision'], bad), user=OWNER, failure='INVALID_WRITE')
                    if read(target) != state:
                        raise ValueError('Rejected reminder partially committed')
                sql(target, statement(0, dict(action='cancel', id=c['id'])), user=OWNER, failure='CONFLICT')
                sql(target, statement(state['revision'], dict(action='cancel', id=c['id']), workspace=2), user=OWNER, failure='CONFLICT')
                stage = 'native-storage-cap'
                sql(target, "insert into public.application_reminders(user_id,id,revision,created,updated,status,details) select user_id,gen_random_uuid(),revision,created,updated,status,details from public.application_reminders cross join generate_series(1,99) where user_id="+literal(OWNER)+" and id="+literal(c['id'])+';')
                capped = read(target)
                sql(target, statement(state['revision'], command()), user=OWNER, failure='INVALID_WRITE')
                if len(capped['items']) != 100 or read(target) != capped:
                    raise ValueError('Cap changed state')
                sql(target, 'delete from public.application_reminders where user_id='+literal(OWNER)+' and id<>'+literal(c['id'])+';')
                stage = 'lifecycle-exact-TS-wire-and-global-revision'
                state = apply(target, folder, state, dict(action='complete', id=c['id']))
                sql(target, statement(state['revision'], dict(action='cancel', id=c['id'])), user=OWNER, failure='CONFLICT')
                state = apply(target, folder, state, dict(c, action='reschedule', description='😀'*3000))
                state = apply(target, folder, state, dict(action='cancel', id=c['id']))
                state = apply(target, folder, state, dict(action='delete', id=c['id']))
                if state['items'] or state['revision'] != 5:
                    raise ValueError('Delete lost monotonic counter')
                state = apply(target, folder, state, c)
                if state['revision'] != 6:
                    raise ValueError('Recreation reset counter')
                boundary = dict(c, action='reschedule', localStart='2000-01-01T00:00', zone='Pacific/Kiritimati', offsetMinutes=840, dueAt='1999-12-31T10:00:00.000Z')
                state = apply(target, folder, state, boundary)
                if sql(target, 'select public.read_workspace();', user=OWNER) != source_before:
                    raise ValueError('Reminder changed source/revision/history')
            stage = 'twenty-writers-one-commit'
            before = read(upgrade)
            cmd = dict(command(before['items'][0]['id']), action='reschedule')
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
                outcomes = list(pool.map(lambda _: sql(upgrade, statement(before['revision'], cmd), user=OWNER, allow_conflict=True), range(20)))
            if sum(isinstance(x, dict) for x in outcomes) != 1 or outcomes.count('CONFLICT') != 19:
                raise ValueError('Unexpected reminder concurrency')
            stage = 'transactional-rollback-forward-and-read-preservation'
            saved, defs = read(upgrade), definitions(upgrade)
            rollback = (ROOT/'supabase/rollback/20261105080950_current_persisted_reminders.sql').read_text()
            sql(upgrade, rollback.replace('commit;', "do $$begin raise exception 'QA_REMINDER_ROLLBACK';end$$;\ncommit;"), failure='QA_REMINDER_ROLLBACK')
            if definitions(upgrade) != defs or read(upgrade) != saved:
                raise ValueError('Failed rollback changed code/grants/data')
            sql(upgrade, rollback)
            if read(upgrade) != saved:
                raise ValueError('Rollback lost readable content')
            sql(upgrade, statement(saved['revision'], dict(action='cancel', id=cmd['id'])), user=OWNER, failure='permission denied')
            closed = definitions(upgrade)
            sql(upgrade, addon.decode().replace('commit;', "do $$begin raise exception 'QA_REMINDER_FORWARD';end$$;\ncommit;"), failure='QA_REMINDER_FORWARD')
            if definitions(upgrade) != closed or read(upgrade) != saved:
                raise ValueError('Failed forward changed grants/data')
            sql(upgrade, addon.decode())
            if read(upgrade) != saved:
                raise ValueError('Reapply changed rows')
            sql(upgrade, statement(saved['revision'], dict(action='cancel', id=cmd['id'])), user=OWNER, failure='REMINDER_UNAVAILABLE')
            stage = 'twenty-table-logical-manifest-and-native-restore'
            baseline = manifest(upgrade, folder/'before.json')
            if len(baseline['tables']) != 20 or not baseline['tables']['public.application_reminders']['rows'] or not baseline['tables']['private.reminder_state']['rows']:
                raise ValueError('Reminder backup scope empty/incomplete')
            dump = folder/'owned.dump'
            run(['pg_dump', '--format=custom', '--no-owner', '--file', str(dump)], upgrade)
            run(['pg_restore', '--exit-on-error', '--no-owner', '--dbname', names[2], str(dump)], environment)
            if compare(baseline, manifest(restored, folder/'after.json')):
                raise ValueError('Restored reminder fingerprints differ')
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT/'supabase/tests/current_persisted_reminders.sql')], restored)
            if read(restored) != saved:
                raise ValueError('Restored current reminder differs')
            sql(restored, 'update private.reminder_state set revision=revision+1;')
            if compare(baseline, manifest(restored, folder/'corrupted.json')) != ['private.reminder_state']:
                raise ValueError('Counter corruption not detected')
            stage = 'account-delete-cascade'
            sql(clean, 'delete from auth.users where id='+literal(OWNER)+';')
            if sql(clean, "select jsonb_build_array((select count(*) from public.application_reminders),(select count(*) from private.reminder_state));") != [0, 0]:
                raise ValueError('Account cascade retained reminder data')
            print('PASS: PG17 populated upgrade/full schema; default-off writes, actual TS command wire/exact ACK; owner/RLS/direct DML/session/time guards; complete/reschedule/cancel/delete and monotonic recreation;20writers1commit/19conflicts;atomic late-fault rollback/forward ACL+definition+row preservation;20-table native synthetic restore/new-table fingerprints/corruption and account deletion cascade. No delivery/provider restore/production acceptance.')
            return 0
    except Exception:
        print('FAIL: disposable reminder protocol at '+stage+'; no rows or credentials printed.', file=sys.stderr)
        return 2
    finally:
        for name in reversed(created):
            try:
                run(['dropdb', '--if-exists', '--force', '--', name], environment)
            except Exception:
                print('FAIL: owned reminder database cleanup.', file=sys.stderr)


if __name__ == '__main__':
    sys.exit(main())
