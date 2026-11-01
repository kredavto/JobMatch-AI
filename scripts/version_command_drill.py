#!/usr/bin/env python3
"""Owned current PG17 version/restore commands. Synthetic identity, not provider acceptance."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import uuid
from backup_manifest import compare
from saved_letter_drill import ROOT, OWNER, KEY, literal, run, sql, bridge, accept_statement, verify_history
from source_profile_drill import context, read, codec, manifest
from profile_command_drill import service, source_command, statement

MIGRATION = 'supabase/migrations/20261028110003_version_commands.sql'
BASE_SHA256 = 'e8ba4bd8b859d255263fcefc9644bbbcb73a6bedb1d9ccb65d50508327b2c4a1'


def allowed(environment):
    return (environment.get('JOBMATCH_LOCAL_VERSION_COMMANDS') == '1'
            and environment.get('PGHOST') in ('127.0.0.1', '::1')
            and not any(environment.get(k) for k in ('PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGOPTIONS')))


def parity_cases():
    variants = ['SQL\nPython\nUnverified', '\ufeff SQL \r\nPython\r\nUnverified',
                'SQL\nSQL\nPython\n', 'e\u0301😀\nSQL\rinside\nSQL\nPython']
    cases = []
    for variant in variants:
        for python_verified in (True, False):
            for mode in range(4):
                user, session = str(uuid.uuid4()), str(uuid.uuid4())
                facts = [{'id': str(uuid.uuid4()), 'text': 'SQL', 'source': 'synthetic input', 'verified': True},
                         {'id': str(uuid.uuid4()), 'text': 'Python', 'source': 'synthetic input', 'verified': python_verified},
                         {'id': str(uuid.uuid4()), 'text': 'Unverified', 'source': 'synthetic input', 'verified': False}]
                cases.append({'user': user, 'session': session, 'mode': mode,
                              'state': {'revision': 1, 'original': variant, 'facts': facts, 'vacancy': 'Обязательные требования:\nSQL\nPython', 'goal': '', 'versions': [], 'applications': []}})
    return cases


def parity(target, folder):
    cases = parity_cases()
    a, b = folder / 'version-input.json', folder / 'version-output.json'
    a.write_text(json.dumps(cases, ensure_ascii=False))
    run(['node', str(ROOT / 'tests/fixtures/version-parity-native.cjs'), str(a), str(b)], target)
    expected = json.loads(b.read_text())
    if len(expected) != 32:
        raise ValueError('Missing renderer parity cases')
    for case, want in zip(cases, expected):
        user, session, state = case['user'], case['session'], case['state']
        sql(target, 'insert into auth.users values(' + literal(user) + ');insert into auth.sessions values(' + literal(session) + ',' + literal(user) + ');')
        payload = {k: v for k, v in state.items() if k != 'revision'}
        sql(target, 'set request.jwt.claims=' + literal(json.dumps({'sub': user, 'session_id': session})) + ';insert into public.workspaces(user_id,revision,payload) values(' + literal(user) + ',1,' + literal(json.dumps(payload, ensure_ascii=False)) + '::jsonb);')
        after = sql(target, statement(1, want['command']), user=user, session=session)
        version = after['versions'][-1]
        if {k: v for k, v in version.items() if k not in ('id', 'created')} != want['expected'] or after['revision'] != 2:
            raise ValueError('Current JS/SQL version rendering or metadata differs')
        if str(uuid.UUID(version['id'])) != version['id'] or not version['created'].endswith('Z'):
            raise ValueError('Version lifecycle not server owned')
    return len(cases)


def main():
    if not allowed(os.environ):
        print('FAIL: explicit owned loopback version fixture required; overrides refused.', file=sys.stderr)
        return 2
    environment = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10')
    names = ['jobmatch_versions_' + uuid.uuid4().hex for _ in range(3)]
    created, failed, stage = [], False, 'setup'
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-versions-') as temporary:
            folder = Path(temporary)
            full_sql, migration = (ROOT / 'supabase/schema.sql').read_bytes(), (ROOT / MIGRATION).read_bytes()
            if full_sql.count(migration) != 1:
                raise ValueError('Consolidated version migration differs')
            prefix, suffix = full_sql.split(migration)
            extras = [ROOT / 'supabase/migrations' / name for name in ('20261028110004_projection_parity.sql','20261028110005_canonical_workspace_reads.sql')]
            if suffix != b''.join(b'\n' + p.read_bytes() for p in extras):
                raise ValueError('Unexpected post-version-command definitions')
            predecessor = prefix[:-1]
            if hashlib.sha256(predecessor).hexdigest() != BASE_SHA256:
                raise ValueError('Not exact current profile/app/source/letter/quota predecessor')
            (folder / 'base.sql').write_bytes(predecessor)
            for name in names:
                run(['createdb', '--', name], environment)
                created.append(name)
            source, full, restored = [dict(environment, PGDATABASE=n) for n in names]
            stage = 'populated-current-upgrade-full-schema'
            for target, schema in ((source, folder / 'base.sql'), (full, ROOT / 'supabase/schema.sql')):
                for path in (ROOT / 'scripts/restore_fixture.sql', schema, ROOT / 'scripts/restore_seed.sql'):
                    run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(path)], target)
            old = manifest(source, folder / 'before.json')
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / MIGRATION)], source)
            for extra in extras:
                run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(extra)], source)
            if compare(old, manifest(source, folder / 'after.json')):
                raise ValueError('Migration changed predecessor rows')
            for target in (source, full):
                stage = 'native-version-SQL-and-current-renderer-parity'
                run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / 'supabase/tests/version_commands.sql')], target)
                parity(target, folder)
                stage = 'actual-service-version-restore-and-unknown-fields'
                sql(target, 'set request.jwt.claims=' + literal(json.dumps({'sub': OWNER, 'session_id': '44444444-4444-4444-8444-444444444444'})) + ";update public.workspaces set payload=jsonb_set(payload,'{versions,0,future}'," + literal(json.dumps({'keep': [False, None, 'literal']})) + '::jsonb) where user_id=' + literal(OWNER) + ';')
                outcome = service(target, folder, [{'action': 'analyze'},
                    {'action': 'version', 'selectAllEdits': True, 'score': 0, 'text': 'forged', 'match_metadata': {'rules_revision': 'forged'}},
                    {'action': 'restore', 'restoreLatest': True}, {'action': 'restore', 'restoreLatest': True},
                    {'action': 'restore', 'id': 'v1', 'text': 'forged', 'score': 0}])
                state = outcome['state']
                v0, v1, v2, v3, v4 = state['versions']
                if v1['match_metadata']['rules_revision'] != 'rules-2026-10-25.1' or v1['text'] == 'forged' or v2['restored_from'] != v1['id'] or v3['restored_from'] != v2['id'] or v4['restored_from'] != 'v1':
                    raise ValueError('Caller fields trusted or immediate restore chain lost')
                for actual, origin in ((v2, v1), (v3, v2), (v4, v0)):
                    if {k: v for k, v in actual.items() if k not in ('id', 'created', 'restored_from')} != {k: v for k, v in origin.items() if k not in ('id', 'created', 'restored_from')}:
                        raise ValueError('Restore changed optional/unknown/evidence/metadata fields')
                if any(k in v4 for k in ('match_metadata', 'engine_version', 'profile_revision')) or v4['future'] != {'keep': [False, None, 'literal']}:
                    raise ValueError('Legacy absence or unknown field lost')
                stage = 'source-profile-letter-and-real-evaluation-race'
                sql(target, 'grant execute on function private.source_profile_storage_permission() to authenticated;')
                p = source_command(target, folder, {'action': 'add', 'kind': 'employment', 'fields': {'title': {'quote': 'SQL', 'start': 0, 'end': 3}}})
                p = source_command(target, folder, {'action': 'confirm', 'id': p['entries'][0]['id'], 'confirmed': True})
                sql(target, "insert into private.letter_signing_config(signing_key) values(decode('" + KEY.hex() + "','hex'));")
                receipt = bridge(folder, 'issue', {'workspace': state, 'letterRevision': 0})
                sql(target, accept_statement(receipt, state['revision']), user=OWNER)
                stale = bridge(folder, 'issue', {'workspace': state, 'letterRevision': 1})
                count = len(state['versions'])
                service(target, folder, [{'action': 'version', 'ids': [], 'injectConcurrentGoal': True, 'expectedStatus': 409}])
                current = sql(target, 'select public.read_workspace();', user=OWNER)
                if current['revision'] != state['revision'] + 1 or len(current['versions']) != count or current['goal'] != 'Concurrent owned goal':
                    raise ValueError('Evaluation/write race accepted a stale or duplicate version')
                sql(target, accept_statement(stale, state['revision'], 1), user=OWNER, failure='CONFLICT')
                service(target, folder, [{'action': 'restore', 'id': 'v1'}])
                after = read(target)
                if {k: v for k, v in after.items() if k != 'workspace_revision'} != {k: v for k, v in p.items() if k != 'workspace_revision'} or not after['source_matches']:
                    raise ValueError('Version/restore changed source provenance')
                codec(folder, {'profile': after, 'context': context(target)})
                verify_history(target, folder, receipt)
                if target == source:
                    source_receipt = receipt
            stage = 'twenty-real-restore-writers'
            w = sql(source, 'select public.read_workspace();', user=OWNER)
            query = statement(w['revision'], {'action': 'restore', 'id': w['versions'][-1]['id']})
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
                values = list(pool.map(lambda _: sql(source, query, user=OWNER, allow_conflict=True), range(20)))
            if sum(isinstance(v, dict) for v in values) != 1 or values.count('CONFLICT') != 19:
                raise ValueError('Expected one restore commit/nineteen conflicts')
            current = sql(source, 'select public.read_workspace();', user=OWNER)
            if len(current['versions']) != len(w['versions']) + 1 or current['revision'] != w['revision'] + 1 or current['versions'][-1]['restored_from'] != w['versions'][-1]['id']:
                raise ValueError('Concurrent restore duplicated or lost history')
            stage = 'seventeen-populated-native-restore-and-corruption'
            baseline = manifest(source, folder / 'baseline.json')
            if len(baseline['tables']) != 17 or not all(t['rows'] > 0 for t in baseline['tables'].values()):
                raise ValueError('All seventeen tables must be populated')
            run(['pg_dump', '-Fc', '-f', str(folder / 'synthetic.dump')], source)
            run(['pg_restore', '--exit-on-error', '--dbname', names[2], str(folder / 'synthetic.dump')], restored)
            if compare(baseline, manifest(restored, folder / 'restored.json')):
                raise ValueError('Restored fingerprints differ')
            codec(folder, {'profile': read(restored), 'context': context(restored)})
            verify_history(restored, folder, source_receipt)
            sql(restored, "update public.resume_versions set text='Corrupted synthetic version' where id='v1';")
            if not compare(baseline, manifest(restored, folder / 'corrupted.json')):
                raise ValueError('Historical-version corruption not detected')
            print('PASS: PG17 exact populated current upgrade/full schema;32 actual prepare/render-vs-SQL cases on each path;actual service version/restore without snapshot writes;SQL lifecycle/owned evidence;optional/unknown fields/immediate chain;real evaluation-write race refusal;source/letter history preserved;20restores/1commit/19conflicts;17populated native restore/corruption. Score metadata is not SQL-attested relevance;synthetic identity/HTTP,not provider/model/SMTP/restore acceptance.')
    except Exception:
        failed = True
        print('FAIL: owned version protocol at ' + stage + '; no workspace/DB diagnostics/keys printed.', file=sys.stderr)
    finally:
        for name in reversed(created):
            try:
                run(['dropdb', '--if-exists', '--', name], environment)
            except Exception:
                failed = True
                print('FAIL: owned version fixture cleanup incomplete.', file=sys.stderr)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
