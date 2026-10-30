#!/usr/bin/env python3
"""Real same-preview concurrency and independent UTF-8/hash validation; synthetic DB only."""
import concurrent.futures
import hashlib
import json
import os
from structured_profile_concurrency import query

CLAIMS = '''set request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}';set role authenticated;'''


def main():
    local = os.environ.get('PGHOST') in ('127.0.0.1', '::1')
    ci = os.environ.get('GITHUB_ACTIONS') == 'true' and os.environ.get('PGHOST') == 'postgres'
    if (os.environ.get('JOBMATCH_LOCAL_STRUCTURED_TEST') != '1' or not (local or ci)
            or not os.environ.get('PGDATABASE', '').startswith('structured_')
            or any(os.environ.get(name) for name in ('PGSERVICE', 'PGHOSTADDR', 'PGSERVICEFILE'))):
        raise ValueError('Disposable fixture opt-in required')
    if query('select count(*) from public.structured_resume_versions') != '0':
        raise ValueError('Expected pristine versions fixture')
    # Follows the real profile concurrency probe: one unconfirmed record, revision 1.
    query(CLAIMS+"select public.command_structured_profile(1,1,jsonb_build_object('action','confirm','id',public.read_structured_profile()#>>'{entries,0,id}','confirmed',true));")
    preview = json.loads(query(CLAIMS+"select public.preview_structured_english_version(1,2,array[(public.read_structured_profile()#>>'{entries,0,id}')::uuid]);"))
    s = preview['snapshot']
    parts = [preview['template_version'], preview['context_guard_version'], preview['generator'], 'null',
             s['format'], s['ownerId'], str(s['revision']), str(s['workspace_revision']),
             str(s['source_workspace_revision']), str(len(s['source_fact_ids'])),
             *s['source_fact_ids'], s['source_original'], 'true', preview['text']]
    for entry in s['entries']:
        parts.extend([entry['id'], entry['kind'], entry['created'], 'true'])
        for name in ('title', 'organization', 'start', 'end', 'description', 'credential'):
            field = entry['fields'].get(name)
            parts.extend([name, str(field['start']) if field else '', str(field['end']) if field else '', field['quote'] if field else ''])
    if hashlib.sha256('\0'.join(parts).encode('utf-8')).hexdigest() != preview['preview_hash']:
        raise ValueError('Native hash binding differs')
    # Hash restricted to hex by preview contract; no user text/identifiers interpolated.
    digest = preview['preview_hash']
    if len(digest) != 64 or any(c not in '0123456789abcdef' for c in digest):
        raise ValueError('Invalid hash')
    sql = CLAIMS+"select public.save_structured_english_version(1,2,array[(public.read_structured_profile()#>>'{entries,0,id}')::uuid],'"+digest+"','SAVE_LITERAL_VERSION')->>'id';"
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(lambda _: query(sql), range(20)))
    if len(set(results)) != 1 or not results[0] or query('select count(*) from public.structured_resume_versions') != '1':
        raise ValueError('Duplicate version')
    if query("select count(*) from public.audit_log where action='structured_version_save'") != '1':
        raise ValueError('Duplicate audit')
    if query("select revision from public.workspaces where user_id='11111111-1111-4111-8111-111111111111'") != '1' or query('select revision from public.structured_profiles') != '2':
        raise ValueError('Unexpected mutation')
    print('PASS: English independent native UTF-8 hash; twenty saves return one immutable version and one audit; workspace/profile unchanged.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('FAIL: structured-version concurrency; no database diagnostics or row data emitted.')
        raise SystemExit(1)
