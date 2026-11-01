#!/usr/bin/env python3
"""Owned current literal source versions/native PG17; never provider or model acceptance."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import uuid
from backup_manifest import snapshot, compare
from saved_letter_drill import ROOT, OWNER, OTHER, SESSION, KEY, literal, run, bridge, accept_statement, verify_history
from source_profile_drill import read, context, codec as profile_codec
from profile_command_drill import service, source_command
from compact_storage_drill import catalog, current_provenance, verify_provenance
from check_workspace_concurrency import Probe, CheckFailure

MIGRATION = 'supabase/migrations/20261101171000_source_versions.sql'
BASE_SHA256 = '6d363eccef5bb136c43bd372f0725398ea97924429e719a43a6835932437c7e1'


def allowed(env):
    return env.get('JOBMATCH_LOCAL_SOURCE_VERSIONS')=='1' and env.get('PGHOST') in ('127.0.0.1','::1') and not any(env.get(k) for k in ('PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS'))


def database_allowed(env):
    return allowed(env) and re.fullmatch(r'jobmatch_source_versions_[a-f0-9]{32}',env.get('PGDATABASE','')) is not None


class NativeSQLFailure(ValueError):
    def __init__(self,code):
        self.code=code
        super().__init__('Native SQL refused')


def sql(environment,statement,*,user=None,session=SESSION,failure=None):
    if not database_allowed(environment):raise ValueError('Owned SQL target required')
    prefix='' if user is None else 'set role authenticated;set request.jwt.claims='+literal(json.dumps({'sub':user,'session_id':session}))+';'
    result=subprocess.run(['psql','-X','-qAt','-w','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],env=environment,input=(prefix+statement).encode(),capture_output=True,timeout=30)
    if failure and result.returncode and failure.encode() in result.stderr:return None
    if result.returncode or failure:
        state=re.search(rb'ERROR:\s+([0-9A-Z]{5}):',result.stderr)
        raise NativeSQLFailure(state.group(1).decode() if state else 'UNKNOWN')
    raw=result.stdout.decode().strip()
    return json.loads(raw) if raw else None


def native(target,folder,data,refused=False):
    if not database_allowed(target):
        raise ValueError('Owned source-version target required')
    token=uuid.uuid4().hex
    a,b=folder/('sv-in-'+token+'.json'),folder/('sv-out-'+token+'.json')
    a.write_text(json.dumps(data,ensure_ascii=False))
    result=subprocess.run(['node',str(ROOT/'tests/fixtures/source-version-native.cjs'),str(a),str(b)],env=target,capture_output=True,timeout=180)
    if refused:
        if result.returncode!=2 or b.exists() or result.stdout:
            raise ValueError('Corrupted codec did not refuse privately')
        return None
    if result.returncode or result.stdout or not b.is_file():
        raise ValueError('Current production source-version fixture failed')
    return json.loads(b.read_text())


def versions(target):
    return sql(target,'select public.list_source_versions();',user=OWNER)


def preview(target):
    p=read(target)
    ids=[entry['id'] for entry in p['entries'] if entry['confirmed']]
    expression='public.preview_source_version('+str(p['workspace_revision'])+','+str(p['revision'])+',ARRAY['+','.join(literal(i) for i in ids)+']::uuid[])'
    return p,ids,expression,sql(target,'select '+expression+';',user=OWNER)


def save_statement(p,ids,value):
    return 'select public.save_source_version('+str(p['workspace_revision'])+','+str(p['revision'])+',ARRAY['+','.join(literal(i) for i in ids)+']::uuid[],'+literal(value['preview_hash'])+",'SAVE_LITERAL_SOURCE_VERSION');"


def save(target,folder):
    p,ids,expression,value=preview(target)
    native(target,folder,{'op':'codec','kind':'preview','value':value,'ownerId':OWNER})
    row=sql(target,save_statement(p,ids,value),user=OWNER)
    native(target,folder,{'op':'codec','kind':'version','value':row,'ownerId':OWNER})
    native(target,folder,{'op':'codec','kind':'list','value':versions(target),'ownerId':OWNER})
    return row


def capture(target,path,full=True,logical=False):
    before=dict(os.environ)
    try:
        os.environ.update(target)
        snapshot(path,include_letters=True,include_source_profile=True,logical_workspaces=logical,include_source_versions=full)
    finally:
        os.environ.clear();os.environ.update(before)
    return json.loads(path.read_text())


def seed_core(target,folder):
    sql(target,'grant execute on function private.source_profile_storage_permission() to authenticated;')
    p=source_command(target,folder,{'action':'add','kind':'employment','fields':{'title':{'quote':'SQL','start':0,'end':3}}})
    source_command(target,folder,{'action':'confirm','id':p['entries'][0]['id'],'confirmed':True})
    sql(target,"insert into private.letter_signing_config(signing_key) values(decode('"+KEY.hex()+"','hex'));")
    w=sql(target,'select public.read_workspace();',user=OWNER)
    receipt=bridge(folder,'issue',{'workspace':{**w,'ownerId':OWNER},'letterRevision':0})
    sql(target,accept_statement(receipt,w['revision']),user=OWNER)
    return receipt


def revoke_waiters(target):
    if not database_allowed(target):
        raise ValueError('Owned revocation target required')
    probe=Probe(target)
    try:
        probe.query("insert into auth.users values('"+probe.a+"'),('"+probe.b+"');insert into auth.sessions values('"+probe.sa+"','"+probe.a+"'),('"+probe.sb+"','"+probe.b+"');")
        prepared={}
        for uid,session in ((probe.a,probe.sa),(probe.b,probe.sb)):
            sql(target,"select public.apply_workspace_command(0,'{\"action\":\"import\",\"text\":\"SQL\\nOwned QA source\"}');",user=uid,session=session)
            p=sql(target,"select public.command_source_profile(1,0,'{\"action\":\"add\",\"kind\":\"employment\",\"fields\":{\"title\":{\"quote\":\"SQL\",\"start\":0,\"end\":3}}}','STORE_REVIEWED_SOURCE_PROFILE');",user=uid,session=session)
            p=sql(target,"select public.command_source_profile(1,1,jsonb_build_object('action','confirm','id',"+literal(p['entries'][0]['id'])+"::uuid,'confirmed',true),'STORE_REVIEWED_SOURCE_PROFILE');",user=uid,session=session)
            expression='public.preview_source_version(1,2,ARRAY['+literal(p['entries'][0]['id'])+']::uuid[])'
            value=sql(target,'select '+expression+';',user=uid,session=session)
            statement="public.save_source_version(1,2,ARRAY["+literal(p['entries'][0]['id'])+']::uuid[],'+literal(value['preview_hash'])+",'SAVE_LITERAL_SOURCE_VERSION')"
            sql(target,'select '+statement+';',user=uid,session=session)
            state=sql(target,'select public.list_source_versions();',user=uid,session=session)
            prepared[uid]=(expression,statement,state)
        before=sql(target,'select coalesce(jsonb_agg(to_jsonb(v) order by id),\'[]\') from public.source_profile_versions v where user_id='+literal(probe.a)+';')
        holder=probe.owner_lock()
        workers=[]
        for index,expression in enumerate((prepared[probe.a][1],"public.clear_source_versions("+literal(prepared[probe.a][2]['collection_hash'])+",'DELETE_LITERAL_SOURCE_VERSIONS')")):
            name='jobmatch_sv_waiter_'+str(index)
            body="""begin;create function pg_temp.attempt() returns text language plpgsql as $q$begin perform %s;return 'OK';exception when raise_exception then if sqlerrm='AUTH' then return 'AUTH';end if;raise;end;$q$;
set request.jwt.claims=%s;set local role authenticated;select pg_temp.attempt();commit;"""%(expression,literal(json.dumps({'sub':probe.a,'session_id':probe.sa})))
            workers.append((name,probe.child(body,name)))
        probe.wait_for([name for name,_ in workers],'advisory')
        # An independent owner progresses while both A operations are observed blocked.
        sql(target,'select '+prepared[probe.b][0]+';',user=probe.b,session=probe.sb)
        probe.query('delete from auth.sessions where id='+literal(probe.sa)+';')
        probe.finish(holder,'COMMIT;\n')
        if any(probe.finish(child)!='AUTH\n' for _,child in workers):
            raise ValueError('Revoked save/cleanup waiter committed')
        after=sql(target,'select coalesce(jsonb_agg(to_jsonb(v) order by id),\'[]\') from public.source_profile_versions v where user_id='+literal(probe.a)+';')
        if after!=before:
            raise ValueError('Revoked cleanup changed immutable history')
    finally:
        probe.cleanup()


def main():
    if not allowed(os.environ):
        print('FAIL: explicit owned loopback source-version fixture required.',file=sys.stderr);return 2
    env=dict(os.environ,PGDATABASE='postgres',PGCONNECT_TIMEOUT='10',JOBMATCH_NATIVE_OPS='',JOBMATCH_OPS_TELEMETRY='off')
    names=['jobmatch_source_versions_'+uuid.uuid4().hex for _ in range(4)]
    created=[];stage='setup';status=1
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-source-versions-owned-') as temp:
            folder=Path(temp)
            migration=(ROOT/MIGRATION).read_bytes();full=(ROOT/'supabase/schema.sql').read_bytes()
            if full.count(migration)!=1 or not full.endswith(b'\n'+migration):raise ValueError('Unexpected source-version suffix')
            predecessor=full[:-len(migration)-1]
            if hashlib.sha256(predecessor).hexdigest()!=BASE_SHA256:raise ValueError('Not exact current compact/source/letter/quota predecessor')
            (folder/'base.sql').write_bytes(predecessor)
            for name in names:run(['createdb','--',name],env);created.append(name)
            source,clean,restored,missing=[dict(env,PGDATABASE=name) for name in names]
            def install(target,paths):
                for path in paths:
                    result=subprocess.run(['psql','-X','-w','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-f',str(path)],env=target,capture_output=True,timeout=90)
                    if result.returncode:
                        state=re.search(rb'ERROR:\s+([0-9A-Z]{5}):',result.stderr)
                        raise NativeSQLFailure(state.group(1).decode() if state else 'UNKNOWN')
            stage='missing predecessor and atomic default-off install'
            stage='missing predecessor fixture install'
            install(missing,[ROOT/'scripts/restore_fixture.sql'])
            stage='missing predecessor catalog'
            missing_defs=catalog(missing)
            stage='missing predecessor refusal'
            sql(missing,migration.decode(),failure='SOURCE_VERSION_PREDECESSOR_REQUIRED')
            if catalog(missing)!=missing_defs or sql(missing,"select to_jsonb(to_regclass('public.source_profile_versions') is not null);"):
                raise ValueError('Missing predecessor left objects')
            stage='pinned predecessor bootstrap'
            install(source,[ROOT/'scripts/restore_fixture.sql',folder/'base.sql',ROOT/'scripts/restore_seed.sql'])
            stage='populated predecessor source and letter'
            old_receipt=seed_core(source,folder)
            stage='populated predecessor fingerprints'
            baseline=capture(source,folder/'pre17.json',full=False);defs=catalog(source)
            if not all(t['rows']>0 for t in baseline['tables'].values()):raise ValueError('Expected17populated predecessor')
            late=migration.decode().rsplit('commit;',1)[0]+"do $$begin raise exception 'QA_LATE_MIGRATION';end;$$;commit;"
            stage='late DDL refusal'
            sql(source,late,failure='QA_LATE_MIGRATION')
            if catalog(source)!=defs or compare(baseline,capture(source,folder/'late17.json',full=False)) or sql(source,"select to_jsonb(to_regclass('public.source_profile_versions') is not null);"):
                raise ValueError('Late migration failure changed data/definitions')
            stage='successful additive migration'
            install(source,[ROOT/MIGRATION])
            if compare(baseline,capture(source,folder/'after17.json',full=False)) or sql(source,'select public.source_version_storage_ready();',user=OWNER):raise ValueError('Upgrade changed core or enabled storage')
            stage='clean full bootstrap'
            install(clean,[ROOT/'scripts/restore_fixture.sql',ROOT/'supabase/schema.sql',ROOT/'scripts/restore_seed.sql'])
            stage='actual SQL guards/caps/idempotence/audit fault/retraction/reimport/cleanup/RLS/cascade'
            for target in (source,clean):install(target,[ROOT/'supabase/tests/source_versions.sql'])
            seed_core(clean,folder)
            if catalog(source)!=catalog(clean):raise ValueError('Clean/upgrade catalogs differ')
            for target in (source,clean):sql(target,'grant execute on function private.source_version_storage_permission() to authenticated;')
            stage='actual production wire preview/save/detail/export and no implicit fact verification'
            # Legacy fact retraction is independent from manually confirmed structured fields.
            w=sql(source,'select public.read_workspace();',user=OWNER)
            sql(source,"select public.apply_workspace_command("+str(w['revision'])+",'{\"action\":\"verify\",\"ids\":[\"f1\"],\"verified\":false}');",user=OWNER)
            p=read(source);ids=[p['entries'][0]['id']]
            operations=[{}, {'action':'preview','workspaceRevision':p['workspace_revision'],'profileRevision':p['revision'],'entryIds':ids},
                        {'action':'save','workspaceRevision':p['workspace_revision'],'profileRevision':p['revision'],'entryIds':ids,'usePreviewHash':True,'accept':'SAVE_LITERAL_SOURCE_VERSION','consentToStore':True},
                        {'useVersionId':True},{'query':'?export=1'}]
            outcomes=native(source,folder,{'op':'wire','operations':operations})['results']
            first=outcomes[2]['body']
            if outcomes[-1]['body'][-1].get('complete') is not True or any(f['verified'] for f in sql(source,'select public.read_workspace();',user=OWNER)['facts']):raise ValueError('Wire export incomplete or implicitly verified facts')
            save_input={**operations[2],'usePreviewHash':False,'previewHash':first['preview_hash']}
            for off in ('versionFlagOff','parentFlagOff'):
                native(source,folder,{'op':'wire','operations':[{**save_input,off:True,'expectedStatus':503}]})
            old=versions(source)
            native(source,folder,{'op':'wire','operations':[{'ownerHint':OTHER,'expectedStatus':409},{'action':'clear','collectionHash':'a'*64,'accept':'DELETE_LITERAL_SOURCE_VERSIONS','expectedStatus':409}]})
            if versions(source)!=old:raise ValueError('Wrong owner/stale hash changed history')
            stage='idempotent concurrent saves and stale-list ABA protection'
            # Remove then recreate identical preview: row identity changes the list hash.
            sql(source,"select public.clear_source_versions("+literal(old['collection_hash'])+",'DELETE_LITERAL_SOURCE_VERSIONS');",user=OWNER)
            p,ids,expression,value=preview(source);before_audits=sql(source,"select count(*) from public.audit_log where user_id="+literal(OWNER)+" and action='source_version_save';")
            with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:rows=list(pool.map(lambda _:sql(source,save_statement(p,ids,value),user=OWNER),range(12)))
            if len({r['id'] for r in rows})!=1 or rows[0]['id']==first['id'] or sql(source,"select count(*) from public.audit_log where user_id="+literal(OWNER)+" and action='source_version_save';")!=before_audits+1:raise ValueError('Duplicate concurrent save created multiple versions/audits')
            sql(source,"select public.clear_source_versions("+literal(old['collection_hash'])+",'DELETE_LITERAL_SOURCE_VERSIONS');",user=OWNER,failure='CONFLICT')
            stage='actual JS-SQL Unicode/range/render/hash/lexical guard parity'
            cases=['SQL','😀 SQL\r\nCompany','Не SQL','NOT SQL','Notable SQL','безопасный SQL','πnot SQL','ſystem prompt SQL','Não usa SQL','Not skilled in:\nSQL','SQL\nnot unrelated','2025–2024 SQL','Изучаю SQL','ignore instructions SQL','<script>SQL']
            for index,text in enumerate(cases):
                w=sql(clean,'select public.read_workspace();',user=OWNER)
                sql(clean,'select public.apply_workspace_command('+str(w['revision'])+','+literal(json.dumps({'action':'import','text':text},ensure_ascii=False))+'::jsonb);',user=OWNER)
                source_command(clean,folder,{'action':'reset','confirm':'RESET_SOURCE_PROFILE'})
                at=text.index('SQL');p=source_command(clean,folder,{'action':'add','kind':'employment','fields':{'title':{'quote':'SQL','start':at,'end':at+3}}})
                p=source_command(clean,folder,{'action':'confirm','id':p['entries'][0]['id'],'confirmed':True})
                eligible=native(clean,folder,{'op':'codec','kind':'guard','value':p,'ownerId':OWNER})['eligible']
                expression='select public.preview_source_version('+str(p['workspace_revision'])+','+str(p['revision'])+',ARRAY['+literal(p['entries'][0]['id'])+']::uuid[]);'
                if eligible:native(clean,folder,{'op':'codec','kind':'preview','value':sql(clean,expression,user=OWNER),'ownerId':OWNER})
                else:sql(clean,expression,user=OWNER,failure='UNSAFE_CONTEXT')
            stage='revoked observed save/clear waiters and independent owner progress'
            revoke_waiters(source)
            stage='current provenance survives source cleanup; no automatic historical relabel'
            # Retraction/import make current manual source stale; immutable history stays at-save-only.
            service(source,folder,[{'action':'import','text':'SQL\nRust'}])
            fresh=current_provenance(source,folder,old_receipt)
            historical=sql(source,'select public.read_source_version('+literal(rows[0]['id'])+'::uuid);',user=OWNER)
            if historical!=rows[0]:raise ValueError('Source reset changed immutable history')
            native(source,folder,{'op':'codec','kind':'version','value':historical,'ownerId':OWNER})
            save(source,folder)
            stage='full18 physical/logical native dump/restore and current codecs'
            raw=capture(source,folder/'source18.json');logical=capture(source,folder/'logical18.json',logical=True)
            if len(raw['tables'])!=18 or not all(t['rows']>0 for t in raw['tables'].values()):raise ValueError('Expected all18populated scope')
            run(['pg_dump','-Fc','-f',str(folder/'owned.dump')],source)
            run(['pg_restore','--exit-on-error','--dbname',names[2],str(folder/'owned.dump')],restored)
            if compare(raw,capture(restored,folder/'restored18.json')) or compare(logical,capture(restored,folder/'restored-logical18.json',logical=True)) or catalog(source)!=catalog(restored):raise ValueError('Native restore differs')
            verify_provenance(restored,folder,[old_receipt,fresh])
            state=versions(restored);native(restored,folder,{'op':'codec','kind':'list','value':state,'ownerId':OWNER})
            for item in state['versions']:native(restored,folder,{'op':'codec','kind':'version','value':sql(restored,'select public.read_source_version('+literal(item['id'])+'::uuid);',user=OWNER),'ownerId':OWNER})
            stage='corruption fingerprint/codec refusal and actual incomplete-after200 stream alert'
            sql(restored,"alter table public.source_profile_versions disable trigger immutable_version;update public.source_profile_versions set text='PRIVATE_CORRUPT_FIXTURE';alter table public.source_profile_versions enable trigger immutable_version;")
            if compare(raw,capture(restored,folder/'corrupt18.json'))!=['public.source_profile_versions']:raise ValueError('Full18 fingerprint missed corruption')
            outcome=native(restored,folder,{'op':'wire','operations':[{'query':'?export=1'}]})['results'][0]
            if outcome['status']!=200 or outcome['body'][-1].get('complete') is not False or any(row.get('complete') is True for row in outcome['body']):raise ValueError('Corrupt stream fabricated completion')
            events=folder/'stream.events';events.write_text(''.join('JOBMATCH_OPS_V1 '+json.dumps(event)+'\n' for event in outcome['ops']))
            check=subprocess.run([sys.executable,str(ROOT/'scripts/ops_report.py'),'stream-check',str(events),'--route','source-versions','--min-streams','1','--max-incomplete-fraction','0','--max-cancelled-fraction','1','--max-age-seconds','120'],env=restored,capture_output=True,text=True,timeout=20)
            report=json.loads(check.stdout)
            if check.returncode!=1 or report['verdict']!='observed-alert' or report['clientDelivery']!='not-established':raise ValueError('Native incomplete stream was not a scoped alert')
            status=0
    except (OSError,ValueError,KeyError,TypeError,CheckFailure,subprocess.SubprocessError) as error:
        if isinstance(error,NativeSQLFailure):print('FAIL: closed SQLSTATE='+error.code,file=sys.stderr)
        print('FAIL: owned source-version stage='+stage+'; no payloads/keys/DB diagnostics.',file=sys.stderr);status=1
    finally:
        for name in created:
            result=subprocess.run(['dropdb','--if-exists','--',name],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=30)
            if result.returncode:
                status=1;print('FAIL: owned source-version database cleanup incomplete.',file=sys.stderr)
    if status==0:print('PASS: current source versions/default-off SQL gates/preview-save-idempotence/clear/caps/atomic fault/RLS/session/cascade; actual production wire and JS-SQL parity; observed revoked waiters/owner progress; current rules/source/old-new letters preserved;18populated native physical-logical restore/current codecs; corruption and real incomplete-after200 stream->operator alert. Synthetic Auth/HTTP/restore, no provider/model/delivery acceptance.')
    return status


if __name__=='__main__':
    sys.exit(main())
