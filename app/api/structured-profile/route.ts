import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,failure,requireExpectedOwner} from '../../../lib/http';
import {consumeQuota} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {StructuredCommandSchema} from '../../../lib/structured-profile';
import {readStructuredProfile,writeStructuredProfile} from '../../../lib/structured-profile-db';
import {UserError} from '../../../lib/errors';
export const runtime='nodejs';export const dynamic='force-dynamic';
const input=z.object({expectedOwnerId:z.uuid(),workspaceRevision:z.number().int().nonnegative(),profileRevision:z.number().int().nonnegative(),command:StructuredCommandSchema}).strict();
export async function GET(req:NextRequest){try{
 const user=await userOf(req);requireExpectedOwner(req,user.id);await consumeQuota(user,'service');
 return NextResponse.json(await readStructuredProfile(user),{headers:{'Cache-Control':'no-store',...(req.nextUrl.searchParams.get('export')==='1'?{'Content-Disposition':'attachment; filename="jobmatch-structured-profile.json"'}:{})}});
}catch(error){return failure(error);}}
export async function POST(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);
 const body=input.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBody(req,40000))));
 if(body.expectedOwnerId!==user.id)throw new UserError('Аккаунт изменился. Вернитесь в исходный аккаунт.',409);
 await consumeQuota(user,'service');
 return NextResponse.json(await writeStructuredProfile(user,body.workspaceRevision,body.profileRevision,body.command),{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error);}}
