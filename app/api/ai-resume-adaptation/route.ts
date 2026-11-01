import {observeRoute} from '../../../lib/ops-telemetry';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota,readWorkspace} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {adaptResume,adaptationConfig} from '../../../lib/ai-resume-adaptation-provider';
import {UserError} from '../../../lib/errors';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function POSTHandler(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);
 const body=z.object({consent:z.literal(true),revision:z.number().int().nonnegative(),expectedOwnerId:z.uuid()}).strict().parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,1024))));
 if(body.expectedOwnerId!==user.id)throw new UserError('Account changed.',409,'ACCOUNT_CHANGED');
 adaptationConfig();
 const state=await readWorkspace(user);
 if(state.revision!==body.revision)throw new Error('CONFLICT');
 await consumeQuota(user,'analysis');
 const preview=await adaptResume(state.facts,state.original,state.vacancy,req.signal);
 // Reject a response produced against a workspace changed while the model was running.
 const current=await readWorkspace(user);
 if(current.revision!==state.revision||current.original!==state.original||current.vacancy!==state.vacancy||JSON.stringify(current.facts)!==JSON.stringify(state.facts))throw new Error('CONFLICT');
 return NextResponse.json({ownerId:user.id,revision:state.revision,preview},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}}

export const POST=observeRoute('ai-resume-adaptation','POST',POSTHandler);
