import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {observeRoute} from '../../../lib/ops-telemetry';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {UserError} from '../../../lib/errors';
import {VersionRequestSchema,ClearVersionsSchema} from '../../../lib/source-version';
import {sourceVersionCommand,sourceVersionStorageAvailable,listSourceVersions,readSourceVersion,clearSourceVersions,sourceVersionStream} from '../../../lib/source-version-db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const requestSchema=z.discriminatedUnion('action',[...VersionRequestSchema.options,ClearVersionsSchema]);
const headers={'Cache-Control':'no-store'};
async function POSTHandler(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);
 const bytes=await boundedBody(req,4096);let raw:string;try{raw=new TextDecoder('utf8',{fatal:true}).decode(bytes);}catch{throw new UserError('Проверьте кодировку запроса.',400,'REQUEST_ENCODING_INVALID');}
 const body=requestSchema.parse(JSON.parse(raw));if(body.expectedOwnerId!==user.id)throw Error('CONFLICT');
 await consumeQuota(user,'service');
 return NextResponse.json(body.action==='clear'?await clearSourceVersions(user,body.collectionHash):await sourceVersionCommand(user,body),{headers});
}catch(error){return failure(error);}}
async function GETHandler(req:NextRequest){try{
 const user=await userOf(req);requireExpectedOwner(req,user.id);const q=req.nextUrl.searchParams;
 if([...q.keys()].some(k=>!['id','export','expectedOwnerId'].includes(k))||q.getAll('id').length>1||q.getAll('export').length>1||q.has('id')&&q.has('export')||q.has('export')&&q.get('export')!=='1')throw new UserError('Проверьте параметры истории версий.',400,'SOURCE_VERSION_QUERY_INVALID');
 const id=q.has('id')?z.uuid().parse(q.get('id')):null;await consumeQuota(user,'service');
 if(id)return NextResponse.json(await readSourceVersion(user,id),{headers:{...headers,'Content-Disposition':'attachment; filename="jobmatch-source-version.json"'}});
 const history=await listSourceVersions(user);
 if(q.has('export'))return new Response(sourceVersionStream(history,id=>readSourceVersion(user,id),req.signal),{headers:{...headers,'Content-Type':'application/x-ndjson; charset=utf-8','Content-Disposition':'attachment; filename="jobmatch-source-versions.ndjson"'}});
 return NextResponse.json({history,storageAvailable:await sourceVersionStorageAvailable(user)},{headers});
}catch(error){return failure(error);}}
export const GET=observeRoute('source-versions','GET',GETHandler);
export const POST=observeRoute('source-versions','POST',POSTHandler);
