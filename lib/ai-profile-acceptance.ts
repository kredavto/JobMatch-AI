import {z} from 'zod';
import {validateAiProfilePreview,type AiProfilePreview} from './ai-profile-v2';
import type {StructuredProfile} from './structured-profile';

export const PROFILE_RECEIPT_TTL=600;
export const PROFILE_RECEIPT_BYTES=128000;
export const PROFILE_ACCEPTANCE_LIMIT=50;
const revision=z.number().int().min(0).max(2147483647);
const sha=z.string().regex(/^[a-f0-9]{64}$/);
const seconds=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-PROFILE_RECEIPT_TTL);
const factIds=z.array(z.string().min(1).max(100)).max(500).refine(ids=>new Set(ids).size===ids.length);
const source=z.object({ownerId:z.uuid(),workspaceRevision:revision,profileRevision:revision,sourceWorkspaceRevision:revision,sourceOriginal:z.string().max(24000),sourceFactIds:factIds}).strict().refine(s=>s.sourceWorkspaceRevision<=s.workspaceRevision);
const payloadSchema=z.object({format:z.literal('jobmatch-ai-profile-receipt-v1'),id:z.uuid(),issuerKeyId:sha,issuedAt:seconds,expiresAt:seconds,source,preview:z.unknown()}).strict().refine(p=>p.expiresAt===p.issuedAt+PROFILE_RECEIPT_TTL);
export const ProfileReceiptSchema=z.object({payload:z.string().min(1).max(PROFILE_RECEIPT_BYTES).refine(s=>s.isWellFormed()&&new TextEncoder().encode(s).length<=PROFILE_RECEIPT_BYTES),signature:sha}).strict();
export type ProfileReceipt=z.infer<typeof ProfileReceiptSchema>;
export type ProfileReceiptPayload=Omit<z.infer<typeof payloadSchema>,'preview'>&{preview:AiProfilePreview};
export const SelectedProfileIndicesSchema=z.array(z.number().int().min(0).max(9)).min(1).max(10).refine(ids=>ids.every((id,i)=>i===0||id>ids[i-1]));
export function profileReceiptSource(profile:StructuredProfile){
 if(!profile.source_matches)throw Error('AI profile receipt refused');
 return source.parse({ownerId:profile.ownerId,workspaceRevision:profile.workspace_revision,profileRevision:profile.revision,sourceWorkspaceRevision:profile.source_workspace_revision,sourceOriginal:profile.source_original,sourceFactIds:profile.source_fact_ids});
}
/** Frozen receipt-v1 decoder uses paragraph-quotes-v2, independently of the current producer facade. */
export function decodeProfileReceipt(value:unknown):ProfileReceiptPayload{
 const receipt=ProfileReceiptSchema.parse(value),payload=payloadSchema.parse(JSON.parse(receipt.payload));
 return {...payload,preview:validateAiProfilePreview(payload.preview,payload.source.sourceOriginal)};
}
/** Source binding is defensive browser validation, not signature or model attestation. */
export function receiptForProfile(value:unknown,profile:StructuredProfile,preview?:AiProfilePreview){
 const receipt=ProfileReceiptSchema.parse(value),payload=decodeProfileReceipt(receipt);
 if(JSON.stringify(payload.source)!==JSON.stringify(profileReceiptSource(profile))||(preview&&JSON.stringify(payload.preview)!==JSON.stringify(preview)))throw Error('AI profile receipt refused');
 return receipt;
}
const ids=z.array(z.uuid()).min(1).max(10).refine(values=>new Set(values).size===values.length);
export const ProfileAcceptanceSchema=z.object({format:z.literal('jobmatch-ai-profile-acceptance-v1'),id:z.uuid(),ownerId:z.uuid(),created:z.iso.datetime({offset:true}),receipt:ProfileReceiptSchema,payloadSha256:sha,selectedIndices:SelectedProfileIndicesSchema,entryIds:ids,userSelectionAccepted:z.literal(true),signatureVerifiedAtAcceptance:z.literal(true),issuerIdentity:z.literal('server-key-holder'),modelIdentityVerified:z.literal(false),modelAcceptance:z.literal('not-accepted')}).strict();
export type ProfileAcceptance=z.infer<typeof ProfileAcceptanceSchema>;
export async function profilePayloadSha256(payload:string){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
/** Historical reads do not require the current signing key or an unexpired receipt. */
export async function validateProfileAcceptance(value:unknown,ownerId:string){
 const record=ProfileAcceptanceSchema.parse(value),payload=decodeProfileReceipt(record.receipt),created=Date.parse(record.created)/1000;
 if(created<payload.issuedAt-5||created>=payload.expiresAt||record.ownerId!==ownerId||payload.source.ownerId!==ownerId||payload.id!==record.id||record.entryIds.length!==record.selectedIndices.length||record.selectedIndices.some(i=>i>=payload.preview.candidates.length)||await profilePayloadSha256(record.receipt.payload)!==record.payloadSha256)throw Error('AI profile acceptance refused');
 return record;
}
const summary=z.object({id:z.uuid(),created:z.iso.datetime({offset:true}),entryCount:z.number().int().min(1).max(10),workspaceRevision:revision,profileRevision:revision,model:z.string().min(1).max(100).regex(/^[a-zA-Z0-9_./:-]+$/),operatorDeclaredModelDigest:z.string().regex(/^sha256:[a-f0-9]{64}$/),contractVersion:z.literal('paragraph-quotes-v2'),payloadSha256:sha,modelIdentityVerified:z.literal(false),modelAcceptance:z.literal('not-accepted')}).strict();
export const ProfileAcceptanceListSchema=z.object({format:z.literal('jobmatch-ai-profile-acceptance-list-v1'),ownerId:z.uuid(),items:z.array(summary).max(PROFILE_ACCEPTANCE_LIMIT)}).strict().refine(value=>new Set(value.items.map(item=>item.id)).size===value.items.length);
export type ProfileAcceptanceList=z.infer<typeof ProfileAcceptanceListSchema>;
