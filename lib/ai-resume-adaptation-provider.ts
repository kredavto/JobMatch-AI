import {aiConfig} from './ai-provider';
import {z} from 'zod';
import {boundedBody} from './body';
import {adaptationRequest} from './ai-adaptation-request';
import {validateAiReview} from './ai-review';
import {ADAPTATION_FORMAT,adaptationFacts,validateAdaptation} from './ai-resume-adaptation';
import type {Fact} from './engine';
import {UserError} from './errors';
/** Independent opt-in. Enabling this experimental path is NOT model acceptance. */
export function adaptationConfig(){
 if(process.env.JOBMATCH_AI_ADAPTATION_ENABLED!=='true')throw new UserError('AI adaptation is not enabled.',503);
 return aiConfig();
}
export async function adaptResume(facts:Fact[],original:string,vacancy:string,signal:AbortSignal){
 adaptationConfig();
 const eligible=adaptationFacts(facts,original);
 if(!original.trim()||!eligible.length)throw new UserError('Confirmed original resume lines required.',400);
 const config=aiConfig();let request;
 try{request=adaptationRequest(eligible,vacancy);}catch{throw new UserError('For AI adaptation, use 1–50 clear vacancy lines of at most 2000 characters each; review ambiguous evidence IDs. Manual analysis remains available.',400);}
 if(Buffer.byteLength(JSON.stringify(request),'utf8')>48000)throw new UserError('Adaptation request exceeds 48 KB.',413);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000),combined=AbortSignal.any([signal,controller.signal]);
 let review;
 try{
  const response=await fetch(config.endpoint,{method:'POST',redirect:'error',cache:'no-store',signal:combined,headers:{'Content-Type':'application/json',...(config.token?{Authorization:`Bearer ${config.token}`}:{})},body:JSON.stringify({model:config.model,stream:false,format:request.format,options:{temperature:0,num_predict:2048},messages:request.messages})});
  if(!response.ok||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error('PROVIDER');
  const bytes=await boundedBody({headers:response.headers,body:response.body,signal:combined},64000,15000);
  const envelope=z.object({done:z.literal(true),done_reason:z.literal('stop').optional(),message:z.object({role:z.literal('assistant'),content:z.string().max(60000)})}).parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
  review=validateAiReview(JSON.parse(envelope.message.content),eligible,vacancy);
  if(review.requirements.some(row=>!request.spans.some(span=>span.quote===row.quote)))throw Error('OUTSIDE_VACANCY_SPANS');
 }catch{throw new UserError(combined.aborted?'AI adaptation timed out or was cancelled.':'AI adaptation returned an unverifiable result.',combined.aborted?504:502);}finally{clearTimeout(timer);}
 return validateAdaptation({format:ADAPTATION_FORMAT,generator:'ai-selected-literal',modelAcceptance:'not-accepted',review},facts,original,vacancy);
}
