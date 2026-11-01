#!/usr/bin/env python3
"""Read-only parity preflight for JobMatch snapshots and normalized entities; counts only."""
import json
import os
import subprocess
import sys

CHECKED = {'workspaces', 'profile_facts', 'resume_versions', 'applications', 'application_events'}
MISMATCHES = {'facts', 'versions', 'applications', 'payload_rows', 'position_rows',
              'extra_rows', 'orphan_rows', 'link_rows'}
COMPLETE = 'JOBMATCH_PARITY_COMPLETE'
SQL = """BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '120s';
SET LOCAL client_encoding = 'UTF8';
SET LOCAL row_security = off;
SELECT private.workspace_projection_report()::text;
COMMIT;
SELECT 'JOBMATCH_PARITY_COMPLETE';
"""


def validate(report):
    if (not isinstance(report, dict) or set(report) != {'format', 'checked', 'mismatches', 'ok'}
            or report['format'] != 'jobmatch-projection-parity-v1' or type(report['ok']) is not bool):
        raise ValueError('Invalid parity report')
    for key, names in (('checked', CHECKED), ('mismatches', MISMATCHES)):
        counts = report[key]
        if (not isinstance(counts, dict) or set(counts) != names
                or any(type(value) is not int or not 0 <= value <= 9223372036854775807
                       for value in counts.values())):
            raise ValueError('Invalid parity counts')
    if report['ok'] != all(value == 0 for value in report['mismatches'].values()):
        raise ValueError('Inconsistent parity status')
    return report


def check():
    # PG* / PGSERVICE / .pgpass only: passwords never enter arguments or output.
    environment = dict(os.environ)
    environment.setdefault('PGCONNECT_TIMEOUT', '15')
    result = subprocess.run(['psql', '-X', '-q', '-A', '-t', '-w', '-v', 'ON_ERROR_STOP=1'],
                            input=SQL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                            env=environment, text=True, encoding='utf-8', timeout=140, check=False)
    if result.returncode != 0 or len(result.stdout) > 16384:
        raise ValueError('Parity query failed')
    lines = result.stdout.splitlines()
    if len(lines) != 2 or lines[-1] != COMPLETE:
        raise ValueError('Incomplete parity query')
    return validate(json.loads(lines[0]))


def main():
    try:
        report = check()
        print(json.dumps(report, sort_keys=True))
        return 0 if report['ok'] else 1
    except (OSError, ValueError, subprocess.SubprocessError):
        # Database diagnostics and unexpected stdout can contain personal data.
        print('FAIL: parity check unavailable. Check client, connection, full-read privileges and migration locally.', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
