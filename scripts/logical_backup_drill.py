#!/usr/bin/env python3
"""Current logical/physical manifests in owned PG17 fixtures; not provider restore/cutover."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid
from storage_fixture import mirror_fixture
from backup_manifest import compare, COMBINED_TABLES
from saved_letter_drill import ROOT, OWNER, OTHER, OTHER_SESSION, KEY, literal, run, sql, bridge, accept_statement, verify_history
from source_profile_drill import read, context, codec, manifest
from profile_command_drill import service, source_command, statement
from canonical_reads_drill import definitions
from projection_parity_drill import checker

MIGRATION = 'supabase/migrations/20261028120140_workspace_entity_snapshot.sql'
BASE_SHA256 = 'af944e78bd9dfd03c9b6f56b9877a4fc38fbb933d9b4fcfcabd06a4b19a59780'


def allowed(environment):
    return (environment.get('JOBMATCH_LOCAL_LOGICAL_BACKUPS') == '1'
            and environment.get('PGHOST') in ('127.0.0.1', '::1')
            and not any(environment.get(k) for k in ('PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGOPTIONS')))


def capture(target, path, *, letters=True, profile=True, logical=True, refused=False):
    args = [sys.executable, str(ROOT / 'scripts/backup_manifest.py'), 'snapshot', str(path)]
    if letters:
        args += ['--include-letters']
    if profile:
        args += ['--include-source-profile']
    if logical:
        args += ['--logical-workspaces']
    result = subprocess.run(args, env=target, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=180)
    if refused:
        expected = b'FAIL: cannot complete verification. Check local inputs, PostgreSQL client, connection, privileges and schema.\n'
        if result.returncode != 2 or result.stdout or result.stderr != expected or path.exists():
            raise ValueError('Unavailable logical snapshot did not fail privately without output artifact')
        return None
    if result.returncode or result.stderr or result.stdout != b'Manifest created; no database rows saved.\n' or path.stat().st_mode & 0o777 != 0o600:
        raise ValueError('Manifest CLI failed or emitted diagnostics/unsafe permissions')
    return json.loads(path.read_text())


def main():
    if not allowed(os.environ):
        print('FAIL: explicit owned loopback logical-backup fixture required; overrides refused.', file=sys.stderr)
        return 2
    environment = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10')
    names = ['jobmatch_logical_' + uuid.uuid4().hex for _ in range(3)]
    created, failed, stage = [], False, 'setup'
    try:
        import hashlib
        with tempfile.TemporaryDirectory(prefix='jobmatch-logical-') as temporary:
            folder = Path(temporary)
            full_sql, migration = (ROOT / 'supabase/schema.sql').read_bytes(), (ROOT / MIGRATION).read_bytes()
            if full_sql.count(migration) != 1:
                raise ValueError('Consolidated helper migration differs')
            prefix, suffix = full_sql.split(migration)
            extras = [ROOT / 'supabase/migrations' / name for name in ('20261028120214_compact_workspace_storage.sql','20261101171000_source_versions.sql')]
            if suffix != b''.join(b'\n'+extra.read_bytes() for extra in extras):
                raise ValueError('Unexpected post-helper definitions')
            predecessor = prefix[:-1]
            if hashlib.sha256(predecessor).hexdigest() != BASE_SHA256:
                raise ValueError('Not exact current explicit/canonical/parity/entity/source/letter/quota predecessor')
            (folder / 'base.sql').write_bytes(predecessor)
            for name in names:
                run(['createdb', '--', name], environment)
                created.append(name)
            source, full, restored = [dict(environment, PGDATABASE=n) for n in names]
            stage = 'exact-predecessor-and-full-schema'
            for target, schema in ((source, folder / 'base.sql'), (full, ROOT / 'supabase/schema.sql')):
                for path in (ROOT / 'scripts/restore_fixture.sql', schema, ROOT / 'scripts/restore_seed.sql'):
                    run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(path)], target)
                mirror_fixture(target)
            stage = 'missing-helper-refuses-logical-artifact'
            capture(source, folder / 'missing-helper.json', refused=True)
            receipts = {}
            for target in (source, full):
                stage = 'current-service-source-letter-and-second-owner'
                state = service(target, folder, [{'action': 'analyze'}, {'action': 'version', 'selectAllEdits': True}, {'action': 'restore', 'restoreLatest': True}])['state']
                sql(target, 'grant execute on function private.source_profile_storage_permission() to authenticated;')
                p = source_command(target, folder, {'action': 'add', 'kind': 'employment', 'fields': {'title': {'quote': 'SQL', 'start': 0, 'end': 3}}})
                source_command(target, folder, {'action': 'confirm', 'id': p['entries'][0]['id'], 'confirmed': True})
                sql(target, "insert into private.letter_signing_config(signing_key) values(decode('" + KEY.hex() + "','hex'));")
                receipt = bridge(folder, 'issue', {'workspace': state, 'letterRevision': 0})
                sql(target, accept_statement(receipt, state['revision']), user=OWNER)
                receipts[target['PGDATABASE']] = receipt
                sql(target, 'insert into auth.sessions values(' + literal(OTHER_SESSION) + ',' + literal(OTHER) + ');')
                sql(target, statement(0, {'action': 'import', 'text': 'Other owned source\nUnverified'}), user=OTHER, session=OTHER_SESSION)
                # Administrative historical fixture extras; no production RPC bypass.
                sql(target, "update public.workspaces set payload=jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload||'{\"future_workspace\":{\"keep\":[false,null,\"😀\\r\\n\"]}}','{facts,0,future_fact}','{\"keep\":true}'),'{versions,0,future_version}','[false,null,\"literal\"]'),'{applications,0,future_app}','\"literal\"'),'{applications,0,events,0,future_event}','{\"keep\":true}') where user_id=" + literal(OWNER) + ';do $$begin perform private.project_workspace(' + literal(OWNER) + ',(select payload from public.workspaces where user_id=' + literal(OWNER) + '));end;$$;')
            stage = 'helper-DDL-rollback-and-exact-populated-upgrade'
            before, before_defs = manifest(source, folder / 'before.json'), definitions(source)
            if len(before['tables']) != 17 or not all(t['rows'] > 0 for t in before['tables'].values()) or before['tables']['public.workspaces']['rows'] != 2:
                raise ValueError('All17tables and two workspaces must be populated')
            marker = '\nend;\n$migration$;'
            if migration.decode().count(marker) != 1:
                raise ValueError('Unexpected atomic helper wrapper')
            sql(source, migration.decode().replace(marker, "\nraise exception 'QA_LATE_HELPER';" + marker), failure='QA_LATE_HELPER')
            if compare(before, manifest(source, folder / 'late-rollback.json')) or definitions(source) != before_defs:
                raise ValueError('Failed helper DDL changed data/definitions/grants')
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / MIGRATION)], source)
            for extra in extras:
                run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(extra)], source)
            mirror_fixture(source)
            if compare(before, manifest(source, folder / 'after.json')) or definitions(source) != definitions(full):
                raise ValueError('Helper upgrade changed rows or definitions differ')
            scopes = [(False, False, 13, ''), (True, False, 15, '-letters'), (False, True, 15, '-source'), (True, True, 17, '-letters-source')]
            for target in (source, full):
                stage = 'closed-stable-invoker-helper-and-eight-CLI-scopes'
                sql(target, 'select private.workspace_entities(' + literal(OWNER) + ');', user=OWNER, failure='permission denied')
                props = sql(target, "select jsonb_build_array(prosecdef,provolatile) from pg_proc where oid='private.workspace_entities(uuid)'::regprocedure;")
                if props != [False, 's'] or not checker(target)['ok']:
                    raise ValueError('Helper privilege/volatility/parity differs')
                baseline = manifest(target, folder / ('read-before-' + target['PGDATABASE'] + '.json'))
                for letters, profile, count, suffix in scopes:
                    prefix = target['PGDATABASE'] + suffix
                    raw = capture(target, folder / (prefix + '-raw.json'), letters=letters, profile=profile, logical=False)
                    logical = capture(target, folder / (prefix + '-logical.json'), letters=letters, profile=profile)
                    if raw['format'] != 'jobmatch-backup-manifest' + suffix + '-v1' or logical['format'] != 'jobmatch-backup-logical' + suffix + '-v2' or len(raw['tables']) != count or raw['tables'] != logical['tables']:
                        raise ValueError('Logical scope/row representation/unknown data differs')
                    try:
                        compare(raw, logical)
                    except ValueError:
                        pass
                    else:
                        raise ValueError('Physical and logical formats silently mixed')
                if compare(baseline, manifest(target, folder / ('read-after-' + target['PGDATABASE'] + '.json'))):
                    raise ValueError('Manifest read changed data')
                stage = 'limited-RLS-logical-snapshot-fails-without-artifact'
                sql(target, 'create role qa_logical_limited nologin;grant usage on schema auth,public,private to qa_logical_limited;grant select on ' + ','.join(COMBINED_TABLES) + ' to qa_logical_limited;grant execute on function private.workspace_entities(uuid),private.workspace_projection_report() to qa_logical_limited;')
                try:
                    sql(dict(target, PGOPTIONS='-c role=qa_logical_limited'), 'select private.workspace_projection_report();', failure='PARITY_SCOPE')
                    capture(dict(target, PGOPTIONS='-c role=qa_logical_limited'), folder / ('limited-' + target['PGDATABASE'] + '.json'), refused=True)
                finally:
                    sql(target, 'drop owned by qa_logical_limited;drop role qa_logical_limited;')
                stage = 'current-post-helper-command-and-provenance'
                service(target, folder, [{'action': 'goal', 'text': 'Logical backup role'}, {'action': 'version', 'ids': []}, {'action': 'restore', 'id': 'v1'}])
                codec(folder, {'profile': read(target), 'context': context(target)})
                verify_history(target, folder, receipts[target['PGDATABASE']])
            stage = 'seventeen-populated-native-physical-and-logical-restore'
            raw = capture(source, folder / 'baseline-raw.json', logical=False)
            logical = capture(source, folder / 'baseline-logical.json')
            run(['pg_dump', '-Fc', '-f', str(folder / 'synthetic.dump')], source)
            run(['pg_restore', '--exit-on-error', '--dbname', names[2], str(folder / 'synthetic.dump')], restored)
            if compare(raw, capture(restored, folder / 'restored-raw.json', logical=False)) or compare(logical, capture(restored, folder / 'restored-logical.json')) or definitions(source) != definitions(restored):
                raise ValueError('Restored physical/logical data or definitions differ')
            codec(folder, {'profile': read(restored), 'context': context(restored)})
            verify_history(restored, folder, receipts[source['PGDATABASE']])
            stage = 'physical-mirror-drift-is-not-logical-parity'
            sql(restored, "update public.workspaces set payload=jsonb_set(payload,'{versions,0,text}','\"SENSITIVE_SYNTHETIC_MIRROR\"') where user_id=" + literal(OWNER) + ';')
            if compare(raw, capture(restored, folder / 'mirror-bad-raw.json', logical=False)) != ['public.workspaces'] or compare(logical, capture(restored, folder / 'mirror-bad-logical.json')):
                raise ValueError('Logical view was incorrectly treated as physical mirror')
            checker(restored, expected=1)
            # Explicit reversal of the owned synthetic mirror corruption only.
            sql(restored, "update public.workspaces set payload=(payload-array['facts','versions','applications'])||private.workspace_entities(user_id) where user_id=" + literal(OWNER) + ';')
            if compare(raw, capture(restored, folder / 'mirror-restored-raw.json', logical=False)) or not checker(restored)['ok']:
                raise ValueError('Helper lost unknown fields/order/absence during owned fixture reconstruction')
            stage = 'normalized-value-and-letter-key-corruption-fingerprints'
            sql(restored, "update public.resume_versions set text='SENSITIVE_SYNTHETIC_VERSION' where user_id=" + literal(OWNER) + " and id='v1';")
            if compare(raw, capture(restored, folder / 'value-bad-raw.json', logical=False)) != ['public.resume_versions'] or compare(logical, capture(restored, folder / 'value-bad-logical.json')) != ['public.workspaces', 'public.resume_versions']:
                raise ValueError('Canonical semantic value change escaped fingerprints')
            sql(restored, "update private.letter_signing_config set signing_key=decode(repeat('ac',32),'hex');")
            if 'private.letter_signing_config' not in compare(logical, capture(restored, folder / 'key-bad-logical.json')):
                raise ValueError('Logical scope omitted private letter-key fingerprint')
            print('PASS: MIRROR ROLLBACK COMPATIBILITY; PG17 exact17populated/two-owner predecessor/full schema;closed STABLE invoker helper/DDL rollback/unchanged rows+definitions;missing helper+limited RLS fail without artifact;all8physical/logical13-15-17CLI scopes/read-only600/strict no mixing/unknown scalars+entity extras;actual current commands/source+letter codecs;17populated native dump/restore/physical+logical fingerprints/definitions;physical-only mirror drift not hidden as parity;normalized value+private letter-key corruption detected. No compact cutover;synthetic Auth/HTTP/restore,not provider/RPO/RTO/model acceptance.')
    except Exception:
        failed = True
        print('FAIL: owned logical-backup protocol at ' + stage + '; no rows/keys/DB diagnostics printed.', file=sys.stderr)
    finally:
        for name in reversed(created):
            try:
                run(['dropdb', '--if-exists', '--', name], environment)
            except Exception:
                failed = True
                print('FAIL: owned logical-backup fixture cleanup incomplete.', file=sys.stderr)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
