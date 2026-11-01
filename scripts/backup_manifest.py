#!/usr/bin/env python3
"""Read-only fingerprints of a restored JobMatch database. No row data is saved."""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

TABLES = (
    'auth.users', 'auth.identities', 'auth.sessions', 'auth.refresh_tokens',
    'public.workspaces', 'public.profile_facts', 'public.resume_versions',
    'public.applications', 'public.application_events', 'public.fact_history',
    'public.audit_log', 'public.consent_records', 'private.request_quotas',
)

LETTER_TABLES = TABLES + ('public.saved_letter_versions', 'private.letter_signing_config')
SOURCE_TABLES = TABLES + ('public.source_profiles', 'public.source_profile_entries')
COMBINED_TABLES = LETTER_TABLES + ('public.source_profiles', 'public.source_profile_entries')
FORMATS = {'jobmatch-backup-manifest-v1': TABLES, 'jobmatch-backup-manifest-letters-v1': LETTER_TABLES,
           'jobmatch-backup-manifest-source-v1': SOURCE_TABLES, 'jobmatch-backup-manifest-letters-source-v1': COMBINED_TABLES}

LOGICAL_FORMATS = {name.replace('manifest', 'logical').replace('-v1', '-v2'): tables for name, tables in FORMATS.items()}
FORMATS.update(LOGICAL_FORMATS)


def fingerprint(lines):
    digest = hashlib.sha256()
    count = 0
    for line in lines:
        # psql emits exactly one JSON string per row, including escaped newlines.
        digest.update(line)
        count += 1
    return {'rows': count, 'sha256': digest.hexdigest()}


def snapshot(output, include_letters=False, include_source_profile=False, logical_workspaces=False):
    format_name = ('jobmatch-backup-manifest-letters-source-v1' if include_letters else 'jobmatch-backup-manifest-source-v1') if include_source_profile else ('jobmatch-backup-manifest-letters-v1' if include_letters else 'jobmatch-backup-manifest-v1')
    if logical_workspaces:
        format_name = format_name.replace('manifest', 'logical').replace('-v1', '-v2')
    selected = FORMATS[format_name]
    # Use standard PG* environment / PGSERVICE and .pgpass. Never place passwords
    # in command-line arguments or echo database errors (which can contain PII).
    statements = ['BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;',
                  "SET LOCAL statement_timeout = '120s';",
                  "SET LOCAL timezone = 'UTC';", "SET LOCAL row_security = off;",
                  "SET LOCAL client_encoding = 'UTF8';", "SET LOCAL DateStyle = 'ISO, YMD';",
                  "SET LOCAL bytea_output = 'hex';"]
    for table in selected:
        statements.append(f"SELECT 'JOBMATCH_TABLE:{table}';")
        source = table
        if logical_workspaces and table == 'public.workspaces':
            source = "(SELECT w.user_id,w.revision,(w.payload-ARRAY['facts','versions','applications']) " \
                     "|| private.workspace_entities(w.user_id) AS payload,w.updated_at FROM public.workspaces w)"
        statements.append(f'SELECT row_to_json(t)::text FROM {source} t ORDER BY row_to_json(t)::text COLLATE "C";')
    statements.extend(['COMMIT;', "SELECT 'JOBMATCH_COMPLETE';"])
    environment = dict(os.environ)
    environment.setdefault('PGCONNECT_TIMEOUT', '15')
    process = subprocess.Popen(['psql', '-X', '-q', '-A', '-t', '-w', '-v', 'ON_ERROR_STOP=1'],
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.DEVNULL, env=environment)
    tables = {}
    current = None
    digest = None
    count = 0
    complete = False
    try:
        process.stdin.write(('\n'.join(statements) + '\n').encode())
        process.stdin.close()
        for line in process.stdout:
            if complete:
                raise ValueError('Unexpected output after completion')
            if line == b'JOBMATCH_COMPLETE\n':
                complete = True
                continue
            if line.startswith(b'JOBMATCH_TABLE:'):
                if current is not None:
                    tables[current] = {'rows': count, 'sha256': digest.hexdigest()}
                name = line.decode().strip().split(':', 1)[1]
                expected = selected[len(tables)] if len(tables) < len(selected) else None
                if name != expected:
                    raise ValueError('Unexpected or duplicate table')
                current = name
                digest = hashlib.sha256()
                count = 0
            elif current is not None:
                digest.update(line)
                count += 1
            else:
                raise ValueError('Unexpected database output')
        if current is not None:
            tables[current] = {'rows': count, 'sha256': digest.hexdigest()}
        if process.wait() != 0 or not complete or set(tables) != set(selected):
            raise ValueError('Database snapshot failed; check connection, privileges and schema locally')
        report = {'format': format_name,
                  'created_at': datetime.now(timezone.utc).isoformat(), 'tables': tables}
        # Publish a complete file atomically, without overwriting a baseline.
        destination = os.path.abspath(output)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', dir=os.path.dirname(destination),
                                             prefix='.jobmatch-manifest-', delete=False) as handle:
                temporary = handle.name
                json.dump(report, handle, indent=2)
                handle.write('\n')
                handle.flush()
                os.fsync(handle.fileno())
            os.link(temporary, destination)
        finally:
            if temporary is not None:
                os.unlink(temporary)
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()
        process.stdout.close()
        if not process.stdin.closed:
            process.stdin.close()


def compare(baseline, restored):
    for manifest in (baseline, restored):
        if not isinstance(manifest, dict) or not isinstance(manifest.get('tables'), dict):
            raise ValueError('Invalid manifest')
        if manifest.get('format') not in FORMATS or set(manifest.get('tables', {})) != set(FORMATS[manifest['format']]):
            raise ValueError('Invalid or incomplete manifest')
        for item in manifest['tables'].values():
            if not isinstance(item, dict):
                raise ValueError('Invalid table fingerprint')
            if (set(item) != {'rows', 'sha256'} or type(item['rows']) is not int or item['rows'] < 0
                    or not isinstance(item['sha256'], str) or len(item['sha256']) != 64
                    or any(c not in '0123456789abcdef' for c in item['sha256'])):
                raise ValueError('Invalid table fingerprint')
    if baseline['format'] != restored['format']:
        raise ValueError('Manifest scopes differ')
    return [table for table in FORMATS[baseline['format']] if baseline['tables'][table] != restored['tables'][table]]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    capture = commands.add_parser('snapshot')
    capture.add_argument('output')
    capture.add_argument('--include-letters', action='store_true', help='Include saved versions and private signing config; fingerprints only')
    capture.add_argument('--include-source-profile', action='store_true', help='Include source profile tables; combine with --include-letters for the 17-table scope')
    capture.add_argument('--logical-workspaces', action='store_true', help='Explicit normalized entity reconstruction; never mix with physical manifest formats')
    check = commands.add_parser('compare')
    check.add_argument('baseline')
    check.add_argument('restored')
    args = parser.parse_args()
    try:
        if args.command == 'snapshot':
            snapshot(args.output, args.include_letters, args.include_source_profile, args.logical_workspaces)
            print('Manifest created; no database rows saved.')
        else:
            with open(args.baseline) as handle:
                baseline = json.load(handle)
            with open(args.restored) as handle:
                restored = json.load(handle)
            differences = compare(baseline, restored)
            if differences:
                print('FAIL: differing tables: ' + ', '.join(differences))
                return 1
            print(f"PASS: all {len(baseline['tables'])} table fingerprints match. Schema/RLS and Auth delivery still require separate checks.")
    except (OSError, ValueError):
        print('FAIL: cannot complete verification. Check local inputs, PostgreSQL client, connection, privileges and schema.', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
