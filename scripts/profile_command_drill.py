#!/usr/bin/env python3
"""Owned PG17 profile commands/actual service bridge. Synthetic Auth, never provider acceptance."""
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
from source_profile_drill import read, context, codec, manifest, command_statement

MIGRATION = 'supabase/migrations/20261028110002_profile_import_commands.sql'
BASE_SHA256 = '05c664900d788784f74c1a46adcd29935bdd5a6e75e2f0daa4dc70ef47b634da'


def allowed(environment):
    return (environment.get('JOBMATCH_LOCAL_PROFILE_COMMANDS') == '1'
            and environment.get('PGHOST') in ('127.0.0.1', '::1')
            and not any(environment.get(k) for k in ('PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGOPTIONS')))


def statement(revision, cmd):
    return 'select public.apply_workspace_command(' + str(revision) + ',' + literal(json.dumps(cmd, ensure_ascii=False)) + '::jsonb);'


def service(target, folder, operations):
    a, b = folder / 'service-input.json', folder / 'service-output.json'
    a.write_text(json.dumps({'operations': operations}, ensure_ascii=False))
    run(['node', str(ROOT / 'tests/fixtures/native-service.cjs'), str(a), str(b)], target)
    return json.loads(b.read_text())


def source_command(target, folder, cmd):
    before, c = read(target), context(target)
    after = sql(target, command_statement(cmd, before['revision'], c['revision']), user=OWNER)
    codec(folder, {'before': before, 'profile': after, 'command': cmd, 'context': c})
    return after


def unicode_cases():
    marks = ['', ' ', '\t', '\r', '\v', '\f', '\u00a0', '\ufeff', '\u1680', '\u2000', '\u200a', '\u2028', '\u2029', '\u202f', '\u205f', '\u3000', '\u0085', '\u200b', '\u180e']
    result = []
    for i in range(256):
        a, b = marks[i % len(marks)], marks[(i // len(marks)) % len(marks)]
        result.append(a + 'SQL😀' + b + '\r\n' + b + 'v' + a + '\n\n' + a + 'SQL😀' + b)
    return result + ['', ' '.join(['x']) * 100001, ' ' * 99999 + 'v', '😀' * 1000,
                     '😀' * 1000 + 'x', 'x\n' * 500, 'x\n' * 501, 'e\u0301👩‍💻\rinside\nSQL\nSQL']


def parity(target, folder):
    cases = unicode_cases()
    a, b = folder / 'unicode-input.json', folder / 'unicode-output.json'
    a.write_text(json.dumps(cases, ensure_ascii=False))
    run(['node', str(ROOT / 'tests/fixtures/profile-parse-native.cjs'), str(a), str(b)], target)
    expected = json.loads(b.read_text())
    if len(expected) != len(cases):
        raise ValueError('Incomplete JS parser parity')
    previous_ids = set()
    for text, want in zip(cases, expected):
        before = sql(target, 'select public.read_workspace();', user=OWNER)
        query = statement(before['revision'], {'action': 'import', 'text': text})
        if not want['accepted']:
            sql(target, query, user=OWNER, failure='INVALID_WRITE')
            if sql(target, 'select public.read_workspace();', user=OWNER) != before:
                raise ValueError('Invalid import mutated state')
            continue
        after = sql(target, query, user=OWNER)
        facts = after['facts']
        ids = {f['id'] for f in facts}
        if after['original'] != text or [f['text'] for f in facts] != want['texts'] or [f['source'] for f in facts] != want['sources'] or any(f['verified'] for f in facts):
            raise ValueError('Actual SQL/production JS parser differs')
        if len(ids) != len(facts) or ids & previous_ids or any(str(uuid.UUID(i)) != i for i in ids):
            raise ValueError('Imported IDs reused or not server UUIDs')
        previous_ids = ids
    return len(cases)


def main():
    if not allowed(os.environ):
        print('FAIL: explicit owned loopback profile fixture required; overrides refused.', file=sys.stderr)
        return 2
    environment = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10')
    names = ['jobmatch_profile_' + uuid.uuid4().hex for _ in range(4)]
    created, failed, stage = [], False, 'setup'
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-profile-command-') as temporary:
            folder = Path(temporary)
            full_sql, migration = (ROOT / 'supabase/schema.sql').read_bytes(), (ROOT / MIGRATION).read_bytes()
            if not full_sql.endswith(migration) or full_sql.count(migration) != 1:
                raise ValueError('Consolidated import migration differs')
            predecessor = full_sql[:-len(migration)-1]
            if hashlib.sha256(predecessor).hexdigest() != BASE_SHA256:
                raise ValueError('Not exact current application/source/letter/quota predecessor')
            (folder / 'base.sql').write_bytes(predecessor)
            for name in names:
                run(['createdb', '--', name], environment)
                created.append(name)
            source, full, restored, unicode = [dict(environment, PGDATABASE=n) for n in names]
            stage = 'full-and-populated-current-upgrade'
            for target, schema in ((source, folder / 'base.sql'), (full, ROOT / 'supabase/schema.sql'), (unicode, ROOT / 'supabase/schema.sql')):
                for path in (ROOT / 'scripts/restore_fixture.sql', schema, ROOT / 'scripts/restore_seed.sql'):
                    run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(path)], target)
            old = manifest(source, folder / 'before.json')
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / MIGRATION)], source)
            if compare(old, manifest(source, folder / 'after.json')):
                raise ValueError('Migration changed predecessor rows')
            stage = 'actual-JavaScript-SQL-Unicode-parity'
            cases = parity(unicode, folder)
            for target in (source, full):
                stage = 'native-profile-SQL-suite-both-paths'
                run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / 'supabase/tests/profile_commands.sql')], target)
                stage = 'actual-route-version-metadata'
                prepared = service(target, folder, [{'action': 'analyze'}, {'action': 'version', 'selectAllEdits': True}])['state']
                if len(prepared['versions']) != 2 or not prepared['versions'][-1].get('match_metadata'):
                    raise ValueError('Actual route did not store current rule metadata')
                stage = 'confirmed-source-and-immutable-letter'
                sql(target, 'grant execute on function private.source_profile_storage_permission() to authenticated;')
                p = source_command(target, folder, {'action': 'add', 'kind': 'employment', 'fields': {'title': {'quote': 'SQL', 'start': 0, 'end': 3}}})
                p = source_command(target, folder, {'action': 'confirm', 'id': p['entries'][0]['id'], 'confirmed': True})
                sql(target, "insert into private.letter_signing_config(signing_key) values(decode('" + KEY.hex() + "','hex'));")
                receipt = bridge(folder, 'issue', {'workspace': prepared, 'letterRevision': 0})
                sql(target, accept_statement(receipt, prepared['revision']), user=OWNER)
                stale = bridge(folder, 'issue', {'workspace': prepared, 'letterRevision': 1})
                stage = 'actual-route-compact-import-fact-demo'
                raw, extra = '\ufeff SQL \r\n\r\nRust\nSQL', '  v\r\nSQL😀  '
                outcome = service(target, folder, [
                    {'action': 'import', 'text': raw, 'verified': True, 'facts': [{'id': 'forged'}], 'source': 'forged'},
                    {'action': 'import', 'text': raw}, {'action': 'fact', 'text': extra},
                    {'action': 'demo', 'text': 'forged', 'vacancy': 'forged'},
                    {'action': 'fact', 'text': 'stale', 'revision': prepared['revision'], 'expectedStatus': 409}])
                states = [item['state'] for item in outcome['results']]
                for w in states:
                    if w['versions'] != prepared['versions'] or w['applications'] != prepared['applications'] or w['goal'] != prepared['goal'] or any(f['verified'] for f in w['facts']):
                        raise ValueError('History/metadata/apps altered or auto-verified')
                first_ids, second_ids = ({f['id'] for f in w['facts']} for w in states[:2])
                if states[0]['original'] != raw or states[1]['original'] != raw or [f['text'] for f in states[0]['facts']] != ['SQL', 'Rust', 'SQL'] or first_ids & second_ids:
                    raise ValueError('Same-text import did not preserve raw/reset identities')
                if states[2]['original'] != raw + '\n' + extra or states[2]['facts'][-1]['text'] != extra or states[2]['facts'][-1]['source'] != 'Уточнение пользователя':
                    raise ValueError('Manual literal fact append changed bytes')
                state = outcome['state']
                if {**sql(target, 'select public.read_workspace();', user=OWNER), 'ownerId': OWNER} != state:
                    raise ValueError('Failed stale route changed committed state')
                after = read(target)
                if after['source_matches'] or after['entries'] != p['entries'] or after['source_original'] != p['source_original'] or after['source_fact_ids'] != p['source_fact_ids'] or after['revision'] != p['revision']:
                    raise ValueError('Import silently rewrote/retargeted source evidence')
                codec(folder, {'profile': after, 'context': context(target)})
                verify_history(target, folder, receipt)
                sql(target, accept_statement(stale, prepared['revision'], 1), user=OWNER, failure='CONFLICT')
                stage = 'explicit-cache-cleanup-and-source-review'
                sql(target, 'revoke execute on function private.source_profile_storage_permission() from authenticated;')
                cleared = source_command(target, folder, {'action': 'clear', 'confirm': 'CLEAR_SOURCE_PROFILE_DATA'})
                if cleared['source_captured'] or cleared['entries'] or not sql(target, "select to_jsonb(source_original is null and source_fact_ids is null) from public.source_profiles where user_id=" + literal(OWNER) + ';'):
                    raise ValueError('Explicit stale-cache cleanup failed')
                sql(target, 'grant execute on function private.source_profile_storage_permission() to authenticated;')
                source_command(target, folder, {'action': 'reset', 'confirm': 'RESET_SOURCE_PROFILE'})
                quote = state['facts'][0]['text']
                at = state['original'].index(quote)
                fresh_profile = source_command(target, folder, {'action': 'add', 'kind': 'employment', 'fields': {'title': {'quote': quote, 'start': at, 'end': at + len(quote)}}})
                source_command(target, folder, {'action': 'confirm', 'id': fresh_profile['entries'][0]['id'], 'confirmed': True})
                if any(f['verified'] for f in sql(target, 'select public.read_workspace();', user=OWNER)['facts']):
                    raise ValueError('Source-field review auto-verified legacy facts')
                stage = 'separate-fact-verification-current-letter'
                state = service(target, folder, [{'action': 'verify', 'selectFirstFact': True, 'verified': True}])['state']
                fresh = bridge(folder, 'issue', {'workspace': state, 'letterRevision': 1})
                sql(target, accept_statement(fresh, state['revision'], 1), user=OWNER)
                verify_history(target, folder, fresh)
                verify_history(target, folder, receipt)
                if target == source:
                    source_receipts = [receipt, fresh]
            stage = 'twenty-concurrent-current-imports'
            w = sql(source, 'select public.read_workspace();', user=OWNER)
            query = statement(w['revision'], {'action': 'import', 'text': 'Concurrent SQL\nUnverified Rust'})
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
                values = list(pool.map(lambda _: sql(source, query, user=OWNER, allow_conflict=True), range(20)))
            if sum(isinstance(v, dict) for v in values) != 1 or values.count('CONFLICT') != 19:
                raise ValueError('Expected one import commit/nineteen conflicts')
            state = sql(source, 'select public.read_workspace();', user=OWNER)
            if state['revision'] != w['revision'] + 1 or any(f['verified'] for f in state['facts']) or state['versions'] != w['versions'] or state['applications'] != w['applications']:
                raise ValueError('Concurrent import changed history/verification')
            codec(folder, {'profile': read(source), 'context': context(source)})
            stage = 'seventeen-populated-native-restore-and-corruption'
            baseline = manifest(source, folder / 'baseline.json')
            if len(baseline['tables']) != 17 or not all(t['rows'] > 0 for t in baseline['tables'].values()):
                raise ValueError('All seventeen tables must be populated')
            run(['pg_dump', '-Fc', '-f', str(folder / 'synthetic.dump')], source)
            run(['pg_restore', '--exit-on-error', '--dbname', names[2], str(folder / 'synthetic.dump')], restored)
            if compare(baseline, manifest(restored, folder / 'restored.json')):
                raise ValueError('Restored fingerprints differ')
            codec(folder, {'profile': read(restored), 'context': context(restored)})
            for receipt in source_receipts:
                verify_history(restored, folder, receipt)
            sql(restored, "update public.resume_versions set text='Corrupted synthetic history' where id='v1';")
            if not compare(baseline, manifest(restored, folder / 'corrupted.json')):
                raise ValueError('Historical-version corruption not detected')
            print('PASS: PG17 exact current populated upgrade/full schema; actual service route/HTTP fixture/native SQL, rule metadata/history/apps preserved;256 Unicode +8 boundary production JS/SQL parity cases;fresh unverified IDs;source cache stale then explicit cleanup/review without auto-verification;stale letter refused/current letter accepted;20imports/1commit/19conflicts;17populated native restore/corruption. Synthetic identity, not provider Auth/PostgREST/SMTP/restore/model acceptance.')
    except Exception:
        failed = True
        print('FAIL: owned profile protocol at ' + stage + '; no rows/keys/DB diagnostics printed.', file=sys.stderr)
    finally:
        for name in reversed(created):
            try:
                run(['dropdb', '--if-exists', '--', name], environment)
            except Exception:
                failed = True
                print('FAIL: owned profile fixture cleanup incomplete.', file=sys.stderr)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
