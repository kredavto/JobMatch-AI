import {selectHHResume} from '../../../../../mvp/hh';
import {errorResponse,guard,privateHeaders,jsonBody} from '../../../../../mvp/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{guard(request);return Response.json(await selectHHResume(request,(await jsonBody(request,1000) as {id?:unknown}).id),{headers:privateHeaders});}catch(error){return errorResponse(error);}}
