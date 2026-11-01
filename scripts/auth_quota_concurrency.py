#!/usr/bin/env python3
"""Synthetic signed RPC concurrency probe. Never point at a hosted database."""
import concurrent.futures
import hashlib
import hmac
import os
import json
import selectors
import subprocess
import time


def query(sql):
    result = subprocess.run(['psql', '-X', '-w', '-At', '-v', 'ON_ERROR_STOP=1'], input=sql,
                            text=True, capture_output=True, timeout=15, check=True)
    return result.stdout.strip()


def main():
    if (os.environ.get('JOBMATCH_LOCAL_AUTH_QUOTA_TEST') != '1'
            or os.environ.get('PGHOST') not in ('127.0.0.1', '::1')
            or any(os.environ.get(k) for k in ('PGSERVICE', 'PGHOSTADDR', 'PGSERVICEFILE', 'PGOPTIONS'))):
        raise ValueError('Disposable loopback opt-in required')
    # Fixed synthetic key in the isolated fixture DB only; no actual secret is read.
    query("insert into private.auth_quota_config(signing_key) values(decode(repeat('a',64),'hex'))")
    # Use a fresh minute with ample budget for all parallel connections.
    if time.time() % 60 > 45:
        raise ValueError('Retry probe early in a minute; no waiting/false pass')
    stamp = int(time.time())
    subject = 'b' * 64
    signature = hmac.new(bytes.fromhex('a' * 64),
                         f'jobmatch-auth-quota-v1\ncredentials\n{subject}\n{stamp}'.encode(),
                         hashlib.sha256).hexdigest()
    sql = f"select public.consume_auth_quota('credentials','{subject}',{stamp},'{signature}');"
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
        values = list(pool.map(lambda _: query(sql), range(20)))
    if values.count('t') != 10 or values.count('f') != 10:
        raise ValueError('Concurrent subject limit failed')
    if query("select count from private.auth_quotas where scope='credentials' and subject='*'") != '20':
        raise ValueError('Global charge failed')
    metrics = query("select allowed::text||':'||denied_subject::text||':'||denied_global::text from private.auth_quota_outcomes where scope='credentials'")
    if metrics != '10:10:0':
        raise ValueError('Concurrent metrics failed')
    # Maintenance must skip an expired row locked by another transaction.
    bucket = int(time.time() // 60) - 1500
    query(f"insert into private.auth_quotas values('mail',repeat('c',64),{bucket},1),('mail',repeat('d',64),{bucket},1)")
    locker = subprocess.Popen(['psql', '-X', '-w', '-qAt', '-v', 'ON_ERROR_STOP=1'],
                              stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                              stderr=subprocess.DEVNULL, text=True)
    try:
        locker.stdin.write(f"begin;select 1 from private.auth_quotas where scope='mail' and subject=repeat('c',64) for update;\n")
        locker.stdin.flush()
        with selectors.DefaultSelector() as selector:
            selector.register(locker.stdout, selectors.EVENT_READ)
            if not selector.select(5) or locker.stdout.readline().strip() != '1':
                raise ValueError('Lock fixture unavailable')
        result = json.loads(query('select private.purge_auth_quotas(2)'))
        if result['deleted_counters'] != 1:
            raise ValueError('Purge did not skip locked expired row')
        if query(f"select count(*) from private.auth_quotas where bucket={bucket}") != '1':
            raise ValueError('Locked fixture unexpectedly removed')
        locker.communicate('rollback;\n', timeout=5)
        if json.loads(query('select private.purge_auth_quotas(2)'))['deleted_counters'] != 1:
            raise ValueError('Unlocked expired row not purged')
    finally:
        if locker.poll() is None:
            locker.kill()
        locker.wait()
    print('PASS: SKIP LOCKED purge, atomic aggregate outcomes; Node-compatible HMAC, 20 real connections, exactly 10 allowed / 10 denied; no Auth calls.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('FAIL: synthetic quota probe; no DB diagnostics or credentials printed.')
        raise SystemExit(1)
