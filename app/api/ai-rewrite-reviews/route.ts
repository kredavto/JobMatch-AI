import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota,readWorkspace} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {UserError} from '../../../lib/errors';
import {observeRoute} from '../../../lib/ops-telemetry';
import {RewriteReceiptSchema} from '../../../lib/ai-rewrite';
import {RewriteReviewConfirmation} from '../../../lib/ai-rewrite-review';
import {issueRewriteReviewReceipt} from '../../../lib/ai-rewrite-review-signing';
import {rewriteConfig} from '../../../lib/ai-rewrite-provider';
import {sameJson} from '../../../lib/application-write-response';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const input=RewriteReviewConfirmation.extend({expectedOwnerId:z.uuid(),revision:z.number().int().min(0).max(2147483647),receipt:RewriteReceiptSchema});
function configured(){
 if(process.env.JOBMATCH_AI_REWRITE_REVIEW_ENABLED!=='true')throw new UserError('Проверка AI-правок не включена.',503,'AI_REWRITE_REVIEW_DISABLED');
 return rewriteConfig();
}
/** Review receipt only: no model call, workspace/history write, acceptance or save. */
async function POSTHandler(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);
 let raw:unknown;try{raw=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(await boundedBody(req,524288)));}catch(e){if(e instanceof TypeError)throw new UserError('Некорректный UTF-8.',400,'INVALID_INPUT');throw e;}
 const body=input.parse(raw);if(body.expectedOwnerId!==user.id)throw new UserError('Account changed.',409,'ACCOUNT_CHANGED');
 const config=configured(),loaded=await readWorkspace(user);
 if(loaded.ownerId!==undefined&&loaded.ownerId!==user.id)throw new UserError('Некорректный владелец ответа.',502,'WORKSPACE_INVALID_RESPONSE');
 const state={...loaded,ownerId:user.id};if(state.revision!==body.revision)throw new Error('CONFLICT');
 const confirmation=RewriteReviewConfirmation.parse({consent:body.consent,reviewed:body.reviewed,decisions:body.decisions,acknowledgedReviewSha256:body.acknowledgedReviewSha256,acknowledgedIssueIds:body.acknowledgedIssueIds}),previewReceipt=body.receipt;
 await consumeQuota(user,'analysis');
 let receipt;try{receipt=await issueRewriteReviewReceipt(user.id,state,previewReceipt,confirmation,config);}catch(e){if(e instanceof UserError)throw e;throw new UserError('Подтверждение AI-правок не прошло проверку.',400,'AI_REWRITE_REVIEW_INVALID');}
 const active=await userOf(req);if(active.id!==user.id)throw new UserError('Account changed.',409,'ACCOUNT_CHANGED');
 const current=await readWorkspace(active),latest=configured();
 if(current.ownerId!==undefined&&current.ownerId!==user.id)throw new UserError('Некорректный владелец ответа.',502,'WORKSPACE_INVALID_RESPONSE');
 if(current.revision!==state.revision||current.original!==state.original||current.vacancy!==state.vacancy||!sameJson(current.facts,state.facts)||latest.configurationId!==config.configurationId)throw new Error('CONFLICT');
 if(req.signal.aborted)throw new UserError('Запрос прерван.',504,'AI_REWRITE_TIMEOUT');
 // Recheck expiry after auth/read latency; no new receipt is issued on retry.
 if(JSON.parse(receipt.payload).expiresAt<=Math.floor(Date.now()/1000))throw new UserError('Подтверждение устарело.',400,'AI_REWRITE_REVIEW_INVALID');
 return NextResponse.json({ownerId:user.id,revision:state.revision,receipt},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}}
export const POST=observeRoute('ai-rewrite-reviews','POST',POSTHandler);
