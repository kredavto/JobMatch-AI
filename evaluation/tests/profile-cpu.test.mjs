import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {createProfileCpuBridge,approvedProfileCpuEnvironment} from '../dist/evaluation/profile-cpu-diagnostic.cjs';
import {cpuModelIdentity} from '../dist/evaluation/cpu-diagnostic.cjs';
import {profileCorpus,PROFILE_CORPUS_VERSION,gradeProfile} from '../dist/evaluation/profile-corpus.js';
import {aiProfileBody,aiProfilePreview} from '../dist/lib/ai-profile-provider.js';
import {aiProfileSource,profilePreview,AI_PROFILE_PROMPT} from '../dist/lib/ai-profile.js';
const approved={CI:'true',GITHUB_ACTIONS:'true',JOBMATCH_AI_CPU_DIAGNOSTIC:'true',JOBMATCH_AI_PROFILE_CPU_DIAGNOSTIC:'true',GITHUB_REPOSITORY:'kredavto/JobMatch-AI',JOBMATCH_REPOSITORY_VISIBILITY:'public',NODE_ENV:'test'};
async function backend(handler,run){const server=createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');try{await run('http://127.0.0.1:'+server.address().port+'/');}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
const upstream=(content='ACTUAL SCRIPTED UPSTREAM TEXT',extra={})=>JSON.stringify({choices:[{message:{role:'assistant',content},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:5},...extra});
const post=(bridge,text)=>fetch(bridge.endpoint,{method:'POST',body:text});

test('profile CPU mode requires every explicit public test marker and cannot use production/fork/unknown contexts',()=>{
 assert.equal(approvedProfileCpuEnvironment(approved),true);
 for(const key of Object.keys(approved)){const env={...approved};delete env[key];assert.equal(approvedProfileCpuEnvironment(env),false);}
 for(const change of [{NODE_ENV:'production'},{JOBMATCH_REPOSITORY_VISIBILITY:'private'},{GITHUB_REPOSITORY:'other/repo'},{JOBMATCH_AI_PROFILE_CPU_DIAGNOSTIC:'yes'}])assert.equal(approvedProfileCpuEnvironment({...approved,...change}),false);
});
test('profile entrypoint refuses missing approval or extra arguments before weights/network without reflecting input',()=>{
 for(const [env,args]of [[{PATH:process.env.PATH},[]],[{PATH:process.env.PATH,...approved},['PRIVATE']],[{PATH:process.env.PATH,...approved,JOBMATCH_AI_CPU_MODEL_SLOT:'PRIVATE'},[]]]){
  const result=spawnSync(process.execPath,['evaluation/dist/evaluation/profile-cpu-diagnostic.cjs',...args],{env,encoding:'utf8',timeout:5000});assert.equal(result.status,2);assert.equal(result.stderr,'CPU profile diagnostic refused or incomplete; no provider output or paths emitted.\n');assert.equal(result.stdout.includes('PRIVATE'),false);assert.equal(result.stdout.includes('JOBMATCH_PROFILE_CPU_DIAGNOSTIC_V1'),false);
 }
});
test('fixed synthetic corpus has twelve unique RU/EN cases, all eligible requests and valid strict gold; no real model is involved',()=>{
 assert.equal(PROFILE_CORPUS_VERSION,'synthetic-profile-ru-en-v1');assert.equal(profileCorpus.length,12);assert.equal(new Set(profileCorpus.map(row=>row.id)).size,12);assert.equal(profileCorpus.filter(row=>row.language==='ru').length,6);assert.equal(profileCorpus.filter(row=>row.language==='en').length,6);
 const model=cpuModelIdentity();for(const row of profileCorpus){assert.ok(aiProfileSource(row.source).blocks.length>0);const preview=profilePreview({entries:row.expected},row.source,{model:model.modelAlias,operatorDeclaredModelDigest:'sha256:'+model.sha256,modelIdentityVerified:false});assert.equal(gradeProfile(row,preview).passed,true);assert.equal(preview.acceptance,'not-accepted');}
});
test('empty responses cannot pass positive recall; extra records fail neutral exact gold',()=>{
 const model=cpuModelIdentity(),origin={model:model.modelAlias,operatorDeclaredModelDigest:'sha256:'+model.sha256,modelIdentityVerified:false};
 for(const row of profileCorpus.filter(row=>row.expected.length)){const result=gradeProfile(row,profilePreview({entries:[]},row.source,origin));assert.equal(result.passed,false);assert.ok(result.missingRecords>0);}
 const neutral=profileCorpus.find(row=>row.id==='en-profile-neutral'),fields=Object.fromEntries(['title','organization','start','end','description','credential'].map(key=>[key,key==='description'?neutral.source:null]));assert.equal(gradeProfile(neutral,profilePreview({entries:[{blockId:0,kind:'achievement',fields}]},neutral.source,origin)).passed,false);
});
test('bridge rejects arbitrary remote/query/credential backends before sending a request',async()=>{
 for(const url of ['https://example.test/','http://localhost:1234/','http://127.0.0.1:1234/private','http://127.0.0.1:1234/?PRIVATE','http://user:PRIVATE@127.0.0.1:1234/'])await assert.rejects(createProfileCpuBridge(url));
});
test('native bridge never reads expected gold and forwards exact selected requests/content without repair',async()=>{
 for(const slot of ['baseline','candidate']){
  let calls=0,observed;await backend(async(req,res)=>{calls++;let raw='';for await(const chunk of req)raw+=chunk;observed=JSON.parse(raw);res.setHeader('Content-Type','application/json');res.end(upstream());},async url=>{
   const descriptor=Object.getOwnPropertyDescriptor(profileCorpus[0],'expected');Object.defineProperty(profileCorpus[0],'expected',{configurable:true,get(){throw Error('Gold read forbidden');}});let bridge;
   try{bridge=await createProfileCpuBridge(url,slot);}finally{Object.defineProperty(profileCorpus[0],'expected',descriptor);}
   try{
    const expected=JSON.parse(aiProfileBody(profileCorpus[0].source,cpuModelIdentity(slot).modelAlias)),response=await post(bridge,JSON.stringify(expected));assert.equal(response.status,200);assert.equal((await response.json()).message.content,'ACTUAL SCRIPTED UPSTREAM TEXT');assert.equal(observed.model,expected.model);assert.deepEqual(observed.messages,expected.messages);assert.equal(observed.messages[0].content,AI_PROFILE_PROMPT);assert.deepEqual(observed.response_format.schema,expected.format);assert.equal(observed.seed,42);assert.equal(observed.max_tokens,2048);assert.equal(bridge.stats.backendResponses,1);assert.equal(bridge.stats.generatedTokens,5);
   }finally{await bridge.close();}
  });assert.equal(calls,1);
 }
});
test('unknown messages/alias/schema/options and request replay cannot contact inference or consume another source',async()=>{
 let calls=0;await backend((_req,res)=>{calls++;res.setHeader('Content-Type','application/json');res.end(upstream());},async url=>{const bridge=await createProfileCpuBridge(url);try{
  const source=JSON.parse(aiProfileBody(profileCorpus[0].source,cpuModelIdentity().modelAlias));for(const change of [{model:'PRIVATE'},{messages:[{role:'user',content:'PRIVATE'}]},{format:{}},{options:{temperature:1,num_predict:2048}},{endpoint:'https://PRIVATE'}])assert.equal((await post(bridge,JSON.stringify({...source,...change}))).status,400);assert.equal(calls,0);
  assert.equal((await post(bridge,JSON.stringify(source))).status,200);assert.equal((await post(bridge,JSON.stringify(source))).status,400);assert.equal(calls,1);assert.equal(bridge.stats.acceptedRequests,1);
 }finally{await bridge.close();}});
});
test('scripted invalid content is forwarded unchanged; envelope and body failures are redacted, not gold fallback',async()=>{
 const variants=[upstream('{PRIVATE'), 'PRIVATE upstream envelope',upstream('x',{usage:{prompt_tokens:100,completion_tokens:0}}),upstream('x',{choices:[{message:{role:'assistant',content:'PRIVATE'},finish_reason:'unknown'}]}),'x'.repeat(64001)];
 for(const [i,content]of variants.entries())await backend((_req,res)=>{res.setHeader('Content-Type','application/json');res.end(content);},async url=>{const bridge=await createProfileCpuBridge(url);try{const response=await post(bridge,aiProfileBody(profileCorpus[0].source,cpuModelIdentity().modelAlias));if(i===0){assert.equal(response.status,200);assert.equal((await response.json()).message.content,'{PRIVATE');}else{assert.equal(response.status,502);assert.equal((await response.text()).includes('PRIVATE'),false);assert.equal(bridge.stats.backendFailures,1);assert.equal(bridge.stats.backendResponses,0);}}finally{await bridge.close();}});
});
test('length output is never relabelled as stop or accepted by the production profile provider',async()=>{
 await backend((_req,res)=>{res.setHeader('Content-Type','application/json');res.end(upstream('{}',{choices:[{message:{role:'assistant',content:'{}'},finish_reason:'length'}]}));},async url=>{const bridge=await createProfileCpuBridge(url);try{const response=await post(bridge,aiProfileBody(profileCorpus[0].source,cpuModelIdentity().modelAlias));assert.equal((await response.json()).done_reason,'length');assert.equal(bridge.stats.limited,1);assert.equal(bridge.stats.stopped,0);}finally{await bridge.close();}});
});
test('all twelve scripted gold replies exercise the actual provider/bridge/grader but never establish accepted model quality',async()=>{
 const model=cpuModelIdentity(),settings={NODE_ENV:'test',JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_PROFILE_ENABLED:'true',JOBMATCH_AI_PROFILE_MODEL_REVISION:'sha256:'+model.sha256,JOBMATCH_AI_MODEL:model.modelAlias,JOBMATCH_AI_TOKEN:'',JOBMATCH_AI_QUOTE_CONTRACT:'legacy'};
 const keys=[...Object.keys(settings),'JOBMATCH_AI_ENDPOINT'],before=Object.fromEntries(keys.map(key=>[key,process.env[key]]));let calls=0;
 try{await backend((_req,res)=>{const row=profileCorpus[calls++];res.setHeader('Content-Type','application/json');res.end(upstream(JSON.stringify({entries:row.expected})));},async url=>{const bridge=await createProfileCpuBridge(url);try{Object.assign(process.env,settings,{JOBMATCH_AI_ENDPOINT:bridge.endpoint});for(const row of profileCorpus){const preview=await aiProfilePreview(row.source,new AbortController().signal);assert.equal(gradeProfile(row,preview).passed,true);assert.equal(preview.acceptance,'not-accepted');assert.equal(preview.origin.modelIdentityVerified,false);}assert.equal(bridge.stats.backendResponses,12);assert.equal(bridge.stats.acceptedRequests,12);assert.equal(bridge.stats.backendFailures,0);}finally{await bridge.close();}});}finally{for(const key of keys){if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];}}
 assert.equal(calls,12);
});
