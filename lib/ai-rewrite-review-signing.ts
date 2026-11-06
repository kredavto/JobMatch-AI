import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import type {Workspace} from './db';
import {prepareRewriteSource,validateRewritePreview,RewriteReceiptSchema,REWRITE_RECEIPT_BYTES} from './ai-rewrite';
import {confirmRewriteReview} from './ai-rewrite-review';
import {verifyRewriteReceipt,type RewriteSigningConfig} from './ai-rewrite-signing';
import {decodeRewriteReviewReceipt} from './ai-rewrite-review-receipt';
import {UserError} from './errors';
const DOMAIN='jobmatch-ai-rewrite-review-receipt-v1\n';
type Config={signing:RewriteSigningConfig;configurationId:string};
async function basis(ownerId:string,state:Workspace,raw:unknown,config:Config){
 const checked=await verifyRewriteReceipt(raw,ownerId,config.signing),preview=checked.payload.preview;
 if(preview.configurationId!==config.configurationId||state.ownerId!==ownerId)throw Error('REWRITE_REVIEW_INVALID');
 const source=await prepareRewriteSource(state,ownerId,preview.source.facts.map(f=>f.id));
 await validateRewritePreview(preview,{source,language:preview.requestedLanguage,original:state.original});
 return checked;
}
/** Signs user-declared review only. No persistence, semantic pass or refreshed TTL. */
export async function issueRewriteReviewReceipt(ownerId:string,state:Workspace,raw:unknown,confirmation:unknown,config:Config){
 const checked=await basis(ownerId,state,raw,config),review=await confirmRewriteReview(checked.payload.preview,state.original,confirmation);
 const now=Math.floor(Date.now()/1000);
 if(checked.payload.expiresAt<=now)throw Error('REWRITE_REVIEW_INVALID');
 const payload=JSON.stringify({format:'jobmatch-ai-rewrite-review-receipt-v1',id:randomUUID(),issuerKeyId:config.signing.keyId,issuedAt:now,expiresAt:checked.payload.expiresAt,previewReceipt:checked.receipt,review});
 if(Buffer.byteLength(payload)>REWRITE_RECEIPT_BYTES)throw new UserError('Подтверждение слишком велико.',413,'AI_REWRITE_TOO_LARGE');
 return RewriteReceiptSchema.parse({payload,signature:createHmac('sha256',config.signing.key).update(DOMAIN+payload).digest('hex')});
}
export async function verifyRewriteReviewReceipt(ownerId:string,state:Workspace,raw:unknown,config:Config){
 try{
  const receipt=RewriteReceiptSchema.parse(raw),expected=createHmac('sha256',config.signing.key).update(DOMAIN+receipt.payload).digest();
  if(!timingSafeEqual(expected,Buffer.from(receipt.signature,'hex')))throw Error();
  const decoded=await decodeRewriteReviewReceipt(receipt,state.original),payload=decoded.payload,now=Math.floor(Date.now()/1000);
  if(payload.issuerKeyId!==config.signing.keyId||payload.issuedAt>now+5||payload.expiresAt<=now||payload.issuedAt>=payload.expiresAt)throw Error();
  const checked=await basis(ownerId,state,payload.previewReceipt,config);
  if(payload.expiresAt!==checked.payload.expiresAt)throw Error();
  return{receipt,payload};
 }catch{throw new UserError('Подтверждение AI-правок устарело или не прошло проверку.',400,'AI_REWRITE_REVIEW_INVALID');}
}
