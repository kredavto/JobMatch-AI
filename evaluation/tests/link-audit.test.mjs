import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {evaluationCorpus} from '../dist/evaluation/corpus.js';
import {validateCpuLinkAudit} from '../dist/evaluation/cpu-diagnostic.cjs';
const configured={NODE_ENV:'test',JOBMATCH_AI_EVAL_APPROVED:'true',JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_MODEL:'synthetic-link-audit-fixture',JOBMATCH_AI_EVAL_MODEL_REVISION:'sha256:'+'a'.repeat(64)};
function run(env){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,['evaluation/dist/evaluation/run.cjs'],{env:{PATH:process.env.PATH,...configured,...env},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('CLI timeout'));},15000);child.stdout.on('data',data=>{stdout+=data;if(stdout.length>100000)child.kill('SIGKILL');});child.stderr.on('data',data=>{stderr+=data;if(stderr.length>10000)child.kill('SIGKILL');});child.on('error',reject);child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});});}
test('opt-in audit report annotates validated reviews without altering model requests/gold results; outages are null unavailable',async()=>{
 let calls=0,mode='linked';const bodies=[];
 const server=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw),row=evaluationCorpus[calls++%28],input=JSON.parse(body.messages[1].content);
  bodies.push(raw);res.setHeader('Content-Type','application/json');
  if(mode==='outage'){res.statusCode=500;res.end('SENSITIVE provider output');return;}
  const requirements=[{quote:row.expected[0].quote,evidence_ids:[input.facts[0].id]}];
  res.end(JSON.stringify({done:true,done_reason:'stop',message:{role:'assistant',content:JSON.stringify({requirements})}}));
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const endpoint='http://127.0.0.1:'+server.address().port+'/api/chat',env={JOBMATCH_AI_ENDPOINT:endpoint,JOBMATCH_AI_EVAL_DIAGNOSTICS:'stages-v1'};
  const old=await run(env),legacy=JSON.parse(old.stdout);assert.equal(legacy.schemaVersion,2);assert.equal('linkAudit'in legacy,false);
  const current=await run({...env,JOBMATCH_AI_EVAL_LINK_AUDIT:'literal-quantities-v1'}),report=JSON.parse(current.stdout);
  assert.equal(current.code,old.code);assert.equal(current.stderr,'');assert.equal(report.schemaVersion,4);assert.equal(report.errors,legacy.errors);assert.equal(report.passed,legacy.passed);
  assert.deepEqual(bodies.slice(0,28),bodies.slice(28,56));assert.equal(report.linkAudit.observedCases,28);assert.equal(report.linkAudit.unavailableCases,0);assert.equal(validateCpuLinkAudit(report.linkAudit),true);
  assert.ok(report.linkAudit.cases.some(row=>row.warningLinks>0));assert.ok(report.linkAudit.cases.some(row=>row.unknownLinks>0));
  for(const secret of ['SENSITIVE','evidence_ids','"vacancy":','127.0.0.1'])assert.equal(current.stdout.includes(secret),false);
  mode='outage';const refused=await run({...env,JOBMATCH_AI_EVAL_LINK_AUDIT:'literal-quantities-v1'}),outage=JSON.parse(refused.stdout);
  assert.equal(refused.code,2);assert.equal(outage.errors,28);assert.equal(outage.linkAudit.observedCases,0);assert.equal(outage.linkAudit.unavailableCases,28);
  assert.equal(outage.linkAudit.cases.every(row=>row.links===null&&row.notes===null&&row.warningLinks===null&&row.availabilityReason==='no-validated-review'),true);assert.equal(validateCpuLinkAudit(outage.linkAudit),true);assert.equal(calls,84);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('unrecognised audit mode refuses before provider access and emits no supplied value',async()=>{
 let calls=0;const server=createServer(()=>{calls++;});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const result=await run({JOBMATCH_AI_ENDPOINT:'http://127.0.0.1:'+server.address().port+'/api/chat',JOBMATCH_AI_EVAL_LINK_AUDIT:'SENSITIVE unknown'});assert.equal(result.code,2);assert.equal(result.stdout,'');assert.equal(result.stderr.includes('SENSITIVE'),false);assert.equal(calls,0);}
 finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
