import {AdaptSchema} from '../../../../mvp/contracts';
import {adaptWithOwnModel} from '../../../../mvp/ai';
import {acquire,guard,jsonBody,errorResponse,privateHeaders} from '../../../../mvp/http';
export async function POST(request:Request){let release:(()=>void)|undefined;try{guard(request);release=acquire();const {resume,vacancy}=AdaptSchema.parse(await jsonBody(request));return Response.json(await adaptWithOwnModel(resume,vacancy,request.signal),{headers:privateHeaders});}catch(error){return errorResponse(error);}finally{release?.();}}
