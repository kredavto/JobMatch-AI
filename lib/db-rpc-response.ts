import {boundedBody} from './body';
import {UserError} from './errors';

// SQL limits a complete workspace to <15,000,000 bytes of jsonb text. Keep room
// for the owner/revision wrapper, without accepting an unbounded upstream body.
export const RPC_RESPONSE_BYTES=16*1024*1024;
export const RPC_ERROR_BYTES=64*1024;
function discard(response:Response){void response.body?.cancel().catch(()=>{});}
const invalid=()=>new UserError('Некорректный ответ сервиса. Повторите позже.',502,'UPSTREAM_INVALID_RESPONSE');

/** RPC framing only. Callers still validate the command's exact acknowledgement.
 * Authentication HTTP endpoints have their own success statuses and stay separate.
 * No response body, URL, credentials or provider diagnostics enter an error.
 */
export async function readRpcText(response:Response,signal:AbortSignal):Promise<string>{
 if(response.status===429){discard(response);throw new Error('RATE');}
 if(response.status>=500){discard(response);throw new UserError('Сервис временно недоступен. Повторите позже.',503,'UPSTREAM_UNAVAILABLE');}
 if(response.status===401||response.status===403){discard(response);throw new Error('AUTH');}
 if(response.status!==200&&(response.status<400||response.status>=500)
  ||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'){
  discard(response);throw invalid();
 }
 try{
  const bytes=await boundedBody({headers:response.headers,body:response.body,signal},response.status===200?RPC_RESPONSE_BYTES:RPC_ERROR_BYTES);
  if(!bytes.byteLength)throw invalid();
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 }catch(error){
  discard(response);
  if(signal.aborted||error instanceof UserError&&error.code==='UPLOAD_TIMEOUT')throw new UserError('Сервис не ответил вовремя. Повторите позже.',503,'UPSTREAM_TIMEOUT');
  throw invalid();
 }
}
