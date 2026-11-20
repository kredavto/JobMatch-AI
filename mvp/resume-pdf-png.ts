import type {PDFPageProxy,TextItem} from 'pdfjs-dist/types/src/display/api';
import {createResumeOcr,importDeadline,ResumeImageImportError,throwIfImportCancelled,withImportBounds} from './resume-ocr';

const PDF='/resume-assets/pdf-6.2.108';
export const MAX_RESUME_PDF_PAGES=10;
export const MAX_RESUME_SCAN_PAGES=4;
export const MAX_RESUME_PNG_PIXELS=12_000_000;
const MAX_INPUT_BYTES=10*1024*1024;
const MAX_SCAN_PIXELS=4_000_000;
const MAX_SCAN_SIDE=2400;
const MAX_TEXT=100000;
const PNG_MAGIC=[137,80,78,71,13,10,26,10];
const HAS_WORD=/[\p{L}\p{N}]/u;

function assertInput(file:File){
 if(!file.size||file.size>MAX_INPUT_BYTES)throw new ResumeImageImportError('Размер файла должен быть от 1 байта до 10 МБ.');
}

/** Check dimensions before the decoder sees the file; do not rely on MIME/extension. */
export function parseResumePngHeader(bytes:Uint8Array){
 if(bytes.length<33||!PNG_MAGIC.every((value,index)=>bytes[index]===value))throw new ResumeImageImportError('Это не PNG или файл повреждён.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(view.getUint32(8)!==13||view.getUint32(12)!==0x49484452)throw new ResumeImageImportError('Заголовок PNG повреждён.');
 const width=view.getUint32(16),height=view.getUint32(20);
 if(width===0||height===0)throw new ResumeImageImportError('В PNG указаны неверные размеры.');
 if(width>8000||height>8000||width*height>MAX_RESUME_PNG_PIXELS)throw new ResumeImageImportError('PNG слишком велик. Максимум 12 мегапикселей и 8 000 пикселей на сторону.');
 return {width,height};
}

export function resumeScanScale(width:number,height:number,maxScale:number) {
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||width>100_000||height>100_000)throw new ResumeImageImportError('Некорректный размер страницы или изображения.');
 return Math.min(maxScale,MAX_SCAN_SIDE/Math.max(width,height),Math.sqrt(MAX_SCAN_PIXELS/(width*height)));
}

export function textFromPdfItems(items:Iterable<TextItem>) {
 let text='',previous:TextItem|null=null;
 for(const item of items){
  if(previous){
   const hasPositions=previous.transform?.length>=6&&item.transform?.length>=6;
   if(hasPositions){
    const delta=Math.abs(item.transform[5]-previous.transform[5]);
    if(delta>Math.max(1,Math.min(4,item.height*.35))&&!text.endsWith('\n'))text+='\n';
    else if(item.str&&text&&!/\s$/u.test(text)&&!/^\s/u.test(item.str)
      &&item.transform[4]-previous.transform[4]-previous.width>Math.max(1,item.height*.14))text+=' ';
   }
  }
  text+=item.str;
  if(item.hasEOL)text+='\n';
  if(text.length>MAX_TEXT)throw new ResumeImageImportError('PDF содержит больше 100 000 знаков. Загрузите более короткий документ.');
  previous=item;
 }
 return text.trim();
}

async function pdfPageText(page:PDFPageProxy,signal:AbortSignal){
 const reader=page.streamTextContent({includeMarkedContent:false}).getReader();
 const items:TextItem[]=[];
 let units=0,total=0,complete=false;
 try{
  for(;;){
   const {done,value}=await withImportBounds(reader.read(),signal);
   if(done){complete=true;break;}
   for(const item of value.items){
    if(++total>20000)throw new ResumeImageImportError('PDF слишком сложный для локального импорта. Сохраните резюме как простой PDF или TXT.');
    if('str' in item){
     units+=item.str.length;
     if(units>MAX_TEXT)throw new ResumeImageImportError('PDF содержит больше 100 000 знаков. Загрузите более короткий документ.');
     items.push(item);
    }
   }
  }
  return textFromPdfItems(items);
 }finally{
  if(!complete)void reader.cancel().catch(()=>{});
  reader.releaseLock();
 }
}

function canvasFor(width:number,height:number){
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(width));canvas.height=Math.max(1,Math.floor(height));
 return canvas;
}

export async function extractPdfResume(file:File,externalSignal?:AbortSignal):Promise<string>{
 assertInput(file);
 const scope=importDeadline(externalSignal);
 const signal=scope.signal;
 let worker:Worker|undefined,ocr:ReturnType<typeof createResumeOcr>|undefined;
 let pdfWorker:import('pdfjs-dist/types/src/display/api').PDFWorker|undefined;
 let task:import('pdfjs-dist/types/src/display/api').PDFDocumentLoadingTask|undefined;
 try{
  throwIfImportCancelled(signal);
  const bytes=new Uint8Array(await withImportBounds(file.arrayBuffer(),signal));
  const header=String.fromCharCode(...bytes.subarray(0,1024));
  if(!header.includes('%PDF-'))throw new ResumeImageImportError('Это не PDF или файл повреждён.');
  const pdf=await withImportBounds(import('pdfjs-dist/legacy/build/pdf.mjs'),signal);
  const base=new URL(PDF,window.location.origin).href;
  worker=new Worker(base+'/pdf.worker.mjs',{type:'module'});
  worker.addEventListener('error',event=>{event.preventDefault();scope.cancel(new ResumeImageImportError('Не удалось запустить локальное чтение PDF. Обновите страницу или попробуйте TXT.'));});
  pdfWorker=pdf.PDFWorker.create({port:worker,verbosity:0});
  task=pdf.getDocument({data:bytes,worker:pdfWorker,verbosity:0,
   cMapUrl:base+'/cmaps/',cMapPacked:true,standardFontDataUrl:base+'/standard_fonts/',iccUrl:base+'/iccs/',wasmUrl:base+'/wasm/',
   useWorkerFetch:true,disableFontFace:true,useSystemFonts:false,enableXfa:false,
   isOffscreenCanvasSupported:false,isImageDecoderSupported:false,maxImageSize:MAX_RESUME_PNG_PIXELS,
   canvasMaxAreaInBytes:MAX_RESUME_PNG_PIXELS*4,stopAtErrors:true});
  let doc:import('pdfjs-dist/types/src/display/api').PDFDocumentProxy;
  try{doc=await withImportBounds(task.promise,signal);}
  catch(error){
   if(signal.aborted)throwIfImportCancelled(signal);
   if(error instanceof Error&&error.name==='PasswordException')throw new ResumeImageImportError('PDF защищён паролем. Загрузите копию без пароля.');
   throw new ResumeImageImportError('Не удалось открыть PDF. Проверьте, что файл не повреждён.');
  }
  if(doc.numPages<1||doc.numPages>MAX_RESUME_PDF_PAGES)throw new ResumeImageImportError('Загрузите PDF не длиннее 10 страниц.');
  const blocks:string[]=[];
  let scans=0,chars=0;
  for(let index=1;index<=doc.numPages;index++){
   const page=await withImportBounds(doc.getPage(index),signal);
   try{
    let text=await pdfPageText(page,signal);
    // Prefer authoritative selectable text. OCR is only for pages without a readable text layer.
    if(!HAS_WORD.test(text)||text.includes('\ufffd')){
     if(++scans>MAX_RESUME_SCAN_PAGES)throw new ResumeImageImportError('В одном PDF можно распознать не больше 4 сканированных страниц.');
     const view=page.getViewport({scale:1});
     const viewport=page.getViewport({scale:resumeScanScale(view.width,view.height,2.8)});
     const canvas=canvasFor(viewport.width,viewport.height);
     const render=page.render({canvas,viewport,background:'#ffffff',annotationMode:0});
     try{
      await withImportBounds(render.promise,signal);
      ocr??=createResumeOcr(signal);
      const scanned=await ocr.recognize(canvas);
      if(!HAS_WORD.test(scanned))throw new ResumeImageImportError('На одной из страниц PDF не удалось распознать текст. Загрузите более чёткий скан или PDF с текстовым слоем.');
      text=scanned;
     }finally{
      if(signal.aborted)render.cancel();
      canvas.width=0;canvas.height=0;
     }
    }
    chars+=text.length+(blocks.length?2:0);
    if(chars>MAX_TEXT)throw new ResumeImageImportError('PDF содержит больше 100 000 знаков. Загрузите более короткий документ.');
    blocks.push(text);
   }finally{page.cleanup();}
  }
  const value=blocks.join('\n\n');
  if(!HAS_WORD.test(value))throw new ResumeImageImportError('В PDF не найден читаемый текст.');
  return value;
 }catch(error){
  throwIfImportCancelled(signal);
  if(error instanceof ResumeImageImportError)throw error;
  throw new ResumeImageImportError('Не удалось прочитать PDF в браузере. Попробуйте простой PDF без защиты или текстовый файл.');
 }finally{
  ocr?.close();
  if(task)void task.destroy().catch(()=>{});
  pdfWorker?.destroy();
  worker?.terminate();
  scope.dispose();
 }
}

export async function extractPngResume(file:File,externalSignal?:AbortSignal):Promise<string>{
 assertInput(file);
 const scope=importDeadline(externalSignal);
 const signal=scope.signal;
 let bitmap:ImageBitmap|undefined,canvas:HTMLCanvasElement|undefined;
 let ocr:ReturnType<typeof createResumeOcr>|undefined;
 try{
  throwIfImportCancelled(signal);
  const {width,height}=parseResumePngHeader(new Uint8Array(await withImportBounds(file.slice(0,33).arrayBuffer(),signal)));
  if(typeof createImageBitmap!=='function')throw new ResumeImageImportError('Этот браузер не поддерживает обработку PNG. Откройте JobMatch в актуальном браузере или загрузите текстовый файл.');
  try{bitmap=await withImportBounds(createImageBitmap(file),signal,image=>image.close());}
  catch{throwIfImportCancelled(signal);throw new ResumeImageImportError('Не удалось открыть PNG. Проверьте, что файл не повреждён.');}
  if(bitmap.width!==width||bitmap.height!==height)throw new ResumeImageImportError('Размер декодированного PNG не совпал с заголовком.');
  const scale=resumeScanScale(width,height,2);
  canvas=canvasFor(width*scale,height*scale);
  const context=canvas.getContext('2d',{alpha:false});
  if(!context)throw new ResumeImageImportError('Браузер не смог обработать изображение.');
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  bitmap.close();bitmap=undefined;
  ocr=createResumeOcr(signal);
  const text=await ocr.recognize(canvas);
  if(!HAS_WORD.test(text))throw new ResumeImageImportError('В PNG не удалось распознать текст. Используйте чёткий снимок или текстовый файл.');
  return text;
 }catch(error){
  throwIfImportCancelled(signal);
  if(error instanceof ResumeImageImportError)throw error;
  throw new ResumeImageImportError('Не удалось прочитать PNG в браузере. Попробуйте более чёткую копию или текстовый файл.');
 }finally{
  bitmap?.close();ocr?.close();
  if(canvas){canvas.width=0;canvas.height=0;}
  scope.dispose();
 }
}
