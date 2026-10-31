import {createHash} from 'node:crypto';
import {z} from 'zod';
import {adaptResume} from '../../lib/ai-resume-adaptation-provider';
import {adaptationFacts,adaptationEdits,renderAdaptation} from '../../lib/ai-resume-adaptation';
import {AiReviewSchema,validateAiReview} from '../../lib/ai-review';
import {boundedBody} from '../../lib/body';
import type {Fact} from '../../lib/engine';
export type Case={id:string;language:string;original:string;facts:Fact[];vacancy:string;expectedEvidenceIds:string[];expectedRequirementQuotes:string[];selectedEvidenceIds:string[];rationale:string};
export const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const ENDPOINT='http://127.0.0.1:18766/api/chat';
export function configure(){Object.assign(process.env,{NODE_ENV:'test',JOBMATCH_AI_ADAPTATION_ENABLED:'true',JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_ENDPOINT:ENDPOINT,JOBMATCH_AI_MODEL:'jobmatch-qwen2.5-0.5b-q8-diagnostic'});delete process.env.JOBMATCH_AI_TOKEN;}
export function approved(env:Record<string,string|undefined>){return env.CI==='true'&&env.GITHUB_ACTIONS==='true'&&env.JOBMATCH_AI_CPU_DIAGNOSTIC==='true'&&env.GITHUB_REPOSITORY==='kredavto/JobMatch-AI'&&env.JOBMATCH_REPOSITORY_VISIBILITY==='public';}
export type Payload={model:string;stream:false;messages:{role:string;content:string}[];format:unknown;options:{temperature:number;num_predict:number}};
export type Backend=(payload:Payload,signal:AbortSignal)=>Promise<Response>;
const envelopeSchema=z.object({choices:z.tuple([z.object({message:z.object({role:z.literal('assistant'),content:z.string().max(60000)}),finish_reason:z.enum(['stop','length'])})]),usage:z.object({prompt_tokens:z.number().int().positive().max(4096),completion_tokens:z.number().int().positive().max(2056)})});
// Captures actual production bytes. No copied prompt, alternate grammar or gold access.
export async function capture(test:Pick<Case,'facts'|'original'|'vacancy'>){const saved=globalThis.fetch;let body:string|undefined;globalThis.fetch=async(url,init)=>{if(url!==ENDPOINT||init?.method!=='POST'||typeof init.body!=='string'||body)throw Error('CAPTURE');body=init.body;throw Error('CAPTURE_ONLY');};try{await adaptResume(test.facts,test.original,test.vacancy,new AbortController().signal).catch(()=>{});}finally{globalThis.fetch=saved;}if(!body)throw Error('NO_PRODUCTION_REQUEST');return body;}
export async function evaluateCase(test:Case,backend:Backend,signal:AbortSignal){
 const captured=await capture(test),saved=globalThis.fetch;let calls=0,stage='provider',raw:string|null=null,rawBackendEnvelope:string|null=null,tokens=0,finish:string|null=null,backendResponse=false;
 globalThis.fetch=async(url,init)=>{
  if(url!==ENDPOINT||init?.method!=='POST'||init.body!==captured||++calls!==1)throw Error('REQUEST_REFUSED');
  try{stage='transport';const combined=AbortSignal.any([signal,init.signal!]);const response=await backend(JSON.parse(captured),combined);stage='http-status-or-type';if(!response.ok||!response.headers.get('content-type')?.startsWith('application/json'))throw Error('HTTP');stage='body-read';const bytes=await boundedBody({headers:response.headers,body:response.body,signal:combined},64000,15000);stage='envelope';rawBackendEnvelope=new TextDecoder('utf8',{fatal:true}).decode(bytes);const envelope=envelopeSchema.parse(JSON.parse(rawBackendEnvelope));const choice=envelope.choices[0];raw=choice.message.content;tokens=envelope.usage.completion_tokens;finish=choice.finish_reason;backendResponse=true;stage='finish';if(finish==='stop'){try{stage='json';const parsed=JSON.parse(raw);stage='schema';AiReviewSchema.parse(parsed);stage='provenance';validateAiReview(parsed,adaptationFacts(test.facts,test.original),test.vacancy);stage='provider';}catch{/* Label only: real provider receives unchanged content and validates independently. */}}
   return new Response(JSON.stringify({done:true,done_reason:finish,message:choice.message}),{headers:{'Content-Type':'application/json'}});
  }catch(e){if(signal.aborted||init?.signal?.aborted)stage='timeout-or-cancelled';throw e;}
 };
 try{const preview=await adaptResume(test.facts,test.original,test.vacancy,signal);stage='grading';const ids=adaptationEdits(preview,test.facts,test.original,test.vacancy).map(e=>e.evidence_ids[0]).sort();const quotes=preview.review.requirements.map(r=>r.quote).sort();const semanticGoldMatch=JSON.stringify(ids)===JSON.stringify([...test.expectedEvidenceIds].sort())&&JSON.stringify(quotes)===JSON.stringify([...test.expectedRequirementQuotes].sort());
  let draft:string|null=null,renderingStatus='not-requested';if(test.selectedEvidenceIds.length){if(test.selectedEvidenceIds.every(id=>ids.includes(id))){try{draft=renderAdaptation(preview,test.selectedEvidenceIds.map(id=>'ai-adaptation-'+id),test.facts,test.original,test.vacancy);renderingStatus='rendered';}catch{renderingStatus='selection-error';}}else renderingStatus='selected-evidence-unavailable';}
  return {id:test.id,language:test.language,payloadSha256:hash(captured),status:'graded',passed:semanticGoldMatch,stage:semanticGoldMatch?'complete':'gold-mismatch',evidenceIds:ids,requirementQuotes:quotes,selectedEvidenceIds:test.selectedEvidenceIds,renderingStatus,draft,rawSyntheticReply:raw,rawBackendEnvelope,backendResponse,tokens,finish};
 }catch{return {id:test.id,language:test.language,payloadSha256:hash(captured),status:'error',passed:false,stage,rawSyntheticReply:raw,rawBackendEnvelope,backendResponse,tokens,finish};}finally{globalThis.fetch=saved;}
}
