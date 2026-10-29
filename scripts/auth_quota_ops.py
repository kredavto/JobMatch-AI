#!/usr/bin/env python3
"""Fixed administrative aggregate/purge queries; never emits DB diagnostics or keys."""
import argparse
import json
import os
import subprocess
import sys

SCOPES = {'credentials', 'mail', 'refresh', 'exchange', 'update'}
MAX_COUNT = 9007199254740991


def integer(value, maximum=MAX_COUNT):
    return type(value) is int and 0 <= value <= maximum


def validate(value, action, limit=500):
    if not isinstance(value, dict) or value.get('version') != 1 or type(value['version']) is not int:
        raise ValueError('Invalid report')
    if action == 'purge':
        if set(value) != {'version', 'deleted_counters', 'deleted_outcomes'} or not all(
                integer(value[name], limit) for name in ('deleted_counters', 'deleted_outcomes')):
            raise ValueError('Invalid purge')
    else:
        if (set(value) != {'version', 'bucket', 'config_present', 'expired_counters', 'expired_outcomes', 'scopes'}
                or type(value['config_present']) is not bool
                or not all(integer(value[name]) for name in ('bucket', 'expired_counters', 'expired_outcomes'))
                or not isinstance(value['scopes'], list) or len(value['scopes']) != 5):
            raise ValueError('Invalid status')
        seen = set()
        for row in value['scopes']:
            if (not isinstance(row, dict) or set(row) != {'scope', 'allowed', 'denied_global', 'denied_subject'}
                    or type(row['scope']) is not str or row['scope'] not in SCOPES or row['scope'] in seen
                    or not all(integer(row[name]) for name in ('allowed', 'denied_global', 'denied_subject'))):
                raise ValueError('Invalid aggregates')
            seen.add(row['scope'])
    return value


def execute(action, limit=500):
    if action not in ('status', 'purge'):
        raise ValueError('Invalid operation')
    if os.environ.get('JOBMATCH_AUTH_QUOTA_OPS_APPROVED') != '1':
        raise ValueError('Explicit administrative operation approval required')
    if action == 'purge' and os.environ.get('JOBMATCH_AUTH_QUOTA_PURGE_APPROVED') != '1':
        raise ValueError('Explicit purge approval required')
    if type(limit) is not int or not 1 <= limit <= 1000:
        raise ValueError('Invalid purge limit')
    query = 'select private.auth_quota_status();' if action == 'status' else f'select private.purge_auth_quotas({limit});'
    transaction = 'begin isolation level repeatable read read only;' if action == 'status' else 'begin;'
    sql = transaction + "set local statement_timeout='5s';set local lock_timeout='2s';set local row_security=off;" + query + "commit;select 'JOBMATCH_OPS_COMPLETE';"
    environment = dict(os.environ)
    environment.setdefault('PGCONNECT_TIMEOUT', '5')
    result = subprocess.run(['psql', '-X', '-q', '-A', '-t', '-w', '-v', 'ON_ERROR_STOP=1'],
                            input=sql, text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                            env=environment, timeout=10, check=True)
    if len(result.stdout) > 65536:
        raise ValueError('Oversized report')
    lines = result.stdout.splitlines()
    if len(lines) != 2 or lines[1] != 'JOBMATCH_OPS_COMPLETE':
        raise ValueError('Incomplete operation')
    return validate(json.loads(lines[0]), action, limit)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('status', 'purge'))
    parser.add_argument('--limit', type=int, default=500)
    args = parser.parse_args()
    try:
        report = execute(args.action, args.limit)
        print(json.dumps(report, separators=(',', ':')))
        return 0
    except (ValueError, TypeError, KeyError, OSError, subprocess.SubprocessError):
        print('FAIL: quota operation refused or incomplete; no DB diagnostics emitted.', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
