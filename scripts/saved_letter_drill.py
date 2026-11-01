#!/usr/bin/env python3
"""Synthetic PG17 letter protocol, migration and dump/restore. Never a hosted-provider restore."""
import concurrent.futures
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid
from backup_manifest import snapshot, compare

ROOT = Path(__file__).resolve().parent.parent
OWNER = '11111111-1111-4111-8111-111111111111'
OTHER = '22222222-2222-4222-8222-222222222222'
SESSION = '44444444-4444-4444-8444-444444444444'
OTHER_SESSION = '55555555-5555-4555-8555-555555555555'
KEY = bytes.fromhex('ab' * 32)  # PUBLIC synthetic fixture, never usable as a deployment key.
MIGRATION = 'supabase/migrations/20261101073223_saved_letter_versions.sql'
BASE_SCHEMA_SHA256 = '5d9e4c4185ffc70e78b1d8ed0a6dd3456bd1e9ebd19a2f3e1b90b29bdab02769'


def allowed(environment):
    return (environment.get('JOBMATCH_LOCAL_LETTERS') == '1'
            and environment.get('PGHOST') in ('127.0.0.1', '::1')
            and not any(environment.get(k) for k in ('PGSERVICE', 'PGHOSTADDR', 'PGSERVICEFILE', 'PGOPTIONS')))


def literal(value):
    return "'" + str(value).replace("'", "''") + "'"


def run(command, environment, data=None):
    result = subprocess.run(command, env=environment, input=data, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, timeout=180)
    if result.returncode:
        raise ValueError('Synthetic subprocess failed')
    return result.stdout


def sql(environment, statement, *, user=None, session=SESSION, failure=None, allow_conflict=False):
    prefix = ''
    if user:
        claims = json.dumps({'sub': user, 'session_id': session})
        prefix = "set role authenticated;set request.jwt.claims=" + literal(claims) + ';'
    result = subprocess.run(['psql', '-X', '-q', '-A', '-t', '-w', '-v', 'ON_ERROR_STOP=1'],
                            env=environment, input=(prefix + statement).encode(),
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
    if failure:
        if not result.returncode or failure.encode() not in result.stderr:
            raise ValueError('Expected guarded native refusal')
        return None
    if result.returncode:
        if allow_conflict and b'CONFLICT' in result.stderr:
            return 'CONFLICT'
        raise ValueError('Native SQL failed')
    raw = result.stdout.decode().strip()
    return json.loads(raw) if raw else None


def sign(body):
    payload = json.dumps(body, ensure_ascii=False, separators=(',', ':'))
    signature = hmac.new(KEY, ('jobmatch-letter-receipt-v1\n' + payload).encode(), hashlib.sha256).hexdigest()
    return {'payload': payload, 'signature': signature}


def accept_statement(receipt, workspace_revision=1, letter_revision=0, marker='SAVE_REVIEWED_LETTER_VERSION'):
    return 'select public.accept_saved_letter(' + ','.join((str(workspace_revision), str(letter_revision),
           literal(receipt['payload']), literal(receipt['signature']), literal(marker))) + ');'


def bridge(folder, mode, data):
    input_path, output_path = folder / 'bridge-input.json', folder / 'bridge-output.json'
    input_path.write_text(json.dumps(data, ensure_ascii=False))
    run(['node', str(ROOT / 'tests/fixtures/saved-letter-native.cjs'), mode,
         str(input_path), str(output_path)], dict(os.environ))
    return json.loads(output_path.read_text())


def manifest(environment, destination):
    previous = os.environ.copy()
    try:
        os.environ.update(environment)
        snapshot(destination, include_letters=True)
    finally:
        os.environ.clear()
        os.environ.update(previous)
    return json.loads(destination.read_text())


def verify_history(environment, folder, receipt):
    body = json.loads(receipt['payload'])
    record = sql(environment, 'select public.read_saved_letter(' + literal(body['id']) + ');', user=OWNER)
    state = sql(environment, 'select public.read_saved_letters();', user=OWNER)
    if record['receipt'] != receipt or record['payloadSha256'] != hashlib.sha256(receipt['payload'].encode()).hexdigest():
        raise ValueError('Restored receipt bytes changed')
    if not hmac.compare_digest(record['receipt']['signature'], hmac.new(KEY, ('jobmatch-letter-receipt-v1\n' + record['receipt']['payload']).encode(), hashlib.sha256).hexdigest()):
        raise ValueError('Fixture MAC mismatch')
    if bridge(folder, 'validate', {'ownerId': OWNER, 'record': record, 'state': state}) != {'valid': True}:
        raise ValueError('Production history decoder failed')


def main():
    if not allowed(os.environ):
        print('FAIL: require explicit disposable loopback PostgreSQL; hosted/service overrides refused.', file=sys.stderr)
        return 2
    environment = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10')
    names = ['jobmatch_letters_' + uuid.uuid4().hex for _ in range(3)]
    created, stage, failed = [], 'guard', False
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-letters-') as temporary:
            folder = Path(temporary)
            consolidated = (ROOT / 'supabase/schema.sql').read_bytes()
            migration = (ROOT / MIGRATION).read_bytes()
            if not consolidated.endswith(migration):
                raise ValueError('Consolidated migration suffix differs')
            prefix = consolidated[:-len(migration)]
            if not prefix.endswith(b'\n'):
                raise ValueError('Missing migration separator')
            legacy = prefix[:-1]
            if hashlib.sha256(legacy).hexdigest() != BASE_SCHEMA_SHA256:
                raise ValueError('Incremental fixture is not the pinned main schema')
            (folder / 'legacy.sql').write_bytes(legacy)
            stage = 'create-owned-databases'
            for name in names:
                run(['createdb', '--', name], environment)
                created.append(name)
            source, full, restored = [dict(environment, PGDATABASE=name) for name in names]
            stage = 'full-and-populated-incremental-schema'
            for target, schema in ((source, folder / 'legacy.sql'), (full, ROOT / 'supabase/schema.sql')):
                for path in (ROOT / 'scripts/restore_fixture.sql', schema, ROOT / 'scripts/restore_seed.sql'):
                    run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(path)], target)
            run([sys.executable, str(ROOT / 'scripts/backup_manifest.py'), 'snapshot', str(folder / 'legacy-before.json')], source)
            run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / MIGRATION)], source)
            run([sys.executable, str(ROOT / 'scripts/backup_manifest.py'), 'snapshot', str(folder / 'legacy-after.json')], source)
            if compare(json.loads((folder / 'legacy-before.json').read_text()), json.loads((folder / 'legacy-after.json').read_text())):
                raise ValueError('Migration changed legacy data')
            for target in (source, full):
                # Every known fixture identity has an active, owned session.
                sql(target, "insert into auth.sessions values('" + OTHER_SESSION + "','" + OTHER + "');")
                if sql(target, "select to_jsonb(public.letter_signing_ready('" + hashlib.sha256(KEY).hexdigest() + "'));", user=OWNER) is not False:
                    raise ValueError('New schema seeded a key')
                sql(target, "insert into private.letter_signing_config(signing_key) values(decode('" + KEY.hex() + "','hex'));")
                fixture_claims = "set request.jwt.claims=" + literal(json.dumps({'sub': OWNER, 'session_id': SESSION})) + ';'
                sql(target, fixture_claims + "update public.workspaces set payload=jsonb_set(payload,'{original}',to_jsonb(E'SQL\\r\\nПример 🧑‍💻'::text)) where user_id='" + OWNER + "';")
                workspace = sql(target, 'select public.read_workspace();', user=OWNER)
                receipt = bridge(folder, 'issue', {'workspace': {**workspace, 'ownerId': OWNER}, 'letterRevision': 0})
                result = sql(target, accept_statement(receipt), user=OWNER)
                if result['state']['revision'] != 1 or sql(target, 'select public.read_workspace();', user=OWNER) != workspace:
                    raise ValueError('Letter changed workspace or failed to save')
                verify_history(target, folder, receipt)
            stage = 'native-guards-and-privileges'
            workspace = sql(source, 'select public.read_workspace();', user=OWNER)
            receipt = bridge(folder, 'issue', {'workspace': {**workspace, 'ownerId': OWNER}, 'letterRevision': 1})
            valid = json.loads(receipt['payload'])
            foreign = sql(source, 'select public.read_saved_letters();', user=OTHER, session=OTHER_SESSION)
            if foreign['ownerId'] != OTHER or foreign['revision'] != 0 or foreign['items']:
                raise ValueError('Cross-owner history exposed')
            known_id = sql(source, 'select public.read_saved_letters();', user=OWNER)['items'][0]['id']
            if sql(source, 'select public.read_saved_letter(' + literal(known_id) + ');', user=OTHER, session=OTHER_SESSION) is not None:
                raise ValueError('Cross-owner receipt exposed')
            sql(source, 'set role anon;select public.read_saved_letters();', failure='permission denied')

            for target in (source, full):
                for role in ('anon', 'authenticated', 'service_role'):
                    permissions = sql(target, "select to_jsonb(has_table_privilege('" + role + "','private.letter_signing_config','SELECT') or has_table_privilege('" + role + "','public.saved_letter_versions','INSERT,UPDATE,DELETE')); ")
                    if permissions:
                        raise ValueError('Unexpected key or write grant')
                if sql(target, "select to_jsonb(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('accept_saved_letter','read_saved_letters','read_saved_letter','letter_signing_ready') and p.prosecdef));"):
                    raise ValueError('Public wrapper must be invoker')
                sql(target, 'select * from private.letter_signing_config;', user=OWNER, failure='permission denied')
                sql(target, 'delete from public.saved_letter_versions;', user=OWNER, failure='permission denied')
                sql(target, "update public.saved_letter_versions set signature=signature;", failure='IMMUTABLE_SAVED_LETTER')
            sql(source, accept_statement(receipt, letter_revision=1), user=OTHER, session=OTHER_SESSION, failure='INVALID_WRITE')
            sql(source, accept_statement(receipt, letter_revision=1), user=OWNER, session=OTHER_SESSION, failure='AUTH')
            sql(source, accept_statement({**receipt, 'signature': '00' * 32}, letter_revision=1), user=OWNER, failure='INVALID_WRITE')
            sql(source, accept_statement(receipt, letter_revision=1, marker='yes'), user=OWNER, failure='INVALID_WRITE')
            sql(source, "update public.profile_facts set verified=false where user_id='" + OWNER + "' and id='f1';")
            sql(source, accept_statement(receipt, letter_revision=1), user=OWNER, failure='CONFLICT')
            sql(source, "update public.profile_facts set verified=true where user_id='" + OWNER + "' and id='f1';")
            sql(source, "update public.workspaces set revision=2 where user_id='" + OWNER + "';")
            sql(source, accept_statement(receipt, letter_revision=1), user=OWNER, failure='CONFLICT')
            sql(source, "update public.workspaces set revision=1 where user_id='" + OWNER + "';")

            sql(source, accept_statement(receipt, workspace_revision=2, letter_revision=1), user=OWNER, failure='INVALID_WRITE')
            for change, error in (({'issuedAt': 1, 'expiresAt': 601}, 'INVALID_WRITE'),
                                  ({'source': {**valid['source'], 'originalSha256': '0' * 64}}, 'CONFLICT'),
                                  ({'source': {**valid['source'], 'workspaceRevision': 2}}, 'CONFLICT')):
                changed = sign({**valid, **change})
                sql(source, accept_statement(changed, workspace_revision=2 if 'source' in change and change['source']['workspaceRevision'] == 2 else 1, letter_revision=1), user=OWNER, failure=error)
            changed = json.loads(receipt['payload'])
            changed['snapshot']['source']['facts'][0]['source'] = 'changed'
            sql(source, accept_statement(sign(changed), letter_revision=1), user=OWNER, failure='CONFLICT')
            sql(source, "update private.letter_signing_config set signing_key=decode('" + 'cd' * 32 + "','hex');")
            sql(source, accept_statement(receipt, letter_revision=1), user=OWNER, failure='INVALID_WRITE')
            sql(source, "update private.letter_signing_config set signing_key=decode('" + KEY.hex() + "','hex');")
            # Revocation affects SQL reads independently of the HTTP identity helper.
            sql(source, "delete from auth.sessions where id='" + SESSION + "';")
            sql(source, 'select public.read_saved_letters();', user=OWNER, failure='AUTH')
            sql(source, "select to_jsonb(count(*)) from public.saved_letter_versions;", user=OWNER)
            if sql(source, 'select to_jsonb(count(*)) from public.saved_letter_versions;', user=OWNER) != 0:
                raise ValueError('RLS exposed rows after session revocation')
            sql(source, "insert into auth.sessions values('" + SESSION + "','" + OWNER + "');")
            # A rolled-back acceptance cannot leave a version or audit row behind.
            before = sql(source, 'select to_jsonb(count(*)) from public.audit_log;')
            run(['psql', '-X', '-q', '-w', '-v', 'ON_ERROR_STOP=1'], source,
                ('begin;set local role authenticated;set local request.jwt.claims=' + literal(json.dumps({'sub': OWNER, 'session_id': SESSION})) + ';' + accept_statement(receipt, letter_revision=1) + 'rollback;').encode())
            if sql(source, 'select public.read_saved_letters();', user=OWNER)['revision'] != 1 or sql(source, 'select to_jsonb(count(*)) from public.audit_log;') != before:
                raise ValueError('Rollback left data')
            stage = 'twenty-optimistic-writers'
            statement = accept_statement(receipt, letter_revision=1)
            def writer(_):
                # Exactly one call. Only a native CONFLICT counts as the expected refusal.
                result = sql(source, statement, user=OWNER, allow_conflict=True)
                return 'refusal' if result == 'CONFLICT' else 'commit'
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
                results = list(pool.map(writer, range(20)))
            if results.count('commit') != 1 or results.count('refusal') != 19 or sql(source, 'select public.read_saved_letters();', user=OWNER)['revision'] != 2:
                raise ValueError('Optimistic writer assertion failed')
            # Read history independent of current key and after source edits.
            sql(source, 'delete from private.letter_signing_config;')
            verify_history(source, folder, receipt)
            sql(source, "insert into private.letter_signing_config(signing_key) values(decode('" + KEY.hex() + "','hex'));")
            stage = 'fifty-version-bound-and-cascade'
            # Full-schema fixture fills remaining slots through the real issuer/RPC.
            full_workspace = sql(full, 'select public.read_workspace();', user=OWNER)
            for revision in range(1, 50):
                capped = bridge(folder, 'issue', {'workspace': {**full_workspace, 'ownerId': OWNER}, 'letterRevision': revision})
                sql(full, accept_statement(capped, letter_revision=revision), user=OWNER)
            sql(full, accept_statement(capped, letter_revision=50), user=OWNER, failure='INVALID_WRITE')
            if sql(full, 'select public.read_saved_letters();', user=OWNER)['revision'] != 50:
                raise ValueError('Version cap failed')
            sql(full, "delete from auth.users where id='" + OWNER + "';")
            if sql(full, 'select to_jsonb(count(*)) from public.saved_letter_versions;') != 0:
                raise ValueError('Account cascade left letters')
            stage = 'fifteen-populated-table-dump-restore'
            baseline = manifest(source, folder / 'baseline.json')
            if len(baseline['tables']) != 15 or not all(i['rows'] > 0 for i in baseline['tables'].values()):
                raise ValueError('All fifteen tables must be populated')
            run(['pg_dump', '-Fc', '-f', str(folder / 'synthetic.dump')], source)
            run(['pg_restore', '--exit-on-error', '--dbname', names[2], str(folder / 'synthetic.dump')], restored)
            if compare(baseline, manifest(restored, folder / 'restored.json')):
                raise ValueError('Restored fingerprints differ')
            verify_history(restored, folder, receipt)
            stage = 'intentional-key-and-signature-corruption-detection'
            sql(restored, "update private.letter_signing_config set signing_key=decode('" + 'cd' * 32 + "','hex');")
            if compare(baseline, manifest(restored, folder / 'changed-key.json')) != ['private.letter_signing_config']:
                raise ValueError('Key corruption was not detected')
            sql(restored, "update private.letter_signing_config set signing_key=decode('" + KEY.hex() + "','hex');alter table public.saved_letter_versions disable trigger saved_letter_frozen;update public.saved_letter_versions set signature=repeat('0',64) where id=" + literal(valid['id']) + ';alter table public.saved_letter_versions enable trigger saved_letter_frozen;')
            if compare(baseline, manifest(restored, folder / 'changed-receipt.json')) != ['public.saved_letter_versions']:
                raise ValueError('Receipt corruption was not detected')
            try:
                verify_history(restored, folder, receipt)
                raise RuntimeError('Expected fixture MAC probe refusal')
            except ValueError:
                pass
            print('PASS: PG17 full + populated incremental schema; guarded issuer/RPC/history; 20 writers/1 commit/19 refusals; 50-version bound; account cascade; 15 populated table fingerprints after native dump/restore; key/receipt corruption detected. Synthetic Auth only, not provider restore or capacity acceptance.')
    except (OSError, ValueError, RuntimeError, KeyError, subprocess.SubprocessError):
        print('FAIL: synthetic saved-letter drill at ' + stage + '; no credentials or row data printed.', file=sys.stderr)
        failed = True
    finally:
        for name in reversed(created):
            try:
                run(['dropdb', '--if-exists', '--', name], environment)
            except (OSError, ValueError, subprocess.SubprocessError):
                print('FAIL: remove leftover owned fixture database ' + name, file=sys.stderr)
                failed = True
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
