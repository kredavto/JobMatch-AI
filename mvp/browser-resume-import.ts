import {decodeResumeText,extractRtf,extractDocx} from './browser-text-word';
import {extractLegacyDoc} from './browser-word-binary';
export const MAX_RESUME_FILE_BYTES=10*1024*1024;
export const MAX_RESUME_TEXT_CHARS=100000;
export const RESUME_FILE_ACCEPT='.doc,.docx,.txt,.rtf,.pdf,.png';
const abort=(signal?:AbortSignal)=>{if(signal?.aborted)throw new DOMException('Чтение отменено','AbortError');};
export function normalizeImportedResume(text:string):string{
 text=text.replace(/^\ufeff/,'').replace(/\r\n?/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 if(text.length<20)throw Error('В файле недостаточно текста резюме.');if(text.length>MAX_RESUME_TEXT_CHARS)throw Error('Резюме слишком большое: максимум 100 000 символов.');
 if(/[\x00-\x08\x0e-\x1f\uFFFD]/.test(text))throw Error('Файл содержит бинарные данные или нераспознанные символы.');return text;
}
export async function parseResumeFile(file:File,signal?:AbortSignal):Promise<{text:string;filename:string}>{
 abort(signal);if(!file.name||file.name.length>240||/[\x00-\x1f\x7f/\\]/.test(file.name))throw Error('Недопустимое имя файла: максимум 240 символов без управляющих знаков.');if(!file.size||file.size>MAX_RESUME_FILE_BYTES)throw Error('Выберите непустой файл размером до 10 МБ.');const ext=file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
 const types:Record<string,string[]>={txt:['text/plain'],rtf:['application/rtf','text/rtf','application/x-rtf'],doc:['application/msword','application/vnd.ms-word'],docx:['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/zip','application/x-zip-compressed'],pdf:['application/pdf'],png:['image/png']};
 if(!ext||!types[ext])throw Error('Поддерживаются DOC, DOCX, TXT, RTF, PDF и PNG.');if(file.type&&!types[ext].includes(file.type.toLowerCase())&&file.type!=='application/octet-stream')throw Error('Тип файла не соответствует расширению.');
 const bytes=new Uint8Array(await file.arrayBuffer());abort(signal);const starts=(sig:number[])=>sig.every((v,i)=>bytes[i]===v);let text:string;
 if(ext==='pdf'||ext==='png'){
  if(ext==='pdf'&&!starts([37,80,68,70,45])||ext==='png'&&!starts([137,80,78,71,13,10,26,10]))throw Error('Содержимое файла не соответствует расширению.');
  const parsers=await import('./resume-pdf-png');text=await (ext==='pdf'?parsers.extractPdfResume(file,signal):parsers.extractPngResume(file,signal));
 }else if(ext==='doc'){if(!starts([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]))throw Error('Для DOC нужен настоящий бинарный документ Word. Сохраните файл как DOCX.');text=extractLegacyDoc(bytes);}
 else if(ext==='docx'){if(!starts([80,75,3,4]))throw Error('Это не DOCX.');text=await extractDocx(bytes);}
 else if(ext==='rtf'){text=extractRtf(bytes);}
 else {if(starts([80,75,3,4])||starts([0xd0,0xcf,0x11,0xe0])||starts([37,80,68,70])||starts([137,80,78,71])||starts([123,92,114,116,102]))throw Error('Бинарный документ переименован в TXT.');text=decodeResumeText(bytes);}
 abort(signal);return {text:normalizeImportedResume(text),filename:file.name};
}
