import {observeRoute} from '../../../lib/ops-telemetry';
import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {parseImport} from '../../../lib/import-parser';
import {PARSER_ERRORS} from '../../../lib/parser-contract';
import {UserError} from '../../../lib/errors';
export const runtime='nodejs';
async function POSTHandler(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);await consumeQuota(user,'import');
 const bytes=await boundedBody(req,4_100_000);
 const form=await new Response(bytes as BodyInit,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();
 const file=form.get('file');if(!(file instanceof File))throw new UserError('Выберите файл резюме');
 const result=await parseImport(file.name,Buffer.from(await file.arrayBuffer()),req.signal);
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(e){if(e instanceof UserError&&e.status===400&&e.message===PARSER_ERRORS.OCR_LIMIT.message)return NextResponse.json({code:'OCR_LIMIT'},{status:400,headers:{'Cache-Control':'no-store'}});return failure(e);}}

export const POST=observeRoute('import','POST',POSTHandler);
