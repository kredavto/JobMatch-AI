import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {parseImport} from '../../../lib/import-parser';
import {UserError} from '../../../lib/errors';
export const runtime='nodejs';
export async function POST(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);await consumeQuota(user,'import');
 const bytes=await boundedBody(req,4_100_000);
 const form=await new Response(bytes as BodyInit,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();
 const file=form.get('file');if(!(file instanceof File))throw new UserError('Выберите файл резюме');
 const result=await parseImport(file.name,Buffer.from(await file.arrayBuffer()),req.signal);
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
