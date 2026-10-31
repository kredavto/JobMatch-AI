import {validateAuthAck} from './auth-contract';
import {WorkspaceSchema} from './workspace-schema';
import {ui} from './i18n';
/** Never retry mutations: a lost response does not prove a failed write. */
export class RequestError extends Error {
 constructor(message:string,public status=0){super(message);}
}
export async function requestJson<T>(url:string,init?:RequestInit):Promise<T>{
 let response:Response;
 try{response=await fetch(url,{...init,cache:'no-store',signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});}catch{throw new RequestError(ui.request.lost);}
 let data;
 try{data=await response.json();}catch{throw new RequestError(ui.request.invalid,response.ok?0:response.status);}
 if(!response.ok)throw new RequestError(typeof data?.error==='string'?data.error:ui.request.failed,response.status);
 return data as T;
}

export function validatedWorkspace(data:unknown){const result=WorkspaceSchema.safeParse(data);if(!result.success)throw new RequestError(ui.request.invalid);return result.data;}

export function validatedAuthAck(data:unknown,allowConfirmation=false){try{return validateAuthAck(data,allowConfirmation);}catch{throw new RequestError(ui.request.invalid,502);}}
