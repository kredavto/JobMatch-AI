import {AdaptSchema} from '../../../../mvp/contracts';
import {adaptResume} from '../../../../mvp/adapt';
import {LOCAL_ADAPTATION_DESCRIPTION} from '../../../../lib/public-ai-policy';
import {acquire,guard,jsonBody,errorResponse,privateHeaders} from '../../../../mvp/http';
export async function POST(request:Request){let release:(()=>void)|undefined;try{guard(request);release=acquire();const {resume,vacancy}=AdaptSchema.parse(await jsonBody(request));const result=adaptResume(resume,vacancy);return Response.json({...result,adaptationNote:result.adaptationNote+' ' +LOCAL_ADAPTATION_DESCRIPTION},{headers:privateHeaders});}catch(error){return errorResponse(error);}finally{release?.();}}
