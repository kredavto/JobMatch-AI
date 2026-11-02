import {boundedBody} from './body';
/** Above the worst-case escaped payload of current50x(quote2000+20IDs100) schemas. */
export const AI_UI_RESPONSE_MAX_BYTES=2*1024*1024;
export const AI_UI_TIMEOUT_MS=25000;
/** Bounded transport/UTF-8/JSON only. Callers still validate owner/revision/provenance. */
export async function readAiUiResponse(response:Response,signal:AbortSignal):Promise<unknown>{
 try{const bytes=await boundedBody({headers:response.headers,body:response.body,signal},AI_UI_RESPONSE_MAX_BYTES,AI_UI_TIMEOUT_MS);
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as unknown;
 }catch(error){discardAiUiResponse(response);throw error;}
}
/** Error bodies are never UI copy; do not await an untrusted cancel hook. */
export function discardAiUiResponse(response:Response){try{if(response.body)void response.body.cancel().catch(()=>{});}catch{}}
