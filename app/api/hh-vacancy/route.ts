import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {UserError} from '../../../lib/errors';
import {hhVacancyConfig,importHHVacancy} from '../../../lib/hh-vacancy';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);
 const body=z.object({url:z.string().min(1).max(2048),expectedOwnerId:z.uuid()}).strict().parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,4096))));
 if(body.expectedOwnerId!==user.id)throw new UserError('Account changed',409);
 hhVacancyConfig();await consumeQuota(user,'import');
 const vacancy=await importHHVacancy(body.url,req.signal);
 return NextResponse.json({ownerId:user.id,...vacancy},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}}
