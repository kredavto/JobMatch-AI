import {validateAuthAck} from './auth-contract';
import {WorkspaceSchema} from './workspace-schema';
import {apiErrors,clientErrors,isApiErrorCode,codeMatchesStatus,type ApiErrorCode,type ClientErrorCode,type ErrorLocale} from './i18n/api-errors';
/** Codes describe failures; HTTP status remains authoritative. Never retry mutations. */
export class RequestError extends Error {
 constructor(message:string,public status=0,readonly code?:ApiErrorCode|ClientErrorCode){super(message);}
}
/** No code-based authentication, retry or recovery actions. Unknown code/copy is never displayed. */
export function errorFromResponse(value:unknown,status:number,locale:ErrorLocale='ru'){
 const language=locale==='en'?'en':'ru';
 const data=value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
 if(data&&Object.hasOwn(data,'code')){
  if(isApiErrorCode(data.code)&&codeMatchesStatus(data.code,status))return new RequestError(apiErrors[data.code][language],status,data.code);
  return new RequestError(clientErrors.CLIENT_INVALID_RESPONSE[language],status,'CLIENT_INVALID_RESPONSE');
 }
 // Compatibility with the earlier same-origin API and existing released clients.
 // English cannot translate arbitrary legacy copy; use a fixed English fallback.
 if(language==='ru'&&data&&typeof data.error==='string'&&data.error.trim()&&data.error.length<=2000&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(data.error))return new RequestError(data.error,status);
 return new RequestError(clientErrors.CLIENT_REQUEST_FAILED[language],status,'CLIENT_REQUEST_FAILED');
}
export async function requestJson<T>(url:string,init?:RequestInit,locale:ErrorLocale='ru'):Promise<T>{
 const language=locale==='en'?'en':'ru';let response:Response;
 try{response=await fetch(url,{...init,cache:'no-store',signal:AbortSignal.timeout(30000)});}catch{throw new RequestError(clientErrors.CLIENT_NETWORK_LOST[language],0,'CLIENT_NETWORK_LOST');}
 let data;
 try{data=await response.json();}catch{throw new RequestError(clientErrors.CLIENT_INVALID_RESPONSE[language],response.ok?0:response.status,'CLIENT_INVALID_RESPONSE');}
 if(!response.ok)throw errorFromResponse(data,response.status,language);
 return data as T;
}
export function validatedWorkspace(data:unknown,locale:ErrorLocale='ru'){const result=WorkspaceSchema.safeParse(data);if(!result.success)throw new RequestError(clientErrors.CLIENT_INVALID_RESPONSE[locale==='en'?'en':'ru'],0,'CLIENT_INVALID_RESPONSE');return result.data;}
export function validatedAuthAck(data:unknown,allowConfirmation=false,locale:ErrorLocale='ru'){try{return validateAuthAck(data,allowConfirmation);}catch{throw new RequestError(clientErrors.CLIENT_INVALID_RESPONSE[locale==='en'?'en':'ru'],502,'CLIENT_INVALID_RESPONSE');}}
