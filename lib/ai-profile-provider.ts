import {z} from 'zod';
import {aiConfig} from './ai-provider';
import {boundedBody} from './body';
import {UserError} from './errors';
import {observeAiFailure,type AiFailureObserver,type AiFailureStage} from './ai-diagnostics';
import {AI_PROFILE_LIMITS,AI_PROFILE_PROMPT,AiProfileOriginSchema,aiProfileRequest,profilePreview} from './ai-profile';

export function aiProfileConfig(){
 if(process.env.JOBMATCH_AI_PROFILE_ENABLED!=='true')throw new UserError('',503,'AI_PROFILE_DISABLED');
 const config=aiConfig(),digest=process.env.JOBMATCH_AI_PROFILE_MODEL_REVISION;
 if(!digest||!/^sha256:[a-f0-9]{64}$/.test(digest))throw new UserError('',503,'AI_PROFILE_NOT_CONFIGURED');
 return {...config,origin:AiProfileOriginSchema.parse({model:config.model,operatorDeclaredModelDigest:digest,modelIdentityVerified:false})};
}
export function aiProfileBody(source:string,model:string){
 const request=aiProfileRequest(source);
 const body=JSON.stringify({model,stream:false,format:request.format,options:{temperature:0,num_predict:2048},messages:[{role:'system',content:AI_PROFILE_PROMPT},{role:'user',content:request.input}]});
 if(new TextEncoder().encode(body).length>AI_PROFILE_LIMITS.requestBytes)throw new UserError('',413,'AI_PROFILE_SOURCE_LIMIT');
 return body;
}
/** Optional configured own-model request. Preview only, never a profile/fact write. */
export async function aiProfilePreview(source:string,signal:AbortSignal,onFailure?:AiFailureObserver){
 let config:ReturnType<typeof aiProfileConfig>,request:string;
 try{config=aiProfileConfig();}catch(error){observeAiFailure(onFailure,'configuration');throw error;}
 try{request=aiProfileBody(source,config.model);}catch(error){observeAiFailure(onFailure,'input');throw error;}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000),combined=AbortSignal.any([signal,controller.signal]);
 let stage:AiFailureStage='transport';
 try{
  const response=await fetch(config.endpoint,{method:'POST',redirect:'error',cache:'no-store',signal:combined,headers:{'Content-Type':'application/json',...(config.token?{Authorization:`Bearer ${config.token}`}:{})},body:request});
  stage='http-status-or-type';if(!response.ok||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error();
  stage='body-read';const bytes=await boundedBody({headers:response.headers,body:response.body,signal:combined},64000,15000);
  stage='envelope-json';const decoded=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(bytes));
  stage='envelope-schema';const envelope=z.object({done:z.literal(true),done_reason:z.literal('stop'),message:z.object({role:z.literal('assistant'),content:z.string().max(60000)})}).parse(decoded);
  stage='content-json';const value=JSON.parse(envelope.message.content);
  stage='review-validation';return profilePreview(value,source,config.origin,onFailure?failure=>{stage=failure;}:undefined);
 }catch{
  observeAiFailure(onFailure,combined.aborted?(signal.aborted?'cancelled':'timeout'):stage);
  throw new UserError('',combined.aborted?504:502,combined.aborted?'AI_PROFILE_TIMEOUT':'AI_PROFILE_RESPONSE_INVALID');
 }finally{clearTimeout(timer);}
}
