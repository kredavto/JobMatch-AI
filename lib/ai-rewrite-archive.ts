import {z} from 'zod';
import {RewriteReceiptSchema,rewriteSha256} from './ai-rewrite';
import {decodeRewriteReviewReceipt} from './ai-rewrite-review-receipt';

export const REWRITE_ARCHIVE_FORMAT='jobmatch-ai-rewrite-archive-v1';
export const REWRITE_ARCHIVE_BYTES=1024*1024;
// The literal system-prompt hash, not the SHA of the TypeScript source file.
export const REWRITE_ARCHIVE_V1_PROMPT_SHA256='e531f3a6d343ae61773928fc6e2d3aec58aa2804af2e34e01ad039bbf2d48a7f';
const ArchiveSchema=z.strictObject({format:z.literal(REWRITE_ARCHIVE_FORMAT),ownerId:z.uuid(),acceptedAt:z.iso.datetime(),
 sourceOriginal:z.string().min(1).max(100000).refine(s=>s.isWellFormed()&&!s.includes('\0')),
 receipt:RewriteReceiptSchema,receiptSha256:z.string().regex(/^[a-f0-9]{64}$/),
 sourceVerification:z.literal('current-at-storage-acceptance'),receiptSignature:z.literal('verified-at-storage-acceptance'),
 storageConsent:z.literal('STORE_REVIEWED_AI_REWRITE'),contentReview:z.literal('user-declared-only'),
 semanticAssessment:z.literal('not-performed'),modelAcceptance:z.literal('not-accepted')});
export type RewriteArchive=z.infer<typeof ArchiveSchema>;
/** Accidental-corruption digest over the exact payload AND signature. Not a MAC
 * or authentication of an imported file. SQL can hash these identical UTF8 bytes.
 */
export function rewriteArchiveReceiptSha256(raw:unknown){
 const receipt=RewriteReceiptSchema.parse(raw);
 return rewriteSha256('jobmatch-ai-rewrite-archive-receipt-v1\n'+receipt.payload+'\n'+receipt.signature);
}
/** Frozen history format. Trusted API reads require the protected native boundary.
 * The acceptance labels are stored assertions, not authenticated by this reader.
 * Historical reads never refresh TTL or require a currently active signing key.
 */
export async function validateRewriteArchive(raw:unknown,ownerId:string){
 const archive=ArchiveSchema.parse(raw);
 if(archive.ownerId!==ownerId||new TextEncoder().encode(JSON.stringify(archive)).length>REWRITE_ARCHIVE_BYTES)throw Error('INVALID_REWRITE_ARCHIVE');
 const checked=await decodeRewriteReviewReceipt(archive.receipt,archive.sourceOriginal),source=checked.previewPayload.preview.source;
 const accepted=Date.parse(archive.acceptedAt)/1000;
 if(archive.acceptedAt!==new Date(accepted*1000).toISOString()||source.ownerId!==ownerId
  ||checked.previewPayload.preview.promptSha256!==REWRITE_ARCHIVE_V1_PROMPT_SHA256
  ||accepted<checked.payload.issuedAt-5||accepted>=checked.payload.expiresAt
  ||archive.receiptSha256!==await rewriteArchiveReceiptSha256(archive.receipt))throw Error('INVALID_REWRITE_ARCHIVE');
 return{archive,...checked};
}
