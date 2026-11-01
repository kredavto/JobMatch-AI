import {observeRoute} from '../../../lib/ops-telemetry';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {UserError} from '../../../lib/errors';
import {SourceCommandSchema,storesSource} from '../../../lib/source-profile';
import {readSourceProfile,sourceStorageAvailable,commandSourceProfile} from '../../../lib/source-profile-db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const revision=z.number().int().min(0).max(2147483646);
const requestSchema=z.strictObject({expectedOwnerId:z.uuid(),workspaceRevision:revision,profileRevision:revision,command:SourceCommandSchema,consentToStore:z.boolean()});
const headers={'Cache-Control':'no-store'};
async function GETHandler(req:NextRequest){try{
 const user=await userOf(req);requireExpectedOwner(req,user.id);
 if([...req.nextUrl.searchParams.keys()].some(k=>k!=='expectedOwnerId'))throw new UserError('Проверьте параметры профиля.',400);
 await consumeQuota(user,'service');
 const [profile,storageAvailable]=await Promise.all([readSourceProfile(user),sourceStorageAvailable(user)]);
 return NextResponse.json({profile,storageAvailable},{headers});
}catch(error){return failure(error);}}
async function POSTHandler(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);
 const bytes=await boundedBody(req,40000);let raw:string;
 try{raw=new TextDecoder('utf8',{fatal:true}).decode(bytes);}catch{throw new UserError('Проверьте кодировку запроса.',400);}
 const body=requestSchema.parse(JSON.parse(raw));
 if(body.expectedOwnerId!==user.id)throw Error('CONFLICT');
 if(body.consentToStore!==storesSource(body.command))throw new UserError('Проверьте согласие на сохранение источника.',400);
 await consumeQuota(user,'service');
 return NextResponse.json(await commandSourceProfile(user,body.workspaceRevision,body.profileRevision,body.command),{headers});
}catch(error){return failure(error);}}

export const GET=observeRoute('source-profile','GET',GETHandler);
export const POST=observeRoute('source-profile','POST',POSTHandler);
