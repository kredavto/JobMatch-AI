#!/usr/bin/env python3
"""Pinned CLI verification on one disposable loopback DB; never linked/hosted."""
import collections
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

CLI = ['npx', '--yes', '--package=supabase@2.122.0', '--', 'supabase']
# Stock synthetic PostgreSQL on loopback has no TLS. This constant cannot target a hosted database.
URL = 'postgresql://postgres@127.0.0.1:5432/consent_advisors?sslmode=disable'
MIGRATION = '20261030104216_consent_receipts.sql'
FIELDS = {'name', 'title', 'level', 'facing', 'categories', 'description', 'detail', 'remediation', 'cache_key'}


def decode_report(stdout, stderr):
    if not stdout.strip():
        if 'No issues found' not in stderr.splitlines():
            raise ValueError('Incomplete advisor output')
        return []
    rows = json.loads(stdout)
    if not isinstance(rows, list):
        raise ValueError('Unexpected advisor output')
    for row in rows:
        if (not isinstance(row, dict) or not FIELDS <= set(row) or set(row) - FIELDS - {'metadata'}
                or not all(isinstance(row[key], str) for key in FIELDS - {'categories'})
                or row['level'].upper() not in {'INFO', 'WARN', 'ERROR'} or not row['cache_key']
                or not isinstance(row['categories'], list)
                or not all(isinstance(category, str) for category in row['categories'])):
            raise ValueError('Invalid advisor issue')
    if len({row['cache_key'] for row in rows}) != len(rows):
        raise ValueError('Duplicate advisor issues')
    return rows


def main():
    if (os.environ.get('CI') != 'true' or os.environ.get('JOBMATCH_LOCAL_CONSENT_ADVISORS') != '1'
            or os.environ.get('PGHOST') != '127.0.0.1' or os.environ.get('PGPORT') != '5432'
            or any(os.environ.get(name) for name in ('PGSERVICE', 'PGHOSTADDR', 'PGSERVICEFILE',
                                                     'SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_ID', 'SUPABASE_PROFILE'))):
        raise ValueError('Disposable loopback CI required')
    source = Path(__file__).resolve().parent.parent / 'supabase' / 'migrations' / MIGRATION
    with tempfile.TemporaryDirectory(prefix='jobmatch-consent-advisors-') as task_dir:
        def run(*args):
            print('JOBMATCH_LOCAL_CLI_PHASE ' + ' '.join(args[:2]), flush=True)
            result = subprocess.run(CLI + list(args), cwd=task_dir, text=True, stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE, timeout=120)
            if result.returncode:
                # Inputs and database are fixed synthetic CI resources; redact connection/token forms anyway.
                diagnostic = re.sub(r'(?:postgres(?:ql)?://[^\s]+|synthetic-only|sbp_[A-Za-z0-9_]+)', '[REDACTED]', result.stderr)
                print('JOBMATCH_LOCAL_CLI_REFUSAL ' + diagnostic[:1800], flush=True)
                raise ValueError('Local CLI command failed')
            return result
        if run('--version').stdout.strip() != '2.122.0':
            raise ValueError('Unexpected CLI')
        run('--help')
        run('init', '--help')
        for group in [('db', 'advisors'), ('migration', 'up'), ('migration', 'list')]:
            help_text = run(*group, '--help').stdout
            if '--db-url' not in help_text:
                raise ValueError('Unsupported local target')
        run('init')
        def report():
            result = run('db', 'advisors', '--db-url', URL, '--type', 'all', '--level', 'info',
                         '--fail-on', 'none', '--output-format', 'text')
            return decode_report(result.stdout, result.stderr)
        before = report()
        destination = Path(task_dir, 'supabase', 'migrations', MIGRATION)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        run('migration', 'up', '--db-url', URL)
        listed = json.loads(run('migration', 'list', '--db-url', URL, '--output-format', 'json').stdout)
        stamp = MIGRATION.split('_', 1)[0]
        if (not isinstance(listed, dict) or set(listed) != {'migrations', 'message'}
                or listed['message'] != 'Migrations listed'
                or not isinstance(listed['migrations'], list) or len(listed['migrations']) != 1):
            raise ValueError('Unexpected migration list response')
        applied = listed['migrations'][0]
        if (not isinstance(applied, dict) or set(applied) != {'local', 'remote', 'time'}
                or applied['local'] != stamp or applied['remote'] != stamp or not isinstance(applied['time'], str)):
            raise ValueError('Migration list does not confirm local and applied history')
        after = report()
        known = {row['cache_key'] for row in before}
        new = [row for row in after if row['cache_key'] not in known]
        severe = [row for row in new if row['level'].upper() in {'WARN', 'ERROR'}]
        summary = {'before': dict(collections.Counter(row['level'].upper() for row in before)),
                   'after': dict(collections.Counter(row['level'].upper() for row in after)),
                   'new_issue_names': sorted({row['name'] for row in new}),
                   'new_warn_error_names': sorted({row['name'] for row in severe})}
        print('JOBMATCH_LOCAL_ADVISOR_SUMMARY ' + json.dumps(summary, separators=(',', ':')))
        if severe:
            raise ValueError('New warning/error introduced')
    print('PASS: CLI2.122.0 applied the actual migration once, verified local/applied list and compared local advisors before/after; no new WARN/ERROR. Baseline findings are not a hosted/provider acceptance.')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except ValueError as issue:
        print('FAIL: disposable advisor verification: ' + str(issue)[:200])
        raise SystemExit(1)
    except (OSError, KeyError, TypeError, subprocess.SubprocessError):
        print('FAIL: disposable advisor/migration verification incomplete; connection strings and credentials are redacted.')
        raise SystemExit(1)
