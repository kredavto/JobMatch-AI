/* Actual service route -> loopback HTTP fixture -> native PostgreSQL. Auth identity is synthetic. */
/* eslint-disable @typescript-eslint/no-require-imports */
const https=require('node:https');
const fs=require('node:fs'),ts=require('typescript'),http=require('node:http'),assert=require('node:assert/strict'),{execFile}=require('node:child_process');
const owner='11111111-1111-4111-8111-111111111111',session='44444444-4444-4444-8444-444444444444';
const ownedProfile=process.env.JOBMATCH_LOCAL_PROFILE_COMMANDS==='1'&&/^jobmatch_profile_[a-f0-9]{32}$/.test(process.env.PGDATABASE??'');
const ownedVersion=process.env.JOBMATCH_LOCAL_VERSION_COMMANDS==='1'&&/^jobmatch_versions_[a-f0-9]{32}$/.test(process.env.PGDATABASE??'');
const ownedParity=process.env.JOBMATCH_LOCAL_PARITY==='1'&&/^jobmatch_parity_[a-f0-9]{32}$/.test(process.env.PGDATABASE??'');
const ownedCanonical=process.env.JOBMATCH_LOCAL_CANONICAL==='1'&&/^jobmatch_canonical_[a-f0-9]{32}$/.test(process.env.PGDATABASE??'');
const ownedExplicit=process.env.JOBMATCH_LOCAL_EXPLICIT==='1'&&/^jobmatch_explicit_[a-f0-9]{32}$/.test(process.env.PGDATABASE??'');
const ownedLogical=process.env.JOBMATCH_LOCAL_LOGICAL_BACKUPS==='1'&&/^jobmatch_logical_[a-f0-9]{32}$/.test(process.env.PGDATABASE??'');
const ownedCompact=process.env.JOBMATCH_LOCAL_COMPACT==='1'&&/^jobmatch_compact_[a-f0-9]{32}$/.test(process.env.PGDATABASE??'');
const ownedParserCore=process.env.JOBMATCH_LOCAL_PARSER_CORE==='1'&&/^jobmatch_parser_core_[a-f0-9]{32}$/.test(process.env.PGDATABASE??'');
if(!(ownedProfile||ownedVersion||ownedParity||ownedCanonical||ownedExplicit||ownedLogical||ownedCompact||ownedParserCore)||!['127.0.0.1','::1'].includes(process.env.PGHOST)||['PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS'].some(k=>process.env[k]))throw Error('Owned protocol fixture required');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
const {NextRequest}=require('next/server'),{POST,GET}=require('../../app/api/service/route.ts');
const {POST:IMPORT_POST}=require('../../app/api/import/route.ts'),{ImportDraftSchema}=require('../../lib/parser-contract.ts');
let gatewayProxy,gatewayRequests=0,proxyLeak=false,fixtureStage='startup',fixtureStatus=0;
const literal=v=>"'"+String(v).replaceAll("'","''")+"'",traces=[];let concurrentGoal=false;
function pg(statement){return new Promise((resolve,reject)=>{
 const child=execFile('psql',['-X','-qAt','-w','-v','ON_ERROR_STOP=1'],{timeout:8000,maxBuffer:2000000},(error,out,stderr)=>{
  if(error){const code=['CONFLICT','INVALID_WRITE','PROJECTION_CONFLICT','AUTH'].find(c=>new RegExp('ERROR:\\s+'+c+'(?:\\s|$)').test(stderr));reject(Error(code??'FIXTURE_REFUSED'));return;}
  try{resolve(JSON.parse(out.trim()));}catch{reject(Error('FIXTURE_PROTOCOL'));}
 });
 child.stdin.end('set role authenticated;set request.jwt.claims='+literal(JSON.stringify({sub:owner,session_id:session}))+';'+statement);
});}
const server=http.createServer(async(req,res)=>{
 let status=200,value;
 try{
  assert.equal(req.headers.apikey,'synthetic-publishable');assert.equal(req.headers.authorization,'Bearer synthetic-session');
  if(req.method==='GET'&&req.url==='/auth/v1/user'){traces.push({path:req.url,keys:[]});value={id:owner};}
  else{
   assert.equal(req.method,'POST');let raw='';for await(const c of req){raw+=c;if(raw.length>400000)throw Error('FIXTURE_PROTOCOL');}const b=JSON.parse(raw);traces.push({path:req.url,keys:Object.keys(b).sort(),commandKeys:b.p_command?Object.keys(b.p_command).sort():[]});
   let statement;
   if(req.url==='/rest/v1/rpc/session_is_active'){assert.deepEqual(b,{});statement='select to_jsonb(public.session_is_active());';}
   else if(req.url==='/rest/v1/rpc/consume_quota'){assert.deepEqual(Object.keys(b),['p_bucket']);assert.ok(['service','analysis','import'].includes(b.p_bucket));statement='select to_jsonb(public.consume_quota('+literal(b.p_bucket)+'));';}
   else if(req.url==='/rest/v1/rpc/read_workspace'){assert.deepEqual(b,{});statement='select public.read_workspace();';}
   else if(req.url==='/rest/v1/rpc/apply_workspace_command'){
    assert.deepEqual(Object.keys(b).sort(),['p_command','p_revision']);assert.ok(Number.isSafeInteger(b.p_revision)&&b.p_revision>=0);
    if(concurrentGoal&&b.p_command.action==='version'){concurrentGoal=false;await pg('select public.apply_workspace_command('+b.p_revision+','+literal(JSON.stringify({action:'goal',text:'Concurrent owned goal'}))+'::jsonb);');}
    statement='select public.apply_workspace_command('+b.p_revision+','+literal(JSON.stringify(b.p_command))+'::jsonb);';
   }else if(req.url==='/rest/v1/rpc/save_workspace'){
    assert.deepEqual(Object.keys(b).sort(),['p_action','p_payload','p_revision']);assert.ok(Number.isSafeInteger(b.p_revision)&&b.p_revision>=0);assert.ok(['version','restore'].includes(b.p_action));
    statement='select to_jsonb(public.save_workspace('+b.p_revision+','+literal(JSON.stringify(b.p_payload))+'::jsonb,'+literal(b.p_action)+'));';
   }else throw Error('FIXTURE_ROUTE');
   value=await pg(statement);
  }
 }catch(error){status=error.message==='AUTH'?401:['CONFLICT','INVALID_WRITE','PROJECTION_CONFLICT'].includes(error.message)?400:503;value={message:['AUTH','CONFLICT','INVALID_WRITE','PROJECTION_CONFLICT'].includes(error.message)?error.message:'FIXTURE_REFUSED'};}
 res.writeHead(status,{'content-type':'application/json','connection':'close'});res.end(JSON.stringify(value));
});
server.requestTimeout=10000;server.maxConnections=8;
async function startGatewayProxy(){
 if(!ownedParserCore)return;
 if(!process.env.NODE_EXTRA_CA_CERTS||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')throw Error('TLS_FIXTURE_REQUIRED');
 const token=process.env.PARSER_WORKER_TOKEN;assert.ok(/^[A-Za-z0-9_-]{32,128}$/.test(token??''));
 gatewayProxy=https.createServer({key:fs.readFileSync(process.env.JOBMATCH_PARSER_CORE_TLS_KEY),cert:fs.readFileSync(process.env.JOBMATCH_PARSER_CORE_TLS_CERT)},(req,res)=>{
  try{
   gatewayRequests++;const headers=JSON.stringify(req.headers);
   if(req.url!=='/extract'||req.method!=='POST'||req.headers.authorization!=='Bearer '+token||req.headers.cookie||req.headers.apikey||headers.includes(owner)||headers.includes('synthetic-session')||headers.includes('private-owner-resume'))throw Error('HEADER_LEAK');
   const upstream=http.request({hostname:'127.0.0.1',port:8081,path:'/extract',method:'POST',headers:{...req.headers,host:'127.0.0.1:8081'}},remote=>{res.writeHead(remote.statusCode??503,remote.headers);remote.pipe(res);});
   upstream.on('error',()=>{if(!res.destroyed&&!res.headersSent){res.writeHead(503,{'content-type':'application/json','cache-control':'no-store','connection':'close'});res.end(JSON.stringify({ok:false,code:'UNAVAILABLE'}));}});
   req.once('aborted',()=>upstream.destroy());res.once('close',()=>upstream.destroy());req.pipe(upstream);
  }catch{proxyLeak=true;if(!res.destroyed){res.writeHead(503,{'connection':'close'});res.end();}}
 });
 gatewayProxy.on('tlsClientError',()=>{});gatewayProxy.requestTimeout=30000;gatewayProxy.maxConnections=8;
 await new Promise(r=>gatewayProxy.listen(0,'127.0.0.1',r));
 process.env.IMPORT_PARSER_MODE='worker';process.env.IMPORT_PARSER_URL='https://127.0.0.1:'+gatewayProxy.address().port+'/extract';process.env.IMPORT_PARSER_TOKEN=token;
}

async function waitOwnedGateway(){
 // Readiness probes only: extraction is sent exactly once, never automatically replayed.
 const deadline=Date.now()+15000;
 while(Date.now()<deadline){
  try{const response=await fetch('http://127.0.0.1:8081/health',{signal:AbortSignal.timeout(1000)});if(response.ok&&(await response.json()).ok===true)return;}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 throw Error('OWNED_GATEWAY_NOT_READY');
}

(async()=>{let failed=false;try{
 const [input,output]=process.argv.slice(2),operations=JSON.parse(fs.readFileSync(input,'utf8')).operations;
 await new Promise(r=>server.listen(0,'127.0.0.1',r));process.env.SUPABASE_URL='http://127.0.0.1:'+server.address().port;process.env.SUPABASE_PUBLISHABLE_KEY='synthetic-publishable';process.env.JOBMATCH_AUTH_QUOTA_MODE='local';
 await startGatewayProxy();
 const request=(method,body)=>new NextRequest('https://application-fixture.test/api/service',{method,headers:{origin:'https://application-fixture.test',cookie:'jm_access=synthetic-session'},...(body?{body:JSON.stringify(body)}:{})});
 fixtureStage='initial-read';const first=await GET(request('GET'));fixtureStatus=first.status;assert.equal(first.status,200);let state=await first.json(),analysis,lastExtracted;const results=[];
 for(const operation of operations){
  const {expectedStatus=200,selectAllEdits,selectFactContaining,restoreLatest,injectConcurrentGoal,uploadFixture,uploadOwner,useExtractedText,...intent}=operation;
  if(uploadFixture){
   assert.ok(ownedParserCore);assert.ok(['txt','docx','pdf','bad-txt'].includes(uploadFixture));lastExtracted=undefined;
   fixtureStage='extract-'+uploadFixture+'-readiness';if(expectedStatus!==503&&(!uploadOwner||uploadOwner===owner))await waitOwnedGateway();
   const generators=await import('../../worker/tests/documents.mjs'),extension=uploadFixture==='bad-txt'?'txt':uploadFixture;
   const bytes=uploadFixture==='docx'?await generators.docx():uploadFixture==='pdf'?generators.pdf():uploadFixture==='bad-txt'?Buffer.from([0xff,0xfe,0xfd]):Buffer.from('SQL\nSynthetic parser profile\nRust');
   const form=new FormData();form.set('file',new File([bytes],'private-owner-resume.'+extension));
   const start=traces.length,count=gatewayRequests,response=await IMPORT_POST(new NextRequest('https://application-fixture.test/api/import',{method:'POST',headers:{origin:'https://application-fixture.test',cookie:'jm_access=synthetic-session','x-jobmatch-owner':uploadOwner??owner},body:form}));
   fixtureStage='extract-'+uploadFixture+'-status';fixtureStatus=response.status;assert.equal(response.status,expectedStatus);fixtureStage='extract-'+uploadFixture+'-headers';assert.equal(response.headers.get('cache-control'),'no-store');const body=await response.json(),trace=traces.slice(start);
   fixtureStage='extract-'+uploadFixture+'-draft';if(expectedStatus===200){const draft=ImportDraftSchema.parse(body);assert.ok(draft.text.includes('SQL'));lastExtracted=draft.text;}
   else assert.ok(!Object.hasOwn(body,'text'));
   fixtureStage='extract-'+uploadFixture+'-trace';assert.ok(!trace.some(t=>['/rest/v1/rpc/apply_workspace_command','/rest/v1/rpc/save_workspace','/rest/v1/rpc/read_workspace'].includes(t.path)));
   if(uploadOwner&&uploadOwner!==owner)assert.equal(gatewayRequests,count);else assert.equal(gatewayRequests,count+1);
   results.push({action:'extract',status:response.status,state,trace,...(lastExtracted?{draft:{text:lastExtracted}}:{}),gatewayRequests:gatewayRequests-count});continue;
  }
  if(useExtractedText){assert.ok(ownedParserCore);assert.equal(intent.action,'import');assert.equal(typeof lastExtracted,'string');intent.text=lastExtracted;}
  if(selectAllEdits){assert.ok(analysis);intent.ids=analysis.edits.map(e=>e.id);}
  if(selectFactContaining){const found=state.facts.find(f=>f.text.includes(selectFactContaining));assert.ok(found);intent.ids=[found.id];}
  if(restoreLatest){assert.ok(state.versions.length);intent.id=state.versions.at(-1).id;}
  if(injectConcurrentGoal){assert.equal(intent.action,'version');concurrentGoal=true;}
  fixtureStage='service-'+intent.action;const start=traces.length,response=await POST(request('POST',{revision:state.revision,expectedOwnerId:owner,...intent}));assert.equal(response.status,expectedStatus);
  const body=await response.json(),trace=traces.slice(start);
  if(expectedStatus===200&&intent.action==='analyze')analysis=body;
  else if(expectedStatus===200){if(intent.action==='demo'){const {DEMO_RESUME,DEMO_VACANCIES}=require('../../lib/engine.ts');assert.equal(body.original,DEMO_RESUME);assert.equal(body.vacancy,DEMO_VACANCIES[0].text);}assert.equal(body.ownerId,owner);assert.equal(body.revision,state.revision+1);state=body;}
  if(['import','demo','fact','restore'].includes(intent.action)){
   assert.ok(!trace.some(t=>t.path==='/rest/v1/rpc/read_workspace'||t.path==='/rest/v1/rpc/save_workspace'));
   if(expectedStatus===200){const cmd=trace.filter(t=>t.path==='/rest/v1/rpc/apply_workspace_command');assert.equal(cmd.length,1);assert.deepEqual(cmd[0].commandKeys,intent.action==='demo'?['action','text','vacancy']:intent.action==='restore'?['action','id']:['action','text']);}
  }
  if(intent.action==='version'){assert.equal(trace.filter(t=>t.path==='/rest/v1/rpc/read_workspace').length,1);assert.ok(!trace.some(t=>t.path==='/rest/v1/rpc/save_workspace'));}
  results.push({action:intent.action,status:response.status,state,trace});
 }
 assert.equal(proxyLeak,false);fs.writeFileSync(output,JSON.stringify({state,results,...(ownedParserCore?{gatewayRequests}:{} )}));
}catch{failed=true;if(ownedParserCore){const output=process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify({fixtureFailure:{stage:fixtureStage,status:fixtureStatus,gatewayRequests,proxyLeak}}));}process.stderr.write('FAIL: actual service/native SQL fixture; no request/DB diagnostics/rows/keys printed.\n');}
finally{if(gatewayProxy){gatewayProxy.closeAllConnections();if(gatewayProxy.listening)await new Promise(r=>gatewayProxy.close(r));}server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));process.exitCode=failed?1:0;}})();
