import {z} from 'zod';
import {decodeRewriteReceipt,prepareRewriteSource,RewriteReceiptSchema,validateRewritePreview} from './ai-rewrite';
import {confirmRewriteReview} from './ai-rewrite-review';
import {sameJson} from './application-write-response';

export const RewriteReviewPayloadSchema=z.strictObject({format:z.literal('jobmatch-ai-rewrite-review-receipt-v1'),id:z.uuid(),issuerKeyId:z.string().regex(/^[a-f0-9]{64}$/),issuedAt:z.number().int().min(0),expiresAt:z.number().int().positive(),previewReceipt:RewriteReceiptSchema,review:z.unknown()});
/** Frozen structural v1 reader. No MAC, current key/config, wall clock or storage
 * authentication. New acceptance must ALSO verify both current signatures and
 * current owner/source/config/deadline under the database owner lock.
 */
export async function decodeRewriteReviewReceipt(raw:unknown,original:string){
 const receipt=RewriteReceiptSchema.parse(raw),payload=RewriteReviewPayloadSchema.parse(JSON.parse(receipt.payload));
 const previous=await decodeRewriteReceipt(payload.previewReceipt),source=previous.preview.source;
 if(payload.issuerKeyId!==previous.issuerKeyId||payload.expiresAt!==previous.expiresAt||payload.issuedAt<previous.issuedAt-5||payload.issuedAt>=payload.expiresAt)throw Error('INVALID_REWRITE_REVIEW_RECEIPT');
 const facts=source.facts.map(({id,text,source,verified})=>({id,text,source,verified}));
 const expected=await prepareRewriteSource({ownerId:source.ownerId,revision:source.revision,original,vacancy:source.vacancy,facts,goal:'',versions:[],applications:[]},source.ownerId,facts.map(f=>f.id));
 const preview=await validateRewritePreview(previous.preview,{source:expected,language:previous.preview.requestedLanguage,original});
 const stored=payload.review as Record<string,unknown>,confirmation=stored?.confirmation as Record<string,unknown>;
 const review=await confirmRewriteReview(preview,original,{...confirmation,decisions:stored?.decisions});
 if(!sameJson(review,payload.review))throw Error('INVALID_REWRITE_REVIEW_RECEIPT');
 return{receipt,payload:{...payload,review},previewPayload:{...previous,preview}};
}
