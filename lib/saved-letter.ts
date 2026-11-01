import {z} from 'zod';
import {LetterSnapshotSchemaV1} from './letter-snapshot-schema-v1';
export const SAVED_LETTER_LIMIT=50,LETTER_RECEIPT_BYTES=262144,LETTER_RECEIPT_TTL=600;
const sha=z.string().regex(/^[a-f0-9]{64}$/),revision=z.number().int().min(0).max(2147483647);
export const LetterReceiptSchema=z.strictObject({payload:z.string().min(1).max(LETTER_RECEIPT_BYTES).refine(s=>s.isWellFormed()&&new TextEncoder().encode(s).length<=LETTER_RECEIPT_BYTES),signature:sha});
export type LetterReceipt=z.infer<typeof LetterReceiptSchema>;
const payloadSchema=z.strictObject({format:z.literal('jobmatch-letter-receipt-v1'),id:z.uuid(),issuerKeyId:sha,issuedAt:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-600),expiresAt:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),source:z.strictObject({ownerId:z.uuid(),workspaceRevision:revision,letterRevision:z.number().int().min(0).max(49),originalSha256:sha}),snapshot:LetterSnapshotSchemaV1}).refine(p=>p.expiresAt===p.issuedAt+LETTER_RECEIPT_TTL);
/** Frozen structural history reader. Does not re-run a future composer or verify an old MAC. */
export function decodeLetterReceipt(value:unknown){
 const receipt=LetterReceiptSchema.parse(value),p=payloadSchema.parse(JSON.parse(receipt.payload)),s=p.snapshot;
 const ids=s.source.facts.map(f=>f.id),issueIds=s.review.issues.map(i=>i.id);
 if(new Set(ids).size!==ids.length||s.source.facts.some(f=>!f.verified)||s.selection.length!==ids.length||new Set(s.selection).size!==ids.length||ids.some(id=>!s.selection.includes('edit-'+id))||s.review.edited!==(s.generated!==s.text)||new Set(issueIds).size!==issueIds.length||JSON.stringify([...s.approval.reviewedIssueIds].sort())!==JSON.stringify([...issueIds].sort())||s.review.issues.filter(i=>i.kind==='manual-edit').length!==(s.review.edited?1:0))throw Error('INVALID_LETTER_RECEIPT');
 const texts=[s.generated,s.text,s.source.vacancy,...s.selection,...ids,...s.source.facts.flatMap(f=>[f.text,f.source]),...issueIds,...s.approval.reviewedIssueIds];
 if(texts.some(t=>t.includes('\0')))throw Error('INVALID_LETTER_RECEIPT');
 const before=Array.from(s.generated),after=Array.from(s.text);
 for(const issue of s.review.issues){
  if(issue.kind==='manual-edit'){if(issue.id!=='manual-edit'||issue.before||issue.after)throw Error('INVALID_LETTER_RECEIPT');continue;}
  const removed=issue.kind.endsWith('-removed'),span=removed?issue.before:issue.after,other=removed?issue.after:issue.before,source=removed?before:after;
  if(!span||other||span.quote.includes('\0')||source.slice(span.start,span.end).join('')!==span.quote)throw Error('INVALID_LETTER_RECEIPT');
 }
 return p;
}
export async function letterPayloadSha256(payload:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
export const SavedLetterVersionSchema=z.strictObject({format:z.literal('jobmatch-saved-letter-version-v1'),ownerId:z.uuid(),id:z.uuid(),version:z.number().int().min(1).max(50),created:z.iso.datetime({offset:true}),receipt:LetterReceiptSchema,payloadSha256:sha,issuer:z.literal('server-key-holder'),sourceVerification:z.literal('current-at-acceptance'),receiptSignature:z.literal('verified-at-acceptance'),contentReview:z.literal('reported-user-review'),semanticAssessment:z.literal('not-performed'),modelVersion:z.null()});
export type SavedLetterVersion=z.infer<typeof SavedLetterVersionSchema>;
export async function validateSavedLetterVersion(value:unknown,ownerId:string){
 const row=SavedLetterVersionSchema.parse(value),p=decodeLetterReceipt(row.receipt),created=Date.parse(row.created)/1000;
 if(row.ownerId!==ownerId||p.source.ownerId!==ownerId||row.id!==p.id||row.version!==p.source.letterRevision+1||created<p.issuedAt-5||created>=p.expiresAt||row.payloadSha256!==await letterPayloadSha256(row.receipt.payload))throw Error('INVALID_SAVED_LETTER');return row;
}
const summary=z.strictObject({id:z.uuid(),version:z.number().int().min(1).max(50),created:z.iso.datetime({offset:true}),workspaceRevision:revision,templateVersion:z.literal('main-ru-letter-81cb1a6-v1'),style:z.enum(['professional','brief','confident','executive']),edited:z.boolean(),payloadSha256:sha});
export const SavedLettersStateSchema=z.strictObject({format:z.literal('jobmatch-saved-letters-state-v1'),ownerId:z.uuid(),revision:z.number().int().min(0).max(50),items:z.array(summary).max(50)}).refine(s=>s.items.length===s.revision&&new Set(s.items.map(i=>i.id)).size===s.items.length&&s.items.every((item,i)=>item.version===s.revision-i));
export type SavedLettersState=z.infer<typeof SavedLettersStateSchema>;
