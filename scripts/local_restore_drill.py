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
        stage = 'clean schema and seed'
        for filename in ('scripts/restore_fixture.sql', 'supabase/schema.sql', 'scripts/restore_seed.sql'):
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / filename)], source)
        parity = [sys.executable, str(ROOT / 'scripts/check_projection_parity.py')]
        stage = 'clean parity'
        run(parity, source)
        # Apply the new boundary to populated old storage, not an empty database.
        migrations = sorted((ROOT / 'supabase/migrations').glob('*.sql'))
        boundary = migrations.index(ROOT / 'supabase/migrations/20261028110006_explicit_workspace_writes.sql')
        stage = 'pre-stage schema and seed'
        for filename in [ROOT / 'scripts/restore_fixture.sql', *migrations[:boundary],
                         ROOT / 'scripts/restore_seed.sql']:
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(filename)], upgrade)
        with tempfile.TemporaryDirectory(prefix='jobmatch-drill-') as folder:
            folder = Path(folder)
            baseline, restored, changed = (folder / name for name in ('baseline.json', 'restored.json', 'changed.json'))
            manifest = [sys.executable, str(ROOT / 'scripts/backup_manifest.py')]
            # A failed preflight must leave old data and old function definitions intact.
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-c',
                 "update public.profile_facts set text='Dirty synthetic fact' where id='f1'"], upgrade)
            stage = 'dirty preflight'
            dirty_before, dirty_after = folder / 'dirty-before.json', folder / 'dirty-after.json'
            run(manifest + ['snapshot', str(dirty_before)], upgrade)
            result = subprocess.run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f',
                                     str(migrations[boundary])], env=upgrade,
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
            if result.returncode != 3:
                raise ValueError('Expected migration preflight rejection')
            run(manifest + ['snapshot', str(dirty_after)], upgrade)
            run(manifest + ['compare', str(dirty_before), str(dirty_after)], upgrade)
            # Verify that the pre-stage triggers and commit body survived unchanged in shape.
            old_boundary = [
                'psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-c',
                "do $$begin if (select count(*) from pg_trigger where tgrelid='public.workspaces'::regclass "
                "and tgname in ('workspace_capture_facts','workspace_capture_initial_facts','workspace_sync_entities'))<>3 "
                "or to_regprocedure('private.capture_fact_history()') is null "
                "or to_regprocedure('private.sync_workspace_entities()') is null "
                "or position('private.project_workspace' in pg_get_functiondef('private.commit_workspace(integer,jsonb,text)'::regprocedure))>0 "
                "then raise exception 'Partial migration'; end if; end;$$"]
            stage = 'dirty rollback schema'
            run(old_boundary, upgrade)
            # Explicit synthetic fixture repair; production code has no automatic repair path.
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-c',
                 "update public.profile_facts set text='SQL' where id='f1'"], upgrade)
            stage = 'populated baseline snapshot'
            before_upgrade, after_upgrade = folder / 'before-upgrade.json', folder / 'after-upgrade.json'
            run(manifest + ['snapshot', str(before_upgrade)], upgrade)
            # Force failure AFTER function replacement and trigger/function removal.
            # The migration must be one atomic statement even under psql autocommit.
            stage = 'late migration rollback'
            original_sql = migrations[boundary].read_text()
            marker = '\nend;\n$migration$;'
            if original_sql.count(marker) != 1:
                raise ValueError('Unexpected atomic migration wrapper')
            late_failure = folder / 'late-failure.sql'
            late_failure.write_text(original_sql.replace(
                marker, "\n raise exception 'QA_LATE_MIGRATION';" + marker))
            result = subprocess.run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f',
                                     str(late_failure)], env=upgrade,
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
            if result.returncode != 3:
                raise ValueError('Expected late migration rollback')
            stage = 'late rollback schema and contents'
            run(old_boundary, upgrade)
            after_late_failure = folder / 'after-late-failure.json'
            run(manifest + ['snapshot', str(after_late_failure)], upgrade)
            run(manifest + ['compare', str(before_upgrade), str(after_late_failure)], upgrade)
            stage = 'populated migration'
            for filename in migrations[boundary:]:
                run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(filename)], upgrade)
            stage = 'populated migration contents'
            run(manifest + ['snapshot', str(after_upgrade)], upgrade)
            run(manifest + ['compare', str(before_upgrade), str(after_upgrade)], upgrade)
            stage = 'upgraded parity'
            run(parity, upgrade)
            stage = 'source snapshot'
            run(manifest + ['snapshot', str(baseline)], source)
            stage = 'synthetic dump'
            run(['pg_dump', '-Fc', '-f', str(folder / 'synthetic.dump')], source)
            stage = 'synthetic restore'
            run(['pg_restore', '--exit-on-error', '--dbname', names[1], str(folder / 'synthetic.dump')], target)
            stage = 'restored contents'
            run(manifest + ['snapshot', str(restored)], target)
            run(manifest + ['compare', str(baseline), str(restored)], target)
            stage = 'restored parity'
            run(parity, target)
            # Prove this is a populated backup, not an empty-table coincidence.
            data = json.loads(baseline.read_text())
            if not all(item['rows'] > 0 for item in data['tables'].values()):
                raise ValueError('Fixture must populate all 13 tables')
            for database in (target, upgrade):
                for test in ('fact_history.sql', 'normalized_entities.sql', 'write_gates.sql', 'workspace_commands.sql', 'application_commands.sql', 'profile_commands.sql', 'version_commands.sql', 'projection_parity.sql', 'canonical_workspace.sql', 'explicit_workspace_writes.sql'):
                    stage = 'SQL suite ' + test
                    run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / 'supabase/tests' / test)], database)
                stage = 'post-suite parity'
                run(parity, database)
            stage = 'negative content and parity checks'
            # Same number of rows, changed content: the manifest must detect it.
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-c',
                 "update public.profile_facts set text='Changed synthetic fact' where id='f1'"], target)
            run(manifest + ['snapshot', str(changed)], target)
            result = subprocess.run(manifest + ['compare', str(baseline), str(changed)], env=target,
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
            if result.returncode != 1:
                raise ValueError('Expected detection of changed content')
            result = subprocess.run(parity, env=target, stdout=subprocess.DEVNULL,
                                    stderr=subprocess.DEVNULL, timeout=180)
            if result.returncode != 1:
                raise ValueError('Expected parity mismatch detection')
        print('PASS: synthetic PostgreSQL dump/restore, 13 populated tables, 10 SQL suites on restored/populated-upgrade databases, unchanged migration row hashes, rejected dirty preflight and late migration rollback, projection parity and corruption detection.')
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
