/** Browser-only OCR. Only fixed, same-origin public engine/language assets are fetched. */
const OCR='/resume-assets/ocr-7.0.0';
const LANGS=['rus','eng'];
const OCR_RESULT_LIMIT=100000;
export class ResumeImageImportError extends Error {}
type EngineAction='load'|'loadLanguage'|'initialize'|'setParameters'|'recognize';

export function throwIfImportCancelled(signal?:AbortSignal):void {
 if(signal?.aborted)throw signal.reason??new DOMException('Импорт отменён.','AbortError');
}

export function withImportBounds<T>(promise:Promise<T>,signal:AbortSignal,onCancelledValue?:(value:T)=>void):Promise<T> {
 // The original promise always has handlers even after cancellation; late results are ignored.
 return new Promise<T>((resolve,reject)=>{
  const abort=()=>reject(signal.reason??new DOMException('Импорт отменён.','AbortError'));
  promise.then(value=>{
   signal.removeEventListener('abort',abort);
   if(signal.aborted){onCancelledValue?.(value);return;}
   resolve(value);
  },error=>{signal.removeEventListener('abort',abort);reject(error);});
  if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
 });
}

export function importDeadline(signal?:AbortSignal,timeoutMs=110_000){
 const controller=new AbortController();
 const abort=()=>controller.abort(signal?.reason??new DOMException('Импорт отменён.','AbortError'));
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(new ResumeImageImportError('Распознавание заняло слишком много времени. Используйте более чёткую копию или текстовый файл.')),timeoutMs);
 return {signal:controller.signal,cancel:(reason:Error)=>controller.abort(reason),dispose(){clearTimeout(timer);signal?.removeEventListener('abort',abort);}};
}

export function encodeOcrCanvas(canvas:HTMLCanvasElement):Promise<ArrayBuffer>{
 return new Promise((resolve,reject)=>{
  canvas.toBlob(blob=>{
   if(!blob){reject(new ResumeImageImportError('Не удалось подготовить изображение для распознавания.'));return;}
   blob.arrayBuffer().then(resolve,reject);
  },'image/png');
 });
}

export function createResumeOcr(signal:AbortSignal){
 throwIfImportCancelled(signal);
 const root=new URL(OCR,window.location.origin).href;
 const worker=new Worker(root+'/worker.min.js');
 const failure=()=>new ResumeImageImportError('Не удалось запустить локальное распознавание. Обновите страницу или используйте текстовый файл.');
 let serial=0,closed=false;
 function close(){
  if(closed)return;
  closed=true;
  worker.terminate();
  signal.removeEventListener('abort',close);
 }
 signal.addEventListener('abort',close,{once:true});
 // The pinned Tesseract.js 7 worker uses this protocol. Keeping the Worker handle
 // lets us terminate even if a WASM/language initialization is stuck.
 function job(action:EngineAction,payload:unknown,transfer:Transferable[]=[]):Promise<unknown>{
  throwIfImportCancelled(signal);
  if(closed)return Promise.reject(failure());
  return new Promise((resolve,reject)=>{
   const jobId='job-'+(++serial);
   const clean=()=>{worker.removeEventListener('message',message);worker.removeEventListener('error',error);worker.removeEventListener('messageerror',error);signal.removeEventListener('abort',abort);};
   const error=(event?:Event)=>{event?.preventDefault();clean();reject(failure());};
   const abort=()=>{clean();reject(signal.reason??new DOMException('Импорт отменён.','AbortError'));};
   const message=(event:MessageEvent<{jobId?:string;status?:string;data?:unknown}>)=>{
    if(event.data?.jobId!==jobId)return;
    if(event.data.status==='resolve'){clean();resolve(event.data.data);}
    if(event.data.status==='reject')error();
   };
   worker.addEventListener('message',message);
   worker.addEventListener('error',error);
   worker.addEventListener('messageerror',error);
   signal.addEventListener('abort',abort,{once:true});
   try{worker.postMessage({workerId:'jobmatch-local-ocr',jobId,action,payload},transfer);}catch{error();}
  });
 }
 const init=async()=>{
  await job('load',{options:{lstmOnly:true,corePath:root,logging:false}});
  await job('loadLanguage',{langs:LANGS,options:{langPath:root+'/lang',cacheMethod:'none',gzip:true,lstmOnly:true}});
  await job('initialize',{langs:LANGS,oem:1,config:{}});
  await job('setParameters',{params:{tessedit_pageseg_mode:'3',user_defined_dpi:'200',preserve_interword_spaces:'0'}});
 };
 let ready:Promise<void>|undefined;
 return {close,async recognize(canvas:HTMLCanvasElement){
  const buffer=await withImportBounds(encodeOcrCanvas(canvas),signal);
  await (ready??=init());
  const data=await job('recognize',{image:new Uint8Array(buffer),options:{},output:{text:true}},[buffer]);
  if(!data||typeof data!=='object'||!('text' in data)||typeof data.text!=='string')throw failure();
  if(data.text.length>OCR_RESULT_LIMIT)throw new ResumeImageImportError('Распознано больше 100 000 знаков. Загрузите более короткий документ.');
  return data.text.trim();
 }};
}
