import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota} from '../../../lib/db';
import {readStructuredProfile} from '../../../lib/structured-profile-db';
import {boundedBody} from '../../../lib/body';
import {aiProfileConfig,aiProfilePreview} from '../../../lib/ai-profile-provider';
import {UserError} from '../../../lib/errors';
import {observeRoute} from '../../../lib/ops-telemetry';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function post(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);
 const bytes=await boundedBody(req,1024);let input:unknown;
 try{input=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(bytes));}catch{throw new UserError('',400,'INVALID_INPUT');}
 const body=z.object({consent:z.literal(true),workspaceRevision:z.number().int().nonnegative(),profileRevision:z.number().int().nonnegative(),expectedOwnerId:z.uuid()}).strict().parse(input);
 if(body.expectedOwnerId!==user.id)throw new UserError('',409,'OWNER_CHANGED');
 aiProfileConfig();await consumeQuota(user,'analysis');
 const profile=await readStructuredProfile(user);
 if(profile.workspace_revision!==body.workspaceRevision||profile.revision!==body.profileRevision||!profile.source_matches)throw Error('CONFLICT');
 const preview=await aiProfilePreview(profile.source_original,req.signal);
 // Re-read after inference: a source or profile change cannot publish an outdated preview.
 const current=await readStructuredProfile(user);
 if(current.ownerId!==user.id||current.workspace_revision!==profile.workspace_revision||current.revision!==profile.revision||current.source_workspace_revision!==profile.source_workspace_revision||!current.source_matches||current.source_original!==profile.source_original||JSON.stringify(current.source_fact_ids)!==JSON.stringify(profile.source_fact_ids))throw Error('CONFLICT');
 return NextResponse.json({ownerId:user.id,workspaceRevision:profile.workspace_revision,profileRevision:profile.revision,preview},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}}
export const POST=observeRoute('ai-profile','POST',post);
