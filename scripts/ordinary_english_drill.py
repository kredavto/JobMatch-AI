#!/usr/bin/env python3
"""Disposable current PG17 literal version protocol. Synthetic Auth, never provider restore."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import uuid
from saved_letter_drill import ROOT, OWNER, SESSION, OTHER, OTHER_SESSION, run, sql, literal
from profile_command_drill import service, statement
from version_command_drill import parity_cases
from reminder_drill import manifest
from backup_manifest import compare
from storage_fixture import rewrite_schema_predecessor, source_english_schema_predecessor, ordinary_english_schema_predecessor

MIGRATION = 'supabase/migrations/20261105111200_current_ordinary_english.sql'
BASE_SHA256 = '6e399e07754fae887266db2f68623c0453ffa63c543815a5e5cbff57aca53f0a'
EN = 'ordinary-literal-en-v1'
ENABLE = "create or replace function private.ordinary_english_permission() returns boolean language sql stable security invoker set search_path='' as $$select true;$$;"


def allowed(env):
    return env.get('JOBMATCH_LOCAL_ORDINARY_ENGLISH') == '1' and env.get('JOBMATCH_LOCAL_VERSION_COMMANDS') == '1' and env.get('PGHOST') in ('127.0.0.1', '::1') and not any(env.get(k) for k in ('PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGOPTIONS'))


def current(target):
    return sql(target, 'select public.read_workspace();', user=OWNER)


def definitions(target):
    return sql(target, "select jsonb_agg(jsonb_build_object('name',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'acl',(select jsonb_agg(to_jsonb(a) order by a.grantee,a.grantor,a.privilege_type) from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a)) order by p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('apply_version_intent','validate_version_write','ordinary_english_permission','ordinary_english_ready');")


def codec(target, folder, value):
    a, b = folder/'ordinary-input.json', folder/'ordinary-output.json'
    a.write_text(json.dumps(value, ensure_ascii=False))
    run(['node', str(ROOT/'tests/fixtures/ordinary-native.cjs'), str(a), str(b)], target)
    return json.loads(b.read_text())


def parity(target, folder):
    cases = parity_cases()
    expected = codec(target, folder, dict(mode='prepare', rows=cases))
    validated = []
    for case, want in zip(cases, expected):
        user, session, state = case['user'], case['session'], case['state']
        sql(target, 'insert into auth.users values('+literal(user)+');insert into auth.sessions values('+literal(session)+','+literal(user)+');')
        payload = {k:v for k,v in state.items() if k != 'revision'}
        value = literal(json.dumps(payload, ensure_ascii=False))+'::jsonb'
        stored = "case when exists(select 1 from pg_constraint where conrelid='public.workspaces'::regclass and conname='workspace_compact_payload') then "+value+"-array['facts','versions','applications'] else "+value+' end'
        sql(target, 'set request.jwt.claims='+literal(json.dumps(dict(sub=user,session_id=session)))+';insert into public.workspaces(user_id,revision,payload) values('+literal(user)+',1,'+stored+');do $$begin perform private.project_workspace('+literal(user)+','+value+');end$$;')
        after = sql(target, statement(1,want['command']), user=user, session=session)
        if {k:v for k,v in after['versions'][-1].items() if k not in ('id','created')} != want['expected']:
            raise ValueError('Current English SQL/TS rendering differs')
        validated.append(dict(before={**state,'ownerId':user},after={**after,'ownerId':user},ids=want['ids'],owner=user))
    if codec(target,folder,dict(mode='validate',rows=validated)) != dict(valid=32):
        raise ValueError('Native exact ACK failed')
    return len(validated)


def main():
    if not allowed(os.environ):
        print('FAIL: explicit owned ordinary-version loopback fixture required.', file=sys.stderr)
        return 2
    env = dict(os.environ, PGDATABASE='postgres', PGCONNECT_TIMEOUT='10')
    names = ['jobmatch_versions_'+uuid.uuid4().hex for _ in range(3)]
    created, stage = [], 'setup'
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-ordinary-') as directory:
            folder = Path(directory)
            addon = (ROOT/MIGRATION).read_bytes()
            prefix = ordinary_english_schema_predecessor(source_english_schema_predecessor(rewrite_schema_predecessor((ROOT/'supabase/schema.sql').read_bytes())))
            if hashlib.sha256(prefix).hexdigest() != BASE_SHA256:
                raise ValueError('Current predecessor changed')
            base = folder/'base.sql';base.write_bytes(prefix)
            for name in names:
                run(['createdb','--',name],env);created.append(name)
            upgrade, clean, restored = [dict(env,PGDATABASE=name) for name in names]
            for target, schema in ((upgrade,base),(clean,ROOT/'supabase/schema.sql')):
                for path in (ROOT/'scripts/restore_fixture.sql',schema,ROOT/'scripts/restore_seed.sql'):
                    run(['psql','-X','-w','-v','ON_ERROR_STOP=1','-f',str(path)],target)
                sql(target,'insert into auth.sessions values('+literal(OTHER_SESSION)+','+literal(OTHER)+');')
                first = service(target,folder,[dict(action='import',text='SQL\r\nPython\r\nSYNTHETIC Résumé 42%'),dict(action='vacancy',text='Must-have:\nSQL\nNice-to-have:\nPython')])['state']
                service(target,folder,[dict(action='verify',ids=[f['id'] for f in first['facts']],verified=True),dict(action='analyze'),dict(action='version',selectAllEdits=True)])
            before = current(upgrade);snapshot = manifest(upgrade,folder/'before.json');original_defs=definitions(upgrade)
            stage = 'atomic-late-fault-rollback'
            fault = addon.decode().replace('\ncommit;\n',"\ndo $$begin raise exception 'ORDINARY_TEST_LATE';end$$;\ncommit;\n")
            sql(upgrade,fault,failure='ORDINARY_TEST_LATE')
            if definitions(upgrade)!=original_defs or compare(snapshot,manifest(upgrade,folder/'failed.json')):
                raise ValueError('Failed additive migration left changes')
            stage = 'populated-upgrade-and-closed-default'
            sql(upgrade,addon.decode())
            sql(upgrade,(ROOT/'supabase/migrations/20261105130000_current_source_english.sql').read_text())
            sql(upgrade,(ROOT/'supabase/migrations/20261106143805_reviewed_rewrite_versions.sql').read_text())
            if before!=current(upgrade) or compare(snapshot,manifest(upgrade,folder/'upgraded.json')):
                raise ValueError('Migration rewrote stored Russian/history data')
            for target in (upgrade,clean):
                if sql(target,'select to_jsonb(public.ordinary_english_ready());',user=OWNER) is not False:
                    raise ValueError('English permission default is not closed')
                run(['psql','-X','-w','-v','ON_ERROR_STOP=1','-f',str(ROOT/'supabase/tests/current_ordinary_english.sql')],target)
                initial = current(target)
                disabled = service(dict(target,JOBMATCH_ORDINARY_ENGLISH_ENABLED='false'),folder,[dict(action='version',ids=[],template_version=EN,expectedStatus=503)])
                if current(target)!=initial or any(t['path'].endswith('apply_workspace_command') for t in disabled['results'][-1]['trace']):
                    raise ValueError('Disabled English route attempted a write')
                sql(target,statement(initial['revision'],dict(action='version',evidence_ids=[],score=100,match_metadata={},template_version=EN)),user=OWNER,failure='ORDINARY_ENGLISH_UNAVAILABLE')
                sql(target,ENABLE)
                stage = 'actual-route-rpc-ack-and-docx'
                active = dict(target,JOBMATCH_ORDINARY_ENGLISH_ENABLED='true')
                result = service(active,folder,[dict(action='analyze'),dict(action='version',selectAllEdits=True,template_version=EN),dict(exportLatestDocx=True)])
                if not result['state']['versions'][-1]['text'].startswith('RELEVANT EXPERIENCE\n') or result['state']['versions'][-1]['template_version']!=EN:
                    raise ValueError('Actual English service failed')
                stage = 'native-unicode-render-and-full-ack-parity'
                parity(target,folder)
                stage = 'false-and-lost-ack-no-replay'
                for fault, status in [('alter',502),('lost',503)]:
                    prior=current(target)
                    response=service(active,folder,[dict(action='analyze'),dict(action='version',selectAllEdits=True,template_version=EN,injectVersionAckFault=fault,expectedStatus=status)])
                    after=current(target)
                    calls=[t for t in response['results'][-1]['trace'] if t['path'].endswith('apply_workspace_command')]
                    if after['revision']!=prior['revision']+1 or len(after['versions'])!=len(prior['versions'])+1 or len(calls)!=1:
                        raise ValueError('Lost/false ACK was replayed or not committed once')
                    if service(active,folder,[])['state']!={**after,'ownerId':OWNER}:
                        raise ValueError('Explicit authenticated read failed to reconcile actual commit')
                stage='concurrent-current-revision'
                prior=current(target)
                command=codec(target,folder,dict(mode='prepare',rows=[dict(state=prior,mode=2)]))[0]['command']
                audits=sql(target,"select to_jsonb(count(*)) from public.audit_log where user_id="+literal(OWNER)+" and action='version';")
                with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
                    replies=list(pool.map(lambda _:sql(target,statement(prior['revision'],command),user=OWNER,allow_conflict=True),range(20)))
                if sum(isinstance(v,dict) for v in replies)!=1 or replies.count('CONFLICT')!=19:
                    raise ValueError('Concurrent version writers did not serialize')
                stage='owner-session-cap-and-invalid-tags'
                after=current(target)
                if after['revision']!=prior['revision']+1 or len(after['versions'])!=len(prior['versions'])+1 or sql(target,"select to_jsonb(count(*)) from public.audit_log where user_id="+literal(OWNER)+" and action='version';")!=audits+1:raise ValueError('Concurrent append/audit is not exactly one')
                sql(target,'select public.ordinary_english_ready();',user=OWNER,session=str(uuid.uuid4()),failure='AUTH')
                if sql(target,'select to_jsonb(count(*)) from public.resume_versions where user_id='+literal(OWNER)+';',user=OTHER,session=OTHER_SESSION)!=0:
                    raise ValueError('Foreign read exposed a version')
                for tag in [None,'ordinary-literal-en-v2','ordinary-literal-v1']:
                    sql(target,statement(after['revision'],{**command,'template_version':tag}),user=OWNER,failure='INVALID_WRITE')
                    if current(target)!=after:raise ValueError('Invalid tag partially committed')
                stage='actual-hundred-version-cap'
                count=len(after['versions'])
                sql(target,"insert into public.resume_versions(user_id,id,position,created,text,vacancy,score,evidence_ids,extra) select user_id,gen_random_uuid()::text,"+str(count)+"+g,created,text,vacancy,score,evidence_ids,extra from public.resume_versions cross join generate_series(1,"+str(100-count)+") g where user_id="+literal(OWNER)+" and id="+literal(after['versions'][-1]['id'])+';')
                capped=current(target)
                sql(target,statement(after['revision'],command),user=OWNER,failure='INVALID_WRITE')
                if len(capped['versions'])!=100 or current(target)!=capped:raise ValueError('Stored cap failed atomically')
                sql(target,'delete from public.resume_versions where user_id='+literal(OWNER)+' and position>'+str(count)+';')
                if current(target)!=after:raise ValueError('Owned cap fixture cleanup differs')
                stage='closed-permission-rollback'
                english=after['versions'][-1]
                sql(target,(ROOT/'supabase/rollback/20261105111200_current_ordinary_english.sql').read_text())
                stage='closed-English-exact-restore'
                copied=sql(target,statement(after['revision'],dict(action='restore',id=english['id'])),user=OWNER)
                if {k:v for k,v in copied['versions'][-1].items() if k not in ('id','created','restored_from')}!={k:v for k,v in english.items() if k not in ('id','created','restored_from')}:
                    raise ValueError('Disabled English exact restore changed immutable fields')
                stage='reapply-checkpoint'
                checkpoint=manifest(target,folder/(target['PGDATABASE']+'-reapply-before.json'));defs=definitions(target)
                stage='reapply-SQL'
                sql(target,addon.decode())
                stage='reapply-definition-ACL-parity'
                final_defs=definitions(target)
                if final_defs!=defs:
                    prior_defs={row['name']:row for row in defs};next_defs={row['name']:row for row in final_defs}
                    changed=[dict(routine=name,fields=[key for key in ('definition','acl') if prior_defs.get(name,{}).get(key)!=next_defs.get(name,{}).get(key)]) for name in sorted(set(prior_defs)|set(next_defs)) if prior_defs.get(name)!=next_defs.get(name)]
                    print('Ordinary reapply definition diagnostics: '+json.dumps(changed))
                    raise ValueError('Reapply definition/ACL mismatch')
                stage='reapply-row-parity'
                differences=compare(checkpoint,manifest(target,folder/(target['PGDATABASE']+'-reapply-after.json')))
                if differences:
                    print('Ordinary reapply changed relations: '+','.join(differences))
                    raise ValueError('Reapply row mismatch')
            stage='native-twenty-table-dump-restore-and-extra-corruption'
            reference=manifest(upgrade,folder/'source.json');dump=folder/'fixture.dump'
            run(['pg_dump','--format=custom','--no-owner','--file',str(dump)],upgrade)
            run(['pg_restore','--no-owner','--exit-on-error','--dbname',restored['PGDATABASE'],str(dump)],dict(restored,PGDATABASE='postgres'))
            if compare(reference,manifest(restored,folder/'restored.json')) or len(reference['tables'])!=20:
                raise ValueError('Twenty-table native restore differs')
            if definitions(upgrade)!=definitions(restored) or current(upgrade)!=current(restored) or sql(restored,'select to_jsonb(public.ordinary_english_ready());',user=OWNER) is not False:raise ValueError('Restored functions/grants/owner read/default differ')
            if sql(restored,'select to_jsonb(count(*)) from public.resume_versions where user_id='+literal(OWNER)+';',user=OTHER,session=OTHER_SESSION)!=0:raise ValueError('Restored foreign RLS failed')
            text=sql(restored,"select to_jsonb(count(*)) from public.resume_versions where extra->>'template_version'='ordinary-literal-en-v1';")
            if text<1:raise ValueError('Restored English rows missing')
            sql(restored,"update public.resume_versions set extra=jsonb_set(extra,'{template_version}','\"tampered\"') where user_id="+literal(OWNER)+" and extra->>'template_version'='ordinary-literal-en-v1';")
            if 'public.resume_versions' not in compare(reference,manifest(restored,folder/'corrupt.json')):
                raise ValueError('English tag corruption was not detected')
            print('PASS: current PG17 populated/full additive English framing; closed default, actual service/RPC/exact ACK/DOCX;64native Unicode parity cases; real false/lost committed replies and explicit reconciliation without replay;20writers1commit19conflicts per schema; owner/session/100record cap/invalid-tag guards; closed rollback/exact restore/reapply;20table synthetic dump/restore and tag corruption. No provider/model/production acceptance.')
        return 0
    except Exception as error:
        known={'Disabled English exact restore changed immutable fields','Reapply definition/ACL mismatch','Reapply row mismatch','Native SQL failed','Synthetic subprocess failed'}
        reason=str(error) if str(error) in known else type(error).__name__
        print('FAIL: ordinary English native drill at '+stage+'; '+reason+'; no database rows or raw provider diagnostics emitted.',file=sys.stderr)
        return 1
    finally:
        for name in reversed(created):
            try:run(['dropdb','--if-exists','--',name],env)
            except Exception:print('FAIL: owned ordinary fixture cleanup required.',file=sys.stderr)


if __name__=='__main__':
    raise SystemExit(main())
