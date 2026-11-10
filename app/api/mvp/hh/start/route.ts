import {startHH} from '../../../../../mvp/hh';
import {errorResponse,guard} from '../../../../../mvp/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{guard(request);return await startHH(request);}catch(error){return errorResponse(error);}}
