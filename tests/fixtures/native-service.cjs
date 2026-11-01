/* Actual service route -> loopback HTTP fixture -> native PostgreSQL. Auth identity is synthetic. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript'),http=require('node:http'),assert=require('node:assert/strict'),{execFile}=require('node:child_process');
const owner='11111111-1111-4111-8111-111111111111',session='44444444-4444-4444-8444-444444444444';
if(process.env.JOBMATCH_LOCAL_PROFILE_COMMANDS!=='1'||!['127.0.0.1','::1'].includes(process.env.PGHOST)||!/^jobmatch_profile_[a-f0-9]{32}$/.test(process.env.PGDATABASE??'')||['PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS'].some(k=>process.env[k]))throw Error('Owned profile fixture required');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
const {NextRequest}=require('next/server'),{POST,GET}=require('../../app/api/service/route.ts');
const literal=v=>"'"+String(v).replaceAll("'","''")+"'",traces=[];
function pg(statement){return new Promise((resolve,reject)=>{
 const child=execFile('psql',['-X','-qAt','-w','-v','ON_ERROR_STOP=1'],{timeout:8000,maxBuffer:2000000},(error,out,stderr)=>{
  if(error){const code=['CONFLICT','INVALID_WRITE','AUTH'].find(c=>new RegExp('ERROR:\\s+'+c+'(?:\\s|$)').test(stderr));reject(Error(code??'FIXTURE_REFUSED'));return;}
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
   else if(req.url==='/rest/v1/rpc/consume_quota'){assert.deepEqual(Object.keys(b),['p_bucket']);assert.ok(['service','analysis'].includes(b.p_bucket));statement='select to_jsonb(public.consume_quota('+literal(b.p_bucket)+'));';}
   else if(req.url==='/rest/v1/rpc/read_workspace'){assert.deepEqual(b,{});statement='select public.read_workspace();';}
   else if(req.url==='/rest/v1/rpc/apply_workspace_command'){
    assert.deepEqual(Object.keys(b).sort(),['p_command','p_revision']);assert.ok(Number.isSafeInteger(b.p_revision)&&b.p_revision>=0);
    statement='select public.apply_workspace_command('+b.p_revision+','+literal(JSON.stringify(b.p_command))+'::jsonb);';
   }else if(req.url==='/rest/v1/rpc/save_workspace'){
    assert.deepEqual(Object.keys(b).sort(),['p_action','p_payload','p_revision']);assert.ok(Number.isSafeInteger(b.p_revision)&&b.p_revision>=0);assert.ok(['version','restore'].includes(b.p_action));
    statement='select to_jsonb(public.save_workspace('+b.p_revision+','+literal(JSON.stringify(b.p_payload))+'::jsonb,'+literal(b.p_action)+'));';
   }else throw Error('FIXTURE_ROUTE');
   value=await pg(statement);
  }
 }catch(error){status=error.message==='AUTH'?401:['CONFLICT','INVALID_WRITE'].includes(error.message)?400:503;value={message:['AUTH','CONFLICT','INVALID_WRITE'].includes(error.message)?error.message:'FIXTURE_REFUSED'};}
 res.writeHead(status,{'content-type':'application/json','connection':'close'});res.end(JSON.stringify(value));
});
server.requestTimeout=10000;server.maxConnections=8;
(async()=>{let failed=false;try{
 const [input,output]=process.argv.slice(2),operations=JSON.parse(fs.readFileSync(input,'utf8')).operations;
 await new Promise(r=>server.listen(0,'127.0.0.1',r));process.env.SUPABASE_URL='http://127.0.0.1:'+server.address().port;process.env.SUPABASE_PUBLISHABLE_KEY='synthetic-publishable';process.env.JOBMATCH_AUTH_QUOTA_MODE='local';
 const request=(method,body)=>new NextRequest('https://application-fixture.test/api/service',{method,headers:{origin:'https://application-fixture.test',cookie:'jm_access=synthetic-session'},...(body?{body:JSON.stringify(body)}:{})});
 const first=await GET(request('GET'));assert.equal(first.status,200);let state=await first.json(),analysis;const results=[];
 for(const operation of operations){
  const {expectedStatus=200,selectAllEdits,selectFirstFact,...intent}=operation;
  if(selectAllEdits){assert.ok(analysis);intent.ids=analysis.edits.map(e=>e.id);}
  if(selectFirstFact){assert.ok(state.facts.length);intent.ids=[state.facts[0].id];}
  const start=traces.length,response=await POST(request('POST',{revision:state.revision,expectedOwnerId:owner,...intent}));assert.equal(response.status,expectedStatus);
  const body=await response.json(),trace=traces.slice(start);
  if(expectedStatus===200&&intent.action==='analyze')analysis=body;
  else if(expectedStatus===200){if(intent.action==='demo'){const {DEMO_RESUME,DEMO_VACANCIES}=require('../../lib/engine.ts');assert.equal(body.original,DEMO_RESUME);assert.equal(body.vacancy,DEMO_VACANCIES[0].text);}assert.equal(body.ownerId,owner);assert.equal(body.revision,state.revision+1);state=body;}
  if(['import','demo','fact'].includes(intent.action)){
   assert.ok(!trace.some(t=>t.path==='/rest/v1/rpc/read_workspace'||t.path==='/rest/v1/rpc/save_workspace'));
   if(expectedStatus===200){const cmd=trace.filter(t=>t.path==='/rest/v1/rpc/apply_workspace_command');assert.equal(cmd.length,1);assert.deepEqual(cmd[0].commandKeys,intent.action==='demo'?['action','text','vacancy']:['action','text']);}
  }
  results.push({action:intent.action,status:response.status,state,trace});
 }
 fs.writeFileSync(output,JSON.stringify({state,results}));
}catch{failed=true;process.stderr.write('FAIL: actual service/native SQL fixture; no request/DB diagnostics/rows/keys printed.\n');}
finally{server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));process.exitCode=failed?1:0;}})();
