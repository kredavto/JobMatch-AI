import {z} from 'zod';
import {acquire,guard,jsonBody,errorResponse,privateHeaders} from '../../../../mvp/http';
import {loadVacancy} from '../../../../mvp/vacancy';
export const runtime='nodejs';
export async function POST(request:Request){let release:(()=>void)|undefined;try{guard(request);release=acquire();const {url}=z.object({url:z.string().max(2048)}).strict().parse(await jsonBody(request,4096));return Response.json(await loadVacancy(url,request),{headers:privateHeaders});}catch(error){return errorResponse(error);}finally{release?.();}}
