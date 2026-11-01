#!/usr/bin/env python3
"""Synthetic dump/restore drill against an explicitly enabled disposable local PostgreSQL."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid
import hashlib
from saved_letter_drill import sql as pg_sql, OWNER, OTHER, OTHER_SESSION, KEY, literal, bridge, accept_statement, verify_history
from canonical_reads_drill import definitions
from source_profile_drill import read, context, codec
from profile_command_drill import service, source_command

ROOT = Path(__file__).resolve().parent.parent
BASE_SHA256 = 'dd5a8a7af2ab94a39ba315e06e6bb4a41dc28906d606684b76d2ce620e9e3d83'

def allowed(environment):
    return environment.get('JOBMATCH_LOCAL_COMPACT') == '1' and environment.get('PGHOST') in ('127.0.0.1', '::1') and not any(environment.get(k) for k in ('PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS'))

def catalog(environment):
    return {'definitions': definitions(environment), 'constraints': pg_sql(environment, "select coalesce(jsonb_agg(jsonb_build_array(c.relname,p.conname,p.contype,p.convalidated,pg_get_constraintdef(p.oid)) order by c.relname,p.conname),'[]') from pg_constraint p join pg_class c on c.oid=p.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public';")}



def run(command, environment, **kwargs):
    subprocess.run(command, env=environment, check=True, stdout=subprocess.DEVNULL,
                   stderr=subprocess.DEVNULL, timeout=180, **kwargs)



def current_provenance(database, folder, old_receipt):
    from backup_manifest import compare as differences
    from source_profile_drill import manifest as raw_manifest
    p = read(database)
    if p['source_matches']:
        raise ValueError('Transition import silently retargeted reviewed source')
    verify_history(database, folder, old_receipt)
    pg_sql(database, 'revoke execute on function private.source_profile_storage_permission() from authenticated;')
    cleared = source_command(database, folder, {'action':'clear','confirm':'CLEAR_SOURCE_PROFILE_DATA'})
    if cleared['source_captured'] or cleared['entries'] or not pg_sql(database, 'select to_jsonb(source_original is null and source_fact_ids is null) from public.source_profiles where user_id=' + literal(OWNER) + ';'):
        raise ValueError('Explicit revoked-capability cleanup retained source cache')
    pg_sql(database, 'grant execute on function private.source_profile_storage_permission() to authenticated;')
    state = service(database, folder, [{'action':'demo','text':'forged','vacancy':'forged'},
        {'action':'import','text':'SQL\nRust'}, {'action':'fact','text':'Additional owned note'},
        {'action':'vacancy','text':'SQL role'}, {'action':'goal','text':'Current compact role'}])['state']
    source_command(database, folder, {'action':'reset','confirm':'RESET_SOURCE_PROFILE'})
    p = source_command(database, folder, {'action':'add','kind':'employment','fields':{'title':{'quote':'SQL','start':0,'end':3}}})
    source_command(database, folder, {'action':'confirm','id':p['entries'][0]['id'],'confirmed':True})
    if any(f['verified'] for f in pg_sql(database, 'select public.read_workspace();', user=OWNER)['facts']):
        raise ValueError('Structured review implicitly verified legacy facts')
    state = service(database, folder, [{'action':'verify','selectFactContaining':'SQL','verified':True},
        {'action':'analyze'}, {'action':'version','selectAllEdits':True,'score':0,'text':'forged'},
        {'action':'restore','restoreLatest':True}, {'action':'application','title':'Current compact API','status':'Планируется','note':'Literal 😀','resumeVersionId':'v1'}])['state']
    if not state['versions'][-1].get('match_metadata') or not read(database)['source_matches']:
        raise ValueError('Current rules metadata or reviewed source lost')
    fresh = bridge(folder, 'issue', {'workspace':state,'letterRevision':1})
    pg_sql(database, accept_statement(fresh,state['revision'],1), user=OWNER)
    verify_history(database, folder, old_receipt)
    verify_history(database, folder, fresh)
    codec(folder, {'profile':read(database),'context':context(database)})
    # Structural corruption is refused. Canonical value changes have no removed mirror to compare.
    pg_sql(database, "update public.profile_facts set extra=extra||'{\"text\":\"shadowed fixture\"}' where user_id=" + literal(OWNER) + ';')
    before = raw_manifest(database, folder / 'compact-blocked-before.json')
    outcome = service(database, folder, [{'action':'goal','text':'Refused structural write','expectedStatus':503}])
    trace = outcome['results'][0]['trace']
    if len([t for t in trace if t['path']=='/rest/v1/rpc/apply_workspace_command'])!=1 or any(t['path']=='/rest/v1/rpc/save_workspace' for t in trace):
        raise ValueError('Structural refusal retried or used snapshot fallback')
    if any(t!='private.request_quotas' for t in differences(before,raw_manifest(database, folder / 'compact-blocked-after.json'))):
        raise ValueError('Structural refusal changed domain/history/provenance')
    # Only this deliberately corrupted owned fixture is repaired explicitly.
    pg_sql(database, "update public.profile_facts set extra=extra-'text' where user_id=" + literal(OWNER) + ';')
    return fresh


def verify_provenance(database, folder, receipts):
    codec(folder, {'profile':read(database),'context':context(database)})
    for receipt in receipts:
        verify_history(database, folder, receipt)


def main():
    if not allowed(os.environ):
        print('FAIL: enable owned compact loopback fixture; overrides refused.', file=sys.stderr)
        return 2
    environment = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10')
    names = ['jobmatch_compact_' + uuid.uuid4().hex for _ in range(3)]
    created = []
    failed = False
    stage = 'create disposable databases'
    try:
        for name in names:
            run(['createdb', '--', name], environment)
            created.append(name)
        source = dict(environment, PGDATABASE=names[0])
        target = dict(environment, PGDATABASE=names[1])
        upgrade = dict(environment, PGDATABASE=names[2])
        # anon/authenticated roles must already exist in the disposable cluster.
        mirror_tests = ('fact_history', 'normalized_entities', 'write_gates', 'workspace_commands',
                        'application_commands', 'profile_commands', 'version_commands',
                        'projection_parity', 'canonical_workspace', 'explicit_workspace_writes')
        compact_tests = ('fact_history', 'write_gates', 'workspace_commands', 'application_commands',
                         'profile_commands', 'version_commands', 'compact_workspace', 'compact_write_failures')
        parity = [sys.executable, str(ROOT / 'scripts/check_projection_parity.py')]
        manifest = [sys.executable, str(ROOT / 'scripts/backup_manifest.py')]
        receipts = {}
        forward = ROOT / 'supabase/migrations/20261028120214_compact_workspace_storage.sql'
        rollback = ROOT / 'supabase/rollback' / forward.name
        consolidated = (ROOT / 'supabase/schema.sql').read_bytes()
        migration = forward.read_bytes()
        if consolidated.count(migration) != 1 or not consolidated.endswith(migration):
            raise ValueError('Unexpected consolidated compact migration')
        predecessor = consolidated[:-len(migration)-1]
        if hashlib.sha256(predecessor).hexdigest() != BASE_SHA256:
            raise ValueError('Not exact current logical/source/letter/entity/quota predecessor')

        def sql(database, value, file=False):
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f' if file else '-c', str(value)], database)

        def inspect(database, mode):
            run(parity + ['--expect-format', mode], database)

        def suites(database, mode):
            nonlocal stage
            for test in compact_tests if mode == 'compact' else mirror_tests:
                stage = mode + ' SQL suite ' + test
                sql(database, ROOT / 'supabase/tests' / (test + '.sql'), file=True)
            stage = mode + ' concurrent writers'
            subprocess.run([sys.executable, str(ROOT / 'scripts/check_workspace_concurrency.py')],
                           env=database, check=True, stdout=subprocess.DEVNULL, timeout=90)
            stage = mode + ' post-suite report'
            inspect(database, mode)

        def seed_provenance(database):
            with tempfile.TemporaryDirectory(prefix='jobmatch-compact-provenance-') as temp:
                owned = Path(temp)
                pg_sql(database, 'grant execute on function private.source_profile_storage_permission() to authenticated;')
                p = source_command(database, owned, {'action': 'add', 'kind': 'employment', 'fields': {'title': {'quote': 'SQL','start':0,'end':3}}})
                source_command(database, owned, {'action':'confirm','id':p['entries'][0]['id'],'confirmed':True})
                pg_sql(database, "insert into private.letter_signing_config(signing_key) values(decode('" + KEY.hex() + "','hex'));")
                w = pg_sql(database, 'select public.read_workspace();', user=OWNER)
                receipt = bridge(owned, 'issue', {'workspace': {**w,'ownerId':OWNER}, 'letterRevision':0})
                pg_sql(database, accept_statement(receipt, w['revision']), user=OWNER)
                receipts[database['PGDATABASE']] = receipt
                pg_sql(database, "update public.workspaces set payload=payload||'{\"future_workspace\":{\"keep\":[false,null,\"literal\"]}}' where user_id=" + literal(OWNER) + ";update public.profile_facts set extra=extra||'{\"future_fact\":true}' where user_id=" + literal(OWNER) + ";update public.resume_versions set extra=extra||'{\"future_version\":[false,null]}' where user_id=" + literal(OWNER) + ";update public.applications set extra=extra||'{\"future_app\":\"literal\"}' where user_id=" + literal(OWNER) + ";update public.application_events set extra=extra||'{\"future_event\":true}' where user_id=" + literal(OWNER) + ";update public.workspaces set payload=case when payload ? 'facts' then payload||private.workspace_entities(user_id) else payload end where user_id=" + literal(OWNER) + ';')

        stage = 'clean compact schema and seed'
        for filename in ('scripts/restore_fixture.sql', 'supabase/schema.sql', 'scripts/restore_seed.sql'):
            sql(source, ROOT / filename, file=True)
        inspect(source, 'compact')
        seed_provenance(source)
        stage = 'mirror schema and seed'
        with tempfile.NamedTemporaryFile(suffix='.sql') as prefix_file:
            prefix_file.write(predecessor);prefix_file.flush()
            for filename in [ROOT / 'scripts/restore_fixture.sql', Path(prefix_file.name), ROOT / 'scripts/restore_seed.sql']:
                sql(upgrade, filename, file=True)
        seed_provenance(upgrade)
        if catalog(source) == catalog(upgrade):
            raise ValueError('Mirror and compact definitions unexpectedly identical')
        suites(upgrade, 'mirror')
        with tempfile.TemporaryDirectory(prefix='jobmatch-drill-') as folder:
            folder = Path(folder)

            def snapshot(label, database, logical=False):
                path = folder / (label + '.json')
                run(manifest + ['snapshot', str(path), '--include-letters', '--include-source-profile'] + (['--logical-workspaces'] if logical else []), database)
                return path

            def compare(left, right):
                run(manifest + ['compare', str(left), str(right)], upgrade)

            def reject(path, database, expected='PROJECTION_CONFLICT'):
                before_definitions = catalog(database)
                result = subprocess.run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(path)],
                                        env=database, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=180)
                if result.returncode != 3 or expected.encode() not in result.stderr or catalog(database) != before_definitions:
                    raise ValueError('Expected atomic migration rejection')

            def late_failure(path, label, database):
                original = path.read_text()
                marker = '\nend;\n$migration$;'
                if original.count(marker) != 1:
                    raise ValueError('Unexpected atomic wrapper')
                failed_sql = folder / (label + '.sql')
                failed_sql.write_text(original.replace(marker, "\n raise exception 'QA_LATE_MIGRATION';" + marker))
                reject(failed_sql, database, expected='QA_LATE_MIGRATION')

            stage = 'unexpected trigger cutover rejection'
            sql(upgrade, "create function private.qa_cutover_trigger() returns trigger language plpgsql set search_path='' as $$begin return new;end;$$; "
                         "revoke all on function private.qa_cutover_trigger() from public,anon,authenticated; "
                         "create trigger qa_cutover before update on public.workspaces for each row execute function private.qa_cutover_trigger()")
            before = snapshot('trigger-before', upgrade)
            reject(forward, upgrade)
            compare(before, snapshot('trigger-after', upgrade))
            sql(upgrade, 'drop trigger qa_cutover on public.workspaces; drop function private.qa_cutover_trigger()')
            stage = 'dirty mirror cutover rejection'
            sql(upgrade, "update public.profile_facts set text='Dirty fixture' where id='f1'")
            before = snapshot('dirty-mirror-before', upgrade)
            reject(forward, upgrade)
            compare(before, snapshot('dirty-mirror-after', upgrade))
            sql(upgrade, "update public.profile_facts set text='SQL' where id='f1'")
            stage = 'late cutover rollback'
            baseline = snapshot('mirror-raw', upgrade)
            logical = snapshot('mirror-logical', upgrade, logical=True)
            late_failure(forward, 'failed-forward', upgrade)
            compare(baseline, snapshot('failed-forward-raw', upgrade))
            inspect(upgrade, 'mirror')
            stage = 'populated compact cutover'
            sql(upgrade, forward, file=True)
            compare(logical, snapshot('compact-logical', upgrade, logical=True))
            if catalog(upgrade) != catalog(source):
                raise ValueError('Clean and upgraded compact definitions/ACL/constraints differ')
            compact_raw = snapshot('compact-raw', upgrade)
            from backup_manifest import compare as differences
            if differences(json.loads(baseline.read_text()), json.loads(compact_raw.read_text())) != ['public.workspaces']:
                raise ValueError('Only raw workspace storage may change')
            suites(upgrade, 'compact')
            stage = 'dirty compact rollback rejection'
            sql(upgrade, "update public.profile_facts set position=10 where id='f1'")
            before = snapshot('dirty-compact-before', upgrade)
            reject(rollback, upgrade)
            compare(before, snapshot('dirty-compact-after', upgrade))
            sql(upgrade, "update public.profile_facts set position=1 where id='f1'")
            stage = 'late rollback atomicity'
            before = snapshot('before-failed-rollback', upgrade)
            late_failure(rollback, 'failed-rollback', upgrade)
            compare(before, snapshot('after-failed-rollback', upgrade))
            inspect(upgrade, 'compact')
            stage = 'exact raw rollback before new writes'
            sql(upgrade, rollback, file=True)
            compare(baseline, snapshot('exact-mirror-rollback', upgrade))
            inspect(upgrade, 'mirror')
            sql(upgrade, forward, file=True)
            compare(compact_raw, snapshot('exact-compact-reapply', upgrade))
            stage = 'persistent compact commands and legacy writer'
            sql(upgrade, ROOT / 'scripts/compact_transition_writes.sql', file=True)
            fresh_receipt = current_provenance(upgrade, folder, receipts[upgrade['PGDATABASE']])
            logical = snapshot('written-compact-logical', upgrade, logical=True)
            stage = 'rollback preserving compact writes'
            sql(upgrade, rollback, file=True)
            compare(logical, snapshot('written-mirror-logical', upgrade, logical=True))
            suites(upgrade, 'mirror')
            verify_provenance(upgrade, folder, [receipts[upgrade['PGDATABASE']],fresh_receipt])
            stage = 'reapply preserving writes'
            sql(upgrade, forward, file=True)
            compare(logical, snapshot('reapplied-logical', upgrade, logical=True))
            suites(upgrade, 'compact')
            verify_provenance(upgrade, folder, [receipts[upgrade['PGDATABASE']],fresh_receipt])
            stage = 'compact dump and restore'
            baseline = snapshot('source-raw', source)
            run(['pg_dump', '-Fc', '-f', str(folder / 'synthetic.dump')], source)
            run(['pg_restore', '--exit-on-error', '--dbname', names[1], str(folder / 'synthetic.dump')], target)
            compare(baseline, snapshot('restored-raw', target))
            if not all(item['rows'] > 0 for item in json.loads(baseline.read_text())['tables'].values()):
                raise ValueError('All17tables must be populated')
            with tempfile.TemporaryDirectory(prefix='jobmatch-compact-restored-') as temp:
                owned = Path(temp)
                codec(owned, {'profile':read(target),'context':context(target)})
                verify_history(target, owned, receipts[source['PGDATABASE']])
            suites(target, 'compact')
            stage = 'value corruption fingerprints and structural report distinction'
            sql(target, "update public.profile_facts set text='Changed synthetic fact' where id='f1'")
            changed = snapshot('changed-value', target)
            result = subprocess.run(manifest + ['compare', str(baseline), str(changed)], env=target,
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
            if result.returncode != 1:
                raise ValueError('Expected content mismatch')
            inspect(target, 'compact')  # Valid canonical values have no duplicate mirror to compare.
            stage = 'structural corruption detection'
            sql(target, "update public.profile_facts set position=10 where id='f1'")
            result = subprocess.run(parity + ['--expect-format', 'compact'], env=target,
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
            if result.returncode != 1:
                raise ValueError('Expected structural mismatch')
        print('PASS: current HTTP9commands/rules metadata/source cache stale then revoked-capability cleanup/independent confirmation+verification/old+new immutable receipts/structural503 no replay; current compact dump/restore of17populated tables; 10 mirror and 8 compact SQL suites; real concurrent writers; logical cutover/rollback/reapply; early/late atomic rejection and content/structural checks.')
    except (OSError, ValueError, subprocess.SubprocessError):
        print('FAIL: local restore drill failed at ' + stage + '; no credentials or row data printed.', file=sys.stderr)
        failed = True
    finally:
        for name in reversed(created):
            try:
                run(['dropdb', '--if-exists', '--', name], environment)
            except (OSError, subprocess.SubprocessError):
                print('FAIL: remove leftover synthetic database ' + name, file=sys.stderr)
                failed = True
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
