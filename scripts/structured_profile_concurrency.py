#!/usr/bin/env python3
"""Concurrent sourced-profile writes against a named disposable fixture database."""
import concurrent.futures
import os
import subprocess


def query(sql):
    result = subprocess.run(['psql', '-X', '-qAt', '-w', '-v', 'ON_ERROR_STOP=1'],
                            input=sql, text=True, capture_output=True, timeout=15, check=True)
    return result.stdout.strip()


def main():
    local = os.environ.get('PGHOST') in ('127.0.0.1', '::1')
    ci = os.environ.get('GITHUB_ACTIONS') == 'true' and os.environ.get('PGHOST') == 'postgres'
    if (os.environ.get('JOBMATCH_LOCAL_STRUCTURED_TEST') != '1' or not (local or ci)
            or not os.environ.get('PGDATABASE', '').startswith('structured_')
            or any(os.environ.get(name) for name in ('PGSERVICE', 'PGHOSTADDR', 'PGSERVICEFILE'))):
        raise ValueError('Disposable fixture opt-in required')
    if query('select count(*) from public.structured_profiles') != '0':
        raise ValueError('Expected pristine profile fixture')
    sql = """
    set request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}';
    set role authenticated;
    do $$begin
      perform public.command_structured_profile(1,0,'{"action":"add","kind":"employment","fields":{"title":{"quote":"SQL","start":0,"end":3}}}');
      perform set_config('jobmatch.probe_result','OK',false);
    exception when others then
      if sqlerrm='CONFLICT' then perform set_config('jobmatch.probe_result','CONFLICT',false);else raise;end if;
    end$$;
    select current_setting('jobmatch.probe_result');
    """
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(lambda _: query(sql), range(20)))
    if results.count('OK') != 1 or results.count('CONFLICT') != 19:
        raise ValueError('Revision isolation failed')
    if query("select revision from public.structured_profiles") != '1':
        raise ValueError('Profile revision failed')
    if query("select count(*) from public.structured_profile_entries where not confirmed") != '1':
        raise ValueError('Unexpected entry/confirmation')
    if query("select revision from public.workspaces where user_id='11111111-1111-4111-8111-111111111111'") != '1':
        raise ValueError('Workspace changed')
    print('PASS: twenty real profile writers, one commit and nineteen conflicts; no workspace mutation or inherited confirmation.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('FAIL: structured-profile concurrency; no database diagnostics or row data emitted.')
        raise SystemExit(1)
