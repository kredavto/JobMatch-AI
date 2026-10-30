#!/usr/bin/env python3
"""Disposable consent concurrency/session-lock probe. Never use a hosted database."""
import concurrent.futures
import hashlib
import json
import os
import selectors
import subprocess
import time
import uuid

OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
SESSION = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
CLAIMS = json.dumps({'sub': OWNER, 'session_id': SESSION}, separators=(',', ':'))


def query(sql, expected_error=None):
    env = dict(os.environ)
    env.setdefault('PGCONNECT_TIMEOUT', '5')
    result = subprocess.run(['psql', '-X', '-qAt', '-w', '-v', 'ON_ERROR_STOP=1'],
                            input=sql, text=True, capture_output=True, timeout=10, env=env)
    if result.returncode:
        if expected_error and ('ERROR:  ' + expected_error) in result.stderr:
            return expected_error
        raise ValueError('Synthetic query refused')
    return result.stdout.strip()


def accept(command, expected, version, digest, error='CONFLICT'):
    return query("begin;set local statement_timeout='5s';set local request.jwt.claims='" + CLAIMS +
                 "';set local role authenticated;select public.accept_processing_notice(" +
                 str(expected) + ",'" + command + "','" + version + "','ru','" + digest + "',true);commit;",
                 error)


def main():
    if (os.environ.get('CI') != 'true' or os.environ.get('JOBMATCH_LOCAL_CONSENT_TEST') != '1'
            or os.environ.get('PGHOST') not in ('postgres', '127.0.0.1', '::1')
            or os.environ.get('PGDATABASE') != 'consent_parallel'
            or any(os.environ.get(key) for key in ('PGSERVICE', 'PGHOSTADDR', 'PGSERVICEFILE'))):
        raise ValueError('Disposable CI database required')
    text = 'SYNTHETIC CONCURRENT ONLY 😀\r\nNo legal approval.  '
    material = text.encode('utf8').hex()
    digest = hashlib.sha256(text.encode('utf8')).hexdigest()
    query("insert into auth.users values('" + OWNER + "');insert into auth.sessions values('" + SESSION + "','" + OWNER + "');"
          "insert into private.processing_notices(version,locale,body,sha256,operator_reference,active) values"
          "('synthetic-parallel-v1','ru',convert_from(decode('" + material + "','hex'),'UTF8'),'" + digest + "','CI ONLY',true);")
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(lambda _: accept(str(uuid.uuid4()), 0, 'synthetic-parallel-v1', digest), range(20)))
    admitted = [json.loads(value) for value in results if value != 'CONFLICT']
    if len(admitted) != 1 or results.count('CONFLICT') != 19:
        raise ValueError('Concurrent journal sequence failed')
    receipt = admitted[0]
    if (receipt['ownerId'] != OWNER or receipt['sequence'] != 1 or receipt['notice']['text'] != text
            or hashlib.sha256(receipt['notice']['text'].encode('utf8')).hexdigest() != receipt['notice']['sha256']):
        raise ValueError('Native UTF8 binding failed')
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
        replays = list(pool.map(lambda _: accept(receipt['commandId'], 0, 'synthetic-parallel-v1', digest), range(20)))
    if any(json.loads(value) != receipt for value in replays):
        raise ValueError('Idempotent acknowledgement changed')
    if query('select count(*) from public.processing_consent_receipts') != '1':
        raise ValueError('Replay created records')
    if query('select count(*) from public.workspaces') != '0' or query('select count(*) from public.consent_records') != '0':
        raise ValueError('Implicit workspace/legacy write')
    # A revoker owns the session row before the acceptance request reaches it.
    query("update private.processing_notices set active=false;insert into private.processing_notices(version,locale,body,sha256,operator_reference,active)"
          " values('synthetic-parallel-v2','ru',convert_from(decode('" + material + "','hex'),'UTF8'),'" + digest + "','CI ONLY',true)")
    locker = subprocess.Popen(['psql', '-X', '-qAt', '-w', '-v', 'ON_ERROR_STOP=1'],
                              stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    race_id = str(uuid.uuid4())
    try:
        locker.stdin.write("begin;delete from auth.sessions where id='" + SESSION + "';select 1;\n")
        locker.stdin.flush()
        with selectors.DefaultSelector() as selector:
            selector.register(locker.stdout, selectors.EVENT_READ)
            if not selector.select(5) or locker.stdout.readline().strip() != '1':
                raise ValueError('Session lock fixture unavailable')
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            pending = pool.submit(accept, race_id, 1, 'synthetic-parallel-v2', digest, 'AUTH')
            deadline = time.monotonic() + 5
            locked = False
            while time.monotonic() < deadline:
                locked = query("select exists(select 1 from pg_stat_activity where wait_event_type='Lock' and query like '%" + race_id + "%')") == 't'
                if locked:
                    break
                time.sleep(0.05)
            if not locked:
                raise ValueError('Acceptance did not lock the active session')
            locker.communicate('commit;\n', timeout=5)
            if pending.result(timeout=5) != 'AUTH':
                raise ValueError('Revoked session accepted')
        if query('select count(*) from public.processing_consent_receipts') != '1':
            raise ValueError('Revocation race appended a receipt')
    finally:
        if locker.poll() is None:
            locker.kill()
        locker.wait()
    print('PASS:20 real writers,1 receipt/19 conflicts;20 identical idempotent acknowledgements;native UTF8/Python SHA256;observed session-row lock then revoked-session AUTH, no extra receipt/workspace/legacy rows.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('FAIL: synthetic consent probe; no SQL diagnostics, bodies or credentials emitted.')
        raise SystemExit(1)
