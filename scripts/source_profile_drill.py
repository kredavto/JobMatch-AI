#!/usr/bin/env python3
"""Owned disposable PG17 source-profile protocol. Synthetic Auth, never provider acceptance."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid
from storage_fixture import workspace_scalars, preserved_migration
from backup_manifest import snapshot, compare
from saved_letter_drill import ROOT, OWNER, OTHER, SESSION, OTHER_SESSION, KEY, literal, run, sql, bridge, accept_statement, verify_history

MIGRATION = 'supabase/migrations/20261101093530_source_profile.sql'
BASE_SHA256 = '4f1685db8f35e6a73147c45e0ac7065addae4d2dd1a9173553670491ae83e05c'
TEXT = 'Lead 🧑‍💻\r\nCompany\r2020\nCertificate 42\n' + ' '.join('skill' + str(i) for i in range(60))


def allowed(environment):
    return (environment.get('JOBMATCH_LOCAL_SOURCE_PROFILE') == '1'
            and environment.get('PGHOST') in ('127.0.0.1', '::1')
            and not any(environment.get(k) for k in ('PGSERVICE', 'PGHOSTADDR', 'PGSERVICEFILE', 'PGOPTIONS')))


def read(target):
    return sql(target, 'select public.read_source_profile();', user=OWNER)


def context(target):
    w = sql(target, 'select public.read_workspace();', user=OWNER)
    return {'ownerId': OWNER, 'revision': w['revision'], 'original': w['original'], 'factIds': [f['id'] for f in w['facts']]}


def command_statement(command, revision, workspace_revision=1, marker=None):
    stores = command['action'] in ('add', 'reset') or command['action'] == 'confirm' and command['confirmed']
    marker = marker or ('STORE_REVIEWED_SOURCE_PROFILE' if stores else 'REMOVE_SOURCE_PROFILE_DATA')
    return 'select public.command_source_profile(' + ','.join((str(workspace_revision), str(revision), literal(json.dumps(command, ensure_ascii=False)) + '::jsonb', literal(marker))) + ');'


def codec(folder, data):
    a, b = folder / 'source-input.json', folder / 'source-output.json'
    a.write_text(json.dumps(data, ensure_ascii=False))
    run(['node', str(ROOT / 'tests/fixtures/source-profile-native.cjs'), str(a), str(b)], dict(os.environ))
    return json.loads(b.read_text())


def command(target, folder, cmd):
    before, c = read(target), context(target)
    after = sql(target, command_statement(cmd, before['revision'], c['revision']), user=OWNER)
    codec(folder, {'before': before, 'profile': after, 'command': cmd, 'context': c})
    return after


def add(quote='Company'):
    start = TEXT.index(quote)
    return {'action': 'add', 'kind': 'employment', 'fields': {'title': {'quote': quote, 'start': start, 'end': start + len(quote)}}}


def manifest(target, destination):
    before = os.environ.copy()
    try:
        os.environ.update(target)
        snapshot(destination, include_letters=True, include_source_profile=True)
    finally:
        os.environ.clear()
        os.environ.update(before)
    return json.loads(destination.read_text())


def main():
    if not allowed(os.environ):
        print('FAIL: explicit owned loopback PostgreSQL fixture required; hosted/service overrides refused.', file=sys.stderr)
        return 2
    environment = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10')
    names = ['jobmatch_source_' + uuid.uuid4().hex for _ in range(3)]
    created, stage, failed = [], 'guard', False
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-source-') as temporary:
            folder = Path(temporary)
            all_sql, migration = (ROOT / 'supabase/schema.sql').read_bytes(), (ROOT / MIGRATION).read_bytes()
            if all_sql.count(migration) != 1:
                raise ValueError('Consolidated migration differs')
            prefix, suffix = all_sql.split(migration)
            additional_paths = [ROOT / 'supabase/migrations' / p for p in (
                '20261029080555_central_auth_quota.sql', '20261029082413_auth_quota_operations.sql',
                '20261028110001_application_commands.sql', '20261028110002_profile_import_commands.sql', '20261028110003_version_commands.sql', '20261028110004_projection_parity.sql', '20261028110005_canonical_workspace_reads.sql', '20261028110006_explicit_workspace_writes.sql', '20261028120140_workspace_entity_snapshot.sql', '20261028120214_compact_workspace_storage.sql')]
            if suffix != b''.join(b'\n' + p.read_bytes() for p in additional_paths):
                raise ValueError('Unexpected post-profile definitions')
            legacy = prefix[:-1]
            if hashlib.sha256(legacy).hexdigest() != BASE_SHA256:
                raise ValueError('Not pinned fifteen-table predecessor')
            (folder / 'base.sql').write_bytes(legacy)
            stage = 'full-and-populated-incremental'
            for name in names:
                run(['createdb', '--', name], environment)
                created.append(name)
            source, full, restored = [dict(environment, PGDATABASE=n) for n in names]
            for target, schema in ((source, folder / 'base.sql'), (full, ROOT / 'supabase/schema.sql')):
                for path in (ROOT / 'scripts/restore_fixture.sql', schema, ROOT / 'scripts/restore_seed.sql'):
                    run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(path)], target)
                sql(target, "insert into auth.sessions values('" + OTHER_SESSION + "','" + OTHER + "');")
                sql(target, "set request.jwt.claims=" + literal(json.dumps({'sub': OWNER, 'session_id': SESSION})) + ";update public.workspaces set payload=jsonb_set(payload,'{original}',to_jsonb(" + literal(TEXT) + "::text)) where user_id='" + OWNER + "';")
                sql(target, "insert into private.letter_signing_config(signing_key) values(decode('" + KEY.hex() + "','hex'));")
                w = sql(target, 'select public.read_workspace();', user=OWNER)
                receipt = bridge(folder, 'issue', {'workspace': {**w, 'ownerId': OWNER}, 'letterRevision': 0})
                sql(target, accept_statement(receipt), user=OWNER)
                if target == source:
                    source_receipt = receipt
            scalars_before = workspace_scalars(source)
            run([sys.executable, str(ROOT / 'scripts/backup_manifest.py'), 'snapshot', str(folder / 'before.json'), '--include-letters'], source)
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / MIGRATION)], source)
            for path in additional_paths:
                run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(path)], source)
            run([sys.executable, str(ROOT / 'scripts/backup_manifest.py'), 'snapshot', str(folder / 'after.json'), '--include-letters'], source)
            preserved_migration(json.loads((folder / 'before.json').read_text()), json.loads((folder / 'after.json').read_text()), scalars_before, source)
            stage = 'default-off-read-no-copy-and-native-grants'
            for target in (source, full):
                if sql(target, 'select to_jsonb(public.source_profile_storage_ready());', user=OWNER) is not False:
                    raise ValueError('Storage enabled by default')
                stage = 'default-off-read-codec'
                codec(folder, {'profile': read(target), 'context': context(target)})
                if sql(target, 'select to_jsonb(count(*)) from public.source_profiles;') != 0:
                    raise ValueError('GET created source copy')
                stage = 'default-off-native-add-refusal'
                sql(target, command_statement(add(), 0), user=OWNER, failure='SOURCE_PROFILE_UNAVAILABLE')
                stage = 'owner-cannot-grant-capability'
                sql(target, 'grant execute on function private.source_profile_storage_permission() to authenticated;', user=OWNER, failure='permission denied')
                if sql(target, 'select to_jsonb(public.source_profile_storage_ready());', user=OWNER):
                    raise ValueError('Owner escalated storage capability')
                sql(target, 'insert into public.source_profiles(user_id,revision) values(' + literal(OWNER) + ',1);', user=OWNER, failure='permission denied')
                sql(target, 'delete from public.source_profile_entries;', user=OWNER, failure='permission denied')
                stage = 'direct-dml-and-owned-activation'
                # Activation ONLY inside the owned disposable fixture database.
                sql(target, 'grant execute on function private.source_profile_storage_permission() to authenticated;')
                stage = 'native-first-add-and-codec'
                command(target, folder, add())
            stage = 'literal-codepoints-and-strict-schema'
            p = read(source)
            eid = p['entries'][0]['id']
            for bad in ({**add(), 'confirmed': True}, {**add(), 'fields': {'title': {'quote': 'Company', 'start': 0, 'end': 7}}},
                        {**add(), 'fields': {'title': {'quote': 'Company', 'start': 10.0, 'end': 17}}},
                        {**add(), 'fields': {}}, {'action': 'reset', 'confirm': 'yes'}, {'action': 'clear', 'confirm': 'yes'}):
                sql(source, command_statement(bad, p['revision']), user=OWNER, failure='INVALID_WRITE')
            sql(source, command_statement(add(), p['revision']), user=OWNER, failure='INVALID_WRITE')
            sql(source, command_statement(add('Lead'), p['revision'], marker='yes'), user=OWNER, failure='INVALID_WRITE')
            command(source, folder, add('Lead 🧑‍💻\r\nCompany\r2020'))
            p = command(source, folder, {'action': 'confirm', 'id': eid, 'confirmed': True})
            sql(source, command_statement({'action': 'delete', 'id': eid}, 0), user=OTHER, session=OTHER_SESSION, failure='CONFLICT')
            sql(source, command_statement({'action': 'delete', 'id': eid}, p['revision']), user=OWNER, session=OTHER_SESSION, failure='AUTH')
            sql(source, 'select public.read_source_profile();', user=OTHER, session=OTHER_SESSION)
            if sql(source, 'select to_jsonb(count(*)) from public.source_profile_entries;', user=OTHER, session=OTHER_SESSION) != 0:
                raise ValueError('Owner RLS exposed entries')
            if sql(source, "select to_jsonb(count(*)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('read_source_profile','command_source_profile','source_profile_storage_ready') and p.prosecdef;") != 0:
                raise ValueError('Public wrapper must be invoker')
            stage = 'revocation-cleanup-clear-and-replay'
            sql(source, 'revoke execute on function private.source_profile_storage_permission() from authenticated;')
            sql(source, command_statement(add('Lead'), p['revision']), user=OWNER, failure='SOURCE_PROFILE_UNAVAILABLE')
            p = command(source, folder, {'action': 'confirm', 'id': eid, 'confirmed': False})
            p = command(source, folder, {'action': 'delete', 'id': eid})
            old_revision = p['revision']
            p = command(source, folder, {'action': 'clear', 'confirm': 'CLEAR_SOURCE_PROFILE_DATA'})
            stored = sql(source, 'select jsonb_build_object(\'revision\',revision,\'source\',source_original,\'ids\',source_fact_ids,\'workspace\',source_workspace_revision) from public.source_profiles;')
            if stored != {'revision': old_revision + 1, 'source': None, 'ids': None, 'workspace': None} or p['source_captured'] or p['entries']:
                raise ValueError('Clear retained sensitive source or reset revision')
            sql(source, command_statement({'action': 'clear', 'confirm': 'CLEAR_SOURCE_PROFILE_DATA'}, old_revision), user=OWNER, failure='CONFLICT')
            sql(source, 'grant execute on function private.source_profile_storage_permission() to authenticated;')
            p = command(source, folder, add())
            stage = 'same-text-reimport-and-source-reset'
            # Same text but new ordered fact identity must invalidate the captured source.
            sql(source, "update public.profile_facts set id='new-f1' where user_id=" + literal(OWNER) + ";update public.workspaces set revision=2 where user_id=" + literal(OWNER) + ';')
            p = read(source)
            if p['source_matches']:
                raise ValueError('Same-text reimport reused confirmations')
            codec(folder, {'profile': p, 'context': context(source)})
            sql(source, command_statement(add('Lead'), p['revision'], 2), user=OWNER, failure='CONFLICT')
            sql(source, command_statement({'action': 'confirm', 'id': p['entries'][0]['id'], 'confirmed': True}, p['revision'], 2), user=OWNER, failure='CONFLICT')
            command(source, folder, {'action': 'reset', 'confirm': 'RESET_SOURCE_PROFILE'})
            stage = 'rollback-and-session-revocation'
            baseline = manifest(source, folder / 'before-rollback.json')
            run(['psql', '-X', '-q', '-w', '-v', 'ON_ERROR_STOP=1'], source, ('begin;set local role authenticated;set local request.jwt.claims=' + literal(json.dumps({'sub': OWNER, 'session_id': SESSION})) + ';' + command_statement(add(), read(source)['revision'], 2) + 'rollback;').encode())
            if compare(baseline, manifest(source, folder / 'after-rollback.json')):
                raise ValueError('Rollback changed data')
            sql(source, 'delete from auth.sessions where id=' + literal(SESSION) + ';')
            sql(source, 'select public.read_source_profile();', user=OWNER, failure='AUTH')
            sql(source, command_statement(add(), read(full)['revision'], 2), user=OWNER, failure='AUTH')
            if sql(source, 'select to_jsonb(count(*)) from public.source_profiles;', user=OWNER) != 0:
                raise ValueError('Revoked session RLS exposed copy')
            sql(source, 'insert into auth.sessions values(' + literal(SESSION) + ',' + literal(OWNER) + ');')
            stage = 'twenty-native-writers'
            c = context(source)
            before = read(source)
            statement = command_statement(add(), before['revision'], c['revision'])
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
                results = list(pool.map(lambda _: sql(source, statement, user=OWNER, allow_conflict=True), range(20)))
            if sum(isinstance(r, dict) for r in results) != 1 or results.count('CONFLICT') != 19:
                raise ValueError('Expected one commit and nineteen native conflicts')
            codec(folder, {'before': before, 'profile': read(source), 'command': add(), 'context': c})
            stage = 'fifty-entry-cap-and-account-cascade'
            for i in range(49):
                command(full, folder, add('skill' + str(i)))
            sql(full, command_statement(add('skill59'), read(full)['revision']), user=OWNER, failure='INVALID_WRITE')
            if len(read(full)['entries']) != 50:
                raise ValueError('Entry cap failed')
            sql(full, 'delete from auth.users where id=' + literal(OWNER) + ';')
            if sql(full, 'select to_jsonb(count(*)) from public.source_profiles;') or sql(full, 'select to_jsonb(count(*)) from public.source_profile_entries;'):
                raise ValueError('Account cascade left source data')
            stage = 'seventeen-populated-tables-native-dump-restore'
            before_restore = manifest(source, folder / 'baseline.json')
            if len(before_restore['tables']) != 17 or not all(t['rows'] > 0 for t in before_restore['tables'].values()):
                raise ValueError('All seventeen tables must be populated')
            run(['pg_dump', '-Fc', '-f', str(folder / 'synthetic.dump')], source)
            run(['pg_restore', '--exit-on-error', '--dbname', names[2], str(folder / 'synthetic.dump')], restored)
            if compare(before_restore, manifest(restored, folder / 'restored.json')):
                raise ValueError('Restored rows differ')
            codec(folder, {'profile': read(restored), 'context': context(restored)})
            verify_history(restored, folder, source_receipt)
            stage = 'intentional-source-corruption-detection'
            sql(restored, "update public.source_profile_entries set fields=jsonb_set(fields,'{title,quote}',to_jsonb('FORGED'::text));")
            if compare(before_restore, manifest(restored, folder / 'changed.json')) != ['public.source_profile_entries']:
                raise ValueError('Corruption fingerprint not detected')
            try:
                codec(folder, {'profile': read(restored), 'context': context(restored)})
                raise RuntimeError('Expected exact-range refusal')
            except ValueError:
                pass
            print('PASS: PG17 full and populated 15→17 migration; default OFF; read creates no copy; native grants/RLS/session/schema/range guards; clear removes cached source with monotonic revision; same-text reimport; rollback; 20 writers/1 commit/19 conflicts; 50-entry cap; cascade; 17 populated native dump/restore fingerprints and source corruption detection. Synthetic Auth only, no hosted-provider restore or semantic/model acceptance.')
    except (OSError, ValueError, RuntimeError, KeyError, subprocess.SubprocessError) as error:
        safe = str(error) if str(error) in ('Native SQL failed', 'Synthetic subprocess failed', 'Expected guarded native refusal', 'Owner escalated storage capability') else 'assertion or codec failure'
        print('Diagnostic class: ' + safe, file=sys.stderr)
        print('FAIL: synthetic source-profile drill at ' + stage + '; no credentials or row data printed.', file=sys.stderr)
        failed = True
    finally:
        for name in reversed(created):
            try:
                run(['dropdb', '--if-exists', '--', name], environment)
            except (OSError, ValueError, subprocess.SubprocessError):
                print('FAIL: remove leftover owned fixture database ' + name, file=sys.stderr)
                failed = True
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
