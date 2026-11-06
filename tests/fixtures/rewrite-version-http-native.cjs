/* Owned loopback RPC gateway + real PG17 + production Next handlers/codecs.
 * Auth envelope and proposals are authored fixtures, never provider/model proof. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),http=require('node:http'),ts=require('typescript'),assert=require('node:assert/strict'),{execFile}=require('node:child_process');
if(process.env.JOBMATCH_LOCAL_REWRITE_VERSIONS!=='1'||process.env.JOBMATCH_LOCAL_SOURCE_VERSIONS!=='1'||!['127.0.0.1','::1'].includes(process.env.PGHOST)||!/^jobmatch_source_versions_[a-f0-9]{32}$/.test(process.env.PGDATABASE??'')||['PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS'].some(k=>process.env[k]))throw Error('OWNED_REWRITE_FIXTURE_REQUIRED');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
const {NextRequest}=require('next/server'),{GET,POST}=require('../../app/api/rewrite-versions/route.ts'),{readWorkspace,applyWorkspaceCommand}=require('../../lib/db.ts'),{reviewedVersionFixture}=require('./rewrite-version.ts'),{rewriteConfig}=require('../../lib/ai-rewrite-provider.ts');
const [input,output]=process.argv.slice(2),stat=fs.statSync(input);assert.ok(stat.isFile()&&stat.size<=4096);
const {owner,session}=JSON.parse(fs.readFileSync(input,'utf8'));for(const id of [owner,session])assert.match(id,/^[a-f0-9-]{36}$/);
const literal=v=>"'"+String(v).replaceAll("'","''")+"'",user={id:owner,token:'public-owned-rewrite-session'};
let writes=0,fault=null,stage='startup',calls=0,networkLeak=false;
function pg(statement,admin=false){return new Promise((resolve,reject)=>{
 const child=execFile('psql',['-X','-qAt','-w','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],{timeout:10000,maxBuffer:20*1024*1024},(error,out,stderr)=>{
  if(error){const known=['AUTH','CONFLICT','INVALID_WRITE','REWRITE_STORAGE_UNAVAILABLE'].find(code=>new RegExp('ERROR:\\s+[0-9A-Z]{5}:\\s+'+code+'(?:\\s|$)').test(stderr));reject(Error(known??'OWNED_SQL_REFUSED'));return;}
  try{resolve(out.trim()?JSON.parse(out.trim()):null);}catch{reject(Error('OWNED_SQL_RESPONSE'));}
 });child.stdin.end((admin?'':"set role authenticated;set request.jwt.claims="+literal(JSON.stringify({sub:owner,session_id:session}))+';')+statement);
});}
const server=http.createServer(async(req,res)=>{
 let value,status=200;calls++;
 try{
  assert.equal(req.headers.apikey,'public-owned-publishable');assert.equal(req.headers.authorization,'Bearer '+user.token);
  if(req.method==='GET'&&req.url==='/auth/v1/user')value={id:owner};
  else{
   assert.equal(req.method,'POST');let raw=Buffer.alloc(0);for await(const chunk of req){raw=Buffer.concat([raw,chunk]);assert.ok(raw.length<=524288);}const b=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw));let statement;
   const none=()=>assert.deepEqual(b,{});
   if(req.url==='/rest/v1/rpc/session_is_active'){none();statement='select to_jsonb(public.session_is_active());';}
   else if(req.url==='/rest/v1/rpc/consume_quota'){assert.deepEqual(b,{p_bucket:'service'});statement="select to_jsonb(public.consume_quota('service'));";}
   else if(req.url==='/rest/v1/rpc/read_workspace'){none();statement='select public.read_workspace();';}
   else if(req.url==='/rest/v1/rpc/rewrite_history_ready'){none();statement='select to_jsonb(public.rewrite_history_ready());';}
   else if(req.url==='/rest/v1/rpc/rewrite_storage_ready'){assert.deepEqual(Object.keys(b).sort(),['p_configuration_id','p_key_id']);statement='select to_jsonb(public.rewrite_storage_ready('+literal(b.p_key_id)+','+literal(b.p_configuration_id)+'));';}
   else if(req.url==='/rest/v1/rpc/accept_rewrite_version'){
    assert.deepEqual(Object.keys(b).sort(),['p_accept','p_configuration_id','p_key_id','p_match_metadata','p_payload','p_revision','p_score','p_signature']);assert.ok(Number.isSafeInteger(b.p_revision)&&Number.isSafeInteger(b.p_score));
    writes++;statement='select public.accept_rewrite_version('+[b.p_revision,literal(b.p_payload),literal(b.p_signature),literal(b.p_key_id),literal(b.p_configuration_id),b.p_score,literal(JSON.stringify(b.p_match_metadata))+'::jsonb',literal(b.p_accept)].join(',')+');';
   }else if(req.url==='/rest/v1/rpc/apply_workspace_command'){
    assert.deepEqual(Object.keys(b).sort(),['p_command','p_revision']);assert.ok(Number.isSafeInteger(b.p_revision));assert.ok(['goal','restore'].includes(b.p_command.action));statement='select public.apply_workspace_command('+b.p_revision+','+literal(JSON.stringify(b.p_command))+'::jsonb);';
   }else throw Error('OWNED_ROUTE_REFUSED');
   value=await pg(statement);
   if(req.url==='/rest/v1/rpc/accept_rewrite_version'&&fault){const current=fault;fault=null;if(current==='lost'){req.socket.destroy();return;}value.version.text+='CORRUPTED_ACK_ONLY';}
  }
 }catch(error){status=error.message==='AUTH'?401:['CONFLICT','INVALID_WRITE','REWRITE_STORAGE_UNAVAILABLE'].includes(error.message)?400:503;value={message:['AUTH','CONFLICT','INVALID_WRITE','REWRITE_STORAGE_UNAVAILABLE'].includes(error.message)?error.message:'OWNED_FIXTURE_REFUSED'};}
 res.writeHead(status,{'content-type':'application/json','connection':'close'});res.end(JSON.stringify(value));
});server.requestTimeout=15000;server.maxConnections=8;
const originalFetch=globalThis.fetch;
(async()=>{let failed=false;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 Object.assign(process.env,{SUPABASE_URL:base,SUPABASE_PUBLISHABLE_KEY:'public-owned-publishable',JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_ENDPOINT:'http://127.0.0.1:1/api/chat',JOBMATCH_AI_MODEL:'public-unaccepted-fixture',JOBMATCH_AI_TOKEN:'public-authored-token-only',JOBMATCH_LETTER_SIGNING_SECRET:'ab'.repeat(32),JOBMATCH_AI_REWRITE_ENABLED:'true',JOBMATCH_AI_REWRITE_REVIEW_ENABLED:'true',JOBMATCH_AI_REWRITE_STORAGE_ENABLED:'false',JOBMATCH_OPS_TELEMETRY:'off',NODE_ENV:'test'});
 globalThis.fetch=(url,options)=>{if(typeof url!=='string'||!url.startsWith(base+'/')){networkLeak=true;throw Error('NETWORK_SCOPE_REFUSED');}return originalFetch(url,options);};
 const request=(body)=>new NextRequest('https://owned-app.test/api/rewrite-versions',{method:'POST',headers:{origin:'https://owned-app.test',cookie:'jm_access='+user.token},body:JSON.stringify(body)});
 const history=()=>new NextRequest('https://owned-app.test/api/rewrite-versions?expectedOwnerId='+owner,{headers:{cookie:'jm_access='+user.token}});
 const find=id=>new NextRequest(history().url+'&id='+id,{headers:history().headers});
 const current=()=>readWorkspace(user);
 const sign=async()=>reviewedVersionFixture({...await current(),ownerId:owner},{configurationId:rewriteConfig().configurationId});
 const body=f=>({action:'accept',expectedOwnerId:owner,revision:f.state.revision,receipt:f.receipt,consentToStore:true,accept:'STORE_REVIEWED_AI_REWRITE'});
 const configure=async(enabled=true)=>pg("create or replace function private.rewrite_storage_configuration() returns text language sql stable security invoker set search_path='' as $$select "+(enabled?literal(rewriteConfig().configurationId):'null')+"::text;$$;",true);
 await pg("update private.letter_signing_config set signing_key=decode('"+'ab'.repeat(32)+"','hex') where singleton;",true);
 stage='closed-default';const first=await sign();assert.equal((await POST(request(body(first)))).status,503);assert.equal(writes,0);assert.equal((await GET(history())).status,200);
 process.env.JOBMATCH_AI_REWRITE_STORAGE_ENABLED='true';assert.equal((await POST(request(body(first)))).status,503);assert.equal(writes,0);await configure();
 stage='native-write-and-ordinary-command';const response=await POST(request(body(first)));assert.equal(response.status,200);const saved=await response.json();assert.equal(saved.version.text,first.review.text);assert.equal(saved.workspaceRevision,first.state.revision+1);assert.equal(writes,1);
 const state=await current();assert.equal(state.original,first.state.original);assert.deepEqual(state.facts,first.state.facts);assert.equal(state.versions.length,1);
 assert.equal((await POST(request(body(first)))).status,409);assert.equal(writes,1);
 const ordinary=await applyWorkspaceCommand(user,state.revision,{action:'goal',text:'Owned unrelated goal'});assert.equal(ordinary.versions[0].text,saved.version.text);
 const restored=await applyWorkspaceCommand(user,ordinary.revision,{action:'restore',id:saved.version.id});assert.equal(restored.versions.length,2);assert.deepEqual(restored.versions[1].ai_rewrite,saved.version.ai_rewrite);assert.equal(restored.versions[1].restored_from,saved.version.id);
 stage='expiry-key-rotation-disabled-history';await configure(false);await pg("update private.letter_signing_config set signing_key=decode('"+'cd'.repeat(32)+"','hex') where singleton;",true);
 for(const key of ['JOBMATCH_AI_ENABLED','JOBMATCH_AI_SELF_HOSTED','JOBMATCH_AI_REWRITE_ENABLED','JOBMATCH_AI_REWRITE_REVIEW_ENABLED','JOBMATCH_AI_REWRITE_STORAGE_ENABLED'])process.env[key]='false';process.env.JOBMATCH_LETTER_SIGNING_SECRET='';
 const now=Date.now;Date.now=()=>now()+601000;try{const response=await GET(find(saved.version.id));assert.equal(response.status,200);const row=(await response.json()).versions[0];assert.equal(row.text,first.review.text);assert.equal(row.ai_rewrite.modelAcceptance,'not-accepted');}finally{Date.now=now;}
 for(const key of ['JOBMATCH_AI_ENABLED','JOBMATCH_AI_SELF_HOSTED','JOBMATCH_AI_REWRITE_ENABLED','JOBMATCH_AI_REWRITE_REVIEW_ENABLED','JOBMATCH_AI_REWRITE_STORAGE_ENABLED'])process.env[key]='true';process.env.JOBMATCH_LETTER_SIGNING_SECRET='ab'.repeat(32);
 await pg("update private.letter_signing_config set signing_key=decode('"+'ab'.repeat(32)+"','hex') where singleton;",true);await configure();
 stage='lost-ACK-and-invalid-ACK-manual-read';for(const mode of ['lost','invalid']){
  const f=await sign(),before=writes;fault=mode;const response=await POST(request(body(f)));assert.equal(response.status,502);const error=await response.json();assert.equal(error.code,mode==='lost'?'AI_REWRITE_VERSION_SAVE_UNKNOWN':'AI_REWRITE_VERSION_WRITE_INVALID');assert.equal(writes,before+1);
  for(let n=0;n<2;n++){const found=await GET(find(f.row.id));assert.equal(found.status,200);const value=await found.json();assert.equal(value.versions.length,1);assert.equal(value.versions[0].text,f.review.text);assert.deepEqual(value.versions[0].ai_rewrite.receipt,f.receipt);}assert.equal(writes,before+1);
 }
 stage='effective-grant-boundary';await pg('grant insert on public.resume_versions to authenticated;',true);try{assert.equal((await GET(history())).status,503);assert.equal(await pg('select to_jsonb(public.rewrite_history_ready());'),false);}finally{await pg('revoke insert on public.resume_versions from authenticated;',true);}
 assert.equal((await GET(history())).status,200);assert.equal(networkLeak,false);assert.equal(writes,3);
 fs.writeFileSync(output,JSON.stringify({format:'jobmatch-owned-rewrite-http-v1',checks:['closed-default','native-write','source-unchanged','revision-replay-refused','ordinary-after-AI','restore-chain','disabled-key-rotated-expired-history','lost-ACK-manual-read','invalid-ACK-manual-read','effective-grant-refusal'],nativeWrites:writes,gatewayRequests:calls,modelRequests:0,authProvider:'authored-owned-envelope',supabaseProviderRestore:'not-performed'}),{flag:'wx',mode:0o600});
 }catch{failed=true;process.exitCode=2;console.error('FAIL: owned rewrite HTTP stage='+stage);}
 finally{globalThis.fetch=originalFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));if(!failed)console.error('PASS: owned rewrite HTTP/native protocol, no model/provider acceptance.');}
})();
