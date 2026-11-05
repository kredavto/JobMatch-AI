import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {UserError} from './errors';
import type {Workspace} from './db';
import {decodeRewriteReceipt,RewriteReceiptSchema,prepareRewriteSource,validateRewritePreview,REWRITE_RECEIPT_BYTES,REWRITE_RECEIPT_TTL,type RewritePreview} from './ai-rewrite';
export type RewriteSigningConfig={key:Buffer;keyId:string};
// Separate protocol domain; a letter receipt cannot become a rewrite proposal.
const DOMAIN='jobmatch-ai-rewrite-preview-receipt-v1\n';
export function rewriteSigningConfig():RewriteSigningConfig{
 const value=process.env.JOBMATCH_LETTER_SIGNING_SECRET;
 if(!value||!/^[a-f0-9]{64}$/.test(value))throw new UserError('Подпись AI-предпросмотра не настроена.',503,'AI_REWRITE_NOT_CONFIGURED');
 const key=Buffer.from(value,'hex');return{key,keyId:createHash('sha256').update(key).digest('hex')};
}
export async function issueRewriteReceipt(ownerId:string,workspace:Workspace,preview:RewritePreview,config:RewriteSigningConfig){
 const source=await prepareRewriteSource(workspace,ownerId,preview.source.facts.map(f=>f.id));
 const checked=await validateRewritePreview(preview,{source,language:preview.requestedLanguage,original:workspace.original}),issuedAt=Math.floor(Date.now()/1000);
 const payload=JSON.stringify({format:'jobmatch-ai-rewrite-preview-receipt-v1',id:randomUUID(),issuerKeyId:config.keyId,issuedAt,expiresAt:issuedAt+REWRITE_RECEIPT_TTL,preview:checked});
 if(Buffer.byteLength(payload)>REWRITE_RECEIPT_BYTES)throw new UserError('Предпросмотр слишком велик для подписанного результата.',413,'AI_REWRITE_TOO_LARGE');
 const receipt={payload,signature:createHmac('sha256',config.key).update(DOMAIN+payload).digest('hex')};
 await decodeRewriteReceipt(receipt);return receipt;
}
export async function verifyRewriteReceipt(raw:unknown,ownerId:string,config:RewriteSigningConfig){
 try{
  const receipt=RewriteReceiptSchema.parse(raw),expected=createHmac('sha256',config.key).update(DOMAIN+receipt.payload).digest();
  if(!timingSafeEqual(expected,Buffer.from(receipt.signature,'hex')))throw Error();
  const payload=await decodeRewriteReceipt(receipt),now=Math.floor(Date.now()/1000);
  if(payload.preview.source.ownerId!==ownerId||payload.issuerKeyId!==config.keyId||payload.issuedAt>now+5||payload.expiresAt<=now)throw Error();
  return{receipt,payload};
 }catch{throw new UserError('AI-предпросмотр устарел или не прошёл проверку.',400,'AI_REWRITE_PREVIEW_INVALID');}
}
