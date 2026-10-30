#!/usr/bin/env python3
"""Create one empty local migration using CLI discovery. No login/link/remote/DB commands."""
import os
from pathlib import Path
import re
import subprocess
import tempfile

CLI = ['npx', '--yes', '--package=supabase@2.122.0', '--', 'supabase']


def main():
    if os.environ.get('CI') != 'true':
        raise ValueError('Disposable CI opt-in required')
    with tempfile.TemporaryDirectory(prefix='jobmatch-ordinary-english-migration-') as task_dir:
        def run(*args):
            result = subprocess.run(CLI + list(args), cwd=task_dir, text=True,
                                    stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                    timeout=120, check=True)
            return result.stdout
        version = run('--version').strip()
        if version != '2.122.0':
            raise ValueError('Unexpected CLI version')
        print('JOBMATCH_SUPABASE_CLI_VERSION ' + version, flush=True)
        for args in [('--help',), ('init', '--help'), ('migration', '--help'),
                     ('migration', 'new', '--help'), ('db', '--help')]:
            print(run(*args), flush=True)
        run('init')
        run('migration', 'new', 'ordinary_english_versions')
        migrations = list(Path(task_dir, 'supabase', 'migrations').glob('*.sql'))
        if len(migrations) != 1 or not re.fullmatch(r'[0-9]{14}_ordinary_english_versions\.sql', migrations[0].name):
            raise ValueError('Unexpected generated migration')
        if migrations[0].read_bytes().strip():
            raise ValueError('Expected a newly created empty migration')
        print('JOBMATCH_CLI_GENERATED_MIGRATION ' + migrations[0].name, flush=True)
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (OSError, ValueError, subprocess.SubprocessError):
        print('FAIL: local CLI migration bootstrap refused/incomplete; no credentials or DB used.')
        raise SystemExit(1)
