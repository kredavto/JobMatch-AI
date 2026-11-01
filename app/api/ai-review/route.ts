import {observeRoute} from '../../../lib/ops-telemetry';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota,readWorkspace} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {aiReview,aiConfig} from '../../../lib/ai-provider';
import {UserError} from '../../../lib/errors';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function POSTHandler(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);
 const body=z.object({consent:z.literal(true),revision:z.number().int().nonnegative(),expectedOwnerId:z.uuid()}).strict().parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,1024))));
 if(body.expectedOwnerId!==user.id)throw new UserError('Аккаунт изменился. Обновите данные.',409,'ACCOUNT_RELOAD_REQUIRED');
 aiConfig();await consumeQuota(user,'analysis');
 const state=await readWorkspace(user);
 if(state.revision!==body.revision)throw new Error('CONFLICT');
 const review=await aiReview(state.facts,state.vacancy,req.signal);
 return NextResponse.json({ownerId:user.id,revision:state.revision,review},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}}

export const POST=observeRoute('ai-review','POST',POSTHandler);
