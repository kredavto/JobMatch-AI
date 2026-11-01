import {createServer,type ServerResponse} from 'node:http';
import {runParser} from './supervisor.js';
import {assertRuntimeEnvironment} from './runtime-environment.js';
import {assertContainerLimits} from './container-limits.js';
import {MAX_FILE_BYTES,PARSER_ERRORS,type ParserResponse} from '../lib/parser-contract.js';
try{assertRuntimeEnvironment('parser');assertContainerLimits();}catch{process.stderr.write('Required parser isolation configuration unavailable\n');process.exit(1);}
let active=false;
function respond(res:ServerResponse,result:ParserResponse){res.writeHead(result.ok?200:PARSER_ERRORS[result.code].status,{'Content-Type':'application/json','Cache-Control':'no-store','Connection':'close','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(result));}
const server=createServer(async(req,res)=>{
 if(req.headers.authorization!==undefined||req.headers.cookie!==undefined||req.headers['x-jobmatch-owner']!==undefined){
  active=true;server.close();res.once('finish',()=>setImmediate(()=>process.exit(0)));setTimeout(()=>process.exit(0),250);respond(res,{ok:false,code:'UNAVAILABLE'});return;
 }
 if(req.url==='/health'&&req.method==='GET'){res.writeHead(active?503:200,{'Content-Type':'application/json','Cache-Control':'no-store','Connection':'close'});res.end(JSON.stringify({ok:!active}));return;}
 if(req.url!=='/extract'||req.method!=='POST'){res.writeHead(404,{'Connection':'close'});res.end();return;}
 if(active){respond(res,{ok:false,code:'BUSY'});return;}
 const ext=req.headers['x-file-extension'];
 if(typeof ext!=='string'||!['txt','docx','pdf'].includes(ext)||req.headers['content-type']!=='application/octet-stream'){respond(res,{ok:false,code:'INVALID'});return;}
 // One gateway-delivered job per container lifetime. PID-1 retirement kills descendants and clears tmpfs.
 active=true;server.close();server.closeIdleConnections();
 const controller=new AbortController();let uploadExpired=false;
 res.once('close',()=>{if(!res.writableFinished)controller.abort();});
 const timer=setTimeout(()=>{uploadExpired=true;req.destroy();controller.abort();},10000);
 let result:ParserResponse={ok:false,code:'UNAVAILABLE'};
 try{
  const declared=req.headers['content-length'];
  if(declared&&(!/^\d+$/.test(declared)||Number(declared)>MAX_FILE_BYTES)){result={ok:false,code:'TOO_LARGE'};}
  else{
   const chunks:Buffer[]=[];let bytes=0;
   for await(const chunk of req){const value=Buffer.from(chunk);bytes+=value.length;if(bytes>MAX_FILE_BYTES){result={ok:false,code:'TOO_LARGE'};break;}chunks.push(value);}
   clearTimeout(timer);
   if(bytes<=MAX_FILE_BYTES)result=await runParser(Buffer.concat(chunks),ext,controller.signal);
  }
 }catch{result={ok:false,code:uploadExpired?'TIMEOUT':'UNAVAILABLE'};}
 finally{
  clearTimeout(timer);
  // Even a malformed job cannot keep this container available for another user's file.
  res.once('finish',()=>setImmediate(()=>process.exit(0)));
  setTimeout(()=>process.exit(0),250);
  if(!res.destroyed)respond(res,result);
 }
});
server.headersTimeout=5000;server.requestTimeout=10000;server.keepAliveTimeout=1;server.maxConnections=16;server.maxRequestsPerSocket=1;
server.listen(8080,'0.0.0.0');
