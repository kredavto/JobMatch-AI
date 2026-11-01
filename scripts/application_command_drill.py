#!/usr/bin/env python3
"""Owned PG17 current application commands/provenance. Never a provider restore."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import uuid
from storage_fixture import workspace_scalars, preserved_migration
from backup_manifest import compare
from saved_letter_drill import ROOT, OWNER, KEY, literal, run, sql, bridge, accept_statement, verify_history
from source_profile_drill import TEXT, add, command as profile_command, context, read, codec, manifest

MIGRATION = 'supabase/migrations/20261028110001_application_commands.sql'
BASE_SHA256 = '14988e2967a58e4ac9d0d4447909ed06a29c877888f5f7d96ccd64070a9c46a1'


def allowed(environment):
    return (environment.get('JOBMATCH_LOCAL_APPLICATIONS') == '1'
            and environment.get('PGHOST') in ('127.0.0.1', '::1')
            and not any(environment.get(k) for k in ('PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGOPTIONS')))


def statement(revision, cmd):
    return 'select public.apply_workspace_command(' + str(revision) + ',' + literal(json.dumps(cmd, ensure_ascii=False)) + '::jsonb);'


def apply(target, folder, before, cmd):
    state = sql(target, statement(before['revision'], cmd), user=OWNER)
    a, b = folder / 'application-input.json', folder / 'application-output.json'
    a.write_text(json.dumps({'ownerId': OWNER, 'revision': before['revision'], 'command': cmd, 'state': state}, ensure_ascii=False))
    run(['node', str(ROOT / 'tests/fixtures/application-native.cjs'), str(a), str(b)], dict(os.environ))
    if json.loads(b.read_text()) != {'valid': True}:
        raise ValueError('Actual application wire/ack codec refused')
    if {k: v for k, v in state.items() if k not in ('revision', 'applications')} != {k: v for k, v in before.items() if k not in ('revision', 'applications')}:
        raise ValueError('Application changed unrelated source or history')
    return state


def main():
    if not allowed(os.environ):
        print('FAIL: explicit owned loopback fixture required; hosted/service overrides refused.', file=sys.stderr)
        return 2
    environment = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10')
    names = ['jobmatch_applications_' + uuid.uuid4().hex for _ in range(3)]
    created, failed, stage = [], False, 'setup'
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-applications-') as temporary:
            folder = Path(temporary)
            full_sql, migration = (ROOT / 'supabase/schema.sql').read_bytes(), (ROOT / MIGRATION).read_bytes()
            if full_sql.count(migration) != 1:
                raise ValueError('Consolidated command migration differs')
            prefix, suffix = full_sql.split(migration)
            extras = [ROOT / 'supabase/migrations' / name for name in ('20261028110002_profile_import_commands.sql', '20261028110003_version_commands.sql', '20261028110004_projection_parity.sql', '20261028110005_canonical_workspace_reads.sql', '20261028110006_explicit_workspace_writes.sql', '20261028120140_workspace_entity_snapshot.sql', '20261028120214_compact_workspace_storage.sql', '20261101171000_source_versions.sql')]
            if suffix != b''.join(b'\n' + p.read_bytes() for p in extras):
                raise ValueError('Unexpected post-application definitions')
            predecessor = prefix[:-1]
            if hashlib.sha256(predecessor).hexdigest() != BASE_SHA256:
                raise ValueError('Not exact current seventeen-table/quota predecessor')
            (folder / 'base.sql').write_bytes(predecessor)
            for name in names:
                run(['createdb', '--', name], environment)
                created.append(name)
            source, full, restored = [dict(environment, PGDATABASE=n) for n in names]
            stage = 'populated-current-upgrade-and-full-schema'
            for target, schema in ((source, folder / 'base.sql'), (full, ROOT / 'supabase/schema.sql')):
                for path in (ROOT / 'scripts/restore_fixture.sql', schema, ROOT / 'scripts/restore_seed.sql'):
                    run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(path)], target)
            scalars_before = workspace_scalars(source)
            old = manifest(source, folder / 'before.json')
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / MIGRATION)], source)
            for extra in extras:
                run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(extra)], source)
            preserved_migration(old, manifest(source, folder / 'after.json'), scalars_before, source)
            for target in (source, full):
                stage = 'actual-application-SQL-suite-both-paths'
                run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / 'supabase/tests/application_commands.sql')], target)
                stage = 'source-profile-and-letter-provenance'
                sql(target, "set request.jwt.claims=" + literal(json.dumps({'sub': OWNER, 'session_id': '44444444-4444-4444-8444-444444444444'})) + ";update public.workspaces set payload=jsonb_set(payload,'{original}',to_jsonb(" + literal(TEXT) + "::text)) where user_id=" + literal(OWNER) + ';')
                sql(target, 'grant execute on function private.source_profile_storage_permission() to authenticated;')
                p = profile_command(target, folder, add())
                profile_command(target, folder, {'action': 'confirm', 'id': p['entries'][0]['id'], 'confirmed': True})
                p = read(target)
                sql(target, "insert into private.letter_signing_config(signing_key) values(decode('" + KEY.hex() + "','hex'));")
                w = sql(target, 'select public.read_workspace();', user=OWNER)
                receipt = bridge(folder, 'issue', {'workspace': {**w, 'ownerId': OWNER}, 'letterRevision': 0})
                sql(target, accept_statement(receipt, w['revision']), user=OWNER)
                stale = bridge(folder, 'issue', {'workspace': {**w, 'ownerId': OWNER}, 'letterRevision': 1})
                state = apply(target, folder, w, {'action': 'application', 'title': 'Current source-linked role', 'status': 'Планируется', 'note': 'Reviewed', 'resumeVersionId': 'v1'})
                aid = state['applications'][-1]['id']
                state = apply(target, folder, state, {'action': 'application', 'id': aid, 'status': 'Интервью', 'note': 'Own note'})
                if state['applications'][-1]['resumeVersionId'] != 'v1' or len(state['applications'][-1]['events']) != 2:
                    raise ValueError('Application association/event preservation')
                after = read(target)
                if {k: v for k, v in p.items() if k != 'workspace_revision'} != {k: v for k, v in after.items() if k != 'workspace_revision'}:
                    raise ValueError('Application changed source profile provenance')
                codec(folder, {'profile': after, 'context': context(target)})
                verify_history(target, folder, receipt)
                sql(target, accept_statement(stale, w['revision'], 1), user=OWNER, failure='CONFLICT')
                fresh = bridge(folder, 'issue', {'workspace': {**state, 'ownerId': OWNER}, 'letterRevision': 1})
                sql(target, accept_statement(fresh, state['revision'], 1), user=OWNER)
                verify_history(target, folder, fresh)
                if target == source:
                    source_receipt = receipt
            stage = 'twenty-real-application-writers'
            w = sql(source, 'select public.read_workspace();', user=OWNER)
            cmd = {'action': 'application', 'title': 'Concurrent owned role', 'status': 'Планируется', 'note': ''}
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
                values = list(pool.map(lambda _: sql(source, statement(w['revision'], cmd), user=OWNER, allow_conflict=True), range(20)))
            if sum(isinstance(v, dict) for v in values) != 1 or values.count('CONFLICT') != 19:
                raise ValueError('Expected one application commit/nineteen conflicts')
            after = sql(source, 'select public.read_workspace();', user=OWNER)
            if len(after['applications']) != len(w['applications']) + 1 or after['revision'] != w['revision'] + 1:
                raise ValueError('Concurrent duplicate/lost application')
            stage = 'seventeen-populated-tables-native-restore-and-corruption'
            baseline = manifest(source, folder / 'baseline.json')
            if len(baseline['tables']) != 17 or not all(t['rows'] > 0 for t in baseline['tables'].values()):
                raise ValueError('All seventeen tables must be populated')
            run(['pg_dump', '-Fc', '-f', str(folder / 'synthetic.dump')], source)
            run(['pg_restore', '--exit-on-error', '--dbname', names[2], str(folder / 'synthetic.dump')], restored)
            if compare(baseline, manifest(restored, folder / 'restored.json')):
                raise ValueError('Native restored rows differ')
            codec(folder, {'profile': read(restored), 'context': context(restored)})
            verify_history(restored, folder, source_receipt)
            sql(restored, "update public.applications set note='Corrupted synthetic note' where id='a1';")
            if not compare(baseline, manifest(restored, folder / 'corrupted.json')):
                raise ValueError('Intentional application corruption not detected')
            print('PASS: PG17 exact current populated upgrade/full schema; application SQL suite/Unicode/legacy rollback; actual production command wire+ack; confirmed source profile and immutable letters preserved, stale receipt refused/new-context receipt accepted;20 writers/1 commit/19 conflicts;17 populated native dump/restore and application corruption detection. Synthetic Auth/transport, not provider restore/PostgREST/SMTP.')
    except Exception:
        failed = True
        print('FAIL: owned application protocol at ' + stage + '; no DB diagnostics/rows/keys emitted.', file=sys.stderr)
    finally:
        for name in reversed(created):
            try:
                run(['dropdb', '--if-exists', '--', name], environment)
            except Exception:
                failed = True
                print('FAIL: owned fixture cleanup incomplete.', file=sys.stderr)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
