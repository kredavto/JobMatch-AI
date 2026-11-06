import {z} from 'zod';
import type {Workspace} from './db';
import {decodeRewriteReceipt,prepareRewriteSource,validateRewritePreview,RewriteReceiptSchema,type RewriteReceipt,type RewriteLocale} from './ai-rewrite';
import {confirmRewriteReview,RewriteReviewConfirmation} from './ai-rewrite-review';
import {sameJson} from './application-write-response';
export type RewriteUiSource=Pick<Workspace,'ownerId'|'revision'|'original'|'vacancy'|'facts'>;
export function eligibleRewriteFacts(source:RewriteUiSource){
 const lines=new Map<string,number>(),ids=new Map<string,number>();
 for(const line of source.original.split('\n')){const text=line.trim();if(text)lines.set(text,(lines.get(text)??0)+1);}
 for(const f of source.facts)ids.set(f.id,(ids.get(f.id)??0)+1);
 if([...ids.values()].some(n=>n!==1))return [];
 return source.facts.filter(f=>f.verified&&lines.get(f.text)===1);
}
const response=(source:RewriteUiSource)=>z.strictObject({ownerId:z.literal(source.ownerId!),revision:z.literal(source.revision),receipt:RewriteReceiptSchema});
export async function validateRewriteUiPreview(raw:unknown,source:RewriteUiSource,ids:string[],language:RewriteLocale){
 if(!source.ownerId)throw Error('UNKNOWN_OWNER');
 const outer=response(source).parse(raw),payload=await decodeRewriteReceipt(outer.receipt);
 const expected=await prepareRewriteSource({...source,goal:'',versions:[],applications:[]},source.ownerId,ids);
 const preview=await validateRewritePreview(payload.preview,{source:expected,language,original:source.original});
 return{receipt:outer.receipt,payload:{...payload,preview}};
}
const reviewPayload=z.strictObject({format:z.literal('jobmatch-ai-rewrite-review-receipt-v1'),id:z.uuid(),issuerKeyId:z.string().regex(/^[a-f0-9]{64}$/),issuedAt:z.number().int().min(0),expiresAt:z.number().int().positive(),previewReceipt:RewriteReceiptSchema,review:z.unknown()});
/** Authenticated-response consistency only. The browser has no MAC key. */
export async function validateRewriteUiConfirmation(raw:unknown,source:RewriteUiSource,previewReceipt:RewriteReceipt,confirmation:unknown){
 if(!source.ownerId)throw Error('UNKNOWN_OWNER');
 const outer=response(source).parse(raw),payload=reviewPayload.parse(JSON.parse(outer.receipt.payload));
 if(!sameJson(payload.previewReceipt,previewReceipt))throw Error('UNEXPECTED_PREVIEW');
 const original=await decodeRewriteReceipt(previewReceipt),input=RewriteReviewConfirmation.parse(confirmation);
 if(payload.issuerKeyId!==original.issuerKeyId||payload.expiresAt!==original.expiresAt||payload.issuedAt>=payload.expiresAt)throw Error('INVALID_LIFETIME');
 const expected=await prepareRewriteSource({...source,goal:'',versions:[],applications:[]},source.ownerId,original.preview.source.facts.map(f=>f.id));
 const preview=await validateRewritePreview(original.preview,{source:expected,language:original.preview.requestedLanguage,original:source.original});
 const review=await confirmRewriteReview(preview,source.original,input);
 if(!sameJson(review,payload.review))throw Error('UNEXPECTED_REVIEW');
 return{receipt:outer.receipt,payload:{...payload,review}};
}
