#!/usr/bin/env python3
"""Synthetic dump/restore drill against an explicitly enabled disposable local PostgreSQL."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid

ROOT = Path(__file__).resolve().parent.parent


def run(command, environment, **kwargs):
    subprocess.run(command, env=environment, check=True, stdout=subprocess.DEVNULL,
                   stderr=subprocess.DEVNULL, timeout=180, **kwargs)


def main():
    # Never accept hosted projects, sockets or libpq service/URI overrides here.
    local = os.environ.get('PGHOST') in ('127.0.0.1', '::1')
    ci_service = os.environ.get('GITHUB_ACTIONS') == 'true' and os.environ.get('PGHOST') == 'postgres'
    if (os.environ.get('JOBMATCH_LOCAL_RESTORE') != '1'
            or not (local or ci_service)
            or any(os.environ.get(key) for key in ('PGSERVICE', 'PGHOSTADDR', 'PGSERVICEFILE'))):
        print('FAIL: enable JOBMATCH_LOCAL_RESTORE=1 with a disposable loopback PostgreSQL instance.', file=sys.stderr)
        return 2
    environment = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10')
    names = ['jobmatch_drill_' + uuid.uuid4().hex for _ in range(3)]
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
        migrations = sorted((ROOT / 'supabase/migrations').glob('*.sql'))
        forward = ROOT / 'supabase/migrations/20261028120214_compact_workspace_storage.sql'
        rollback = ROOT / 'supabase/rollback' / forward.name
        boundary = migrations.index(forward)

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

        stage = 'clean compact schema and seed'
        for filename in ('scripts/restore_fixture.sql', 'supabase/schema.sql', 'scripts/restore_seed.sql'):
            sql(source, ROOT / filename, file=True)
        inspect(source, 'compact')
        stage = 'mirror schema and seed'
        for filename in [ROOT / 'scripts/restore_fixture.sql', *migrations[:boundary], ROOT / 'scripts/restore_seed.sql']:
            sql(upgrade, filename, file=True)
        suites(upgrade, 'mirror')
        with tempfile.TemporaryDirectory(prefix='jobmatch-drill-') as folder:
            folder = Path(folder)

            def snapshot(label, database, logical=False):
                path = folder / (label + '.json')
                run(manifest + ['snapshot', str(path)] + (['--logical-workspaces'] if logical else []), database)
                return path

            def compare(left, right):
                run(manifest + ['compare', str(left), str(right)], upgrade)

            def reject(path, database):
                result = subprocess.run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(path)],
                                        env=database, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
                if result.returncode != 3:
                    raise ValueError('Expected atomic migration rejection')

            def late_failure(path, label, database):
                original = path.read_text()
                marker = '\nend;\n$migration$;'
                if original.count(marker) != 1:
                    raise ValueError('Unexpected atomic wrapper')
                failed_sql = folder / (label + '.sql')
                failed_sql.write_text(original.replace(marker, "\n raise exception 'QA_LATE_MIGRATION';" + marker))
                reject(failed_sql, database)

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
            logical = snapshot('written-compact-logical', upgrade, logical=True)
            stage = 'rollback preserving compact writes'
            sql(upgrade, rollback, file=True)
            compare(logical, snapshot('written-mirror-logical', upgrade, logical=True))
            suites(upgrade, 'mirror')
            stage = 'reapply preserving writes'
            sql(upgrade, forward, file=True)
            compare(logical, snapshot('reapplied-logical', upgrade, logical=True))
            suites(upgrade, 'compact')
            stage = 'compact dump and restore'
            baseline = snapshot('source-raw', source)
            run(['pg_dump', '-Fc', '-f', str(folder / 'synthetic.dump')], source)
            run(['pg_restore', '--exit-on-error', '--dbname', names[1], str(folder / 'synthetic.dump')], target)
            compare(baseline, snapshot('restored-raw', target))
            if not all(item['rows'] > 0 for item in json.loads(baseline.read_text())['tables'].values()):
                raise ValueError('All 13 tables must be populated')
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
        print('PASS: compact dump/restore of 13 populated tables; 10 mirror and 8 compact SQL suites; real concurrent writers; logical cutover/rollback/reapply; early/late atomic rejection and content/structural checks.')
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
