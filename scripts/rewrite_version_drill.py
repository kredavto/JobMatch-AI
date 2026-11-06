#!/usr/bin/env python3
"""Owned PG17 reviewed-rewrite protocol source, never a Supabase provider restore."""
import concurrent.futures
import hashlib
import hmac
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path
from saved_letter_drill import ROOT, OWNER, OTHER, SESSION, OTHER_SESSION, KEY, literal, run
from source_version_drill import seed_core, save as save_source
from source_english_drill import definitions
from reminder_drill import manifest, command as reminder_command, statement as reminder_statement, ENABLE as ENABLE_REMINDERS
from backup_manifest import compare
from check_workspace_concurrency import Probe

PROTOCOL='supabase/protocols/rewrite_versions.sql'
DISABLE='supabase/protocols/rewrite_versions_disable.sql'
CONFIGURATION='34'*32
KEY_ID=hashlib.sha256(KEY).hexdigest()
ENABLE="create or replace function private.rewrite_storage_configuration() returns text language sql stable security invoker set search_path='' as $$select '"+CONFIGURATION+"'::text;$$;"


def allowed(env):
    return env.get('JOBMATCH_LOCAL_REWRITE_VERSIONS')=='1' and env.get('JOBMATCH_LOCAL_SOURCE_VERSIONS')=='1' and env.get('PGHOST') in ('127.0.0.1','::1') and not any(env.get(k) for k in ('PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS'))


def database_allowed(env):
    return allowed(env) and re.fullmatch('jobmatch_source_versions_[a-f0-9]{32}',env.get('PGDATABASE','')) is not None


class NativeFailure(ValueError):
    def __init__(self, code):
        self.code=code
        super().__init__('Owned SQL refused: '+code)


class NativeCodecFailure(ValueError):
    def __init__(self, code):
        self.code=code
        super().__init__('Owned codec refused')


def sql(target, statement, user=None, session=SESSION, failure=None):
    if not database_allowed(target):raise ValueError('Owned rewrite SQL target required')
    prefix='' if user is None else 'set role authenticated;set request.jwt.claims='+literal(json.dumps(dict(sub=user,session_id=session)))+';'
    r=subprocess.run(['psql','-X','-qAt','-w','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],env=target,input=(prefix+statement).encode(),capture_output=True,timeout=30)
    if r.returncode:
        found=re.search(rb'ERROR:\s+([0-9A-Z]{5}):\s+([^\r\n]+)',r.stderr)
        state=found.group(1).decode() if found else 'UNKNOWN'
        message=found.group(2).decode() if found else ''
        code=message if re.fullmatch('[A-Z][A-Z0-9_]+',message) else state
        if failure in (code,state):return None
        raise NativeFailure(code)
    if failure:raise ValueError('Expected refusal was not observed')
    if len(r.stdout)>20*1024*1024:raise ValueError('Owned response bound')
    raw=r.stdout.decode().strip()
    return json.loads(raw) if raw else None


def bridge(target,folder,data,refused=False):
    if not database_allowed(target):raise ValueError('Owned codec target required')
    token=uuid.uuid4().hex;a=folder/('rewrite-in-'+token+'.json');b=folder/('rewrite-out-'+token+'.json');a.write_text(json.dumps(data,ensure_ascii=False))
    result=subprocess.run(['node',str(ROOT/'tests/fixtures/rewrite-version-native.cjs'),str(a),str(b)],env=target,capture_output=True,timeout=30)
    if refused:
        if result.returncode!=2 or b.exists() or result.stdout:raise ValueError('Corruption not refused privately')
        return None
    if result.returncode or result.stdout or not b.is_file():
        safe=re.search(rb'code=([A-Z][A-Z0-9_]{0,79})(?:\r?\n|$)',result.stderr)
        code=safe.group(1).decode() if safe else 'FIXTURE_OPERATION_REFUSED'
        operation=data.get('op') if data.get('op') in ('issue','verify-current','record','collection','ack') else 'unknown'
        raise NativeCodecFailure(operation.upper()+'_'+code)
    return json.loads(b.read_text())


def workspace(target,user=OWNER,session=SESSION):
    return {**sql(target,'select public.read_workspace();',user,session), 'ownerId':user}


def issue(target,folder,state=None,**changes):
    return bridge(target,folder,dict(op='issue',state=state or workspace(target),**changes))


def accept_statement(revision, issued, marker='STORE_REVIEWED_AI_REWRITE'):
    return 'select public.accept_rewrite_version('+','.join((str(revision),literal(issued['receipt']['payload']),literal(issued['receipt']['signature']),literal(issued['keyId']),literal(issued['configurationId']),str(issued['score']),literal(json.dumps(issued['match_metadata'],ensure_ascii=False))+'::jsonb',literal(marker)))+');'


def resign(body, domain='jobmatch-ai-rewrite-review-receipt-v1'):
    payload=json.dumps(body,ensure_ascii=False,separators=(',',':'))
    return dict(payload=payload,signature=hmac.new(KEY,(domain+'\n'+payload).encode(),hashlib.sha256).hexdigest())


def checked_accept(target,folder,issued,state=None,user=OWNER,session=SESSION):
    before=state or workspace(target,user,session)
    result=sql(target,accept_statement(before['revision'],issued),user,session)
    bridge(target,folder,dict(op='ack',result=result,previous=before,receipt=issued['receipt'],ownerId=user))
    bridge(target,folder,dict(op='collection',versions=workspace(target,user,session)['versions'],ownerId=user))
    return result


def observed_waiter(target,folder,kind):
    probe=Probe(target)
    try:
        sql(target,'insert into auth.users values('+literal(probe.a)+'),('+literal(probe.b)+');insert into auth.sessions values('+literal(probe.sa)+','+literal(probe.a)+'),('+literal(probe.sb)+','+literal(probe.b)+');')
        states={}
        for uid,session in ((probe.a,probe.sa),(probe.b,probe.sb)):
            sql(target,"select public.apply_workspace_command(0,'{\"action\":\"import\",\"text\":\"SQL\\nOwned waiter\"}');",uid,session)
            w=workspace(target,uid,session);ids=[f['id'] for f in w['facts']]
            sql(target,'select public.apply_workspace_command(1,'+literal(json.dumps(dict(action='verify',ids=ids,verified=True)))+'::jsonb);',uid,session)
            sql(target,"select public.apply_workspace_command(2,'{\"action\":\"vacancy\",\"text\":\"SQL role\"}');",uid,session)
            states[uid]=workspace(target,uid,session)
        other=issue(target,folder,states[probe.b]);receipt=issue(target,folder,states[probe.a],clockOffset=-598 if kind=='expiry' else 0);holder=probe.owner_lock()
        if kind=='expiry':
            expires=json.loads(receipt['receipt']['payload'])['expiresAt']
            # Queue while still unexpired, with <1.3s left: the production2s
            # lock timeout must not hide the actual deadline recheck.
            while time.time()<expires-1.3:time.sleep(0.01)
            if time.time()>=expires-0.05:raise ValueError('Expiry fixture window missed')
        expression=accept_statement(3,receipt).removeprefix('select ').removesuffix(';')
        name='jobmatch_rewrite_waiter_'+kind
        expected={'session':'AUTH','config':'REWRITE_STORAGE_UNAVAILABLE','expiry':'INVALID_WRITE','revision':'CONFLICT'}[kind]
        body="begin;create function pg_temp.attempt() returns text language plpgsql as $q$begin perform "+expression+";return 'OK';exception when raise_exception then if sqlerrm="+literal(expected)+" then return sqlerrm;end if;raise;end;$q$;set request.jwt.claims="+literal(json.dumps(dict(sub=probe.a,session_id=probe.sa)))+";set local role authenticated;select pg_temp.attempt();commit;"
        worker=probe.child(body,name);probe.wait_for([name],'advisory')
        # B must progress while A is actually observed waiting on its owner lock.
        other_result=sql(target,accept_statement(3,other),probe.b,probe.sb)
        if kind=='session':sql(target,'delete from auth.sessions where id='+literal(probe.sa)+';')
        elif kind=='config':sql(target,(ROOT/DISABLE).read_text())
        elif kind=='expiry':
            deadline=json.loads(receipt['receipt']['payload'])['expiresAt']+0.02
            while time.time()<deadline:time.sleep(0.02)
        extra=('set local request.jwt.claims='+literal(json.dumps(dict(sub=probe.a,session_id=probe.sa)))+";select public.apply_workspace_command(3,'{\"action\":\"goal\",\"text\":\"Actual concurrent goal\"}');") if kind=='revision' else ''
        probe.finish(holder,extra+'commit;\n')
        if probe.finish(worker).strip()!=expected:raise ValueError('Late waiter accepted')
        bridge(target,folder,dict(op='ack',result=other_result,previous=states[probe.b],receipt=other['receipt'],ownerId=probe.b))
        if sql(target,'select count(*) from public.resume_versions where user_id='+literal(probe.a)+';')!=0:raise ValueError('Late refusal left version')
        if kind=='config':sql(target,ENABLE)
    finally:probe.close()


def main():
    if not allowed(os.environ):
        print('FAIL: explicit owned loopback rewrite opt-ins required.',file=sys.stderr);return 2
    environment=dict(os.environ,PGDATABASE='postgres',PGCONNECT_TIMEOUT='10',JOBMATCH_OPS_TELEMETRY='off')
    names=['jobmatch_source_versions_'+uuid.uuid4().hex for _ in range(3)];created=[];stage='setup'
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-reviewed-rewrite-owned-') as directory:
            folder=Path(directory);addon=(ROOT/PROTOCOL).read_text()
            for name in names:run(['createdb','--',name],environment);created.append(name)
            upgrade,clean,restored=[dict(environment,PGDATABASE=name) for name in names]
            for target in (upgrade,clean):
                for path in ('scripts/restore_fixture.sql','supabase/schema.sql','scripts/restore_seed.sql'):run(['psql','-X','-w','-v','ON_ERROR_STOP=1','-f',str(ROOT/path)],target)
                sql(target,'insert into auth.sessions values('+literal(OTHER_SESSION)+','+literal(OTHER)+');')
                seed_core(target,folder);sql(target,'grant execute on function private.source_version_storage_permission() to authenticated;');save_source(target,folder)
                sql(target,ENABLE_REMINDERS);sql(target,reminder_statement(0,reminder_command()),OWNER)
                # Model potentially inherited hosted service-role grants, then
                # prove that installing this source closes the bypass explicitly.
                sql(target,'grant insert,update on public.resume_versions to service_role;grant usage on schema private to service_role;grant execute on function private.project_workspace(uuid,jsonb),private.commit_workspace(integer,jsonb,text) to service_role;')
            stage='first-install-legacy-forgery-preflight'
            sql(upgrade,"update public.resume_versions set extra=extra||'{\"ai_rewrite\":null}'::jsonb where id='v1';")
            before=manifest(upgrade,folder/'collision-before.json');sql(upgrade,addon,failure='REWRITE_LEGACY_METADATA_COLLISION')
            if compare(before,manifest(upgrade,folder/'collision-after.json')):raise ValueError('Collision attempt rewrote data')
            sql(upgrade,"update public.resume_versions set extra=extra-'ai_rewrite' where id='v1';")
            stage='late-DDL-fault-atomicity'
            before=manifest(upgrade,folder/'before.json');defs=definitions(upgrade)
            sql(upgrade,addon.replace('\ncommit;\n',"\ndo $$begin raise exception 'REWRITE_TEST_LATE';end$$;\ncommit;\n"),failure='REWRITE_TEST_LATE')
            if definitions(upgrade)!=defs or compare(before,manifest(upgrade,folder/'failed.json')):raise ValueError('Failed installation left rows/definitions/ACL')
            for target in (upgrade,clean):sql(target,addon)
            if definitions(upgrade)!=definitions(clean) or compare(before,manifest(upgrade,folder/'upgraded.json')):raise ValueError('Installation changed data or definitions differ')
            for target in (upgrade,clean):
                stage='closed-default-real-HMAC-and-source-binding'
                if sql(target,"select to_jsonb(has_table_privilege('service_role','public.resume_versions','INSERT') or has_table_privilege('service_role','public.resume_versions','UPDATE') or has_function_privilege('service_role','private.project_workspace(uuid,jsonb)','EXECUTE') or has_function_privilege('service_role','private.commit_workspace(integer,jsonb,text)','EXECUTE') or has_function_privilege('service_role','public.accept_rewrite_version(integer,text,text,text,text,integer,jsonb,text)','EXECUTE') or has_function_privilege('anon','public.accept_rewrite_version(integer,text,text,text,text,integer,jsonb,text)','EXECUTE'));") is not False:raise ValueError('Privileged bypass remained open')
                state=workspace(target);issued=issue(target,folder,state)
                if sql(target,'select to_jsonb(public.rewrite_storage_ready('+literal(KEY_ID)+','+literal(CONFIGURATION)+'));',OWNER) is not False:raise ValueError('Default open')
                sql(target,accept_statement(state['revision'],issued),OWNER,failure='REWRITE_STORAGE_UNAVAILABLE');sql(target,ENABLE)
                for marker in ('SAVE_REVIEWED_LETTER_VERSION','true',''):
                    sql(target,accept_statement(state['revision'],issued,marker),OWNER,failure='INVALID_WRITE')
                bad={**issued,'receipt':{**issued['receipt'],'signature':'00'*32}};sql(target,accept_statement(state['revision'],bad),OWNER,failure='INVALID_WRITE')
                for field in ('keyId','configurationId'):
                    sql(target,accept_statement(state['revision'],{**issued,field:'00'*32}),OWNER,failure='REWRITE_STORAGE_UNAVAILABLE')
                wrong_domain={**issued,'receipt':resign(json.loads(issued['receipt']['payload']),'jobmatch-letter-receipt-v1')};sql(target,accept_statement(state['revision'],wrong_domain),OWNER,failure='INVALID_WRITE')
                sql(target,accept_statement(state['revision'],issued),OTHER,OTHER_SESSION,failure='INVALID_WRITE')
                for kind in ('render','source','proposal','ack','key','deadline','origin','coverage','inner-MAC','unknown'):
                    body=json.loads(issued['receipt']['payload'])
                    if kind=='render':body['review']['text']='invented'
                    elif kind=='source':body['review']['source']['vacancy']='invented'
                    elif kind=='proposal':body['review']['proposalClaims'][0]['status']='refused'
                    elif kind=='ack':body['review']['confirmation']['acknowledgedIssueIds']=[]
                    elif kind=='key':body['issuerKeyId']='00'*32
                    elif kind=='deadline':body['expiresAt']+=1
                    elif kind=='origin':body['review']['rows'][0]['origin']='model-proposal'
                    elif kind=='coverage':body['review']['coverage']='semantic-verified'
                    elif kind=='inner-MAC':body['previewReceipt']['signature']='00'*32
                    else:body['unknown']=True
                    bad={**issued,'receipt':resign(body)};sql(target,accept_statement(state['revision'],bad),OWNER,failure='INVALID_WRITE')
                stage='twelve-writer-one-row-audit-idempotent-ACK'
                audits=sql(target,"select count(*) from public.audit_log where action='ai-rewrite-version-accept';")
                with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:rows=list(pool.map(lambda _:sql(target,accept_statement(state['revision'],issued),OWNER),range(12)))
                if len({r['version']['id'] for r in rows})!=1 or any(r!=rows[0] for r in rows) or sql(target,"select count(*) from public.audit_log where action='ai-rewrite-version-accept';")!=audits+1:raise ValueError('Concurrent duplicate committed')
                bridge(target,folder,dict(op='ack',result=rows[0],previous=state,receipt=issued['receipt'],ownerId=OWNER))
                changed={**issued,'score':(issued['score']+1)%101};sql(target,accept_statement(state['revision'],changed),OWNER,failure='CONFLICT')
                stage='legacy-forgery-guard-ordinary-after-AI-and-immutable-DML'
                current=workspace(target);bad={**current,'versions':current['versions']+[dict(current['versions'][0],id=str(uuid.uuid4()),created='2026-11-06T00:00:00.000Z',engine_version='rules-v1',profile_revision=current['revision'],evidence_snapshot=current['facts'],ai_rewrite=None)]};bad.pop('ownerId',None)
                sql(target,'select public.save_workspace('+str(current['revision'])+','+literal(json.dumps(bad,ensure_ascii=False))+",'version');",OWNER,failure='INVALID_WRITE')
                # A valid ordinary append must continue working after an AI row.
                command=dict(action='version',evidence_ids=[],score=issued['score'],match_metadata=issued['match_metadata'])
                sql(target,'select public.apply_workspace_command('+str(current['revision'])+','+literal(json.dumps(command))+'::jsonb);',OWNER)
                sql(target,"update public.resume_versions set text='bad' where user_id="+literal(OWNER)+';',OWNER,failure='42501')
                sql(target,"update public.resume_versions set text='bad' where id="+literal(rows[0]['version']['id'])+';',failure='IMMUTABLE_REWRITE_VERSION')
                stage='Unicode-CRLF-control-IDs-and-independent-render-parity'
                # Current owner state is restored after a source-only change; old
                # immutable versions stay literal historical records throughout.
                for text in ('🧑‍💻 SQL\r\n  Built 5 reports  \r\nUnselected é','\u2003SQL\u00a0\nNo Python','SQL\nSQL'):
                    w=workspace(target);sql(target,'select public.apply_workspace_command('+str(w['revision'])+','+literal(json.dumps(dict(action='import',text=text),ensure_ascii=False))+'::jsonb);',OWNER)
                    w=workspace(target);ids=[f['id'] for f in w['facts']]
                    sql(target,'select public.apply_workspace_command('+str(w['revision'])+','+literal(json.dumps(dict(action='verify',ids=ids,verified=True)))+'::jsonb);',OWNER)
                    w=workspace(target)
                    if text=='SQL\nSQL':bridge(target,folder,dict(op='issue',state=w),refused=True);continue
                    issued=issue(target,folder,w,options=dict(refused=True,manual='Manual 7 SQL reports'))
                    checked_accept(target,folder,issued,w)
                stage='audit-fault-atomic-save-and-closed-rollback-history'
                w=workspace(target);sql(target,'select public.apply_workspace_command('+str(w['revision'])+',\'{"action":"import","text":"SQL"}\');',OWNER)
                w=workspace(target);sql(target,'select public.apply_workspace_command('+str(w['revision'])+','+literal(json.dumps(dict(action='verify',ids=[f['id'] for f in w['facts']],verified=True)))+'::jsonb);',OWNER)
                sql(target,'update public.profile_facts set id=repeat(chr(1),100) where user_id='+literal(OWNER)+' and position=1;')
                w=workspace(target);issued=issue(target,folder,w)
                stage='shared-100-version-cap-rollback-only'
                cap_before=manifest(target,folder/(target['PGDATABASE']+'-cap-before.json'));count=len(w['versions'])
                fill="insert into public.resume_versions(user_id,id,position,created,text,vacancy,score,evidence_ids,extra) select user_id,'owned-cap-'||g::text,"+str(count)+"+g,created,text,vacancy,score,evidence_ids,extra from public.resume_versions cross join generate_series(1,"+str(100-count)+") g where user_id="+literal(OWNER)+" and id='v1';"
                call=accept_statement(w['revision'],issued).replace('select public.','perform public.',1)
                attempt="create function pg_temp.cap_attempt() returns boolean language plpgsql as $$begin "+call+"raise exception 'CAP_NOT_REFUSED';exception when raise_exception then if sqlerrm='INVALID_WRITE' then return true;end if;raise;end$$;"
                claims=literal(json.dumps(dict(sub=OWNER,session_id=SESSION)))
                if sql(target,'begin;'+fill+attempt+'set local request.jwt.claims='+claims+';set local role authenticated;select pg_temp.cap_attempt();rollback;') is not True or compare(cap_before,manifest(target,folder/(target['PGDATABASE']+'-cap-after.json'))):raise ValueError('Shared cap failed or left rows')
                stage='audit-fault-atomic-save-and-closed-rollback-history'
                sql(target,"create function public.rewrite_audit_fault() returns trigger language plpgsql as $$begin if new.action='ai-rewrite-version-accept' then raise exception 'REWRITE_AUDIT_TEST';end if;return new;end$$;create trigger rewrite_audit_fault before insert on public.audit_log for each row execute function public.rewrite_audit_fault();")
                before_fault=manifest(target,folder/(target['PGDATABASE']+'-fault-before.json'));sql(target,accept_statement(w['revision'],issued),OWNER,failure='REWRITE_AUDIT_TEST')
                if compare(before_fault,manifest(target,folder/(target['PGDATABASE']+'-fault-after.json'))):raise ValueError('Audit refusal left rows')
                sql(target,'drop trigger rewrite_audit_fault on public.audit_log;drop function public.rewrite_audit_fault();')
                checked_accept(target,folder,issued,w)
                stage='actual-short-lived-receipt-expiry-then-historical-restore'
                w=workspace(target);short=issue(target,folder,w,clockOffset=-598);first=checked_accept(target,folder,short,w)['version'];expires=json.loads(short['receipt']['payload'])['expiresAt']
                while time.time()<expires+0.02:time.sleep(0.02)
                bridge(target,folder,dict(op='verify-current',state=w,receipt=short['receipt']),refused=True)
                sql(target,(ROOT/DISABLE).read_text());sql(target,"update private.letter_signing_config set signing_key=decode('"+'cd'*32+"','hex');")
                history=workspace(target);bridge(target,folder,dict(op='collection',versions=history['versions'],ownerId=OWNER))
                for _ in range(2):
                    sql(target,'select public.apply_workspace_command('+str(history['revision'])+','+literal(json.dumps(dict(action='restore',id=first['id'])))+'::jsonb);',OWNER);history=workspace(target);first=history['versions'][-1]
                    bridge(target,folder,dict(op='collection',versions=history['versions'],ownerId=OWNER))
                # Reapply from the closed state preserves data and exact functions/ACL.
                closed_defs=definitions(target);checkpoint=manifest(target,folder/(target['PGDATABASE']+'-reapply-before.json'));sql(target,addon)
                if definitions(target)!=closed_defs or compare(checkpoint,manifest(target,folder/(target['PGDATABASE']+'-reapply-after.json'))):raise ValueError('Reapply changed data/functions/ACL')
                sql(target,"update private.letter_signing_config set signing_key=decode('"+KEY.hex()+"','hex');");sql(target,ENABLE)
            stage='observed-session-config-expiry-revision-waiters-and-independent-owner-progress'
            for kind in ('session','config','expiry','revision'):observed_waiter(upgrade,folder,kind)
            stage='populated-selected20table-native-dump-restore'
            sql(upgrade,(ROOT/DISABLE).read_text());reference=manifest(upgrade,folder/'source.json');dump=folder/'owned.dump'
            if len(reference['tables'])!=20 or any(v['rows']==0 for v in reference['tables'].values()):raise ValueError('Expected selected20table populated scope')
            run(['pg_dump','--format=custom','--file',str(dump)],upgrade);run(['pg_restore','--exit-on-error','--dbname',names[2],str(dump)],restored)
            if compare(reference,manifest(restored,folder/'restored.json')) or definitions(upgrade)!=definitions(restored):raise ValueError('Native restore differs')
            history=workspace(restored);bridge(restored,folder,dict(op='collection',versions=history['versions'],ownerId=OWNER))
            if sql(restored,'select count(*) from public.resume_versions where user_id='+literal(OWNER)+';',OTHER,OTHER_SESSION)!=0:raise ValueError('Restored foreign RLS failed')
            if sql(restored,'select to_jsonb(public.rewrite_storage_ready('+literal(KEY_ID)+','+literal(CONFIGURATION)+'));',OWNER) is not False:raise ValueError('Restored construction opened')
            stage='same-count-historical-corruption-refused-privately'
            sql(restored,"alter table public.resume_versions disable trigger rewrite_version_frozen;update public.resume_versions set text='corrupt' where extra ? 'ai_rewrite';alter table public.resume_versions enable trigger rewrite_version_frozen;")
            bridge(restored,folder,dict(op='collection',versions=workspace(restored)['versions'],ownerId=OWNER),refused=True)
            if compare(reference,manifest(restored,folder/'corrupt.json'))!=['public.resume_versions']:raise ValueError('Fingerprint missed historical drift')
        print('PASS: owned PG17 source-only rewrite protocol; first-install legacy collision/late-DDL rollback; closed default; actual nested HMAC/current source/ranges/render/ACK;12writers1row/audit; ordinary-after-AI/immutable ACL;Unicode/CRLF/refusal/manual parity;atomic audit failure;observed revoked/config/expiry/revision waiters and independent owner;closed key-rotation/history/restore/reapply;selected20table populated native dump/restore/RLS/same-count corruption. Not CLI migration packaging/live Supabase/provider/model/semantic acceptance.')
        return 0
    except Exception as error:
        print('FAIL: rewrite protocol stage='+stage+'; '+type(error).__name__+(' code='+error.code if isinstance(error,(NativeFailure,NativeCodecFailure)) else '')+'; no payloads/keys/raw diagnostics.',file=sys.stderr);return 1
    finally:
        cleanup_failed=False
        for name in reversed(created):
            try:run(['dropdb','--if-exists','--',name],environment)
            except Exception:cleanup_failed=True;print('FAIL: owned rewrite cleanup incomplete.',file=sys.stderr)
        if cleanup_failed:return 1


if __name__=='__main__':raise SystemExit(main())
