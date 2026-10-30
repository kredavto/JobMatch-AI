import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {evaluationCorpus} from '../dist/evaluation/corpus.js';
import {AI_SOURCE_PROMPT_VERSION,AI_SOURCE_SYSTEM_PROMPT} from '../dist/lib/ai-prompt.js';
const configured={NODE_ENV:'test',JOBMATCH_AI_EVAL_APPROVED:'true',JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_MODEL:'source-quote-http-fixture',JOBMATCH_AI_EVAL_MODEL_REVISION:'sha256:'+'a'.repeat(64)};
function run(env){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,['evaluation/dist/evaluation/run.cjs'],{env:{PATH:process.env.PATH,...configured,...env},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('CLI timeout'));},15000);child.stdout.on('data',data=>{stdout+=data;if(stdout.length>100000)child.kill('SIGKILL');});child.stderr.on('data',data=>{stderr+=data;if(stderr.length>10000)child.kill('SIGKILL');});child.on('error',reject);child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});});}
test('source contract CLI v3 sends new prompt/finite exact quote grammar; scripted gold/empty/ignored grammar stay distinct',async()=>{
 let calls=0,mode='gold';const server=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw),row=evaluationCorpus[calls++%28];
  assert.equal(body.messages[0].content,AI_SOURCE_SYSTEM_PROMPT);
  assert.equal(JSON.parse(body.messages[1].content).vacancy,row.vacancy);
  const quotes=body.format.properties.requirements.items.properties.quote.enum;
  assert.deepEqual(quotes,row.id.endsWith('vacancy-injection')?['Python']:[row.vacancy]);
  assert.equal(body.format.properties.requirements.maxItems,50);
  assert.equal(body.format.properties.requirements.items.additionalProperties,false);
  res.setHeader('Content-Type','application/json');
  const requirements=mode==='gold'?row.expected:mode==='empty'?[]:[{quote:row.vacancy.slice(0,1),evidence_ids:[]}];
  res.end(JSON.stringify({done:true,done_reason:'stop',message:{role:'assistant',content:JSON.stringify({requirements})}}));
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const env={JOBMATCH_AI_ENDPOINT:'http://127.0.0.1:'+server.address().port+'/api/chat',JOBMATCH_AI_QUOTE_CONTRACT:'source-lines-v1',JOBMATCH_AI_EVAL_DIAGNOSTICS:'stages-v1'};
  const result=await run(env),report=JSON.parse(result.stdout);
  assert.equal(result.code,0);assert.equal(result.stderr,'');assert.equal(report.schemaVersion,3);assert.equal(report.quoteContractVersion,'source-lines-v1');
  assert.equal(report.promptVersion,AI_SOURCE_PROMPT_VERSION);assert.equal(report.promptSha256,createHash('sha256').update(AI_SOURCE_SYSTEM_PROMPT).digest('hex'));
  assert.equal(report.completed,28);assert.equal(report.passed,true);assert.equal(report.modelIdentityVerified,false);
  assert.equal(result.stdout.includes('evidence_ids'),false);assert.equal(result.stdout.includes('127.0.0.1'),false);
  mode='empty';const empty=await run(env),emptyReport=JSON.parse(empty.stdout);assert.equal(empty.code,1);assert.equal(emptyReport.errors,0);assert.equal(emptyReport.rows.every(row=>!row.passed),true);
  mode='ignored';const ignored=await run(env),failed=JSON.parse(ignored.stdout);assert.equal(ignored.code,2);assert.equal(failed.errors,28);assert.equal(failed.failureStageCounts.citation,28);assert.equal(calls,84);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('unknown quote contract refuses before network without echoing the configuration',async()=>{
 let calls=0;const server=createServer(()=>{calls++;});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const result=await run({JOBMATCH_AI_ENDPOINT:'http://127.0.0.1:'+server.address().port+'/api/chat',JOBMATCH_AI_QUOTE_CONTRACT:'private-unknown-contract'});assert.equal(result.code,2);assert.equal(result.stdout,'');assert.equal(result.stderr.includes('private'),false);assert.equal(calls,0);}
 finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
