#!/usr/bin/env python3
"""Owned PG17 mixed literal source archive. No provider/model/live Auth acceptance."""
import concurrent.futures
import hashlib
import json
import os
import sys
import tempfile
import uuid
from pathlib import Path
from source_version_drill import allowed as parent_allowed, sql, native, seed_core, save, versions, revoke_waiters
from source_profile_drill import read
from profile_command_drill import service, source_command
from saved_letter_drill import ROOT, OWNER, OTHER, SESSION, OTHER_SESSION, literal, run
from reminder_drill import manifest
from compact_storage_drill import catalog
from storage_fixture import source_english_schema_predecessor
from backup_manifest import compare

MIGRATION='supabase/migrations/20261105130000_current_source_english.sql'
EN='source-literal-en-v1'
ENABLE="create or replace function private.source_version_english_permission() returns boolean language sql stable security invoker set search_path='' as $$select true;$$;"


def allowed(environment):
    return parent_allowed(environment) and environment.get('JOBMATCH_LOCAL_SOURCE_ENGLISH')=='1'


def preview(target):
    p=read(target);ids=[entry['id'] for entry in p['entries'] if entry['confirmed']]
    args=str(p['workspace_revision'])+','+str(p['revision'])+',ARRAY['+','.join(literal(i) for i in ids)+']::uuid[]'
    return p,ids,args,sql(target,'select public.preview_source_version_english('+args+');',user=OWNER)


def definitions(target):
    return sql(target,"select jsonb_agg(jsonb_build_object('name',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'acl',(select jsonb_agg(to_jsonb(a) order by a.grantee,a.grantor,a.privilege_type) from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a)) order by p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private');")


def main():
    if not allowed(os.environ):
        print('FAIL: explicit owned loopback source-English fixture required.',file=sys.stderr);return 2
    environment=dict(os.environ,PGDATABASE='postgres',PGCONNECT_TIMEOUT='10',JOBMATCH_OPS_TELEMETRY='off')
    names=['jobmatch_source_versions_'+uuid.uuid4().hex for _ in range(3)]
    created=[];stage='setup'
    try:
        with tempfile.TemporaryDirectory(prefix='jobmatch-source-english-owned-') as directory:
            folder=Path(directory);addon=(ROOT/MIGRATION).read_text()
            predecessor=source_english_schema_predecessor((ROOT/'supabase/schema.sql').read_bytes())
            # Exact prior authored schema, including all current reminder/ordinary addons.
            if hashlib.sha256(predecessor).hexdigest()!=BASE_SHA256:raise ValueError('Unexpected predecessor')
            base=folder/'base.sql';base.write_bytes(predecessor)
            for name in names:run(['createdb','--',name],environment);created.append(name)
            upgrade,clean,restored=[dict(environment,PGDATABASE=name) for name in names]
            old_records=[]
            for target,schema in ((upgrade,base),(clean,ROOT/'supabase/schema.sql')):
                for path in (ROOT/'scripts/restore_fixture.sql',schema,ROOT/'scripts/restore_seed.sql'):
                    run(['psql','-X','-w','-v','ON_ERROR_STOP=1','-f',str(path)],target)
                sql(target,'insert into auth.sessions values('+literal(OTHER_SESSION)+','+literal(OTHER)+');')
                seed_core(target,folder)
                sql(target,'grant execute on function private.source_version_storage_permission() to authenticated;')
                old_records.append(save(target,folder))
            stage='late-fault-atomic-upgrade'
            before=manifest(upgrade,folder/'before.json');defs=catalog(upgrade)
            sql(upgrade,addon.replace('\ncommit;\n',"\ndo $$begin raise exception 'SOURCE_ENGLISH_TEST_LATE';end$$;\ncommit;\n"),failure='SOURCE_ENGLISH_TEST_LATE')
            if catalog(upgrade)!=defs or compare(before,manifest(upgrade,folder/'failed.json')):raise ValueError('Late fault left changes')
            sql(upgrade,addon)
            if compare(before,manifest(upgrade,folder/'upgraded.json')):raise ValueError('Upgrade rewrote data')
            if catalog(upgrade)!=catalog(clean):raise ValueError('Upgrade/full catalog differs')
            for target,old in zip((upgrade,clean),old_records):
                stage='closed-default-and-actual-wire'
                if sql(target,'select to_jsonb(public.source_version_english_ready());',user=OWNER) is not False:raise ValueError('Default open')
                run(['psql','-X','-w','-v','ON_ERROR_STOP=1','-f',str(ROOT/'supabase/tests/current_source_english.sql')],target)
                p=read(target);intent=dict(action='preview',workspaceRevision=p['workspace_revision'],profileRevision=p['revision'],entryIds=[e['id'] for e in p['entries']],templateVersion=EN)
                native(target,folder,dict(op='wire',operations=[dict(intent,expectedStatus=503)]))
                sql(target,'select public.preview_source_version_english('+str(p['workspace_revision'])+','+str(p['revision'])+',ARRAY['+literal(p['entries'][0]['id'])+']::uuid[]);',user=OWNER,failure='SOURCE_ENGLISH_UNAVAILABLE')
                sql(target,ENABLE)
                native(target,folder,dict(op='wire',operations=[dict(intent,englishFlagOff=True,expectedStatus=503)]))
                results=native(target,folder,dict(op='wire',operations=[intent,dict(intent,action='save',usePreviewHash=True,accept='SAVE_LITERAL_SOURCE_VERSION',consentToStore=True),dict(useVersionId=True),dict(query='?export=1')]))['results']
                row=results[1]['body']
                if row['template_version']!=EN or not row['text'].startswith('Structured information\n\nEmployment\nTitle: SQL') or results[-1]['body'][-1].get('complete') is not True:raise ValueError('English wire/export failed')
                if sql(target,'select public.read_source_version('+literal(old['id'])+'::uuid);',user=OWNER)!=old:raise ValueError('Russian history changed')
                stage='idempotence-concurrency-and-shared-cap'
                p=source_command(target,folder,dict(action='add',kind='achievement',fields=dict(description=dict(quote='SQL',start=0,end=3))))
                source_command(target,folder,dict(action='confirm',id=p['entries'][-1]['id'],confirmed=True))
                p,ids,args,value=preview(target)
                native(target,folder,dict(op='codec',kind='preview',value=value,ownerId=OWNER))
                statement='select public.save_source_version_english('+args+','+literal(value['preview_hash'])+",'SAVE_LITERAL_SOURCE_VERSION');"
                count=sql(target,"select count(*) from public.audit_log where action='source_version_save' and user_id="+literal(OWNER)+';')
                with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:rows=list(pool.map(lambda _:sql(target,statement,user=OWNER),range(12)))
                if len({r['id'] for r in rows})!=1 or sql(target,"select count(*) from public.audit_log where action='source_version_save' and user_id="+literal(OWNER)+';')!=count+1:raise ValueError('Concurrent duplicate committed')
                stage='false-lost-committed-ack-manual-read-no-replay'
                # A fresh hash per operation ensures an actual new commit, not deduplication.
                for fault in ('alter','lost'):
                    p=source_command(target,folder,dict(action='add',kind='achievement',fields=dict(description=dict(quote='SQL',start=0,end=3))))
                    source_command(target,folder,dict(action='confirm',id=p['entries'][-1]['id'],confirmed=True))
                    p,ids,args,value=preview(target);initial=versions(target)
                    op=dict(action='save',workspaceRevision=p['workspace_revision'],profileRevision=p['revision'],entryIds=ids,templateVersion=EN,previewHash=value['preview_hash'],accept='SAVE_LITERAL_SOURCE_VERSION',consentToStore=True,ackFault=fault,expectedStatus=502)
                    result=native(target,folder,dict(op='wire',operations=[op,{}]))['results']
                    if len(versions(target)['versions'])!=len(initial['versions'])+1 or result[1]['body']['history']!=versions(target) or sum(t['path'].endswith('/save_source_version_english') for t in result[0]['trace'])!=1:raise ValueError('Unknown result was replayed or not reconciled')
                stage='unicode-ranges-four-kinds-and-risk-parity'
                for index,kind in enumerate(('employment','education','certification','achievement')):
                    text='🧑‍💻 SQL\r\nНазвание: 42%\r\n2025–2024\r\nAcme'
                    service(target,folder,[dict(action='import',text=text)])
                    source_command(target,folder,dict(action='reset',confirm='RESET_SOURCE_PROFILE'))
                    def field(quote):return dict(quote=quote,start=text.index(quote),end=text.index(quote)+len(quote))
                    fields={('description' if kind=='achievement' else 'title'):field('SQL')}
                    if kind!='achievement':fields['description']=field('Название: 42%\r\n2025–2024')
                    if kind=='certification':fields['credential']=field('42%')
                    p=source_command(target,folder,dict(action='add',kind=kind,fields=fields))
                    source_command(target,folder,dict(action='confirm',id=p['entries'][0]['id'],confirmed=True))
                    p,ids,args,value=preview(target);native(target,folder,dict(op='codec',kind='preview',value=value,ownerId=OWNER))
                stage='actual-shared-cap-and-atomic-audit-failure'
                before=versions(target)
                statement='select public.save_source_version_english('+args+','+literal(value['preview_hash'])+",'SAVE_LITERAL_SOURCE_VERSION');"
                sql(target,"create function public.source_english_audit_fault() returns trigger language plpgsql set search_path='' as $$begin if new.action='source_version_save' then raise exception 'SOURCE_ENGLISH_AUDIT_TEST';end if;return new;end;$$;create trigger source_english_audit_fault before insert on public.audit_log for each row execute function public.source_english_audit_fault();")
                sql(target,statement,user=OWNER,failure='SOURCE_ENGLISH_AUDIT_TEST')
                sql(target,'drop trigger source_english_audit_fault on public.audit_log;drop function public.source_english_audit_fault();')
                if versions(target)!=before:raise ValueError('Audit failure left version')
                # Fill the shared collection in a rollback-only owned transaction, then
                # invoke the real new-language writer under the authenticated role.
                count=len(before['versions'])
                body="insert into public.source_profile_versions(user_id,id,profile_revision,workspace_revision,template_version,preview_hash,text,snapshot) select user_id,gen_random_uuid(),profile_revision,workspace_revision,template_version,encode(sha256(convert_to('owned-cap-'||g::text,'UTF8')),'hex'),text,snapshot from public.source_profile_versions cross join generate_series(1,"+str(20-count)+") g where user_id="+literal(OWNER)+" and id="+literal(before['versions'][0]['id'])+";"
                attempt="create function pg_temp.cap_attempt() returns jsonb language plpgsql as $$begin "+statement.replace('select public.','perform public.',1)+"raise exception 'CAP_DID_NOT_REFUSE';exception when raise_exception then if sqlerrm='INVALID_WRITE' then return 'true'::jsonb;end if;raise;end;$$;"
                claims=literal(json.dumps(dict(sub=OWNER,session_id=SESSION)))
                if sql(target,'begin;'+body+attempt+'set local role authenticated;set local request.jwt.claims='+claims+';select pg_temp.cap_attempt();rollback;') is not True or versions(target)!=before:raise ValueError('Mixed shared20cap failed')
                # Both RPC variants retain the exact same bounded lexical guard.
                service(target,folder,[dict(action='import',text='not SQL')]);source_command(target,folder,dict(action='reset',confirm='RESET_SOURCE_PROFILE'))
                p=source_command(target,folder,dict(action='add',kind='employment',fields=dict(title=dict(quote='SQL',start=4,end=7))))
                p=source_command(target,folder,dict(action='confirm',id=p['entries'][0]['id'],confirmed=True))
                args=str(p['workspace_revision'])+','+str(p['revision'])+',ARRAY['+literal(p['entries'][0]['id'])+']::uuid[]'
                for suffix in ('','_english'):sql(target,'select public.preview_source_version'+suffix+'('+args+');',user=OWNER,failure='UNSAFE_CONTEXT')
                stage='observed-English-revoked-waiters-and-independent-owner-progress'
                revoke_waiters(target,english=True)
                stage='closed-rollback-retains-mixed-history-and-reapply'
                sql(target,(ROOT/'supabase/rollback/20261105130000_current_source_english.sql').read_text())
                history=versions(target);native(target,folder,dict(op='codec',kind='list',value=history,ownerId=OWNER))
                for item in history['versions']:native(target,folder,dict(op='codec',kind='version',value=sql(target,'select public.read_source_version('+literal(item['id'])+'::uuid);',user=OWNER),ownerId=OWNER))
                native(target,folder,dict(op='wire',operations=[dict(query='?export=1')]))
                checkpoint=manifest(target,folder/(target['PGDATABASE']+'-reapply-before.json'));defs=definitions(target)
                sql(target,addon)
                if definitions(target)!=defs or compare(checkpoint,manifest(target,folder/(target['PGDATABASE']+'-reapply-after.json'))):raise ValueError('Reapply changed data/definitions/ACL')
            stage='twenty-table-synthetic-native-restore'
            reference=manifest(upgrade,folder/'source.json');dump=folder/'owned.dump'
            run(['pg_dump','--format=custom','--file',str(dump)],upgrade)
            run(['pg_restore','--exit-on-error','--dbname',names[2],str(dump)],restored)
            if len(reference['tables'])!=20 or compare(reference,manifest(restored,folder/'restored.json')) or definitions(upgrade)!=definitions(restored):raise ValueError('Restore differs')
            if sql(restored,'select to_jsonb(public.source_version_english_ready());',user=OWNER) is not False or versions(restored)!=versions(upgrade):raise ValueError('Restored default/read differs')
            if sql(restored,'select count(*) from public.source_profile_versions where user_id='+literal(OWNER)+';',user=OTHER,session=OTHER_SESSION)!=0:raise ValueError('Restored foreign RLS failed')
            stage='unknown-tag-corruption-refusal-and-explicit-clear'
            sql(restored,"alter table public.source_profile_versions drop constraint source_profile_versions_template_version_check;alter table public.source_profile_versions disable trigger immutable_version;update public.source_profile_versions set template_version='unknown' where template_version='source-literal-en-v1';alter table public.source_profile_versions enable trigger immutable_version;")
            if compare(reference,manifest(restored,folder/'corrupt.json'))!=['public.source_profile_versions']:raise ValueError('Unknown tag missed')
            native(restored,folder,dict(op='wire',operations=[dict(expectedStatus=502)]))
            before=versions(upgrade)
            result=native(upgrade,folder,dict(op='wire',operations=[dict(action='clear',collectionHash=before['collection_hash'],accept='DELETE_LITERAL_SOURCE_VERSIONS',versionFlagOff=True)]))['results'][0]['body']
            if result['versions']:raise ValueError('Disabled construction blocked explicit clear')
        print('PASS: current source English PG17 additive/full/atomic upgrade; frozen RU history and JS-SQL mixed codec/hash/range parity; default-off API/DB and actual route/save/read/export;12writer single immutable row/audit; actual false/lost committed replies/manual reconcile/no replay;four Unicode kinds and risk guards; closed rollback/mixed reads/cleanup/reapply exact definitions-ACL-data;20table synthetic native restore/RLS/default/unknown-tag corruption. No provider/model/live Auth acceptance.')
        return 0
    except Exception as error:
        print('FAIL: source English stage='+stage+'; '+type(error).__name__+'; no payloads/keys/raw database diagnostics.',file=sys.stderr);return 1
    finally:
        cleanup_failed=False
        for name in reversed(created):
            try:run(['dropdb','--if-exists','--',name],environment)
            except Exception:
                cleanup_failed=True;print('FAIL: owned source-English cleanup incomplete.',file=sys.stderr)
        if cleanup_failed:return 1


BASE_SHA256='ad2d04521f935f5dfd158d22913d6e146f0edfde39ca3b8b30a20ef78128fbcf'
if __name__=='__main__':raise SystemExit(main())
