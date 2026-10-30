import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {evaluationCorpus} from '../dist/evaluation/corpus.js';
function run(env={},onChild=()=>{}){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['evaluation/dist/evaluation/run.cjs'],{env:{PATH:process.env.PATH,NODE_ENV:'test',...env},stdio:['ignore','pipe','pipe']});onChild(child);let stdout='',stderr='';const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('CLI timeout'));},15000);
 child.stdout.on('data',data=>{stdout+=data;if(stdout.length>100000)child.kill('SIGKILL');});child.stderr.on('data',data=>{stderr+=data;if(stderr.length>10000)child.kill('SIGKILL');});child.on('error',reject);child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});
});}
const configured={JOBMATCH_AI_EVAL_APPROVED:'true',JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_MODEL:'synthetic-http-fixture',JOBMATCH_AI_EVAL_MODEL_REVISION:'sha256:'+'a'.repeat(64),JOBMATCH_AI_TOKEN:'synthetic-token-for-http-fixture'};
test('CLI refuses approval/config/digest mistakes before network with safe diagnostics',async()=>{
 for(const env of [{},{...configured,JOBMATCH_AI_EVAL_APPROVED:'false'},{...configured,JOBMATCH_AI_ENDPOINT:'https://token:secret@example.test/api/chat'},{...configured,JOBMATCH_AI_ENDPOINT:'http://127.0.0.1:1/api/chat',JOBMATCH_AI_EVAL_MODEL_REVISION:'unknown'}]){
  const result=await run(env);assert.equal(result.code,2);assert.equal(result.stdout,'');assert.ok(!result.stderr.includes('secret'));assert.ok(!result.stderr.includes('synthetic-token'));
 }
});
test('real local HTTP fixture exercises production provider/CLI; no model is involved',async()=>{
 let calls=0,mode='gold';const server=createServer(async(req,res)=>{
  let text='';for await(const chunk of req)text+=chunk;
  const body=JSON.parse(text);assert.equal(req.url,'/api/chat');assert.equal(body.model,'synthetic-http-fixture');assert.equal(body.options.temperature,0);assert.ok(body.messages[0].content.includes('entire quoted requirement'));
  const row=evaluationCorpus[calls++%evaluationCorpus.length],sent=JSON.parse(body.messages[1].content);
  assert.equal(sent.vacancy,row.vacancy);assert.ok(sent.facts.every(fact=>!('source' in fact)&&!('verified' in fact)));
  res.setHeader('content-type','application/json');
  if(mode==='outage'){res.statusCode=500;res.end('upstream-sensitive-diagnostic');return;}
  const content=mode==='gold'?{requirements:row.expected}:{requirements:[]};
  res.end(JSON.stringify({done:true,done_reason:'stop',message:{role:'assistant',content:JSON.stringify(content)}}));
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const env={...configured,JOBMATCH_AI_ENDPOINT:`http://127.0.0.1:${server.address().port}/api/chat`};
  const result=await run(env);assert.equal(result.code,0,result.stderr);const report=JSON.parse(result.stdout);assert.equal(report.schemaVersion,1);assert.equal('failureStageCounts'in report,false);assert.equal(report.completed,28);assert.equal(report.passed,true);assert.equal(report.modelIdentityVerified,false);assert.equal(report.runKind,'operator-configured-endpoint');assert.equal(report.promptVersion,'requirements-evidence-v2');assert.match(report.corpusSha256,/^[a-f0-9]{64}$/);assert.equal(calls,28);
  for(const forbidden of ['synthetic-token','127.0.0.1','evidence_ids','"vacancy":','upstream-sensitive-diagnostic'])assert.ok(!result.stdout.includes(forbidden),forbidden);
  mode='empty';assert.equal((await run(env)).code,1);assert.equal(calls,56);
  mode='outage';const failed=await run(env);assert.equal(failed.code,2);assert.equal(JSON.parse(failed.stdout).errors,28);assert.ok(!failed.stdout.includes('upstream-sensitive'));assert.equal(calls,84);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('SIGINT cancels an in-flight request without subsequent calls or a successful report',async()=>{
 let child,calls=0;
 const server=createServer(()=>{calls++;child.kill('SIGINT');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const result=await run({...configured,JOBMATCH_AI_ENDPOINT:`http://127.0.0.1:${server.address().port}/api/chat`},value=>{child=value;});
  assert.equal(result.code,2);const report=JSON.parse(result.stdout);assert.equal(report.complete,false);assert.equal(report.passed,false);assert.equal(calls,1);assert.equal(report.completed,1);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
