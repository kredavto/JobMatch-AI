import {boundedBody} from '../../../../lib/body';
import {extractDocument,MAX_FILE_BYTES} from '../../../../lib/documents';
import {UserError} from '../../../../lib/errors';
import {guard,errorResponse,privateHeaders} from '../../../../mvp/http';
export const runtime='nodejs';
let active=0;
export async function POST(request:Request){
 let acquired=false;
 try{
  guard(request);if(active>=2)throw new UserError('Загрузка занята. Повторите через несколько секунд.',429);
  let filename:string;try{filename=decodeURIComponent(request.headers.get('x-filename')??'');}catch{throw new UserError('Неверное имя файла.');}
  if(filename.length>240||!/^.+\.(pdf|docx)$/i.test(filename)||/[\u0000-\u001f/\\]/.test(filename))throw new UserError('Загрузите PDF или Word (.docx). Старый .doc сначала сохраните как .docx.');
  active++;acquired=true;const data=await boundedBody(request,MAX_FILE_BYTES);
  let text:string;try{text=await extractDocument(filename,Buffer.from(data));}catch(error){if(error instanceof UserError&&/OCR|вставьте текст/i.test(error.message))throw new UserError('Не удалось извлечь текст. Загрузите DOCX или PDF с текстовым слоем, не скан.',422);throw error;}
  return Response.json({text,filename},{headers:privateHeaders});
 }catch(error){return errorResponse(error);}finally{if(acquired)active--;}
}
