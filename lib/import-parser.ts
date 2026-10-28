import {boundedBody} from './body';
import {UserError} from './errors';
import {MAX_FILE_BYTES,MAX_PARSER_RESPONSE_BYTES,PARSER_ERRORS,ParserResponseSchema,documentExtension,validParserToken} from './parser-contract';
const unavailable=()=>new UserError(PARSER_ERRORS.UNAVAILABLE.message,503);
/** Inline remains the compatibility default until the owner provisions the worker. No fallback in worker mode. */
export async function parseImport(filename:string,data:Buffer,signal?:AbortSignal):Promise<string>{
 if(data.length>MAX_FILE_BYTES)throw new UserError(PARSER_ERRORS.TOO_LARGE.message,413);
 const extension=documentExtension(filename);if(!extension)throw new UserError('Поддерживаются TXT, DOCX, PDF');
 const mode=process.env.IMPORT_PARSER_MODE||'inline';
 if(mode==='inline')return (await import('./documents')).extractDocument(filename,data);
 if(mode!=='worker')throw unavailable();
 let url:URL;try{url=new URL(process.env.IMPORT_PARSER_URL||'');}catch{throw unavailable();}
 const token=process.env.IMPORT_PARSER_TOKEN;
 if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||!validParserToken(token))throw unavailable();
 if(signal?.aborted)throw new UserError(PARSER_ERRORS.TIMEOUT.message,408);
 const controller=new AbortController();let expired=false;let interrupt!:(error:UserError)=>void;
 const interrupted=new Promise<never>((_,reject)=>{interrupt=reject;});
 const stop=()=>{controller.abort();interrupt(new UserError(PARSER_ERRORS.TIMEOUT.message,408));};signal?.addEventListener('abort',stop,{once:true});
 const timer=setTimeout(()=>{expired=true;stop();},20000);
 try{
  const operation=(async()=>{
  const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream','X-File-Extension':extension},
   body:new Uint8Array(data),redirect:'error',cache:'no-store',signal:controller.signal});
  if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw unavailable();
  const bytes=await boundedBody({headers:response.headers,body:response.body,signal:controller.signal},MAX_PARSER_RESPONSE_BYTES,20000);
  let result;try{result=ParserResponseSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));}catch{throw unavailable();}
  if(result.ok){if(!response.ok)throw unavailable();return result.text;}
  const error=PARSER_ERRORS[result.code];if(response.status!==error.status)throw unavailable();
  throw new UserError(error.message,error.status);
  })();
  return await Promise.race([operation,interrupted]);
 }catch(error){
  if(expired||controller.signal.aborted)throw new UserError(PARSER_ERRORS.TIMEOUT.message,408);
  if(error instanceof UserError&&Object.values(PARSER_ERRORS).some(item=>item.message===error.message))throw error;
  throw unavailable();
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',stop);controller.abort();}
}
