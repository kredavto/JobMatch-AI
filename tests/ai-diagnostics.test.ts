import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {aiReview} from '../lib/ai-provider';
import {validateAiReview} from '../lib/ai-review';
import {AI_FAILURE_STAGES,aiFailureStage,observeAiFailure} from '../lib/ai-diagnostics';
import {evaluateCorpus} from '../evaluation/grade';
import {evaluationCorpus} from '../evaluation/corpus';
const facts=[{id:'f1',text:'SQL',verified:true,source:'private source'},{id:'f2',text:'Private unverified fact',verified:false,source:'private'}];
const valid={requirements:[{quote:'SQL',evidence_ids:['f1']}]};
const envelope=(content=JSON.stringify(valid))=>({done:true,done_reason:'stop',message:{role:'assistant',content}});
beforeEach(()=>{vi.stubEnv('JOBMATCH_AI_ENABLED','true');vi.stubEnv('JOBMATCH_AI_SELF_HOSTED','true');vi.stubEnv('JOBMATCH_AI_ENDPOINT','https://private.example.test/api/chat');vi.stubEnv('JOBMATCH_AI_MODEL','fixture');vi.stubEnv('NODE_ENV','production');vi.stubEnv('JOBMATCH_AI_TOKEN','private-credential-for-fixture');});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('diagnostic sink receives only an allowlisted label and cannot throw into the business operation',()=>{
 const sink=vi.fn(()=>{throw Error('sink private diagnostic');});
 expect(()=>observeAiFailure(sink,'citation')).not.toThrow();expect(sink.mock.calls).toEqual([['citation']]);
 for(const value of ['private',{},null,new Proxy({},{get(){throw Error('inspected');}})])expect(aiFailureStage(value)).toBe('unknown');
 expect(new Set(AI_FAILURE_STAGES).size).toBe(AI_FAILURE_STAGES.length);
});
it.each([
 ['http-status-or-type',()=>new Response('private provider diagnostic',{status:500})],
 ['http-status-or-type',()=>new Response('not-json')],
 ['body-read',()=>Response.json({...envelope(),padding:'x'.repeat(65000)})],
 ['envelope-json',()=>new Response('private invalid JSON',{headers:{'Content-Type':'application/json'}})],
 ['envelope-json',()=>new Response(new Uint8Array([0xff]),{headers:{'Content-Type':'application/json'}})],
 ['envelope-schema',()=>Response.json({...envelope(),done_reason:'length'})],
 ['content-json',()=>Response.json(envelope('private non-JSON'))],
 ['review-schema',()=>Response.json(envelope(JSON.stringify({requirements:[{quote:'SQL',evidence_ids:['f1'],private:'data'}]})))],
 ['citation',()=>Response.json(envelope(JSON.stringify({requirements:[{quote:'invented private quote',evidence_ids:[]}]})))],
 ['evidence',()=>Response.json(envelope(JSON.stringify({requirements:[{quote:'SQL',evidence_ids:['f2']}]})))]
] as const)('classifies %s without changing public code/status or emitting content',async(stage,response)=>{
 const sink=vi.fn(),fetcher=vi.fn().mockResolvedValue(response());vi.stubGlobal('fetch',fetcher);
 await expect(aiReview(facts,'SQL',new AbortController().signal,sink)).rejects.toMatchObject({status:502,code:'AI_RESPONSE_INVALID'});
 expect(sink.mock.calls).toEqual([[stage]]);expect(JSON.stringify(sink.mock.calls)).not.toMatch(/private|SQL|f1|f2/);expect(fetcher).toHaveBeenCalledTimes(1);
});
it('transport rejection does not inspect any exception properties',async()=>{
 const getters=vi.fn(()=>{throw Error('exception inspected');}),error=new Proxy({},{get:getters}),sink=vi.fn();
 vi.stubGlobal('fetch',vi.fn(()=>Promise.reject(error)));
 await expect(aiReview(facts,'SQL',new AbortController().signal,sink)).rejects.toMatchObject({code:'AI_RESPONSE_INVALID'});
 expect(getters).not.toHaveBeenCalled();expect(sink.mock.calls).toEqual([['transport']]);
});
it('configuration and input refusal preserve original public codes before network',async()=>{
 const sink=vi.fn(),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 vi.stubEnv('JOBMATCH_AI_ENABLED','false');await expect(aiReview(facts,'SQL',new AbortController().signal,sink)).rejects.toMatchObject({status:503,code:'AI_DISABLED'});
 expect(sink.mock.calls).toEqual([['configuration']]);sink.mockClear();vi.stubEnv('JOBMATCH_AI_ENABLED','true');
 await expect(aiReview(facts,'',new AbortController().signal,sink)).rejects.toMatchObject({status:400,code:'AI_INPUT_REQUIRED'});
 expect(sink.mock.calls).toEqual([['input']]);expect(fetcher).not.toHaveBeenCalled();
});
it.each(['cancelled','timeout'] as const)('distinguishes %s by owned abort signals without inspecting reason',async expected=>{
 vi.useFakeTimers();const external=new AbortController(),sink=vi.fn();
 vi.stubGlobal('fetch',vi.fn((_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Proxy({},{get(){throw Error('reason inspected');}})),{once:true}))));
 const pending=aiReview(facts,'SQL',external.signal,sink);const assertion=expect(pending).rejects.toMatchObject({status:504,code:'AI_TIMEOUT'});
 if(expected==='cancelled')external.abort('private reason');else await vi.advanceTimersByTimeAsync(20000);
 await assertion;expect(sink.mock.calls).toEqual([[expected]]);expect(vi.getTimerCount()).toBe(0);
});
it('valid results and request bytes are identical with/without observer; successful cases emit nothing',async()=>{
 const bodies:string[]=[],sink=vi.fn();vi.stubGlobal('fetch',vi.fn((_url,options)=>{bodies.push(options.body);return Promise.resolve(Response.json(envelope()));}));
 const signal=new AbortController().signal;
 expect(await aiReview(facts,'SQL',signal)).toEqual(valid);expect(await aiReview(facts,'SQL',signal,sink)).toEqual(valid);
 expect(bodies[0]).toBe(bodies[1]);expect(sink).not.toHaveBeenCalled();
});
it('throwing sink preserves failed provider result, no retry and no diagnostic leak',async()=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json(envelope('not JSON')));vi.stubGlobal('fetch',fetcher);
 await expect(aiReview(facts,'SQL',new AbortController().signal,()=>{throw Error('private sink');})).rejects.toMatchObject({status:502,code:'AI_RESPONSE_INVALID'});
 expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each([
 ['review-schema',{requirements:[{quote:'SQL',evidence_ids:[],score:1}]}],
 ['citation',{requirements:[{quote:' SQL',evidence_ids:[]}]}],
 ['citation',{requirements:[{quote:'SQL',evidence_ids:[]},{quote:'SQL',evidence_ids:[]}]}],
 ['evidence',{requirements:[{quote:'SQL',evidence_ids:['f1','f1']}]}],
 ['evidence',{requirements:[{quote:'SQL',evidence_ids:['foreign']}]}]
] as const)('validator %s callback does not weaken provenance or change rejection', (stage,value)=>{
 const sink=vi.fn();expect(()=>validateAiReview(value,facts,'SQL',sink)).toThrow();expect(sink.mock.calls).toEqual([[stage]]);
 expect(()=>validateAiReview(value,facts,'SQL',()=>{throw Error('sink');})).toThrow();
});
it('evaluation diagnostics are optional, bounded, sink-failure tolerant and preserve unknown/grade failures',async()=>{
 const sample=evaluationCorpus[0],signal=new AbortController().signal,invoke=async()=>{throw Error('private model output');};
 const legacy=await evaluateCorpus([sample],invoke,signal);expect(legacy.rows[0]).not.toHaveProperty('failureStage');
 const classified=await evaluateCorpus([sample],invoke,signal,{failureStage:()=> 'citation'});expect(classified.rows[0]).toMatchObject({status:'error',failureStage:'citation'});
 const unknown=await evaluateCorpus([sample],invoke,signal,{failureStage:()=>{throw Error('private sink');}});expect(unknown.rows[0]).toHaveProperty('failureStage','unknown');
 const invalid=await evaluateCorpus([sample],invoke,signal,{failureStage:()=> 'private' as 'unknown'});expect(invalid.rows[0]).toHaveProperty('failureStage','unknown');
 const phase=vi.fn(()=> 'grading-validation' as const);
 const grade=await evaluateCorpus([sample],async()=>({requirements:[{quote:'foreign quote',evidence_ids:[]}]}),signal,{failureStage:phase});
 expect(phase).toHaveBeenCalledWith(sample.id,'grade');expect(grade.rows[0]).toHaveProperty('failureStage','grading-validation');
 expect(JSON.stringify([classified,unknown,invalid,grade])).not.toContain('private');
});
