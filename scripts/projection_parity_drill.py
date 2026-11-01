#!/usr/bin/env python3
"""Current read-only parity in owned PG17 fixtures, never a production cutover/restore."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import select
import subprocess
import sys
import tempfile
import uuid
from backup_manifest import compare
from check_projection_parity import validate
from saved_letter_drill import ROOT, OWNER, KEY, literal, run, sql, bridge, accept_statement, verify_history
from source_profile_drill import read, context, codec, manifest
from profile_command_drill import service, source_command, statement

MIGRATION = 'supabase/migrations/20261028110004_projection_parity.sql'
BASE_SHA256 = 'c5adc63c52968a7bcf9ded43f5f74666a327a15584a67dc74d2912325b66265c'


def allowed(environment):
    return (environment.get('JOBMATCH_LOCAL_PARITY') == '1'
            and environment.get('PGHOST') in ('127.0.0.1', '::1')
            and not any(environment.get(k) for k in ('PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGOPTIONS')))


def checker(target, expected=0):
    result = subprocess.run([sys.executable, str(ROOT / 'scripts/check_projection_parity.py')],
                            env=target, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=150)
    if result.returncode != expected:
        raise ValueError('Unexpected actual checker exit')
    if expected == 2:
        if result.stdout or result.stderr != b'FAIL: parity check unavailable. Check client, connection, full-read privileges and migration locally.\n':
            raise ValueError('CLI leaked unavailable query diagnostics')
        return None
    if result.stderr:
        raise ValueError('CLI emitted diagnostics')
    return validate(json.loads(result.stdout))


def held_writer(target):
    """Hold a real successful command uncommitted while another process checks parity."""
    before = sql(target, 'select public.read_workspace();', user=OWNER)
    process = subprocess.Popen(['psql', '-X', '-qAt', '-w', '-v', 'ON_ERROR_STOP=1'],
                               env=target, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    try:
        claims = literal(json.dumps({'sub': OWNER, 'session_id': '44444444-4444-4444-8444-444444444444'}))
        command = statement(before['revision'], {'action': 'goal', 'text': 'Held synthetic transaction'})
        process.stdin.write(('begin;set role authenticated;set request.jwt.claims=' + claims + ';do $$begin perform ' + command.removeprefix('select ').removesuffix(';') + ";end$$;select 'WRITER_READY';\n").encode())
        process.stdin.flush()
        if not select.select([process.stdout], [], [], 15)[0] or process.stdout.readline() != b'WRITER_READY\n':
            raise ValueError('Held writer did not become ready')
        if not checker(target)['ok'] or sql(target, 'select public.read_workspace();', user=OWNER) != before:
            raise ValueError('Parity read uncommitted state or repaired data')
        process.stdin.write(b'commit;\n')
        process.stdin.close()
        if process.wait(timeout=15) != 0:
            raise ValueError('Held writer did not commit')
        after = sql(target, 'select public.read_workspace();', user=OWNER)
        if after['revision'] != before['revision'] + 1 or after['goal'] != 'Held synthetic transaction' or not checker(target)['ok']:
            raise ValueError('Post-commit parity or revision changed')
    finally:
        if process.poll() is None:
            process.kill()
            process.wait(timeout=10)
        process.stdout.close()
        if not process.stdin.closed:
            process.stdin.close()


def main():
    if not allowed(os.environ):
        print('FAIL: explicit owned loopback parity fixture required; overrides refused.', file=sys.stderr)
        return 2
    environment = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10')
    names = ['jobmatch_parity_' + uuid.uuid4().hex for _ in range(3)]
    created, failed, stage = [], False, 'setup'
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-parity-') as temporary:
            folder = Path(temporary)
            full_sql, migration = (ROOT / 'supabase/schema.sql').read_bytes(), (ROOT / MIGRATION).read_bytes()
            if full_sql.count(migration) != 1 or not full_sql.endswith(migration):
                raise ValueError('Consolidated parity migration differs')
            predecessor = full_sql[:-len(migration)-1]
            if hashlib.sha256(predecessor).hexdigest() != BASE_SHA256:
                raise ValueError('Not exact current version/profile/application/source/letter/quota predecessor')
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
            if compare(old, manifest(source, folder / 'after.json')):
                raise ValueError('Administrative migration changed predecessor rows')
            for target in (source, full):
                stage = 'SQL-corruption-scope-grants-and-legacy-suite'
                run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / 'supabase/tests/projection_parity.sql')], target)
                stage = 'current-service-commands-and-counts-only-read'
                stage = 'current-service-baseline-checker'
                first = checker(target)
                if not first['ok'] or first['checked']['workspaces'] != 1:
                    raise ValueError('Expected populated baseline')
                stage = 'current-service-initial-version-restore-application'
                prepared = service(target, folder, [{'action': 'analyze'}, {'action': 'version', 'selectAllEdits': True},
                    {'action': 'restore', 'restoreLatest': True},
                    {'action': 'application', 'title': 'Synthetic current role', 'status': 'Планируется', 'note': '😀\r\nLiteral', 'resumeVersionId': 'v1'}])['state']
                stage = 'current-source-profile-confirmation'
                sql(target, 'grant execute on function private.source_profile_storage_permission() to authenticated;')
                profile = source_command(target, folder, {'action': 'add', 'kind': 'employment', 'fields': {'title': {'quote': 'SQL', 'start': 0, 'end': 3}}})
                profile = source_command(target, folder, {'action': 'confirm', 'id': profile['entries'][0]['id'], 'confirmed': True})
                sql(target, "insert into private.letter_signing_config(signing_key) values(decode('" + KEY.hex() + "','hex'));")
                stage = 'current-immutable-letter-acceptance'
                receipt = bridge(folder, 'issue', {'workspace': prepared, 'letterRevision': 0})
                sql(target, accept_statement(receipt, prepared['revision']), user=OWNER)
                read_folder = folder / target['PGDATABASE']
                read_folder.mkdir()
                for i, operation in enumerate([
                    {'action': 'import', 'text': '\ufeff SQL \r\nPython\nSQL'},
                    {'action': 'fact', 'text': 'Literal 😀 clarification'},
                    {'action': 'verify', 'selectFactContaining': 'SQL', 'verified': True},
                    {'action': 'vacancy', 'text': 'SQL role'}, {'action': 'goal', 'text': 'Data role'},
                    {'action': 'application', 'id': 'a1', 'status': 'Отклик отправлен', 'note': 'Updated literal note', 'resumeVersionId': None},
                    {'action': 'analyze'}, {'action': 'version', 'ids': []}, {'action': 'restore', 'id': 'v1'}]):
                    stage = 'current-service-operation-' + operation['action']
                    service(target, folder, [operation])
                    stage = 'current-parity-and-fingerprints-after-' + operation['action']
                    before_check = manifest(target, read_folder / (str(i) + '-before.json'))
                    if not checker(target)['ok'] or compare(before_check, manifest(target, read_folder / (str(i) + '-after.json'))):
                        raise ValueError('Current command drift or read changed fingerprints')
                stage = 'stale-source-and-letter-preservation'
                after = read(target)
                if after['source_matches'] or after['entries'] != profile['entries'] or after['source_original'] != profile['source_original']:
                    raise ValueError('Parity command sequence rewrote stale source evidence')
                codec(folder, {'profile': after, 'context': context(target)})
                verify_history(target, folder, receipt)
                stage = 'restricted-role-CLI-refuses-partial-RLS'
                sql(target, 'create role qa_current_parity_limited nologin;grant usage on schema public,private to qa_current_parity_limited;grant select on public.workspaces,public.profile_facts,public.resume_versions,public.applications,public.application_events to qa_current_parity_limited;grant execute on function private.workspace_projection_report() to qa_current_parity_limited;')
                try:
                    checker(dict(target, PGOPTIONS='-c role=qa_current_parity_limited'), expected=2)
                finally:
                    sql(target, 'drop owned by qa_current_parity_limited;drop role qa_current_parity_limited;')
                if target == source:
                    source_receipt = receipt
            stage = 'real-held-writer-and-parallel-CAS-readers'
            held_writer(source)
            current = sql(source, 'select public.read_workspace();', user=OWNER)
            query = statement(current['revision'], {'action': 'goal', 'text': 'Concurrent parity goal'})
            with concurrent.futures.ThreadPoolExecutor(max_workers=28) as pool:
                writers = [pool.submit(sql, source, query, user=OWNER, allow_conflict=True) for _ in range(20)]
                readers = [pool.submit(checker, source) for _ in range(8)]
                values = [f.result() for f in writers]
                if any(not f.result()['ok'] for f in readers):
                    raise ValueError('Concurrent read reported transient drift')
            if sum(isinstance(v, dict) for v in values) != 1 or values.count('CONFLICT') != 19 or not checker(source)['ok']:
                raise ValueError('Expected one CAS commit/nineteen conflicts and parity')
            stage = 'seventeen-populated-native-restore-and-read-only-corruption'
            baseline = manifest(source, folder / 'baseline.json')
            if len(baseline['tables']) != 17 or not all(t['rows'] > 0 for t in baseline['tables'].values()):
                raise ValueError('All seventeen tables must be populated')
            run(['pg_dump', '-Fc', '-f', str(folder / 'synthetic.dump')], source)
            run(['pg_restore', '--exit-on-error', '--dbname', names[2], str(folder / 'synthetic.dump')], restored)
            if compare(baseline, manifest(restored, folder / 'restored.json')) or not checker(restored)['ok']:
                raise ValueError('Restored fingerprints or projection parity differ')
            codec(folder, {'profile': read(restored), 'context': context(restored)})
            verify_history(restored, folder, source_receipt)
            sql(restored, "update public.resume_versions set text='SENSITIVE_SYNTHETIC_PARITY' where id='v1';")
            corrupted = manifest(restored, folder / 'corrupted.json')
            report = checker(restored, expected=1)
            if report['ok'] or report['mismatches']['versions'] < 1 or not compare(baseline, corrupted):
                raise ValueError('Same-count historical corruption not detected')
            if compare(corrupted, manifest(restored, folder / 'after-detection.json')):
                raise ValueError('Parity checker repaired corrupt rows')
            print('PASS: PG17 exact populated current upgrade/full schema;all-command/legacy SQL parity and corruption/positions/extras/links/scope;actual current service commands and read-only fingerprint stability;restricted-RLS CLI exit2;held uncommitted writer;8parallel repeatable readers/20writers/1commit/19conflicts;17populated native dump/restore/current source+letter codecs;corrupt version CLI exit1/no repair. Checker covers5core tables/snapshot arrays,not all17 semantic tables;synthetic Auth/HTTP/restore,not provider or production cutover/model acceptance.')
    except Exception:
        failed = True
        print('FAIL: owned parity protocol at ' + stage + '; no rows/keys/DB diagnostics printed.', file=sys.stderr)
    finally:
        for name in reversed(created):
            try:
                run(['dropdb', '--if-exists', '--', name], environment)
            except Exception:
                failed = True
                print('FAIL: owned parity fixture cleanup incomplete.', file=sys.stderr)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
