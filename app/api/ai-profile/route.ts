import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota} from '../../../lib/db';
import {readStructuredProfile} from '../../../lib/structured-profile-db';
import {boundedBody} from '../../../lib/body';
import {aiProfileConfig,aiProfilePreview} from '../../../lib/ai-profile-provider';
import {ProfileReceiptSchema,PROFILE_RECEIPT_BYTES,SelectedProfileIndicesSchema} from '../../../lib/ai-profile-acceptance';
import {optionalProfileSigningConfig,requiredProfileSigningConfig,issueProfileReceipt,verifyProfileReceipt} from '../../../lib/ai-profile-signing';
import {acceptProfileCandidates,listProfileAcceptances,readProfileAcceptance,requireProfileSigningReady} from '../../../lib/ai-profile-acceptance-db';
import {UserError} from '../../../lib/errors';
import {observeRoute} from '../../../lib/ops-telemetry';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function post(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);
 const bytes=await boundedBody(req,PROFILE_RECEIPT_BYTES*2+4096);let input:unknown;
 try{input=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(bytes));}catch{throw new UserError('',bytes.byteLength>1024?413:400,bytes.byteLength>1024?'REQUEST_TOO_LARGE':'INVALID_INPUT');}
 if(typeof input==='object'&&input!==null&&'action' in input&&input.action==='save'){
  const body=z.object({action:z.literal('save'),expectedOwnerId:z.uuid(),workspaceRevision:z.number().int().min(0).max(2147483647),profileRevision:z.number().int().min(0).max(2147483647),receipt:ProfileReceiptSchema,selectedIndices:SelectedProfileIndicesSchema,accept:z.literal('SAVE_REVIEWED_AI_FIELDS')}).strict().parse(input);
  if(body.expectedOwnerId!==user.id)throw new UserError('',409,'OWNER_CHANGED');
  aiProfileConfig();const signing=requiredProfileSigningConfig();await consumeQuota(user,'service');
  const verified=verifyProfileReceipt(body.receipt,user.id,signing);
  if(verified.payload.source.workspaceRevision!==body.workspaceRevision||verified.payload.source.profileRevision!==body.profileRevision)throw Error('CONFLICT');
  return NextResponse.json(await acceptProfileCandidates(user,body.workspaceRevision,body.profileRevision,verified.receipt,body.selectedIndices),{headers:{'Cache-Control':'no-store'}});
 }
 if(bytes.byteLength>1024)throw new UserError('',413,'REQUEST_TOO_LARGE');
 const body=z.object({consent:z.literal(true),workspaceRevision:z.number().int().nonnegative(),profileRevision:z.number().int().nonnegative(),expectedOwnerId:z.uuid()}).strict().parse(input);
 if(body.expectedOwnerId!==user.id)throw new UserError('',409,'OWNER_CHANGED');
 aiProfileConfig();const signing=optionalProfileSigningConfig();await consumeQuota(user,'analysis');
 if(signing)await requireProfileSigningReady(user,signing.keyId);
 const profile=await readStructuredProfile(user);
 if(profile.workspace_revision!==body.workspaceRevision||profile.revision!==body.profileRevision||!profile.source_matches)throw Error('CONFLICT');
 const preview=await aiProfilePreview(profile.source_original,req.signal);
 // Re-read after inference: a source or profile change cannot publish an outdated preview.
 const current=await readStructuredProfile(user);
 if(current.ownerId!==user.id||current.workspace_revision!==profile.workspace_revision||current.revision!==profile.revision||current.source_workspace_revision!==profile.source_workspace_revision||!current.source_matches||current.source_original!==profile.source_original||JSON.stringify(current.source_fact_ids)!==JSON.stringify(profile.source_fact_ids))throw Error('CONFLICT');
 return NextResponse.json({ownerId:user.id,workspaceRevision:profile.workspace_revision,profileRevision:profile.revision,preview,...(signing?{receipt:issueProfileReceipt(profile,preview,signing)}:{})},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}}
async function get(req:NextRequest){try{
 const user=await userOf(req);requireExpectedOwner(req,user.id);
 if([...req.nextUrl.searchParams.keys()].some(key=>!['id','expectedOwnerId'].includes(key))||req.nextUrl.searchParams.getAll('id').length>1)throw new UserError('',400,'INVALID_INPUT');
 const id=req.nextUrl.searchParams.has('id')?z.uuid().parse(req.nextUrl.searchParams.get('id')):null;
 await consumeQuota(user,'service');
 return NextResponse.json(id?await readProfileAcceptance(user,id):await listProfileAcceptances(user),{headers:{'Cache-Control':'no-store',...(id?{'Content-Disposition':'attachment; filename="jobmatch-ai-profile-acceptance.json"'}:{})}});
}catch(error){return failure(error);}}
export const GET=observeRoute('ai-profile','GET',get);
export const POST=observeRoute('ai-profile','POST',post);
