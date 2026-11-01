import {createServer,type ServerResponse} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {assertRuntimeEnvironment} from './runtime-environment.js';
import {assertContainerLimits} from './container-limits.js';
import {MAX_FILE_BYTES,MAX_PARSER_RESPONSE_BYTES,PARSER_ERRORS,ParserResponseSchema,type ParserResponse,validParserToken} from '../lib/parser-contract.js';
const token=process.env.PARSER_WORKER_TOKEN;
if(!validParserToken(token)){process.stderr.write('Invalid gateway configuration\n');process.exit(1);}
try{assertRuntimeEnvironment('gateway');assertContainerLimits(undefined,'gateway');}catch{process.stderr.write('Required container limits unavailable\n');process.exit(1);}
const expected=Buffer.from('Bearer '+token),backend='http://parser:8080';let active=false;
function respond(res:ServerResponse,result:ParserResponse){res.writeHead(result.ok?200:PARSER_ERRORS[result.code].status,{'Content-Type':'application/json','Cache-Control':'no-store','Connection':'close','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(result));}
async function readJson(response:Response,maximum:number):Promise<unknown>{
 if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new Error('Invalid protocol');
 const length=response.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>maximum))throw new Error('Response too large');
 if(!response.body)throw new Error('Missing response');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{while(true){const row=await reader.read();if(row.done)break;size+=row.value.byteLength;if(size>maximum)throw new Error('Response too large');chunks.push(row.value);}}
 finally{reader.releaseLock();}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
}
const server=createServer(async(req,res)=>{
 if(req.url==='/health'&&req.method==='GET'){
  let ready=false;try{if(!active){const response=await fetch(backend+'/health',{signal:AbortSignal.timeout(500),redirect:'error'});if(response.ok){const data=await readJson(response,128);ready=typeof data==='object'&&data!==null&&Object.keys(data).length===1&&'ok' in data&&data.ok===true;}}}catch{}
  res.writeHead(ready?200:503,{'Content-Type':'application/json','Cache-Control':'no-store','Connection':'close'});res.end(JSON.stringify({ok:ready}));return;
 }
 const supplied=Buffer.from(typeof req.headers.authorization==='string'?req.headers.authorization:'');
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){res.writeHead(401,{'Connection':'close','Cache-Control':'no-store'});res.end();return;}
 if(req.url!=='/extract'||req.method!=='POST'){res.writeHead(404,{'Connection':'close'});res.end();return;}
 if(active){respond(res,{ok:false,code:'BUSY'});return;}
 const ext=req.headers['x-file-extension'];
 if(typeof ext!=='string'||!['txt','docx','pdf'].includes(ext)||req.headers['content-type']!=='application/octet-stream'){respond(res,{ok:false,code:'INVALID'});return;}
 active=true;const controller=new AbortController();let expired=false;
 const uploadTimer=setTimeout(()=>{expired=true;req.destroy();controller.abort();},10000);
 let operationTimer:ReturnType<typeof setTimeout>|undefined;
 const abort=()=>{if(!res.writableFinished)controller.abort();};res.once('close',abort);
 let result:ParserResponse={ok:false,code:'UNAVAILABLE'};
 try{
  const declared=req.headers['content-length'];
  if(declared&&(!/^\d+$/.test(declared)||Number(declared)>MAX_FILE_BYTES)){result={ok:false,code:'TOO_LARGE'};}
  else{
   let bytes=0;const chunks:Buffer[]=[];
   for await(const chunk of req){const value=Buffer.from(chunk);bytes+=value.length;if(bytes>MAX_FILE_BYTES){result={ok:false,code:'TOO_LARGE'};break;}chunks.push(value);}
   clearTimeout(uploadTimer);
   if(bytes<=MAX_FILE_BYTES){
    operationTimer=setTimeout(()=>{expired=true;controller.abort();},18000);
    // The service credential, original filename and all client headers stop here.
    const response=await fetch(backend+'/extract',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Extension':ext},
     body:new Uint8Array(Buffer.concat(chunks)),redirect:'error',cache:'no-store',signal:controller.signal});
    result=ParserResponseSchema.parse(await readJson(response,MAX_PARSER_RESPONSE_BYTES));
    if((result.ok&&!response.ok)||(!result.ok&&response.status!==PARSER_ERRORS[result.code].status))throw new Error('Status mismatch');
   }
  }
 }catch{result={ok:false,code:expired?'TIMEOUT':'UNAVAILABLE'};}
 finally{clearTimeout(uploadTimer);clearTimeout(operationTimer);controller.abort();res.removeListener('close',abort);active=false;if(!res.destroyed)respond(res,result);}
});
server.headersTimeout=5000;server.requestTimeout=10000;server.keepAliveTimeout=1;server.maxConnections=16;server.maxRequestsPerSocket=1;
server.listen(8080,'0.0.0.0');
