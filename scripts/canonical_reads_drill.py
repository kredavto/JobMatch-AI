#!/usr/bin/env python3
"""Current canonical boundaries in owned PG17 fixtures; never provider/cutover acceptance."""
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
from source_profile_drill import read, context, codec, manifest
from profile_command_drill import service, source_command, statement
from projection_parity_drill import checker, held_writer

MIGRATION = 'supabase/migrations/20261028110005_canonical_workspace_reads.sql'
BASE_SHA256 = 'bedfcfdb4d23275f3e2964b9b16d0299fcdbbfefb37e0435c3f6c5b87119f3cf'


def allowed(environment):
    return (environment.get('JOBMATCH_LOCAL_CANONICAL') == '1'
            and environment.get('PGHOST') in ('127.0.0.1', '::1')
            and not any(environment.get(k) for k in ('PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGOPTIONS')))


def definitions(target):
    return sql(target, "select jsonb_build_object('functions',(select jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,pg_get_functiondef(p.oid),p.proacl::text) order by p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f'),'triggers',(select jsonb_agg(pg_get_triggerdef(t.oid) order by t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal));")


def main():
    if not allowed(os.environ):
        print('FAIL: explicit owned loopback canonical fixture required; overrides refused.', file=sys.stderr)
        return 2
    environment = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10')
    names = ['jobmatch_canonical_' + uuid.uuid4().hex for _ in range(4)]
    created, failed, stage = [], False, 'setup'
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-canonical-') as temporary:
            folder = Path(temporary)
            full_sql, migration = (ROOT / 'supabase/schema.sql').read_bytes(), (ROOT / MIGRATION).read_bytes()
            if full_sql.count(migration) != 1 or not full_sql.endswith(migration):
                raise ValueError('Consolidated canonical migration differs')
            predecessor = full_sql[:-len(migration)-1]
            if hashlib.sha256(predecessor).hexdigest() != BASE_SHA256:
                raise ValueError('Not exact current parity/version/profile/application/source/letter/quota predecessor')
            (folder / 'base.sql').write_bytes(predecessor)
            for name in names:
                run(['createdb', '--', name], environment)
                created.append(name)
            source, full, restored, dirty = [dict(environment, PGDATABASE=n) for n in names]
            stage = 'full-and-exact-populated-predecessor'
            for target, schema in ((source, folder / 'base.sql'), (full, ROOT / 'supabase/schema.sql'), (dirty, folder / 'base.sql')):
                for path in (ROOT / 'scripts/restore_fixture.sql', schema, ROOT / 'scripts/restore_seed.sql'):
                    run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(path)], target)
            stage = 'dirty-migration-atomic-refusal-no-definitions-or-row-change'
            sql(dirty, "update public.profile_facts set text='Dirty synthetic fact' where id='f1';")
            dirty_rows, dirty_defs = manifest(dirty, folder / 'dirty-before.json'), definitions(dirty)
            sql(dirty, migration.decode(), failure='PROJECTION_CONFLICT')
            if compare(dirty_rows, manifest(dirty, folder / 'dirty-after.json')) or definitions(dirty) != dirty_defs or sql(dirty, "select to_jsonb(to_regprocedure('private.locked_workspace(integer)') is not null);"):
                raise ValueError('Dirty preflight changed definitions/grants/triggers/rows')
            checker(dirty, expected=1)
            receipts, profiles = {}, {}
            for target in (source, full):
                stage = 'current-service-metadata-source-and-letter-before-upgrade'
                state = service(target, folder, [{'action': 'analyze'}, {'action': 'version', 'selectAllEdits': True}, {'action': 'restore', 'restoreLatest': True}])['state']
                sql(target, 'grant execute on function private.source_profile_storage_permission() to authenticated;')
                p = source_command(target, folder, {'action': 'add', 'kind': 'employment', 'fields': {'title': {'quote': 'SQL', 'start': 0, 'end': 3}}})
                profiles[target['PGDATABASE']] = source_command(target, folder, {'action': 'confirm', 'id': p['entries'][0]['id'], 'confirmed': True})
                sql(target, "insert into private.letter_signing_config(signing_key) values(decode('" + KEY.hex() + "','hex'));")
                receipt = bridge(folder, 'issue', {'workspace': state, 'letterRevision': 0})
                sql(target, accept_statement(receipt, state['revision']), user=OWNER)
                receipts[target['PGDATABASE']] = receipt
            stage = 'populated-seventeen-table-upgrade-and-identical-definitions'
            old = manifest(source, folder / 'before-upgrade.json')
            if len(old['tables']) != 17 or not all(t['rows'] > 0 for t in old['tables'].values()):
                raise ValueError('Predecessor must have all seventeen tables populated')
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / MIGRATION)], source)
            if compare(old, manifest(source, folder / 'after-upgrade.json')) or definitions(source) != definitions(full):
                raise ValueError('Migration changed rows or clean/upgrade definitions/grants/triggers differ')
            for target in (source, full):
                stage = 'actual-canonical-SQL-suite-exact-history-and-legacy-compatibility'
                run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / 'supabase/tests/canonical_workspace.sql')], target)
                if not checker(target)['ok']:
                    raise ValueError('SQL suite left drift')
                stage = 'actual-service-and-legacy-refuse-corruption-without-domain-writes'
                state = sql(target, 'select public.read_workspace();', user=OWNER)
                sql(target, "update public.profile_facts set text='SENSITIVE_SYNTHETIC_CANONICAL' where id='f1';")
                before = manifest(target, folder / ('blocked-before-' + target['PGDATABASE'] + '.json'))
                stage = 'corrupt-actual-service-503'
                outcomes = service(target, folder, [{'action': 'goal', 'text': 'Refused', 'expectedStatus': 503},
                    {'action': 'import', 'text': 'Refused import', 'expectedStatus': 503},
                    {'action': 'version', 'ids': [], 'expectedStatus': 503},
                    {'action': 'restore', 'id': 'v1', 'expectedStatus': 503}])
                stage = 'corrupt-service-single-command-no-fallback'
                for result in outcomes['results']:
                    commands = [t for t in result['trace'] if t['path'] == '/rest/v1/rpc/apply_workspace_command']
                    if len(commands) != 1 or any(t['path'] == '/rest/v1/rpc/save_workspace' for t in result['trace']):
                        raise ValueError('Corruption caused retry/snapshot fallback')
                stage = 'corrupt-legacy-SQL-refusal'
                sql(target, 'select public.save_workspace(' + str(state['revision']) + ',' + literal(json.dumps(state)) + "::jsonb,'goal');", user=OWNER, failure='PROJECTION_CONFLICT')
                stage = 'corrupt-refusals-no-domain-fingerprint-change'
                changed = compare(before, manifest(target, folder / ('blocked-after-' + target['PGDATABASE'] + '.json')))
                if any(name != 'public.quota_counters' for name in changed):
                    raise ValueError('Refused service changed domain rows/history/audit')
                stage = 'corrupt-refusals-read-only-checker'
                checker(target, expected=1)
                # Explicit repair ONLY of this owned synthetic fixture; no production repair path.
                sql(target, "update public.profile_facts set text='SQL' where id='f1';")
                stage = 'current-commands-history-and-provenance-after-boundary'
                outcome = service(target, folder, [{'action': 'goal', 'text': 'Canonical owned role'},
                    {'action': 'application', 'title': 'Canonical fixture', 'status': 'Планируется', 'note': '😀 literal', 'resumeVersionId': 'v1'},
                    {'action': 'version', 'ids': []}, {'action': 'restore', 'id': 'v1'}])
                state = outcome['state']
                p = read(target)
                if not p['source_matches'] or {k: v for k, v in p.items() if k != 'workspace_revision'} != {k: v for k, v in profiles[target['PGDATABASE']].items() if k != 'workspace_revision'}:
                    raise ValueError('Canonical commands retargeted source provenance')
                codec(folder, {'profile': p, 'context': context(target)})
                verify_history(target, folder, receipts[target['PGDATABASE']])
                if not checker(target)['ok']:
                    raise ValueError('Canonical writes lost parity')
            stage = 'held-writer-and-twenty-real-CAS-commands'
            held_writer(source)
            before = sql(source, 'select public.read_workspace();', user=OWNER)
            query = statement(before['revision'], {'action': 'goal', 'text': 'Concurrent canonical goal'})
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
                values = list(pool.map(lambda _: sql(source, query, user=OWNER, allow_conflict=True), range(20)))
            if sum(isinstance(v, dict) for v in values) != 1 or values.count('CONFLICT') != 19 or not checker(source)['ok']:
                raise ValueError('Expected one canonical commit/nineteen conflicts/parity')
            stage = 'seventeen-populated-native-restore-and-drift-refusal'
            baseline = manifest(source, folder / 'baseline.json')
            run(['pg_dump', '-Fc', '-f', str(folder / 'synthetic.dump')], source)
            run(['pg_restore', '--exit-on-error', '--dbname', names[2], str(folder / 'synthetic.dump')], restored)
            if compare(baseline, manifest(restored, folder / 'restored.json')) or not checker(restored)['ok'] or definitions(restored) != definitions(source):
                raise ValueError('Restored data/definitions/parity differ')
            codec(folder, {'profile': read(restored), 'context': context(restored)})
            verify_history(restored, folder, receipts[source['PGDATABASE']])
            state = sql(restored, 'select public.read_workspace();', user=OWNER)
            sql(restored, "update public.resume_versions set text='Corrupted synthetic history' where id='v1';")
            sql(restored, statement(state['revision'], {'action': 'goal', 'text': 'Refused restored drift'}), user=OWNER, failure='PROJECTION_CONFLICT')
            checker(restored, expected=1)
            if not compare(baseline, manifest(restored, folder / 'corrupted.json')):
                raise ValueError('Restored corruption not detected')
            print('PASS: PG17 exact17populated predecessor/full schema;atomic dirty migration refusal/unchanged rows+definitions+grants+triggers;identical full/upgrade definitions;canonical SQL/exact fact history/legacy compatibility/drift+scope;actual service503/no retry/no snapshot fallback/no domain write except legitimate quota charge;confirmed source and immutable letters preserved;held writer/20commands/1commit/19conflicts;17populated native restore/current codecs/definitions/corruption refusal. Snapshot arrays/legacy remain;synthetic Auth/HTTP/restore,not provider/model/cutover acceptance.')
    except Exception:
        failed = True
        print('FAIL: owned canonical protocol at ' + stage + '; no rows/keys/DB diagnostics printed.', file=sys.stderr)
    finally:
        for name in reversed(created):
            try:
                run(['dropdb', '--if-exists', '--', name], environment)
            except Exception:
                failed = True
                print('FAIL: owned canonical fixture cleanup incomplete.', file=sys.stderr)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
