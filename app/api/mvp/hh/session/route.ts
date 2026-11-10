import {hhSession} from '../../../../../mvp/hh';
import {errorResponse,guard,privateHeaders} from '../../../../../mvp/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{guard(request);return Response.json(await hhSession(request),{headers:privateHeaders});}catch(error){return errorResponse(error);}}
