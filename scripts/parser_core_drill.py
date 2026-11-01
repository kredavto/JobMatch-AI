#!/usr/bin/env python3
"""Owned native container/TLS/API/compact-SQL integration; synthetic Auth only."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.request
import uuid
from backup_manifest import compare
from compact_storage_drill import catalog, current_provenance, verify_provenance
from profile_command_drill import service as native_service, source_command
from saved_letter_drill import sql, OWNER, KEY, literal, bridge, accept_statement
from source_profile_drill import manifest

ROOT = Path(__file__).resolve().parent.parent


def allowed(env):
    return env.get('JOBMATCH_LOCAL_PARSER_CORE') == '1' and env.get('PGHOST') in ('127.0.0.1', '::1') and not any(env.get(k) for k in ('PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGOPTIONS'))


def run(command, env, timeout=180):
    subprocess.run(command, env=env, cwd=ROOT, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=timeout)


def service(target, folder, operations):
    try:
        return native_service(target,folder,operations)
    except ValueError:
        output = folder / 'service-output.json'
        if output.is_file():
            failure = json.loads(output.read_text()).get('fixtureFailure')
            if failure and set(failure) == {'stage','status','gatewayRequests','proxyLeak'}:
                print('FAIL: owned fixture diagnostic ' + json.dumps(failure),file=sys.stderr)
        raise


def main():
    if not allowed(os.environ):
        print('FAIL: owned loopback parser-core fixture opt-in required.', file=sys.stderr)
        return 2
    env = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10', PARSER_WORKER_TOKEN='synthetic_gateway_' + uuid.uuid4().hex, PARSER_WORKER_OCR='false')
    names = ['jobmatch_parser_core_' + uuid.uuid4().hex for _ in range(2)]
    project = 'jobmatch-parser-core-' + uuid.uuid4().hex
    compose = ['docker', 'compose', '-p', project, '-f', str(ROOT / 'worker/compose.yaml')]
    created, started = [], False
    stage = 'create owned fixture'
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-parser-core-') as temp:
            folder = Path(temp)
            cert, key = folder / 'ca.pem', folder / 'key.pem'
            run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=Owned synthetic parser', '-addext', 'subjectAltName=IP:127.0.0.1', '-addext', 'basicConstraints=critical,CA:TRUE', '-keyout', str(key), '-out', str(cert)], env)
            env.update(NODE_EXTRA_CA_CERTS=str(cert), JOBMATCH_PARSER_CORE_TLS_KEY=str(key), JOBMATCH_PARSER_CORE_TLS_CERT=str(cert))
            for name in names:
                run(['createdb', '--', name], env)
                created.append(name)
            source, restored = dict(env, PGDATABASE=names[0]), dict(env, PGDATABASE=names[1])
            for filename in ('scripts/restore_fixture.sql', 'supabase/schema.sql', 'scripts/restore_seed.sql'):
                run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / filename)], source)
            sql(source, 'grant execute on function private.source_profile_storage_permission() to authenticated;')
            p = source_command(source, folder, {'action':'add','kind':'employment','fields':{'title':{'quote':'SQL','start':0,'end':3}}})
            source_command(source, folder, {'action':'confirm','id':p['entries'][0]['id'],'confirmed':True})
            sql(source, "insert into private.letter_signing_config(signing_key) values(decode('" + KEY.hex() + "','hex'));")
            state = sql(source, 'select public.read_workspace();', user=OWNER)
            old = bridge(folder, 'issue', {'workspace':{**state,'ownerId':OWNER},'letterRevision':0})
            sql(source, accept_statement(old,state['revision']), user=OWNER)
            stage = 'build and start real bounded parser and gateway'
            started = True
            run(compose + ['up', '-d', '--build'], env, 600)
            for _ in range(60):
                try:
                    with urllib.request.urlopen('http://127.0.0.1:8081/health', timeout=2) as response:
                        if json.load(response) == {'ok':True}:
                            break
                except (OSError, ValueError):
                    pass
                time.sleep(0.5)
            else:
                raise ValueError('Gateway unavailable')
            stage = 'actual API TLS worker extraction without persistence'
            before = manifest(source, folder / 'before.json')
            extracted = service(source, folder, [{'uploadFixture':'txt'}, {'uploadFixture':'docx'}, {'uploadFixture':'pdf'}, {'uploadFixture':'bad-txt','expectedStatus':400}, {'uploadFixture':'txt','uploadOwner':'22222222-2222-4222-8222-222222222222','expectedStatus':409}])
            if extracted['gatewayRequests'] != 4 or any(t != 'private.request_quotas' for t in compare(before,manifest(source,folder / 'after-extract.json'))):
                raise ValueError('Extract-only persisted domain data or crossed owner boundary')
            stage = 'explicit separate import preserves review boundary'
            imported = service(source, folder, [{'uploadFixture':'txt'}, {'action':'import','useExtractedText':True}])
            state = imported['state']
            if state['original'] != 'SQL\nSynthetic parser profile\nRust' or any(f['verified'] for f in state['facts']) or state['revision'] != extracted['state']['revision']+1:
                raise ValueError('Explicit import contract changed')
            stage = 'outage refuses inline fallback and domain writes'
            run(compose + ['stop', 'gateway'], env)
            before = manifest(source,folder / 'before-outage.json')
            service(source, folder, [{'uploadFixture':'txt','expectedStatus':503}])
            if any(t != 'private.request_quotas' for t in compare(before,manifest(source,folder / 'after-outage.json'))):
                raise ValueError('Worker outage changed domain data')
            stage = 'current profile, rules, letters and native populated restore'
            fresh = current_provenance(source,folder,old)
            before = manifest(source,folder / 'before-restore.json')
            if len(before['tables']) != 17 or not all(t['rows'] > 0 for t in before['tables'].values()):
                raise ValueError('Expected all17 populated scope')
            run(['pg_dump','-Fc','-f',str(folder / 'synthetic.dump')],source)
            run(['pg_restore','--exit-on-error','--dbname',names[1],str(folder / 'synthetic.dump')],restored)
            if compare(before,manifest(restored,folder / 'restored.json')) or catalog(source) != catalog(restored):
                raise ValueError('Native restore differs')
            verify_provenance(restored,folder,[old,fresh])
            print('PASS: real bounded containers -> verified TLS -> production import API; TXT/DOCX/PDF, owner refusal, invalid bytes, explicit import, outage/no fallback; compact SQL, separate fact review, current rules/source/letters, all17 populated native restore. Synthetic Auth; scan/OCR separately tested; no provider acceptance.')
        return 0
    except (OSError, ValueError, subprocess.SubprocessError):
        print('FAIL: parser-core stage: ' + stage + '; no payloads/keys/DB diagnostics printed.',file=sys.stderr)
        return 1
    finally:
        if started:
            subprocess.run(compose + ['down','--volumes','--remove-orphans'],env=env,cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=60)
        for name in created:
            subprocess.run(['dropdb','--if-exists','--',name],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=30)


if __name__ == '__main__':
    sys.exit(main())
