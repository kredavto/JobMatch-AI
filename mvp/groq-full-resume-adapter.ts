import {z} from 'zod';
import {boundedBody} from '../lib/body';
import {resumeFacts,validateFullResume} from './full-resume-consent';
import {REWRITE_EXPERIMENT_PROMPT,reviewRewriteDraft} from './rewrite-draft';
export const FULL_GROQ_MODEL='openai/gpt-oss-20b';
export const FULL_GROQ_URL='https://api.groq.com/openai/v1/chat/completions';
const schema={type:'object',properties:{suggestions:{type:'array',items:{type:'object',properties:{sourceId:{type:'string'},sourceQuote:{type:'string'},text:{type:'string'}},required:['sourceId','sourceQuote','text'],additionalProperties:false}}},required:['suggestions'],additionalProperties:false};
const Envelope=z.object({model:z.literal(FULL_GROQ_MODEL),choices:z.array(z.object({finish_reason:z.literal('stop'),message:z.object({content:z.string().max(48000),refusal:z.null().optional(),tool_calls:z.array(z.never()).max(0).optional()})})).length(1)});
/** No environment reads, global fetch default, route registration, or key lookup.
 * One attempt per factory instance; this is NOT an aggregate spending limit.
 * Construct only after an independent durable authorization/budget reservation.
 */
export function createGroqFullResumeAdapter(options:{key:string;fetcher:typeof fetch}){
 let used=false;
 return async(resume:string,parent:AbortSignal):Promise<unknown>=>{
  try{
   if(used||parent.aborted||!options.key||options.key.length>4096||/[\s\x00-\x1f\x7f]/.test(options.key))throw Error();
   const facts=resumeFacts(validateFullResume(resume));
   const sourceRanges=[...resume.matchAll(/[^\r\n]+/g)].filter(match=>match[0].trim()).map((match,i)=>{const text=match[0].trim();const start=match.index+match[0].indexOf(text);return {sourceId:facts[i].id,start,end:start+text.length};});
   const body=JSON.stringify({model:FULL_GROQ_MODEL,stream:false,temperature:0,reasoning_effort:'low',max_completion_tokens:2048,messages:[{role:'system',content:REWRITE_EXPERIMENT_PROMPT+' The full resume appears once. sourceRanges identify its non-empty trimmed lines using zero-based UTF-16 start/end offsets. Use the indicated sourceId and quote the corresponding line exactly. No vacancy is supplied; improve language only, never infer target-role requirements.'},{role:'user',content:JSON.stringify({resume,sourceRanges})}],response_format:{type:'json_schema',json_schema:{name:'full_resume_rewrite',strict:true,schema}}});
   if(new TextEncoder().encode(body).length>80000)throw Error();
   used=true;
   const signal=AbortSignal.any([parent,AbortSignal.timeout(15000)]);
   let abort=()=>{};
   const interrupted=new Promise<never>((_,reject)=>{abort=()=>reject(Error());signal.addEventListener('abort',abort,{once:true});});
   let response:Response;
   try{response=await Promise.race([options.fetcher(FULL_GROQ_URL,{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${options.key}`},body}),interrupted]);}
   finally{signal.removeEventListener('abort',abort);}
   if(signal.aborted||!response.ok||response.redirected){void response.body?.cancel().catch(()=>{});throw Error();}
   const bytes=await boundedBody({headers:response.headers,body:response.body,signal},65536,15000);
   const envelope=Envelope.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
   const draft=reviewRewriteDraft(facts,JSON.parse(envelope.choices[0].message.content));
   return {suggestions:draft.suggestions.map(({sourceId,sourceQuote,text})=>({sourceId,sourceQuote,text}))};
  }catch{throw Error('GROQ_REWRITE_UNAVAILABLE');}
 };
}
