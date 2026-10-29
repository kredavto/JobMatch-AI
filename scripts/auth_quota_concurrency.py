#!/usr/bin/env python3
"""Synthetic signed RPC concurrency probe. Never point at a hosted database."""
import concurrent.futures
import hashlib
import hmac
import os
import subprocess
import time


def query(sql):
    result = subprocess.run(['psql', '-X', '-w', '-At', '-v', 'ON_ERROR_STOP=1'], input=sql,
                            text=True, capture_output=True, timeout=15, check=True)
    return result.stdout.strip()


def main():
    if (os.environ.get('JOBMATCH_LOCAL_AUTH_QUOTA_TEST') != '1'
            or os.environ.get('PGHOST') not in ('127.0.0.1', '::1')
            or any(os.environ.get(k) for k in ('PGSERVICE', 'PGHOSTADDR', 'PGSERVICEFILE'))):
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
    print('PASS: Node-compatible HMAC, 20 real connections, exactly 10 allowed / 10 denied; no Auth calls.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('FAIL: synthetic quota probe; no DB diagnostics or credentials printed.')
        raise SystemExit(1)
