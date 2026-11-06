import {z} from 'zod';
import type {Workspace} from './db';
import {RewriteReceiptSchema,type RewriteReceipt} from './ai-rewrite';
import {validateRewriteVersionSaveResult,validateReviewedRewriteVersion} from './ai-rewrite-version';
import {readAiUiResponse,discardAiUiResponse} from './ai-ui-response';
import {sameJson} from './application-write-response';
export type RewriteSaveResult=Awaited<ReturnType<typeof validateRewriteVersionSaveResult>>;
export class RewriteStorageFailure extends Error{constructor(readonly status=0){super('REWRITE_STORAGE_NOT_CONFIRMED');}}
/** Status-only UI feedback; no raw error body, retry or rollback inference. */
export async function rewriteStorageResponse(url:string,init:RequestInit,signal:AbortSignal){
 let response:Response;try{response=await fetch(url,{...init,cache:'no-store',redirect:'error',credentials:'same-origin',signal});}catch{throw new RewriteStorageFailure();}
 if(response.status!==200){discardAiUiResponse(response);throw new RewriteStorageFailure(response.status);}
 if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'){discardAiUiResponse(response);throw new RewriteStorageFailure();}
 try{return await readAiUiResponse(response,signal);}catch{throw new RewriteStorageFailure();}
}
/** Response consistency only: browser has no HMAC key. Keep every master field
 * and unrelated saved row from the captured workspace; never adopt a replacement.
 */
export async function adoptReviewedRewrite(raw:unknown,previous:Workspace,current:Workspace|null,receipt:RewriteReceipt,ownerId?:string){
 if(!ownerId||previous.ownerId!==ownerId||current?.ownerId!==ownerId||!sameJson(current,previous))throw new RewriteStorageFailure(409);
 const saved=await validateRewriteVersionSaveResult(raw,previous,receipt,ownerId);
 return{saved,workspace:{...current,revision:saved.workspaceRevision,versions:[...current.versions,saved.version]}};
}
/** A positive manual read matches the exact immutable receipt. A 404/absence is
 * never proof that a queued/in-flight write rolled back. No current MAC/TTL gate.
 */
export async function validateRewriteStorageRead(raw:unknown,ownerId:string,nonce:string,receipt:RewriteReceipt){
 const body=z.strictObject({format:z.literal('jobmatch-ai-rewrite-history-v1'),ownerId:z.literal(ownerId),workspaceRevision:z.number().int().nonnegative().max(2147483647),versions:z.array(z.unknown()).length(1)}).parse(raw);
 const checked=await validateReviewedRewriteVersion(body.versions[0],ownerId);
 if(checked.version.id!==nonce||checked.version.restored_from!==undefined||!sameJson(checked.archive.receipt,RewriteReceiptSchema.parse(receipt)))throw new RewriteStorageFailure();
 return{...body,version:checked.version};
}
