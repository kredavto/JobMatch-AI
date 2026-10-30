import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {evaluationCorpus} from '../dist/evaluation/corpus.js';
import {AI_FAILURE_STAGES} from '../dist/lib/ai-diagnostics.js';
const configured={NODE_ENV:'test',JOBMATCH_AI_EVAL_APPROVED:'true',JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_MODEL:'synthetic-stage-fixture',JOBMATCH_AI_EVAL_MODEL_REVISION:'sha256:'+'a'.repeat(64)};
function run(env,onChild=()=>{}){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,['evaluation/dist/evaluation/run.cjs'],{env:{PATH:process.env.PATH,...configured,...env},stdio:['ignore','pipe','pipe']});onChild(child);let stdout='',stderr='';const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('CLI timeout'));},15000);child.stdout.on('data',data=>{stdout+=data;if(stdout.length>100000)child.kill('SIGKILL');});child.stderr.on('data',data=>{stderr+=data;if(stderr.length>10000)child.kill('SIGKILL');});child.on('error',reject);child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});});}
test('opt-in v2 classifies seven actual HTTP failure paths and retains exact v1 default',async()=>{
 let calls=0,mode='mixed';
 const stages=['http-status-or-type','envelope-json','envelope-schema','content-json','review-schema','citation','evidence'];
 const server=createServer(async(req,res)=>{
  for await(const chunk of req)void chunk;
  const index=calls++%28,row=evaluationCorpus[index];res.setHeader('Content-Type','application/json');
  if(mode==='outage'||index===0){res.statusCode=500;res.end('private upstream diagnostic');return;}
  if(index===1){res.end('private invalid JSON');return;}
  const content=index===3?'private model non-JSON':JSON.stringify(index===4?{requirements:[{...row.expected[0],secret:'private extra'}]}:index===5?{requirements:[{quote:'private invented quote',evidence_ids:[]}]}:index===6?{requirements:[{quote:row.expected[0].quote,evidence_ids:['private-foreign-fact']}]}:{requirements:row.expected});
  res.end(JSON.stringify({done:index!==2,done_reason:'stop',message:{role:'assistant',content}}));
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const env={JOBMATCH_AI_ENDPOINT:'http://127.0.0.1:'+server.address().port+'/api/chat',JOBMATCH_AI_EVAL_DIAGNOSTICS:'stages-v1'};
  const result=await run(env);assert.equal(result.code,2);assert.equal(result.stderr,'');const report=JSON.parse(result.stdout);
  assert.equal(report.schemaVersion,2);assert.equal(report.diagnosticFormat,'ai-failure-stages-v1');assert.equal(report.complete,true);assert.equal(report.completed,28);assert.equal(report.errors,7);assert.equal(report.passed,false);
  assert.deepEqual(report.rows.slice(0,7).map(row=>row.failureStage),stages);assert.equal(report.rows.slice(7).every(row=>row.status==='graded'&&row.passed&&!('failureStage'in row)),true);
  assert.deepEqual(Object.keys(report.failureStageCounts),[...AI_FAILURE_STAGES]);assert.equal(Object.values(report.failureStageCounts).reduce((a,b)=>a+b,0),7);assert.equal(report.failureStageCounts.unknown,0);
  for(const secret of ['private','127.0.0.1','evidence_ids','"vacancy":'])assert.equal(result.stdout.includes(secret),false);
  mode='outage';const old=await run({...env,JOBMATCH_AI_EVAL_DIAGNOSTICS:'off'}),legacy=JSON.parse(old.stdout);
  assert.equal(old.code,2);assert.equal(legacy.schemaVersion,1);assert.equal(legacy.errors,28);assert.equal('failureStageCounts'in legacy,false);assert.equal(legacy.rows.some(row=>'failureStage'in row),false);assert.equal(calls,56);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('unknown diagnostics format refuses before a valid endpoint is contacted',async()=>{
 let calls=0;const server=createServer(()=>{calls++;});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{for(const mode of ['STAGES-V1','stages-v1 ','private-unknown']){const result=await run({JOBMATCH_AI_ENDPOINT:'http://127.0.0.1:'+server.address().port+'/api/chat',JOBMATCH_AI_EVAL_DIAGNOSTICS:mode});assert.equal(result.code,2);assert.equal(result.stdout,'');assert.equal(result.stderr.includes(mode),false);}assert.equal(calls,0);}
 finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('opt-in interruption reports cancelled, prevents subsequent calls and stays incomplete',async()=>{
 let child,calls=0;const server=createServer(()=>{calls++;child.kill('SIGINT');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const result=await run({JOBMATCH_AI_ENDPOINT:'http://127.0.0.1:'+server.address().port+'/api/chat',JOBMATCH_AI_EVAL_DIAGNOSTICS:'stages-v1'},value=>{child=value;});const report=JSON.parse(result.stdout);assert.equal(result.code,2);assert.equal(report.complete,false);assert.equal(report.completed,1);assert.equal(calls,1);assert.equal(report.failureStageCounts.cancelled,1);assert.equal(report.rows[0].failureStage,'cancelled');}
 finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
