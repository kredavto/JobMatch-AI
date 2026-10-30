#!/usr/bin/env python3
"""Twenty real version writers on fixed disposable synthetic source; no network/provider requests."""
import concurrent.futures
import json
import os
from structured_profile_concurrency import query

CLAIMS = '''set request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}';set role authenticated;'''
COMMAND = '{"action":"version","template_version":"ordinary-literal-en-v1","evidence_ids":["f1"],"score":100,"match_metadata":{"rules_revision":"rules-2026-10-25.1","weights":{"mandatory":35,"experience":25,"skills":20,"context":10,"clarity":10},"contributions":{"matched":1,"partial":0.5,"missing":0,"unknown":0},"requirements":1,"outcomes":{"matched":1,"partial":0,"missing":0,"unknown":0}}}'


def main():
    if (os.environ.get('CI') != 'true' or os.environ.get('GITHUB_ACTIONS') != 'true'
            or os.environ.get('PGHOST') != 'postgres'
            or os.environ.get('PGDATABASE') != 'ordinary_english_parallel'
            or os.environ.get('JOBMATCH_LOCAL_ORDINARY_ENGLISH_TEST') != '1'
            or any(os.environ.get(name) for name in ('PGSERVICE', 'PGHOSTADDR', 'PGSERVICEFILE'))):
        raise ValueError('Fixed disposable CI fixture required')
    before = query("select md5(to_jsonb(v)::text) from public.resume_versions v where id='v1'")
    sql = CLAIMS + """do $$begin
      perform public.apply_workspace_command(1,'""" + COMMAND + """'::jsonb);
      perform set_config('jobmatch.ordinary_result','OK',false);
    exception when others then
      if sqlerrm='CONFLICT' then perform set_config('jobmatch.ordinary_result','CONFLICT',false);else raise;end if;
    end$$;select current_setting('jobmatch.ordinary_result');"""
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(lambda _: query(sql), range(20)))
    if results.count('OK') != 1 or results.count('CONFLICT') != 19:
        raise ValueError('Revision isolation failed')
    state = json.loads(query(CLAIMS + 'select public.read_workspace();'))
    version = state['versions'][-1]
    if (state['revision'] != 2 or len(state['versions']) != 2
            or version['template_version'] != 'ordinary-literal-en-v1'
            or version['text'] != 'RELEVANT EXPERIENCE\nSQL\n\nPROFILE\nПример опыта'
            or version['evidence_ids'] != ['f1'] or version['evidence_snapshot'] != state['facts']
            or query("select count(*) from public.audit_log where action='version'") != '1'
            or query("select md5(to_jsonb(v)::text) from public.resume_versions v where id='v1'") != before):
        raise ValueError('Version/legacy atomic result differs')
    print('PASS: twenty real English writers, one commit/nineteen conflicts, one audit; exact English text/source evidence and unchanged legacy row.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('FAIL: English ordinary concurrency; no row data, credentials or database diagnostics emitted.')
        raise SystemExit(1)
