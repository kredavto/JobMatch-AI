#!/usr/bin/env python3
"""Explicit local Unix socket + fresh disposable DB only. Never reads app env/keys."""
import argparse, concurrent.futures, json, os, pathlib, subprocess, uuid
p=argparse.ArgumentParser();p.add_argument('--socket',required=True);p.add_argument('--database',required=True);a=p.parse_args()
assert a.socket.startswith('/') and a.database.endswith('_ai_gate_test'), 'Disposable local DB required'
root=pathlib.Path(__file__).resolve().parent
env={'PATH':os.environ.get('PATH','/usr/bin:/bin')}
def sql(q,ok=True):
 r=subprocess.run(['psql','-X','-h',a.socket,'-d',a.database,'-A','-t','-v','ON_ERROR_STOP=1','-c',q],text=True,capture_output=True,env=env)
 if ok and r.returncode: raise AssertionError(r.stderr)
 if not ok: assert r.returncode!=0; return ''
 return r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ''
assert sql("select count(*) from pg_namespace where nspname in ('auth','private')")=='0','Use empty local DB'
sql((root/'local_bootstrap.sql').read_text());sql((root/'migration.sql').read_text())
assert sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'ai_rewrite_%' and c.relkind='r' and not c.relrowsecurity")=='0'
assert sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','public') and p.proname like 'ai_rewrite_%' and has_function_privilege('anon',p.oid,'execute')")=='0'
assert sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'ai_rewrite_%' and c.relkind='r' and (has_table_privilege('authenticated',c.oid,'select,insert,update,delete') or has_table_privilege('anon',c.oid,'select,insert,update,delete'))")=='0'
u=str(uuid.uuid4());sess=str(uuid.uuid4())
sql(f"insert into auth.users values('{u}',false,now(),null); insert into auth.sessions values('{sess}','{u}')")
def call(q,ok=True): return sql(f"set role authenticated; set request.jwt.claim.sub='{u}'; set request.jwt.claims='{{\"session_id\":\"{sess}\"}}'; {q}",ok)
call('select * from private.ai_rewrite_requests',False)
sql('set role anon; select public.ai_rewrite_consent_status()',False)
assert json.loads(call('select public.ai_rewrite_consent_status()'))['revision']==0
c=json.loads(call("select public.ai_rewrite_grant_consent(0,'groq-full-resume-account-v1')"));cid=c['consent_id'];assert c['granted'] and c['revision']==1
call("select public.ai_rewrite_grant_consent(0,'groq-full-resume-account-v1')",False)
def reserve(i): return call(f"select public.ai_rewrite_reserve('{i}','{cid}',1)")
assert reserve(uuid.uuid4())=='f' # disabled/no entitlement
sql('update private.ai_rewrite_config set enabled=true,global_daily_cap=3,user_daily_cap=10')
assert reserve(uuid.uuid4())=='f' # no self enrollment
sql(f"insert into private.ai_rewrite_entitlements values('{u}',true,now()+interval '1 hour')")
request=str(uuid.uuid4())
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: results=list(pool.map(reserve,[request]*8))
assert results.count('t')==1,results
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: results=list(pool.map(reserve,[uuid.uuid4() for _ in range(8)]))
assert results.count('t')==2,results
assert sql('select count(*) from private.ai_rewrite_requests')=='3'
assert call(f"select public.ai_rewrite_can_deliver('{request}')")=='t'
rev=json.loads(call('select public.ai_rewrite_revoke_consent(1)'));assert not rev['granted'] and rev['revision']==2
assert call(f"select public.ai_rewrite_can_deliver('{request}')")=='f'
assert reserve(uuid.uuid4())=='f'
c=json.loads(call("select public.ai_rewrite_grant_consent(2,'groq-full-resume-account-v1')")); cid=c['consent_id']
sql('update private.ai_rewrite_config set global_daily_cap=9,user_daily_cap=3')
assert call(f"select public.ai_rewrite_reserve('{uuid.uuid4()}','{cid}',3)")=='f' # user cap independently
sql(f"update auth.users set is_anonymous=true where id='{u}'")
call('select public.ai_rewrite_consent_status()',False)
sql(f"update auth.users set is_anonymous=false,email_confirmed_at=null where id='{u}'")
call('select public.ai_rewrite_consent_status()',False)
sql(f"update auth.users set email_confirmed_at=now() where id='{u}'")
sql(f"delete from auth.sessions where id='{sess}'")
call('select public.ai_rewrite_consent_status()',False)
print('PASS: private/anon denial, consent revisions, no enrollment, concurrent dedupe/global cap, revoke delivery, logout. Local mocked Auth only.')
