import {z} from 'zod';
import {boundedBody} from './body';
export class SourceVersionClientError extends Error{constructor(public status:number){super('SOURCE_VERSION_REQUEST_FAILED');}}
/** Fixed same-origin endpoint; bounded headers+body deadline, no retries or raw errors. */
export async function sourceVersionRequest(ownerId:string,signal:AbortSignal,body?:unknown,id?:string):Promise<unknown>{
 z.uuid().parse(ownerId);if(id!==undefined)z.uuid().parse(id);if(body!==undefined&&id!==undefined)throw new SourceVersionClientError(400);
 const deadline=AbortSignal.any([signal,AbortSignal.timeout(20000)]);let response:Response;
 try{response=await fetch('/api/source-versions'+(id?'?id='+encodeURIComponent(id):''),{method:body===undefined?'GET':'POST',credentials:'same-origin',redirect:'error',cache:'no-store',signal:deadline,headers:{'x-jobmatch-owner':ownerId,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});}catch{throw new SourceVersionClientError(0);}
 if(response.status!==200||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'){
  void response.body?.cancel().catch(()=>{});throw new SourceVersionClientError(response.ok?502:response.status);
 }
 try{return JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(await boundedBody({headers:response.headers,body:response.body,signal:deadline},4000000,20000)));}catch{throw new SourceVersionClientError(502);}
}
