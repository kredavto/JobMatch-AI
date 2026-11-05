import {z} from 'zod';
import {createHmac} from 'node:crypto';
import {aiConfig} from './ai-provider';
import {boundedBody} from './body';
import {UserError} from './errors';
import {makeRewritePreview,renderRewriteOriginal,rewriteResponseSchema,REWRITE_PROMPT_VERSION,type RewriteSource,type RewriteLocale} from './ai-rewrite';
import {rewriteSigningConfig} from './ai-rewrite-signing';
import {REWRITE_SYSTEM_PROMPT} from './ai-rewrite-prompt';
export {REWRITE_SYSTEM_PROMPT} from './ai-rewrite-prompt';
export function rewriteConfig(){
 if(process.env.JOBMATCH_AI_REWRITE_ENABLED!=='true')throw new UserError('AI-переписывание не включено.',503,'AI_REWRITE_DISABLED');
 const provider=aiConfig(),signing=rewriteSigningConfig();
 const configurationId=createHmac('sha256',signing.key).update('jobmatch-ai-rewrite-configuration-v1\n'+JSON.stringify([provider.endpoint,provider.model,provider.token??'',REWRITE_PROMPT_VERSION,REWRITE_SYSTEM_PROMPT])).digest('hex');
 return{...provider,signing,promptVersion:REWRITE_PROMPT_VERSION,configurationId};
}
/** Configured-server proposal only; transport success is not model identity or quality. */
export async function proposeRewrite(source:RewriteSource,original:string,language:RewriteLocale,signal:AbortSignal,config=rewriteConfig()){
 try{await renderRewriteOriginal(original,source,source.facts.map(f=>({fact_id:f.id,status:'refused' as const,text:null})));}catch{throw new UserError('Исходник не допускает выбранное переписывание.',400,'AI_REWRITE_SOURCE_INVALID');}
 const input=JSON.stringify({language,vacancy:source.vacancy,facts:source.facts.map(({id,text})=>({fact_id:id,text}))});
 if(Buffer.byteLength(input)>48000)throw new UserError('Для AI-переписывания сократите выбранные факты или вакансию: лимит 48 КБ.',413,'AI_REWRITE_TOO_LARGE');
 const combined=AbortSignal.any([signal,AbortSignal.timeout(20000)]);
 try{
  const response=await fetch(config.endpoint,{method:'POST',redirect:'error',cache:'no-store',signal:combined,
   headers:{'Content-Type':'application/json',...(config.token?{Authorization:`Bearer ${config.token}`}:{})},
   body:JSON.stringify({model:config.model,stream:false,format:z.toJSONSchema(rewriteResponseSchema(source)),options:{temperature:0,num_predict:4096},messages:[{role:'system',content:REWRITE_SYSTEM_PROMPT},{role:'user',content:input}]})});
  if(response.status!==200||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'){void response.body?.cancel().catch(()=>{});throw Error();}
  const bytes=await boundedBody({headers:response.headers,body:response.body,signal:combined},128000,15000);
  const envelope=z.object({done:z.literal(true),done_reason:z.literal('stop'),message:z.object({role:z.literal('assistant'),content:z.string().min(1).max(120000)})}).parse(JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(bytes)));
  const preview=await makeRewritePreview(source,language,config.model,JSON.parse(envelope.message.content),original,config.configurationId);
  combined.throwIfAborted();return preview;
 }catch{throw new UserError(combined.aborted?'AI-переписывание прервано или не ответило вовремя.':'AI-сервис не вернул связанный с исходником предпросмотр.',combined.aborted?504:502,combined.aborted?'AI_REWRITE_TIMEOUT':'AI_REWRITE_RESPONSE_INVALID');}
}
