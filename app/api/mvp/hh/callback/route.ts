import {callbackHH} from '../../../../../mvp/hh';
import {errorResponse,guard} from '../../../../../mvp/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{guard(request);return await callbackHH(request);}catch(error){return errorResponse(error);}}
