import {fromBuffer,type Entry} from 'yauzl';
import {UserError} from './errors';
export const MAX_FILE_BYTES=4_000_000;
export const MAX_TEXT_CHARS=100_000;
/** Validate central directory AND actual inflated bytes before handing the archive to a parser. */
export function validateDocx(data:Buffer):Promise<void>{return new Promise((resolve,reject)=>{
 fromBuffer(data,{lazyEntries:true,validateEntrySizes:true},(error,zip)=>{
  if(error||!zip){reject(new UserError('Неверный или поврежденный DOCX'));return;}
  let count=0,total=0,actual=0,document=false,types=false,finished=false;
  const fail=()=>{if(finished)return;finished=true;zip.close();reject(new UserError('DOCX поврежден или превышает безопасные лимиты распаковки'));};
  zip.on('error',fail);zip.on('end',()=>{if(finished)return;finished=true;if(!document||!types)reject(new UserError('В файле нет структуры документа DOCX'));else resolve();});
  zip.on('entry',(entry:Entry)=>{
   count++;total+=entry.uncompressedSize;
   if(count>1000||total>20_000_000||entry.uncompressedSize>8_000_000||(entry.generalPurposeBitFlag&1)!==0||entry.fileName.split('/').includes('..')||entry.fileName.startsWith('/')||/vbaProject\.bin$/i.test(entry.fileName)){fail();return;}
   if(entry.fileName==='word/document.xml')document=true;if(entry.fileName==='[Content_Types].xml')types=true;
   if(entry.fileName.endsWith('/')){zip.readEntry();return;}
   zip.openReadStream(entry,(err,stream)=>{if(err||!stream){fail();return;}let entryBytes=0;stream.on('error',fail);stream.on('data',(chunk:Buffer)=>{actual+=chunk.length;entryBytes+=chunk.length;if(actual>20_000_000||entryBytes>8_000_000){stream.destroy();fail();}});stream.on('end',()=>{if(!finished)zip.readEntry();});});
  });zip.readEntry();
 });
});}
export function validateText(text:string){if(text.trim().length<5)throw new UserError('Текст не найден. Для скана нужен OCR; вставьте текст вручную.');if(text.length>MAX_TEXT_CHARS)throw new UserError('Слишком много текста');return text;}
export async function extractDocument(filename:string,data:Buffer):Promise<string>{
 if(data.length>MAX_FILE_BYTES)throw new UserError('Файл должен быть меньше 4 МБ',413);
 const ext=filename.toLowerCase().split('.').pop();let text='';
 if(ext==='txt'){try{text=new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{throw new UserError('TXT должен быть в кодировке UTF-8');}if(text.includes('\u0000'))throw new UserError('В TXT обнаружены бинарные данные');}
 else if(ext==='docx'){await validateDocx(data);const mammoth=await import('mammoth');try{text=(await mammoth.extractRawText({buffer:data})).value;}catch{throw new UserError('Не удалось прочитать структуру DOCX');}}
 else if(ext==='pdf'){
  if(data.subarray(0,5).toString()!=='%PDF-')throw new UserError('Неверный PDF');
  const canvas=await import('@napi-rs/canvas');Object.assign(globalThis,{DOMMatrix:canvas.DOMMatrix,ImageData:canvas.ImageData,Path2D:canvas.Path2D});
  const pdf=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=pdf.getDocument({data:new Uint8Array(data),useSystemFonts:true});
  const timeout=setTimeout(()=>{void task.destroy();},15000);
  try{const doc=await task.promise;if(doc.numPages>30)throw new UserError('Не более 30 страниц');for(let i=1;i<=doc.numPages;i++){const content=await(await doc.getPage(i)).getTextContent();text+=content.items.map(item=>'str' in item?item.str+('hasEOL' in item&&item.hasEOL?'\n':' '):'').join('')+'\n';if(text.length>MAX_TEXT_CHARS)throw new UserError('Слишком много текста');}}
  catch(e){if(e instanceof UserError)throw e;throw new UserError('Не удалось прочитать PDF: файл поврежден, защищен паролем или слишком сложен.');}
  finally{clearTimeout(timeout);await task.destroy();}
 }else throw new UserError('Поддерживаются TXT, DOCX, PDF');return validateText(text);
}
