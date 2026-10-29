#!/usr/bin/env python3
"""Revision race for saved tasks on synthetic fixtures only."""
import concurrent.futures
import os
from structured_profile_concurrency import query


def main():
    local = os.environ.get('PGHOST') in ('127.0.0.1', '::1')
    ci = os.environ.get('GITHUB_ACTIONS') == 'true' and os.environ.get('PGHOST') == 'postgres'
    if (os.environ.get('JOBMATCH_LOCAL_STRUCTURED_TEST') != '1' or not (local or ci)
            or not os.environ.get('PGDATABASE', '').startswith('structured_')
            or any(os.environ.get(name) for name in ('PGSERVICE', 'PGHOSTADDR', 'PGSERVICEFILE'))):
        raise ValueError('Disposable fixture opt-in required')
    if query('select count(*) from public.reminder_boards') != '0':
        raise ValueError('Expected pristine task fixture')
    sql = '''
    set request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}';
    set role authenticated;
    do $$begin
      perform public.command_reminder(1,0,'{"action":"create","applicationId":"a1","title":"Synthetic task","description":"No delivery","dueLocal":"2026-10-28T10:30","timeZone":"Europe/Moscow","offsetMinutes":180,"dueAt":"2026-10-28T07:30:00.000Z","minutes":30,"accept":"SAVE_REMINDER"}');
      perform set_config('jobmatch.probe_result','OK',false);
    exception when others then
      if sqlerrm='CONFLICT' then perform set_config('jobmatch.probe_result','CONFLICT',false);else raise;end if;
    end$$;
    select current_setting('jobmatch.probe_result');
    '''
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(lambda _: query(sql), range(20)))
    if results.count('OK') != 1 or results.count('CONFLICT') != 19:
        raise ValueError('Revision race failed')
    for table in ('reminder_boards', 'reminders', 'reminder_events'):
        if query('select count(*) from public.'+table) != '1':
            raise ValueError('Task/event/board duplicated')
    if query("select count(*) from public.audit_log where action='reminder_create'") != '1' or query("select revision from public.workspaces where user_id='11111111-1111-4111-8111-111111111111'") != '1':
        raise ValueError('Audit or workspace mutation')
    print('PASS: twenty real task commands; one task/event/audit/board revision and nineteen conflicts; workspace unchanged.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('FAIL: saved reminder concurrency; no row data or database diagnostics emitted.')
        raise SystemExit(1)
