import {verifiedScannerReady} from './scanner-attestation.js';
/** Fixed private endpoint; no caller-controlled URL/key or redirects. */
export async function observerReady(publicKey:string,allowedEngines:readonly string[],signal?:AbortSignal):Promise<boolean>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
 try{
  if(signal?.aborted)return false;
  const interrupted=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Observer deadline'));},500);});
  return await Promise.race([(async()=>{
   const response=await fetch('http://scanner-observer:8080/readiness',{signal:controller.signal,redirect:'error',cache:'no-store',headers:{Accept:'application/json'}});
   if(response.status!==200||response.headers.get('content-type')?.split(';')[0].trim()!=='application/json'||!response.body)return false;
   const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
   try{while(true){const row=await reader.read();if(row.done)break;size+=row.value.length;if(size>10000)return false;chunks.push(row.value);}}
   finally{void reader.cancel().catch(()=>{});reader.releaseLock();}
   if(controller.signal.aborted)return false;
   const envelope=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
   return verifiedScannerReady(envelope,publicKey,{now:Date.now(),allowedEngines,maxDatabaseAgeMs:86400000,maxObservationAgeMs:30000});
  })(),interrupted]);
 }catch{return false;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort();}
}
