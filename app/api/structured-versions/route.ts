import {observeRoute} from '../../../lib/ops-telemetry';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,failure,requireExpectedOwner} from '../../../lib/http';
import {consumeQuota} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {VersionRequestSchema} from '../../../lib/structured-version';
import {structuredVersionCommand,listStructuredVersions,readStructuredVersion,structuredVersionStream} from '../../../lib/structured-version-db';
import {UserError} from '../../../lib/errors';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function get(req:NextRequest){try{
 const user=await userOf(req);requireExpectedOwner(req,user.id);await consumeQuota(user,'service');
 const ids=req.nextUrl.searchParams.getAll('id'),exports=req.nextUrl.searchParams.getAll('export');
 if(ids.length>1||exports.length>1||(ids.length&&exports.length))throw new UserError('Выберите чтение версии или полный экспорт.',400,'EXPORT_QUERY_INVALID');
 if(ids.length)return NextResponse.json(await readStructuredVersion(user,z.uuid().parse(ids[0])),{headers:{'Cache-Control':'no-store'}});
 const list=await listStructuredVersions(user);
 if(exports[0]==='1')return new Response(structuredVersionStream(list,async id=>{await consumeQuota(user,'service');return readStructuredVersion(user,id);}),{headers:{'Cache-Control':'no-store','Content-Type':'application/x-ndjson; charset=utf-8','Content-Disposition':'attachment; filename="jobmatch-structured-versions.ndjson"'}});
 return NextResponse.json(list,{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error);}}
async function post(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);
 const body=VersionRequestSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBody(req,10000))));
 if(body.expectedOwnerId!==user.id)throw new UserError('Аккаунт изменился. Вернитесь в исходный аккаунт.',409,'OWNER_CHANGED');
 await consumeQuota(user,'service');
 return NextResponse.json(await structuredVersionCommand(user,body),{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error);}}

export const GET=observeRoute('structured-versions','GET',get);
export const POST=observeRoute('structured-versions','POST',post);
