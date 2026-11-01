/* Real production quota signer + HTTP codec against owned native SQL; not PostgREST/Auth. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict'),http=require('node:http'),{execFile}=require('node:child_process');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
if(process.env.JOBMATCH_LOCAL_AUTH_QUOTA_TEST!=='1'||!['127.0.0.1','::1'].includes(process.env.PGHOST)||!/^quota_native$/.test(process.env.PGDATABASE??'')||['PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS'].some(k=>process.env[k]))throw Error('Owned loopback quota fixture required');
const {consumeAuthQuota}=require('../../lib/auth-quota.ts');
let calls=0,unexpected=0,failed=false;
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url!=='/rest/v1/rpc/consume_auth_quota'||req.method!=='POST'){unexpected++;throw Error();}
  calls++;assert.equal(req.headers.apikey,'synthetic-publishable');assert.equal(req.headers.authorization,undefined);
  let data='';for await(const c of req){data+=c;if(data.length>1024)throw Error();}
  assert.ok(!data.includes('native@example.test'));
  const b=JSON.parse(data);assert.deepEqual(Object.keys(b).sort(),['p_scope','p_signature','p_subject','p_timestamp']);
  assert.ok(['credentials','mail','refresh','exchange','update'].includes(b.p_scope));assert.match(b.p_subject,/^[a-f0-9]{64}$/);assert.match(b.p_signature,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(b.p_timestamp));
  const result=await new Promise((resolve,reject)=>{const child=execFile('psql',['-X','-qAt','-w','-v','ON_ERROR_STOP=1'],{timeout:5000,maxBuffer:4096},(e,out)=>e?reject(Error('SQL refusal')):resolve(out.trim()));child.stdin.end(`set role anon;select to_jsonb(public.consume_auth_quota('${b.p_scope}','${b.p_subject}',${b.p_timestamp},'${b.p_signature}'));`);});
  assert.ok(result==='true'||result==='false');res.writeHead(200,{'content-type':'application/json'});res.end(result);
 }catch{res.writeHead(503,{'content-type':'application/json'});res.end('{}');}
});
(async()=>{
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));process.env.SUPABASE_URL='http://127.0.0.1:'+server.address().port;process.env.SUPABASE_PUBLISHABLE_KEY='synthetic-publishable';process.env.JOBMATCH_AUTH_QUOTA_MODE='required';process.env.JOBMATCH_AUTH_QUOTA_SECRET='a'.repeat(64);
  const minute=Math.floor(Date.now()/60000);
  for(const [scope,max] of [['credentials',10],['mail',3],['refresh',10],['exchange',5],['update',5]]){
   for(let i=0;i<max;i++)await consumeAuthQuota(scope,'native@example.test');
   await assert.rejects(consumeAuthQuota(scope,'native@example.test'),{message:'RATE'});
  }
  process.env.JOBMATCH_AUTH_QUOTA_SECRET='b'.repeat(64);await assert.rejects(consumeAuthQuota('mail','other-native@example.test'),{status:503,code:'AUTH_PROTECTION_UNAVAILABLE'});
  process.env.JOBMATCH_AUTH_QUOTA_SECRET='';const before=calls;await assert.rejects(consumeAuthQuota('mail','other-native@example.test'),{status:503});assert.equal(calls,before);assert.equal(unexpected,0);
  assert.equal(Math.floor(Date.now()/60000),minute,'Fixture crossed a quota window');
  process.stdout.write('PASS: actual production HMAC signer + bounded HTTP codec -> anon native PostgreSQL RPC, all five subject ceilings, wrong/missing key refusal, no Auth/mail/provider calls. Fixture HTTP is not PostgREST acceptance.\n');
 }catch{failed=true;process.stderr.write('FAIL: owned native quota bridge; no request, DB diagnostics or keys printed.\n');}
 finally{server.closeAllConnections();await new Promise(r=>server.close(r));process.exitCode=failed?1:0;}
})();
