import {configuredAiQuoteContract,sourceQuoteContract,SOURCE_QUOTE_LIMITS,type AiQuoteContract} from './ai-source-quotes';
import {observeAiFailure,type AiFailureObserver,type AiFailureStage} from './ai-diagnostics';
import {z} from 'zod';
import {aiPromptForQuoteContract} from './ai-prompt';
import {AiReviewSchema,eligibleAiFacts,validateAiReview} from './ai-review';
import type {Fact} from './engine';
import {boundedBody} from './body';
import {UserError} from './errors';
export function aiConfig(){
 configuredAiQuoteContract();
 if(process.env.JOBMATCH_AI_ENABLED!=='true'||process.env.JOBMATCH_AI_SELF_HOSTED!=='true')throw new UserError('AI-разбор пока не подключён администратором. Обычный анализ доступен.',503,'AI_DISABLED');
 let endpoint:URL;try{endpoint=new URL(process.env.JOBMATCH_AI_ENDPOINT||'');}catch{throw new UserError('AI-сервис не настроен.',503,'AI_NOT_CONFIGURED');}
 const local=['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname);
 if((endpoint.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&local&&endpoint.protocol==='http:'))||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.pathname!=='/api/chat')throw new UserError('AI-сервис не настроен.',503,'AI_NOT_CONFIGURED');
 const model=process.env.JOBMATCH_AI_MODEL;
 if(!model||model.length>100||!/^[a-zA-Z0-9_./:-]+$/.test(model))throw new UserError('AI-модель не настроена.',503,'AI_MODEL_NOT_CONFIGURED');
 const token=process.env.JOBMATCH_AI_TOKEN;
 if((process.env.NODE_ENV==='production'&&!token)||(token&&(token.length<16||token.length>4096||/[\s\x00-\x1f\x7f]/.test(token))))throw new UserError('AI-сервис не настроен.',503,'AI_NOT_CONFIGURED');
 return {endpoint:endpoint.href,model,token};
}
export async function aiReview(facts:Fact[],vacancy:string,signal:AbortSignal,onFailure?:AiFailureObserver){
 let config:ReturnType<typeof aiConfig>,contract:AiQuoteContract;
 try{config=aiConfig();contract=configuredAiQuoteContract();}catch(error){observeAiFailure(onFailure,'configuration');throw error;}
 let eligible:Fact[],input:string,requestBody:string,source:ReturnType<typeof sourceQuoteContract>|undefined;
 try{
 eligible=eligibleAiFacts(facts);
 if(!eligible.length||!vacancy.trim())throw new UserError('Подтвердите факты и сохраните текст вакансии.',400,'AI_INPUT_REQUIRED');
 input=JSON.stringify({vacancy,facts:eligible.map(({id,text})=>({id,text}))});
 if(Buffer.byteLength(input,'utf8')>48000)throw new UserError('Для AI-разбора сократите профиль или вакансию: лимит 48 КБ.',413,'AI_INPUT_TOO_LARGE');
 source=contract==='source-lines-v1'?sourceQuoteContract(vacancy):undefined;
 const prompt=aiPromptForQuoteContract(contract);
 requestBody=JSON.stringify({model:config.model,stream:false,format:source?.format??z.toJSONSchema(AiReviewSchema),options:{temperature:0,num_predict:2048},messages:[{role:'system',content:prompt.text},{role:'user',content:input}]});
 if(source&&Buffer.byteLength(requestBody,'utf8')>SOURCE_QUOTE_LIMITS.requestBytes)throw new UserError('Для AI-разбора сократите число или длину строк требований и объём профиля.',413,'AI_SOURCE_QUOTES_LIMIT');
 }catch(error){observeAiFailure(onFailure,'input');throw error;}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 const combined=AbortSignal.any([signal,controller.signal]);
 let stage:AiFailureStage='transport';
 try{
  const response=await fetch(config.endpoint,{method:'POST',redirect:'error',cache:'no-store',signal:combined,
   headers:{'Content-Type':'application/json',...(config.token?{Authorization:`Bearer ${config.token}`}:{})},body:requestBody});
  stage='http-status-or-type';
  if(!response.ok||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new Error('PROVIDER');
  stage='body-read';
  const bytes=await boundedBody({headers:response.headers,body:response.body,signal:combined},64000,15000);
  stage='envelope-json';
  const decoded=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  stage='envelope-schema';
  const envelope=z.object({done:z.literal(true),done_reason:z.literal('stop').optional(),message:z.object({role:z.literal('assistant'),content:z.string().max(60000)})}).parse(decoded);
  stage='content-json';
  const value=JSON.parse(envelope.message.content);
  stage='review-validation';
  const review=validateAiReview(value,facts,vacancy,onFailure?failure=>{stage=failure;}:undefined);
  if(source&&review.requirements.some(row=>!source.candidates.some(candidate=>candidate.quote===row.quote))){stage='citation';throw Error('AI_SOURCE_QUOTE_CONTRACT');}
  return review;
 }catch{
  observeAiFailure(onFailure,combined.aborted?(signal.aborted?'cancelled':'timeout'):stage);
  throw new UserError(combined.aborted?'AI-разбор прерван или не ответил вовремя. Повторите по желанию.':'AI-сервис не вернул проверяемый результат. Обычный анализ доступен.',combined.aborted?504:502,combined.aborted?'AI_TIMEOUT':'AI_RESPONSE_INVALID');
 }finally{clearTimeout(timer);}
}
