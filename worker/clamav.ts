import {createConnection} from 'node:net';
import {MAX_FILE_BYTES} from '../lib/parser-contract.js';
export type ScanVerdict='clean'|'blocked'|'unavailable';
/** Transport only: signature freshness/readiness and deployment remain separate gates. */
export function scanStream(data:Buffer,signal?:AbortSignal,options:{host?:string;port?:number;deadlineMs?:number}={}):Promise<ScanVerdict>{
 if(data.length>MAX_FILE_BYTES||signal?.aborted)return Promise.resolve('unavailable');
 return new Promise(resolve=>{
  const socket=createConnection({host:options.host??'scanner',port:options.port??3310});let done=false,size=0;const chunks:Buffer[]=[];
  const finish=(verdict:ScanVerdict)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);socket.destroy();resolve(verdict);};
  const abort=()=>finish('unavailable');const timer=setTimeout(abort,options.deadlineMs??2000);
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  socket.on('error',abort);
  socket.on('connect',()=>{
   if(done)return;
   socket.write(Buffer.from('zINSTREAM\0'));
   for(let offset=0;offset<data.length;offset+=65536){const chunk=data.subarray(offset,offset+65536),length=Buffer.alloc(4);length.writeUInt32BE(chunk.length);socket.write(length);socket.write(chunk);}
   socket.write(Buffer.alloc(4));
  });
  socket.on('data',(chunk:Buffer)=>{if(done)return;size+=chunk.length;if(size>1024){abort();return;}chunks.push(chunk);});
  // Require EOF, not just a prefix: extra/truncated frames cannot become clean.
  socket.on('end',()=>{
   const response=Buffer.concat(chunks);
   if(response.equals(Buffer.from('stream: OK\0')))finish('clean');
   else if(/^stream: [A-Za-z0-9_.-]+ FOUND\x00$/.test(response.toString('latin1')))finish('blocked');
   else abort();
  });
  socket.on('close',()=>{if(!done)abort();});
 });
}
/** The only parser dispatch path when a gate is supplied. No retries or bypass. */
export async function afterCleanScan<T>(data:Buffer,scan:(bytes:Buffer)=>Promise<ScanVerdict>,parse:(bytes:Buffer)=>Promise<T>):Promise<{verdict:ScanVerdict;value?:T}>{
 const frozen=Buffer.from(data);let verdict:ScanVerdict;
 try{verdict=await scan(Buffer.from(frozen));}catch{return{verdict:'unavailable'};}
 if(verdict!=='clean')return{verdict:verdict==='blocked'?'blocked':'unavailable'};
 return{verdict,value:await parse(frozen)};
}
