import {fromBuffer,type Entry} from 'yauzl';
import {UserError} from './errors';
import {readPdfTask} from './pdf-lifecycle';
import {MAX_FILE_BYTES,MAX_TEXT_CHARS} from './parser-contract';
export {MAX_FILE_BYTES,MAX_TEXT_CHARS} from './parser-contract';
/** Validate central directory AND actual inflated bytes before handing the archive to a parser. */
export function validateDocx(data:Buffer):Promise<void>{return new Promise((resolve,reject)=>{
 fromBuffer(data,{lazyEntries:true,validateEntrySizes:true,strictFileNames:true},(error,zip)=>{
  if(error||!zip){reject(new UserError('Неверный или поврежденный DOCX',400,'DOCUMENT_INVALID_DOCX'));return;}
  const names=new Set<string>();
  let count=0,total=0,actual=0,document=false,types=false,finished=false;
  const fail=()=>{if(finished)return;finished=true;zip.close();reject(new UserError('DOCX поврежден, содержит неподдерживаемые вложения или превышает безопасные лимиты. Сохраните копию без вложений или вставьте текст вручную.',400,'DOCUMENT_UNSAFE_DOCX'));};
  zip.on('error',fail);zip.on('end',()=>{if(finished)return;finished=true;if(!document||!types)reject(new UserError('В файле нет структуры документа DOCX',400,'DOCUMENT_MISSING_DOCX'));else resolve();});
  zip.on('entry',(entry:Entry)=>{
   const name=entry.fileName,canonical=name.normalize('NFC').toLowerCase().replace(/\/$/,'');
   const segments=canonical.split('/');
   const mode=(entry.externalFileAttributes>>>16)&0xf000;
   // Reject ambiguous parts before the second ZIP reader (Mammoth/JSZip) sees them.
   if(names.has(canonical)||segments.some(p=>p===''||p==='.'||p==='..')||/[\u0000-\u001f\u007f]/.test(name)||/%(?:2e|2f|5c|00)/i.test(name)||mode===0xa000||/^word\/(?:embeddings|activex)(?:\/|$)/.test(canonical)||/(?:^|\/)vba[^/]*\.bin$/.test(canonical)){fail();return;}
   names.add(canonical);
   count++;total+=entry.uncompressedSize;
   if(count>1000||total>20_000_000||entry.uncompressedSize>8_000_000||(entry.generalPurposeBitFlag&1)!==0||entry.fileName.split('/').includes('..')||entry.fileName.startsWith('/')||/vbaProject\.bin$/i.test(entry.fileName)){fail();return;}
   if(entry.fileName==='word/document.xml')document=true;if(entry.fileName==='[Content_Types].xml')types=true;
   if(entry.fileName.endsWith('/')){zip.readEntry();return;}
   zip.openReadStream(entry,(err,stream)=>{if(err||!stream){fail();return;}let entryBytes=0;stream.on('error',fail);stream.on('data',(chunk:Buffer)=>{actual+=chunk.length;entryBytes+=chunk.length;if(actual>20_000_000||entryBytes>8_000_000){stream.destroy();fail();}});stream.on('end',()=>{if(!finished)zip.readEntry();});});
  });zip.readEntry();
 });
});}
export function validateText(text:string){if(text.trim().length<5)throw new UserError('Текст не найден. Для скана нужен OCR; вставьте текст вручную.',400,'DOCUMENT_TEXT_NOT_FOUND');if(text.length>MAX_TEXT_CHARS)throw new UserError('Слишком много текста',400,'DOCUMENT_TEXT_TOO_LONG');return text;}
export async function extractDocument(filename:string,data:Buffer,options:{readScannedPage?:(page:number)=>Promise<string>}={}):Promise<string>{
 if(data.length>MAX_FILE_BYTES)throw new UserError('Файл должен быть меньше 4 МБ',413,'DOCUMENT_TOO_LARGE');
 const ext=filename.toLowerCase().split('.').pop();let text='';
 if(ext==='txt'){try{text=new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{throw new UserError('TXT должен быть в кодировке UTF-8',400,'DOCUMENT_INVALID_UTF8');}if(text.includes('\u0000'))throw new UserError('В TXT обнаружены бинарные данные',400,'DOCUMENT_BINARY_TEXT');}
 else if(ext==='docx'){await validateDocx(data);const mammoth=await import('mammoth');try{text=(await mammoth.extractRawText({buffer:data})).value;}catch{throw new UserError('Не удалось прочитать структуру DOCX',400,'DOCUMENT_READ_DOCX_FAILED');}}
 else if(ext==='pdf'){
  if(data.subarray(0,5).toString()!=='%PDF-')throw new UserError('Неверный PDF',400,'DOCUMENT_INVALID_PDF');
  const canvas=await import('@napi-rs/canvas');Object.assign(globalThis,{DOMMatrix:canvas.DOMMatrix,ImageData:canvas.ImageData,Path2D:canvas.Path2D});
  const pdf=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=pdf.getDocument({data:new Uint8Array(data),useSystemFonts:true,useWorkerFetch:false});
  text=await readPdfTask(task,async(doc,assertActive)=>{
   if(doc.numPages>30)throw new UserError('Не более 30 страниц',400,'DOCUMENT_PAGE_LIMIT');
   let result='';
   for(let i=1;i<=doc.numPages;i++){
    assertActive();const page=await doc.getPage(i);assertActive();
    const content=await page.getTextContent();assertActive();
    const embedded=content.items.map(item=>'str' in item?item.str+('hasEOL' in item&&item.hasEOL?'\n':' '):'').join('');
    result+=(embedded.trim().length<5&&options.readScannedPage?await options.readScannedPage(i):embedded)+'\n';assertActive();
    if(result.length>MAX_TEXT_CHARS)throw new UserError('Слишком много текста',400,'DOCUMENT_TEXT_TOO_LONG');
   }
   return result;
  });
 }else throw new UserError('Поддерживаются TXT, DOCX, PDF',400,'DOCUMENT_TYPE_UNSUPPORTED');return validateText(text);
}
