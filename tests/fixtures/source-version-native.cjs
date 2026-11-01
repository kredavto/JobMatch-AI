/* Actual production codecs/routes -> owned loopback bridge -> native SQL; synthetic Auth. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript'),http=require('node:http'),assert=require('node:assert/strict'),{execFile}=require('node:child_process');
if(process.env.JOBMATCH_LOCAL_SOURCE_VERSIONS!=='1'||!/^jobmatch_source_versions_[a-f0-9]{32}$/.test(process.env.PGDATABASE??'')||!['127.0.0.1','::1'].includes(process.env.PGHOST)||['PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS'].some(k=>process.env[k]))throw Error('OWNED_SOURCE_VERSION_FIXTURE_REQUIRED');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
const owner='11111111-1111-4111-8111-111111111111',session='44444444-4444-4444-8444-444444444444';
const codec=require('../../lib/source-version.ts'),{validateSourceProfile}=require('../../lib/source-profile.ts'),{NextRequest}=require('next/server');
const {GET,POST}=require('../../app/api/source-versions/route.ts');
const {OpsObservationSchema,OPS_PREFIX}=require('../../lib/ops-telemetry.ts');
const ops=[],traces=[],originalInfo=console.info;let server,stage='setup';
console.info=line=>{assert.equal(typeof line,'string');assert.ok(line.startsWith(OPS_PREFIX));const value=OpsObservationSchema.parse(JSON.parse(line.slice(OPS_PREFIX.length)));assert.ok(!line.includes(owner)&&!line.includes('PRIVATE')&&!line.includes('synthetic-session'));ops.push(value);};
const literal=value=>"'"+String(value).replaceAll("'","''")+"'";
function pg(statement){return new Promise((resolve,reject)=>{const child=execFile('psql',['-X','-qAt','-w','-v','ON_ERROR_STOP=1'],{timeout:12000,maxBuffer:6000000},(error,out,stderr)=>{if(error){const code=['AUTH','CONFLICT','INVALID_WRITE','UNSAFE_CONTEXT','SOURCE_VERSION_UNAVAILABLE','PROJECTION_CONFLICT'].find(c=>new RegExp('ERROR:\\s+'+c+'(?:\\s|$)').test(stderr));reject(Error(code??'FIXTURE_REFUSED'));return;}try{resolve(JSON.parse(out.trim()));}catch{reject(Error('FIXTURE_PROTOCOL'));}});child.stdin.end('set role authenticated;set request.jwt.claims='+literal(JSON.stringify({sub:owner,session_id:session}))+';'+statement);});}
async function start(){server=http.createServer(async(req,res)=>{let status=200,value;try{
 assert.equal(req.headers.apikey,'synthetic-publishable');assert.equal(req.headers.authorization,'Bearer synthetic-session');
 if(req.method==='GET'&&req.url==='/auth/v1/user'){traces.push({path:req.url,keys:[]});value={id:owner};}
 else{assert.equal(req.method,'POST');let raw='';for await(const c of req){raw+=c;if(raw.length>12000)throw Error('FIXTURE_BODY');}const b=JSON.parse(raw);traces.push({path:req.url,keys:Object.keys(b).sort()});let statement;
  if(req.url==='/rest/v1/rpc/session_is_active'){assert.deepEqual(b,{});statement='select to_jsonb(public.session_is_active());';}
  else if(req.url==='/rest/v1/rpc/consume_quota'){assert.deepEqual(b,{p_bucket:'service'});statement="select to_jsonb(public.consume_quota('service'));";}
  else if(req.url==='/rest/v1/rpc/source_version_storage_ready'){assert.deepEqual(b,{});statement='select to_jsonb(public.source_version_storage_ready());';}
  else if(req.url==='/rest/v1/rpc/list_source_versions'){assert.deepEqual(b,{});statement='select public.list_source_versions();';}
  else if(req.url==='/rest/v1/rpc/read_source_version'){assert.deepEqual(Object.keys(b),['p_id']);statement='select public.read_source_version('+literal(b.p_id)+'::uuid);';}
  else if(req.url==='/rest/v1/rpc/clear_source_versions'){assert.deepEqual(Object.keys(b).sort(),['p_accept','p_collection_hash']);statement='select public.clear_source_versions('+literal(b.p_collection_hash)+','+literal(b.p_accept)+');';}
  else if(['/rest/v1/rpc/preview_source_version','/rest/v1/rpc/save_source_version'].includes(req.url)){
   const save=req.url.endsWith('/save_source_version');assert.deepEqual(Object.keys(b).sort(),['p_entry_ids','p_profile_revision','p_workspace_revision',...(save?['p_accept','p_preview_hash']:[])].sort());assert.ok(Number.isInteger(b.p_workspace_revision)&&b.p_workspace_revision>=0&&Number.isInteger(b.p_profile_revision)&&b.p_profile_revision>0);assert.ok(Array.isArray(b.p_entry_ids)&&b.p_entry_ids.length<=50);
   statement='select public.'+(save?'save':'preview')+'_source_version('+b.p_workspace_revision+','+b.p_profile_revision+',ARRAY['+b.p_entry_ids.map(literal).join(',')+']::uuid[]'+(save?','+literal(b.p_preview_hash)+','+literal(b.p_accept):'')+');';
  }else throw Error('FIXTURE_RPC');value=await pg(statement);
 }
 }catch(error){status=error.message==='AUTH'?401:['CONFLICT','INVALID_WRITE','UNSAFE_CONTEXT','SOURCE_VERSION_UNAVAILABLE','PROJECTION_CONFLICT'].includes(error.message)?400:503;value={message:['AUTH','CONFLICT','INVALID_WRITE','UNSAFE_CONTEXT','SOURCE_VERSION_UNAVAILABLE','PROJECTION_CONFLICT'].includes(error.message)?error.message:'FIXTURE_REFUSED'};}
 res.writeHead(status,{'content-type':'application/json','connection':'close'});res.end(JSON.stringify(value));});server.requestTimeout=15000;server.maxConnections=8;await new Promise(r=>server.listen(0,'127.0.0.1',r));process.env.SUPABASE_URL='http://127.0.0.1:'+server.address().port;process.env.SUPABASE_PUBLISHABLE_KEY='synthetic-publishable';process.env.JOBMATCH_AUTH_QUOTA_MODE='local';}
(async()=>{let failed=false;try{
 const [input,output]=process.argv.slice(2),data=JSON.parse(fs.readFileSync(input,'utf8'));let result;
 if(data.op==='codec'){
  stage='codec';
  if(data.kind==='preview'){const checked=await codec.validateSourcePreview(data.value,data.ownerId);assert.equal(checked.text,codec.renderSourceVersion(checked.snapshot));result={valid:true,hash:checked.preview_hash};}
  else if(data.kind==='version'){const checked=await codec.validateSourceVersion(data.value,data.ownerId);result={valid:true,hash:checked.preview_hash};}
  else if(data.kind==='list'){const checked=await codec.validateSourceVersionList(data.value,data.ownerId);result={valid:true,hash:checked.collection_hash};}
  else if(data.kind==='guard'){const profile=validateSourceProfile(data.value,data.ownerId),value={template_version:codec.TEMPLATE_VERSION,context_guard_version:codec.CONTEXT_GUARD_VERSION,generator:'literal-template',model_version:null,snapshot:profile,text:codec.renderSourceVersion(profile),preview_hash:'0'.repeat(64)};result={valid:true,eligible:codec.SourcePreviewSchema.safeParse(value).success};}
  else throw Error('CODEC_KIND');
 }else if(data.op==='wire'){
  process.env.JOBMATCH_SOURCE_PROFILE_ENABLED='true';process.env.JOBMATCH_SOURCE_VERSIONS_ENABLED='true';process.env.JOBMATCH_OPS_TELEMETRY='stdout';await start();
  let preview,list,version;const results=[];
  for(const operation of data.operations){
   const {expectedStatus=200,usePreviewHash=false,useCollectionHash=false,useVersionId=false,versionFlagOff=false,parentFlagOff=false,ownerHint=owner,query,...intent}=operation;stage='wire';
   process.env.JOBMATCH_SOURCE_VERSIONS_ENABLED=versionFlagOff?'false':'true';process.env.JOBMATCH_SOURCE_PROFILE_ENABLED=parentFlagOff?'false':'true';
   if(usePreviewHash){assert.ok(preview);intent.previewHash=preview.preview_hash;}if(useCollectionHash){assert.ok(list);intent.collectionHash=list.collection_hash;}
   const suffix=useVersionId?'?id='+version.id:query===undefined?'':query;
   const write=Object.hasOwn(intent,'action'),start=traces.length,obs=ops.length;
   const request=new NextRequest('https://source-version-fixture.test/api/source-versions'+suffix,{method:write?'POST':'GET',headers:{origin:'https://source-version-fixture.test',cookie:'jm_access=synthetic-session','x-jobmatch-owner':ownerHint},...(write?{body:JSON.stringify({expectedOwnerId:owner,...intent})}:{})});
   const response=await (write?POST:GET)(request);assert.equal(response.status,expectedStatus);assert.equal(response.headers.get('cache-control'),'no-store');
   let body;if(response.headers.get('content-type')?.includes('ndjson')){body=(await response.text()).trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}else body=await response.json();
   if(expectedStatus===200&&!Array.isArray(body)){
    if(intent.action==='preview')preview=await codec.validateSourcePreview(body,owner,intent.workspaceRevision,intent.profileRevision,intent.entryIds);
    else if(intent.action==='save'||useVersionId)version=await codec.validateSourceVersion(body,owner);
    else if(intent.action==='clear')list=await codec.validateSourceVersionList(body,owner);
    else if(body.history)list=await codec.validateSourceVersionList(body.history,owner);
   }
   const event=ops.slice(obs).filter(x=>x.kind==='returned');assert.equal(event.length,1);assert.equal(event[0].route,'source-versions');assert.equal(event[0].status,expectedStatus);
   const trace=traces.slice(start);assert.ok(!trace.some(t=>t.path.includes('save_workspace')||t.path.includes('apply_workspace_command')||t.path.includes('command_source_profile')));
   if(versionFlagOff||parentFlagOff)assert.ok(!trace.some(t=>t.path.endsWith('/save_source_version')));
   results.push({status:response.status,body,trace,ops:ops.slice(obs)});
  }
  result={results};
 }else throw Error('OP_KIND');
 fs.writeFileSync(output,JSON.stringify(result));
}catch{failed=true;process.stderr.write('FAIL: owned source-version production fixture stage='+stage+'; no payloads/keys/DB diagnostics.\n');}
finally{console.info=originalInfo;if(server){server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));}process.exitCode=failed?2:0;}})();
