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
    try:
        for name in names:
            run(['createdb', '--', name], environment)
            created.append(name)
        source = dict(environment, PGDATABASE=names[0])
        target = dict(environment, PGDATABASE=names[1])
        upgrade = dict(environment, PGDATABASE=names[2])
        # anon/authenticated roles must already exist in the disposable cluster.
        for filename in ('scripts/restore_fixture.sql', 'supabase/schema.sql', 'scripts/restore_seed.sql'):
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / filename)], source)
        parity = [sys.executable, str(ROOT / 'scripts/check_projection_parity.py')]
        run(parity, source)
        # Prove the incremental path as well as the consolidated clean install.
        for filename in [ROOT / 'scripts/restore_fixture.sql',
                         *sorted((ROOT / 'supabase/migrations').glob('*.sql')),
                         ROOT / 'scripts/restore_seed.sql']:
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(filename)], upgrade)
        run(parity, upgrade)
        with tempfile.TemporaryDirectory(prefix='jobmatch-drill-') as folder:
            folder = Path(folder)
            baseline, restored, changed = (folder / name for name in ('baseline.json', 'restored.json', 'changed.json'))
            manifest = [sys.executable, str(ROOT / 'scripts/backup_manifest.py')]
            run(manifest + ['snapshot', str(baseline)], source)
            run(['pg_dump', '-Fc', '-f', str(folder / 'synthetic.dump')], source)
            run(['pg_restore', '--exit-on-error', '--dbname', names[1], str(folder / 'synthetic.dump')], target)
            run(manifest + ['snapshot', str(restored)], target)
            run(manifest + ['compare', str(baseline), str(restored)], target)
            run(parity, target)
            # Prove this is a populated backup, not an empty-table coincidence.
            data = json.loads(baseline.read_text())
            if not all(item['rows'] > 0 for item in data['tables'].values()):
                raise ValueError('Fixture must populate all 13 tables')
            for database in (target, upgrade):
                for test in ('fact_history.sql', 'normalized_entities.sql', 'write_gates.sql', 'workspace_commands.sql', 'application_commands.sql', 'profile_commands.sql', 'version_commands.sql', 'projection_parity.sql'):
                    run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / 'supabase/tests' / test)], database)
                run(parity, database)
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
        print('PASS: synthetic PostgreSQL dump/restore, 13 populated tables, 8 SQL suites on restored/incremental databases, projection parity and corruption detection.')
    except (OSError, ValueError, subprocess.SubprocessError):
        print('FAIL: local restore drill failed; no credentials or row data printed.', file=sys.stderr)
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
