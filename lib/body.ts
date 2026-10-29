import {UserError} from './errors';
export const BODY_TIMEOUT_MS=15000;
/** Bound total wall time and bytes, even without Content-Length. Never await an untrusted cancel hook. */
export async function boundedBody(request:Pick<Request,'headers'|'signal'|'body'>,maxBytes:number,timeoutMs=BODY_TIMEOUT_MS):Promise<Uint8Array>{
 const declared=request.headers.get('content-length');
 if(declared&&(!/^\d+$/.test(declared)||Number(declared)>maxBytes))throw new UserError('Запрос слишком большой',413,'REQUEST_TOO_LARGE');
 if(request.signal.aborted)throw new UserError('Загрузка прервана. Повторите попытку.',408,'UPLOAD_ABORTED');
 if(!request.body)return new Uint8Array();
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 let stopped:UserError|undefined;
 let rejectInterrupted!:(error:UserError)=>void;
 const interrupted=new Promise<never>((_,reject)=>{rejectInterrupted=reject;});
 const cancel=()=>{void reader.cancel().catch(()=>{});};
 const stop=(message:string,code:'UPLOAD_ABORTED'|'UPLOAD_TIMEOUT')=>{stopped=new UserError(message,408,code);rejectInterrupted(stopped);cancel();};
 const abort=()=>stop('Загрузка прервана. Повторите попытку.','UPLOAD_ABORTED');
 request.signal.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>stop('Время загрузки истекло. Повторите попытку.','UPLOAD_TIMEOUT'),timeoutMs);
 try{
  if(request.signal.aborted)abort();
  while(true){
   const {done,value}=await Promise.race([reader.read(),interrupted]);
   if(stopped)throw stopped;
   if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){cancel();throw new UserError('Запрос слишком большой',413,'REQUEST_TOO_LARGE');}
   chunks.push(value);
  }
 }catch(error){cancel();if(error instanceof UserError)throw error;throw new UserError('Не удалось прочитать загрузку. Повторите попытку.',400,'UPLOAD_UNREADABLE');}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);reader.releaseLock();}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}return data;
}
