import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {approved,evaluateCase,hash,RewriteCorpus,type Backend} from './harness.js';

const bytes=readFileSync('evaluation/rewrite/corpus-v1.json');
const corpus=RewriteCorpus.parse(JSON.parse(bytes.toString('utf8')));
const example=corpus.cases[0];
const signal=()=>new AbortController().signal;
const claims=(input:typeof example)=>JSON.stringify({claims:input.facts.filter(f=>input.factIds.includes(f.id)).map(f=>({fact_id:f.id,status:'proposed',text:f.text}))});
function response(content=claims(example),finish='stop',usage={prompt_tokens:100,completion_tokens:50}){
 return Response.json({choices:[{message:{role:'assistant',content},finish_reason:finish}],usage});
}
const env=()=>Object.fromEntries(Object.entries(process.env));
test('frozen public authored corpus retains pre-inference SHA and six distinct cases',()=>{
 assert.equal(hash(bytes),'0703166fc0491ed093676cd6612331f680f26f45b6b4883eed9e2465c10bdf73');
 assert.equal(corpus.cases.length,6);
 assert.equal(RewriteCorpus.safeParse({...corpus,cases:corpus.cases.map(()=>example)}).success,false);
});
test('CI opt-in requires every exact public same-repository gate',()=>{
 const good={CI:'true',GITHUB_ACTIONS:'true',JOBMATCH_AI_CPU_DIAGNOSTIC:'true',JOBMATCH_AI_REWRITE_CPU_DIAGNOSTIC:'true',GITHUB_REPOSITORY:'kredavto/JobMatch-AI',JOBMATCH_REPOSITORY_VISIBILITY:'public'};
 assert.equal(approved(good),true);assert.equal(approved({}),false);
 for(const key of Object.keys(good))assert.equal(approved({...good,[key]:'false'}),false);
});
for(const example of corpus.cases)test('actual production HTTP wire: '+example.id,async()=>{
 const before=env();let received='';const raw=claims(example);
 const row=await evaluateCase(example,async payload=>{
  received=payload.messages[1].content;
  assert.deepEqual(JSON.parse(received),{language:example.requestedLanguage,vacancy:example.vacancy,facts:example.facts.filter(f=>example.factIds.includes(f.id)).map(f=>({fact_id:f.id,text:f.text}))});
  assert.equal(received.includes(example.reviewNotes[0]),false);
  assert.equal(payload.options.num_predict,4096);return response(raw);
 },signal());
 assert.equal(row.status,'contract-valid');assert.equal(row.calls,1);assert.equal(row.backendRequests,1);
 assert.match(row.payloadSha256!,/^[a-f0-9]{64}$/);assert.equal(row.rawSyntheticReply,raw);
 assert.equal(row.preview!.text,example.original);assert.equal(row.preview!.reviewStatus,'not-reviewed');
 assert.equal(row.acceptance,'not-accepted');assert.equal(row.semanticAssessment,'not-performed');
 assert.equal(row.independentHeldOut,'not-performed');assert.equal(row.tokens,50);
 assert.deepEqual(env(),before);
});
test('changed numeric wording is preserved and reviewed, never semantically accepted',async()=>{
 const raw=JSON.stringify({claims:[{fact_id:'selected',status:'proposed',text:'Created 7 SQL reports in 2024.'}]});
 const row=await evaluateCase(example,async()=>response(raw),signal());
 assert.equal(row.status,'contract-valid');assert.equal(row.rawSyntheticReply,raw);
 assert.match(row.preview!.text,/Created 7/);assert.match(row.preview!.text,/Unselected synthetic line$/);
 assert.ok(row.preview!.review.claims[0].lexical.issues.length>0);assert.equal(row.acceptance,'not-accepted');
});
test('model refusal retains source and remains unaccepted',async()=>{
 const row=await evaluateCase(example,async()=>response('{"claims":[{"fact_id":"selected","status":"refused","text":null}]}'),signal());
 assert.equal(row.status,'contract-valid');assert.equal(row.preview!.text,example.original);
 assert.equal(row.preview!.claims[0].status,'refused');assert.equal(row.acceptance,'not-accepted');
});
const failures:[string,Backend,boolean][]=[
 ['unfinished output',async()=>response(claims(example),'length'),true],
 ['malformed model JSON',async()=>response('{broken'),true],
 ['unknown fact ID',async()=>response('{"claims":[{"fact_id":"foreign","status":"proposed","text":"Invented"}]}'),true],
 ['duplicate claim',async()=>response('{"claims":[{"fact_id":"selected","status":"refused","text":null},{"fact_id":"selected","status":"refused","text":null}]}'),true],
 ['HTTP error',async()=>Response.json({error:'private backend diagnostic'},{status:503}),false],
 ['wrong MIME',async()=>new Response('{}'),false],
 ['malformed backend JSON',async()=>new Response('{broken',{headers:{'Content-Type':'application/json'}}),false],
 ['zero completion tokens',async()=>response(claims(example),'stop',{prompt_tokens:100,completion_tokens:0}),false],
 ['context overflow',async()=>response(claims(example),'stop',{prompt_tokens:8000,completion_tokens:300}),false],
 ['oversized body',async()=>new Response('x'.repeat(128001),{headers:{'Content-Type':'application/json'}}),false],
 ['invalid UTF8',async()=>new Response(new Uint8Array([0xc3,0x28]),{headers:{'Content-Type':'application/json'}}),false],
 ['backend throw',async()=>{throw Error('private backend diagnostic');},false]
];
for(const [name,backend,complete] of failures)test('refuses '+name+' without retry or environment leakage',async()=>{
 const before=env();const row=await evaluateCase(example,backend,signal());
 assert.equal(row.status,'refused');assert.equal(row.preview,null);assert.equal(row.backendRequests,1);
 assert.equal(row.calls,1);assert.equal(row.backendResponse,complete);assert.equal(row.acceptance,'not-accepted');
 assert.deepEqual(env(),before);
});
test('pre-aborted operation does not contact backend and restores environment',async()=>{
 const before=env();const control=new AbortController();control.abort();let calls=0;
 const row=await evaluateCase(example,async()=>{calls++;return response();},control.signal);
 assert.equal(row.status,'refused');assert.equal(calls,0);assert.deepEqual(env(),before);
});
test('in-flight abort reaches owned backend; overlap refuses without changing environment',async()=>{
 const before=env();const control=new AbortController();let entered!:()=>void;
 const ready=new Promise<void>(r=>{entered=r;});let aborted=false;
 const operation=evaluateCase(example,async(_payload,s)=>{
  entered();return new Promise<Response>((_resolve,reject)=>s.addEventListener('abort',()=>{aborted=true;reject(Error('cancelled'));},{once:true}));
 },control.signal);
 await ready;
 const during=env();await assert.rejects(evaluateCase(example,async()=>response(),signal()),/REWRITE_DIAGNOSTIC_BUSY/);
 assert.deepEqual(env(),during);control.abort();const row=await operation;
 assert.equal(row.status,'refused');assert.equal(aborted,true);assert.equal(row.backendRequests,1);assert.deepEqual(env(),before);
});
test('invalid source fails before backend and releases exclusive lease',async()=>{
 const before=env();let calls=0;
 await assert.rejects(evaluateCase({...example,original:'Unrelated original'},async()=>{calls++;return response();},signal()));
 assert.equal(calls,0);assert.deepEqual(env(),before);
 assert.equal((await evaluateCase(example,async()=>response(),signal())).status,'contract-valid');
});
