import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,chmodSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {z} from 'zod';
import {compareCpuReports,parseCpuTranscript} from '../dist/evaluation/cpu-comparison.cjs';
import {validateCpuPin,cpuModelSlot,cpuModelIdentity,cpuServerArgs,createCpuBridge,CPU_ALIAS,CPU_LICENSE_SHA} from '../dist/evaluation/cpu-diagnostic.cjs';
import {CORPUS_VERSION,evaluationCorpus} from '../dist/evaluation/corpus.js';
import {AI_FAILURE_STAGES} from '../dist/lib/ai-diagnostics.js';
import {aiPromptForQuoteContract,AI_SYSTEM_PROMPT} from '../dist/lib/ai-prompt.js';
import {AiReviewSchema,eligibleAiFacts} from '../dist/lib/ai-review.js';

const sha=text=>createHash('sha256').update(text).digest('hex');
const pin=slot=>JSON.parse(readFileSync(slot==='baseline'?'evaluation/cpu-model.json':'evaluation/cpu-model-candidate.json','utf8'));
const prompt=aiPromptForQuoteContract('source-lines-v1');
function fixture(slot,{errors=0,mismatches=0}={}){
 const model=pin(slot),startedAt=slot==='baseline'?'2026-10-31T00:00:00.000Z':'2026-10-31T00:02:00.000Z';
 const finishedAt=slot==='baseline'?'2026-10-31T00:01:00.000Z':'2026-10-31T00:03:00.000Z';
 const rows=evaluationCorpus.map((source,i)=>({id:source.id,language:source.language,category:source.category,durationMs:10,...(i<errors?{status:'error',passed:false,failureStage:'citation'}:{status:'graded',passed:i>=errors+mismatches,missingRequirements:0,unexpectedRequirements:0,missingLinks:0,unsupportedLinks:i<errors+mismatches?1:0})}));
 const auditCases=evaluationCorpus.map((source,i)=>({id:source.id,version:'literal-quantities-v1',semanticAssessment:'not-performed',...(i<errors?{status:'unavailable',availabilityReason:'no-validated-review',links:null,notes:null,warningLinks:null,unknownLinks:null,noRuleWarningLinks:null,signalCounts:null}:{status:'available',availabilityReason:'audited',links:0,notes:[],warningLinks:0,unknownLinks:0,noRuleWarningLinks:0,signalCounts:Object.fromEntries(['no-linked-facts','literal-gap','coverage-unavailable','quantity-difference','quantity-unknown','level-below','level-unknown'].map(s=>[s,0]))})}));
 const passed=errors+mismatches===0;
 return {format:'jobmatch-cpu-diagnostic-v4',linkAuditVersion:'literal-quantities-v1',quoteContractVersion:'source-lines-v1',runKind:'actual-local-cpu-inference/synthetic-only',startedAt,finishedAt, pin:model,weightsFileVerified:true,executionBinding:'readonly-file-and-owned-local-process',deploymentIdentityVerified:false,acceptance:'not-accepted',containerImageId:'sha256:'+'a'.repeat(64),llamaBinarySha256:'b'.repeat(64),licenseFileSha256:CPU_LICENSE_SHA,runtime:{node:'v24.22.2',architecture:'x64',cpu:'SYNTHETIC CPU DESCRIPTION'},bridge:{acceptedRequests:28,backendResponses:28,generatedTokens:1400,stopped:28,limited:0,transportFailures:0,rejectedRequests:0},diagnosticQuality:passed?'synthetic-exact-gold-passed':errors?'synthetic-provider-or-contract-errors':'synthetic-quality-mismatch',evaluatorExitCode:errors?2:passed?0:1,evaluation:{schemaVersion:4,quoteContractVersion:'source-lines-v1',diagnosticFormat:'ai-failure-stages-v1',failureStageCounts:Object.fromEntries(AI_FAILURE_STAGES.map(stage=>[stage,stage==='citation'?errors:0])),runKind:'operator-configured-endpoint',startedAt,finishedAt,corpusVersion:CORPUS_VERSION,corpusSha256:sha(JSON.stringify(evaluationCorpus)),promptVersion:prompt.version,promptSha256:sha(prompt.text),model:model.modelAlias,operatorDeclaredModelDigest:'sha256:'+model.sha256,modelIdentityVerified:false,semanticAcceptance:'synthetic-exact-gold-only',complete:true,passed,planned:28,completed:28,errors,rows,linkAudit:{version:'literal-quantities-v1',semanticAssessment:'not-performed',scope:'validated-review-diagnostics-only',plannedCases:28,observedCases:28-errors,unavailableCases:errors,cases:auditCases}}};
}
const transcript=report=>['pin','weights','binary','server-start','server-ready','evaluate','evaluation-returned','report'].map(p=>'CPU_DIAGNOSTIC_PHASE '+p+'\n').join('')+'JOBMATCH_CPU_DIAGNOSTIC_V4 '+JSON.stringify(report)+'\n';
const approved={CI:'true',GITHUB_ACTIONS:'true',JOBMATCH_AI_CPU_DIAGNOSTIC:'true',GITHUB_REPOSITORY:'kredavto/JobMatch-AI',JOBMATCH_REPOSITORY_VISIBILITY:'public',NODE_ENV:'test',GITHUB_RUN_ID:'12345'};
function files(run){const parent=mkdtempSync(join(tmpdir(),'jobmatch-comparison-unit-')),root=join(parent,'jobmatch-cpu-comparison.A1b2C3d4');mkdirSync(root,{mode:0o700});
 try{for(const slot of ['baseline','candidate'])writeFileSync(join(root,slot+'.log'),transcript(fixture(slot)),{mode:0o600});run({parent,root,env:{PATH:process.env.PATH,...approved,RUNNER_TEMP:parent,JOBMATCH_CPU_COMPARISON_ROOT:root}});}finally{rmSync(parent,{recursive:true,force:true});}}
const cli=(env,args=[])=>spawnSync(process.execPath,['evaluation/dist/evaluation/cpu-comparison.cjs',...args],{env,encoding:'utf8',timeout:5000});

test('two explicit pins preserve baseline defaults and refuse cross-slot or resource substitutions',()=>{
 assert.equal(cpuModelSlot(undefined),'baseline');assert.equal(cpuModelSlot('candidate'),'candidate');
 for(const slot of ['baseline','candidate']){
  assert.deepEqual(validateCpuPin(pin(slot),slot),pin(slot));assert.equal(cpuServerArgs(slot)[3],pin(slot).modelAlias);
  for(const changed of [{repository:'PRIVATE'},{revision:'main'},{sha256:'a'.repeat(64)},{bytes:1},{threads:8},{context:8192},{seed:1},{endpoint:'https://PRIVATE'}])assert.throws(()=>validateCpuPin({...pin(slot),...changed},slot));
 }
 assert.throws(()=>validateCpuPin(pin('candidate')));assert.throws(()=>validateCpuPin(pin('baseline'),'candidate'));
 for(const value of ['other','PRIVATE',null,3,{}]){assert.throws(()=>cpuModelSlot(value));assert.throws(()=>cpuModelIdentity(value));}
});
test('unknown entrypoint slot refuses before weights/startup without reflecting its value',()=>{
 const result=spawnSync(process.execPath,['evaluation/dist/evaluation/cpu-diagnostic.cjs'],{env:{PATH:process.env.PATH,...approved,JOBMATCH_AI_CPU_MODEL_SLOT:'PRIVATE'},encoding:'utf8',timeout:5000});
 assert.equal(result.status,2);assert.equal(result.stdout,'CPU_DIAGNOSTIC_PHASE pin\n');assert.equal(result.stderr.includes('PRIVATE'),false);
});
test('candidate bridge forwards only its approved alias and unchanged synthetic messages/grammar',async()=>{
 const calls=[];const backend=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;calls.push(JSON.parse(raw));res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({choices:[{message:{role:'assistant',content:'ACTUAL SYNTHETIC UPSTREAM TEXT'},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:5}}));});
 backend.listen(0,'127.0.0.1');await once(backend,'listening');const bridge=await createCpuBridge('http://127.0.0.1:'+backend.address().port+'/','legacy','candidate');
 try{
  const source=evaluationCorpus[0],value={model:CPU_ALIAS,stream:false,format:z.toJSONSchema(AiReviewSchema),options:{temperature:0,num_predict:2048},messages:[{role:'system',content:AI_SYSTEM_PROMPT},{role:'user',content:JSON.stringify({vacancy:source.vacancy,facts:eligibleAiFacts(source.facts).map(({id,text})=>({id,text}))})}]};
  const post=body=>fetch(bridge.endpoint,{method:'POST',body:JSON.stringify(body)});
  assert.equal((await post(value)).status,400);assert.equal(calls.length,0);
  value.model=pin('candidate').modelAlias;const response=await post(value);assert.equal(response.status,200);assert.equal((await response.json()).message.content,'ACTUAL SYNTHETIC UPSTREAM TEXT');
  assert.equal(calls[0].model,value.model);assert.deepEqual(calls[0].messages,value.messages);assert.deepEqual(calls[0].response_format.schema,value.format);
 }finally{await bridge.close();backend.closeAllConnections();await new Promise(resolve=>backend.close(resolve));}
});
test('synthetic report fixtures normalize passes/errors/mismatches without model acceptance promotion',()=>{
 const report=compareCpuReports(fixture('baseline',{errors:6,mismatches:16}),fixture('candidate',{errors:2,mismatches:10}));
 assert.deepEqual(report.baseline.counts,{cases:28,passed:6,errors:6,mismatches:16});assert.deepEqual(report.candidate.counts,{cases:28,passed:16,errors:2,mismatches:10});
 assert.equal(report.deltas.passed,10);assert.equal(report.acceptance,'not-accepted');assert.equal(report.independentHeldOut,'not-performed');assert.equal(report.remoteAttestation,'not-performed');
 assert.equal(report.baseline.byLanguage.ru.cases,14);assert.equal(report.candidate.cases.length,28);
 const all=compareCpuReports(fixture('baseline'),fixture('candidate'));assert.equal(all.candidate.counts.passed,28);assert.equal(all.acceptance,'not-accepted');
 const errors=compareCpuReports(fixture('baseline',{errors:28}),fixture('candidate',{errors:28}));assert.equal(errors.candidate.counts.errors,28);
});
test('report normalization refuses missing physical responses, fabricated stop counts and changed provenance',()=>{
 const mutations=[r=>{r.bridge.backendResponses=27;},r=>{r.bridge.stopped=27;},r=>{r.bridge.generatedTokens=0;},r=>{r.bridge.transportFailures=1;},r=>{r.acceptance='accepted';},r=>{r.weightsFileVerified=false;},r=>{r.deploymentIdentityVerified=true;},r=>{r.licenseFileSha256='c'.repeat(64);},r=>{r.evaluation.modelIdentityVerified=true;},r=>{r.evaluation.model='PRIVATE';},r=>{r.evaluation.operatorDeclaredModelDigest='sha256:'+'0'.repeat(64);},r=>{r.evaluation.corpusSha256='0'.repeat(64);},r=>{r.evaluation.promptSha256='0'.repeat(64);},r=>{r.evaluation.complete=false;},r=>{r.evaluation.completed=27;}];
 for(const mutate of mutations){const value=fixture('candidate');mutate(value);assert.throws(()=>compareCpuReports(fixture('baseline'),value),error=>error.message==='CPU comparison refused or inconsistent');}
});
test('comparisons require the same reported binary/image/runtime and sequential execution',()=>{
 for(const mutate of [r=>{r.containerImageId='sha256:'+'f'.repeat(64);},r=>{r.llamaBinarySha256='f'.repeat(64);},r=>{r.runtime.cpu='OTHER SYNTHETIC CPU';},r=>{r.runtime.node='v24.22.1';},r=>{r.startedAt='2026-10-31T00:00:30.000Z';},r=>{r.finishedAt='2026-10-31T00:01:30.000Z';}]){
  const value=fixture('candidate');mutate(value);assert.throws(()=>compareCpuReports(fixture('baseline'),value));
 }
 assert.throws(()=>compareCpuReports(fixture('baseline'),fixture('baseline')));
});
test('coherent rows, fixed order, stages, grades, quality labels and exit codes are mandatory',()=>{
 const mutations=[r=>{r.evaluation.rows[1]=r.evaluation.rows[0];},r=>{r.evaluation.rows.reverse();},r=>{r.evaluation.rows[0].language='en';},r=>{r.evaluation.rows[0].category='PRIVATE';},r=>{r.evaluation.rows[0].unsupportedLinks=1;},r=>{r.evaluation.passed=false;},r=>{r.evaluatorExitCode=1;},r=>{r.diagnosticQuality='synthetic-quality-mismatch';},r=>{r.evaluation.failureStageCounts.citation=1;},r=>{r.evaluation.linkAudit.observedCases=27;}];
 for(const mutate of mutations){const value=fixture('candidate');mutate(value);assert.throws(()=>compareCpuReports(fixture('baseline'),value));}
});
test('normalization emits no free-form CPU/provider text and errors never reflect input values',()=>{
 const a=fixture('baseline'),b=fixture('candidate');a.runtime.cpu=b.runtime.cpu='PRIVATE CPU DESCRIPTION';
 assert.equal(JSON.stringify(compareCpuReports(a,b)).includes('PRIVATE'),false);
 for(const value of [{...b,providerOutput:'PRIVATE'}, {...b,evaluation:{...b.evaluation,providerOutput:'PRIVATE'}}, {...b,pin:{...b.pin,endpoint:'https://PRIVATE'}}])assert.throws(()=>compareCpuReports(a,value),error=>!error.message.includes('PRIVATE'));
});
test('transcript framing requires exactly ordered phases and one complete report',()=>{
 const report=fixture('baseline'),text=transcript(report);assert.deepEqual(parseCpuTranscript(text),report);
 for(const bad of [text.trimEnd(),text+'PRIVATE\n',text.replace('CPU_DIAGNOSTIC_PHASE weights\n',''),text.replace('CPU_DIAGNOSTIC_PHASE weights','CPU_DIAGNOSTIC_PHASE pin'),text+'JOBMATCH_CPU_DIAGNOSTIC_V4 {}\n','PRIVATE\n'+text,text.replace('JOBMATCH_CPU_DIAGNOSTIC_V4','JOBMATCH_CPU_DIAGNOSTIC_V3')])assert.throws(()=>parseCpuTranscript(bad),error=>!error.message.includes('PRIVATE'));
 assert.throws(()=>parseCpuTranscript('x'.repeat(4*1024*1024+1)+'\n'));
});
test('CLI requires explicit CI context and refuses unknown arguments before reading files',()=>{
 const refused=cli({PATH:process.env.PATH},['PRIVATE']);assert.equal(refused.status,2);assert.equal(refused.stdout,'');assert.equal(refused.stderr,'CPU comparison refused or incomplete; no input paths or diagnostics emitted.\n');
 files(({env})=>{const result=cli(env,['PRIVATE']);assert.equal(result.status,2);assert.equal(result.stdout,'');assert.equal(result.stderr.includes('PRIVATE'),false);});
});
test('CLI reads only private owned bounded complete report files and prints a safe controlled result',()=>{
 files(({env})=>{const result=cli(env);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/^JOBMATCH_CPU_COMPARISON_V1 /);const report=JSON.parse(result.stdout.slice('JOBMATCH_CPU_COMPARISON_V1 '.length));assert.equal(report.workflow.runId,'12345');assert.equal(report.acceptance,'not-accepted');assert.equal(result.stdout.includes(env.JOBMATCH_CPU_COMPARISON_ROOT),false);assert.equal(result.stdout.includes('SYNTHETIC CPU DESCRIPTION'),false);});
});
test('CLI rejects symlink, world-readable, oversized and partial report files without echoing paths',()=>{
 for(const change of [({root})=>{chmodSync(join(root,'baseline.log'),0o644);},({root})=>{writeFileSync(join(root,'baseline.log'),'PRIVATE');},({root})=>{writeFileSync(join(root,'baseline.log'),'x'.repeat(4*1024*1024+1));},({parent,root})=>{rmSync(join(root,'baseline.log'));const path=join(parent,'PRIVATE');writeFileSync(path,'PRIVATE',{mode:0o600});symlinkSync(path,join(root,'baseline.log'));}])files(context=>{change(context);const result=cli(context.env);assert.equal(result.status,2);assert.equal(result.stdout,'');assert.equal(result.stderr.includes('PRIVATE'),false);assert.equal(result.stderr.includes(context.parent),false);});
});
test('CLI refuses FIFOs promptly instead of blocking while opening input',()=>{
 files(({env,root})=>{rmSync(join(root,'baseline.log'));const created=spawnSync('mkfifo',[join(root,'baseline.log')],{encoding:'utf8',timeout:2000});assert.equal(created.status,0);const result=cli(env);assert.equal(result.error,undefined);assert.equal(result.status,2);assert.equal(result.stdout,'');});
});
