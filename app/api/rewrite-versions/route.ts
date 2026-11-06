import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota,readWorkspace,supabase} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {UserError} from '../../../lib/errors';
import {observeRoute} from '../../../lib/ops-telemetry';
import {RewriteReceiptSchema} from '../../../lib/ai-rewrite';
import {verifyRewriteReviewReceipt} from '../../../lib/ai-rewrite-review-signing';
import {rewriteConfig} from '../../../lib/ai-rewrite-provider';
import {requireRewriteStorageReady} from '../../../lib/ai-rewrite-version-capability';
import {acceptReviewedRewrite} from '../../../lib/ai-rewrite-version-db';
import {hasRewriteVersionNamespace,validateRewriteVersionCollection} from '../../../lib/ai-rewrite-version';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const input=z.strictObject({action:z.literal('accept'),expectedOwnerId:z.uuid(),revision:z.number().int().min(0).max(2147483646),receipt:RewriteReceiptSchema,consentToStore:z.literal(true),accept:z.literal('STORE_REVIEWED_AI_REWRITE')});
const query=z.strictObject({expectedOwnerId:z.uuid(),id:z.uuid().optional()});
function configured(){
 if(process.env.JOBMATCH_AI_REWRITE_STORAGE_ENABLED!=='true')throw new UserError('Сохранение не включено.',503,'AI_REWRITE_STORAGE_DISABLED');
 if(process.env.JOBMATCH_AI_REWRITE_REVIEW_ENABLED!=='true')throw new UserError('Проверка не включена.',503,'AI_REWRITE_REVIEW_DISABLED');
 return rewriteConfig();
}
/** No inference or snapshot/score/text input. Native SQL rechecks the exact
 * current receipt/source/session/configuration and commits one atomic intent.
 */
async function POSTHandler(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);
 let raw:unknown;try{raw=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(await boundedBody(req,524288)));}catch(error){if(error instanceof TypeError)throw new UserError('Некорректный UTF-8.',400,'INVALID_INPUT');throw error;}
 const body=input.parse(raw);if(body.expectedOwnerId!==user.id)throw new UserError('Account changed.',409,'ACCOUNT_CHANGED');
 const config=configured();await consumeQuota(user,'service');
 const loaded=await readWorkspace(user);
 if(loaded.ownerId!==undefined&&loaded.ownerId!==user.id)throw new UserError('Некорректный владелец ответа.',502,'WORKSPACE_INVALID_RESPONSE');
 const state={...loaded,ownerId:user.id};if(state.revision!==body.revision)throw new Error('CONFLICT');
 if(state.versions.length>=100)throw new UserError('Лимит версий.',400,'WRITE_REJECTED');
 await verifyRewriteReviewReceipt(user.id,state,body.receipt,config);
 await requireRewriteStorageReady(user.token,config.signing.keyId,config.configurationId,supabase);
 const active=await userOf(req);if(active.id!==user.id)throw new UserError('Account changed.',409,'ACCOUNT_CHANGED');
 const latest=configured();if(latest.configurationId!==config.configurationId||latest.signing.keyId!==config.signing.keyId)throw new Error('CONFLICT');
 // Recheck time after readiness/auth latency, without extending the preview TTL.
 await verifyRewriteReviewReceipt(user.id,state,body.receipt,latest);
 if(req.signal.aborted)throw new UserError('Запрос прерван до записи.',504,'AI_REWRITE_TIMEOUT');
 const result=await acceptReviewedRewrite(active,state,body.receipt,latest);
 // A known committed ACK remains a known ACK even if the client disconnected.
 // Transport/invalid ACK errors are outcome-unknown and must never be retried.
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}}
/** Historical rendering is independent of current key/model/write flags.
 * readWorkspace establishes the native boundary before trusting reserved tags.
 */
async function GETHandler(req:NextRequest){try{
 const user=await userOf(req);requireExpectedOwner(req,user.id);
 const params=req.nextUrl.searchParams;for(const key of params.keys())if(params.getAll(key).length!==1)throw new UserError('Повторный параметр.',400,'INVALID_INPUT');
 const body=query.parse(Object.fromEntries(params));if(body.expectedOwnerId!==user.id)throw new UserError('Account changed.',409,'ACCOUNT_CHANGED');
 await consumeQuota(user,'service');const state=await readWorkspace(user);
 if(state.ownerId!==undefined&&state.ownerId!==user.id)throw new UserError('Некорректный владелец ответа.',502,'WORKSPACE_INVALID_RESPONSE');
 // Defensive collection check for alternate adapters; never return partial history.
 if(state.versions.some(hasRewriteVersionNamespace))try{await validateRewriteVersionCollection(state.versions,user.id);}catch{throw new UserError('Некорректная история.',502,'WORKSPACE_INVALID_RESPONSE');}
 const versions=state.versions.filter(hasRewriteVersionNamespace).filter(v=>body.id===undefined||v.id===body.id);
 if(body.id!==undefined&&versions.length!==1)throw new UserError('Версия не найдена.',404,'AI_REWRITE_VERSION_NOT_FOUND');
 return NextResponse.json({format:'jobmatch-ai-rewrite-history-v1',ownerId:user.id,workspaceRevision:state.revision,versions},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}}
export const POST=observeRoute('rewrite-versions','POST',POSTHandler);
export const GET=observeRoute('rewrite-versions','GET',GETHandler);
