import {UserError} from './errors';
/** Cooperative deadlines; synchronous parser work still requires an isolated worker. */
export async function readPdfTask<T>(task:{promise:Promise<T>;destroy:()=>Promise<void>},read:(document:T,assertActive:()=>void)=>Promise<string>,timeoutMs=15000,cleanupMs=1000):Promise<string>{
 let expired=false,cleanup:Promise<void>|undefined;
 const destroy=()=>cleanup??=Promise.resolve().then(()=>task.destroy()).catch(()=>{});
 const assertActive=()=>{if(expired)throw new UserError('Время обработки PDF истекло. Вставьте текст вручную или попробуйте более простой файл.',408,'DOCUMENT_PDF_TIMEOUT');};
 let timer:ReturnType<typeof setTimeout>|undefined;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{expired=true;void destroy();try{assertActive();}catch(error){reject(error);}},timeoutMs);});
 const operation=task.promise.then(document=>{assertActive();return read(document,assertActive);});
 try{return await Promise.race([operation,deadline]);}
 catch(error){if(error instanceof UserError)throw error;throw new UserError('Не удалось прочитать PDF: файл поврежден, защищен паролем или слишком сложен.',400,'DOCUMENT_READ_PDF_FAILED');}
 finally{
  clearTimeout(timer);
  let cleanupTimer:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([destroy(),new Promise<void>(resolve=>{cleanupTimer=setTimeout(resolve,cleanupMs);})]);}
  finally{clearTimeout(cleanupTimer);}
 }
}
