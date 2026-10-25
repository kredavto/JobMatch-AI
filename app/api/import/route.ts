import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin,userOf,failure} from '../../../lib/http';
import {consumeQuota} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {extractDocument} from '../../../lib/documents';
import {UserError} from '../../../lib/errors';
export const runtime='nodejs';
export async function POST(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);await consumeQuota(user,'import');
 const bytes=await boundedBody(req,4_100_000);
 const form=await new Response(bytes as BodyInit,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();
 const file=form.get('file');if(!(file instanceof File))throw new UserError('Выберите файл резюме');
 const text=await extractDocument(file.name,Buffer.from(await file.arrayBuffer()));
 return NextResponse.json({text},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
