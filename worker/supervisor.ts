import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {MAX_FILE_BYTES,MAX_PARSER_RESPONSE_BYTES,ParserResponseSchema,type ParserResponse} from '../lib/parser-contract.js';
export type JobOptions={entry?:string;wallMs?:number;cpuSeconds?:number};
/** Linux RLIMIT_CPU + external wall kill. Hard total RAM/PIDs are enforced by the container, not V8 flags. */
export function runParser(data:Buffer,extension:string,signal?:AbortSignal,options:JobOptions={}):Promise<ParserResponse>{
 if(data.length>MAX_FILE_BYTES)return Promise.resolve({ok:false,code:'TOO_LARGE'});
 if(signal?.aborted)return Promise.resolve({ok:false,code:'TIMEOUT'});
 return new Promise(resolve=>{
  let finished=false,bytes=0;const chunks:Buffer[]=[];
  const child=spawn('/usr/bin/prlimit',['--cpu='+(options.cpuSeconds??8)+':'+(options.cpuSeconds??8),'--core=0','--nofile=64',
   process.execPath,'--disable-sigusr1','--max-old-space-size=192',options.entry??join(__dirname,'job.cjs'),extension],
   {detached:true,stdio:['pipe','pipe','ignore'],cwd:'/tmp',env:{PATH:'/usr/bin:/bin',TZ:'UTC',LANG:'C.UTF-8',NODE_ENV:'production',HOME:'/tmp',RAYON_NUM_THREADS:'2',UV_THREADPOOL_SIZE:'2',OMP_NUM_THREADS:'1'}});
  const kill=()=>{if(child.pid)try{process.kill(-child.pid,'SIGKILL');}catch{try{child.kill('SIGKILL');}catch{}}};
  const finish=(result:ParserResponse)=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);kill();resolve(result);};
  const abort=()=>finish({ok:false,code:'TIMEOUT'});
  const timer=setTimeout(abort,options.wallMs??15000);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  child.stdout.on('data',(chunk:Buffer)=>{if(finished)return;bytes+=chunk.length;if(bytes>MAX_PARSER_RESPONSE_BYTES){finish({ok:false,code:'UNAVAILABLE'});return;}chunks.push(chunk);});
  child.stdin.on('error',()=>{});child.on('error',()=>finish({ok:false,code:'UNAVAILABLE'}));
  child.on('close',(code,exitSignal)=>{
   if(finished)return;
   if(exitSignal==='SIGKILL'||exitSignal==='SIGXCPU'){finish({ok:false,code:'TIMEOUT'});return;}
   if(code!==0||bytes>MAX_PARSER_RESPONSE_BYTES){finish({ok:false,code:'UNAVAILABLE'});return;}
   try{const result=ParserResponseSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))));finish(result);}
   catch{finish({ok:false,code:'UNAVAILABLE'});}
  });
  child.stdin.end(data);
 });
}
