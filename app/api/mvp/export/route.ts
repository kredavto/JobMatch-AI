import {ExportSchema} from '../../../../mvp/contracts';
import {resumeDocx} from '../../../../lib/resume-docx';
import {resumePdf} from '../../../../mvp/pdf';
import {acquire,guard,jsonBody,errorResponse,privateHeaders} from '../../../../mvp/http';
export const runtime='nodejs';
export async function POST(request:Request){let release:(()=>void)|undefined;try{guard(request);release=acquire();const {text,format}=ExportSchema.parse(await jsonBody(request));const data=format==='docx'?await resumeDocx(text):await resumePdf(text);return new Response(new Uint8Array(data),{headers:{...privateHeaders,'Content-Type':format==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/pdf','Content-Disposition':`attachment; filename="jobmatch-resume.${format}"`}});}catch(error){return errorResponse(error);}finally{release?.();}}
