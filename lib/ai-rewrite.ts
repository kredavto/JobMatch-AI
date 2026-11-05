import {z} from 'zod';
import type {Workspace} from './db';
import {reviewLetterEdit} from './letter-edit-review';
import {sameJson} from './application-write-response';

import {REWRITE_PROMPT_VERSION,REWRITE_SYSTEM_PROMPT} from './ai-rewrite-prompt';
export {REWRITE_PROMPT_VERSION} from './ai-rewrite-prompt';
export const REWRITE_PREVIEW_FORMAT='jobmatch-ai-rewrite-preview-v1';
export const REWRITE_RECEIPT_TTL=600;
export const REWRITE_RECEIPT_BYTES=262144;
const safe=(s:string)=>s.isWellFormed()&&!s.includes('\0');
const text=(max:number)=>z.string().min(1).max(max).refine(s=>safe(s)&&!!s.trim());
const id=text(100),sha=z.string().regex(/^[a-f0-9]{64}$/);
export const RewriteFactIds=z.array(id).min(1).max(12).refine(v=>new Set(v).size===v.length);
export const RewriteLanguage=z.enum(['ru','en']);
const fact=z.strictObject({id,text:text(2000),source:text(500),verified:z.literal(true),start:z.number().int().min(0),end:z.number().int().positive()});
export const RewriteSourceSchema=z.strictObject({ownerId:z.uuid(),revision:z.number().int().min(0).max(2147483647),originalSha256:sha,originalLength:z.number().int().min(1).max(100000),vacancy:text(30000),facts:z.array(fact).min(1).max(12)}).superRefine((v,ctx)=>{
 const sorted=[...v.facts].sort((a,b)=>a.start-b.start);
 if(new Set(v.facts.map(f=>f.id)).size!==v.facts.length||sorted.some((f,i)=>f.end>v.originalLength||f.end-f.start!==Array.from(f.text).length||i>0&&f.start<sorted[i-1].end))ctx.addIssue({code:'custom',message:'Invalid source bindings'});
});
export type RewriteSource=z.infer<typeof RewriteSourceSchema>;
export type RewriteLocale=z.infer<typeof RewriteLanguage>;
const row=(factId:z.ZodType<string>)=>z.discriminatedUnion('status',[
 z.strictObject({fact_id:factId,status:z.literal('proposed'),text:text(2000)}),
 z.strictObject({fact_id:factId,status:z.literal('refused'),text:z.null()})
]);
const ModelRewriteSchema=z.strictObject({claims:z.array(row(id)).min(1).max(12)});
/** Request-specific IDs constrain syntax, never establish semantic entailment. */
export function rewriteResponseSchema(source:RewriteSource){
 const ids=RewriteSourceSchema.parse(source).facts.map(f=>f.id);
 return z.strictObject({claims:z.array(row(z.enum(ids as [string,...string[]]))).length(ids.length)});
}
export async function rewriteSha256(value:string){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
}
/** Selected verified declarations only; negative wording is retained for review.
 * Unlike requirement matching, this does not promote them into positive evidence. */
export async function prepareRewriteSource(workspace:Workspace,ownerId:string,rawIds:unknown):Promise<RewriteSource>{
 const ids=RewriteFactIds.parse(rawIds);
 if(workspace.ownerId!==ownerId||!workspace.original.trim()||!safe(workspace.original))throw Error('REWRITE_SOURCE_INVALID');
 if(ids.some(id=>workspace.facts.filter(f=>f.id===id&&f.verified).length!==1)||new Set(workspace.facts.map(f=>f.id)).size!==workspace.facts.length)throw Error('REWRITE_SOURCE_INVALID');
 const lines:{text:string;start:number;end:number}[]=[];let offset=0;
 for(const line of workspace.original.split(/(?<=\n)/)){
  const content=line.endsWith('\n')?line.slice(0,-1):line,trimmed=content.trim();
  if(trimmed){const start=offset+Array.from(content.slice(0,content.indexOf(trimmed))).length;lines.push({text:trimmed,start,end:start+Array.from(trimmed).length});}
  offset+=Array.from(line).length;
 }
 const facts=workspace.facts.filter(f=>ids.includes(f.id)).map(({id,text,source,verified})=>{
  const matches=lines.filter(line=>line.text===text);if(matches.length!==1)throw Error('REWRITE_SOURCE_INVALID');
  return {id,text,source,verified,start:matches[0].start,end:matches[0].end};
 });
 const source=RewriteSourceSchema.parse({ownerId,revision:workspace.revision,originalSha256:await rewriteSha256(workspace.original),originalLength:offset,vacancy:workspace.vacancy,facts});
 if(source.facts.some(f=>reviewLetterEdit(f.text,f.text).coverage!=='bounded-lexical-only'))throw Error('REWRITE_REVIEW_LIMIT');
 return source;
}
const previewBase=z.strictObject({
 format:z.literal(REWRITE_PREVIEW_FORMAT),generator:z.literal('ai-proposed-paraphrase'),
 modelAcceptance:z.literal('not-accepted'),modelIdentity:z.literal('unverified'),semanticAssessment:z.literal('not-performed'),
 sourceVerification:z.literal('current-at-preview-only'),reviewStatus:z.literal('not-reviewed'),
 promptVersion:z.literal(REWRITE_PROMPT_VERSION),promptSha256:sha,configurationId:sha,declaredModel:z.string().min(1).max(100).regex(/^[a-zA-Z0-9_./:-]+$/),
 requestedLanguage:RewriteLanguage,source:RewriteSourceSchema,claims:ModelRewriteSchema.shape.claims,review:z.unknown(),text:text(300000)
});
function derive(source:RewriteSource,raw:unknown){
 const parsed=rewriteResponseSchema(source).parse(raw);
 if(new Set(parsed.claims.map(row=>row.fact_id)).size!==source.facts.length)throw Error('REWRITE_CLAIMS_INVALID');
 const claims=source.facts.map(f=>parsed.claims.find(c=>c.fact_id===f.id)!);
 const reviews=claims.map((claim,index)=>({fact_id:claim.fact_id,status:claim.status,
  changed:claim.status==='proposed'&&claim.text!==source.facts[index].text,
  lexical:reviewLetterEdit(source.facts[index].text,claim.text??source.facts[index].text)}));
 if(reviews.some(r=>r.lexical.coverage!=='bounded-lexical-only')||reviews.reduce((n,r)=>n+r.lexical.issues.length,0)>128)throw Error('REWRITE_REVIEW_LIMIT');
 const review={format:'jobmatch-ai-rewrite-review-v1' as const,coverage:'bounded-lexical-only' as const,semanticAssessment:'not-performed' as const,claims:reviews};
 return {claims,review};
}
type ModelClaims=z.infer<typeof ModelRewriteSchema>['claims'];
/** Replace the selected exact ranges once; every other original code point stays. */
export async function renderRewriteOriginal(original:string,source:RewriteSource,claims:ModelClaims){
 const basis=RewriteSourceSchema.parse(source),points=Array.from(original),checked=derive(basis,{claims}).claims;
 if(!safe(original)||points.length!==basis.originalLength||await rewriteSha256(original)!==basis.originalSha256)throw Error('REWRITE_SOURCE_INVALID');
 let at=0,result='';
 for(const f of [...basis.facts].sort((a,b)=>a.start-b.start)){
  if(points.slice(f.start,f.end).join('')!==f.text)throw Error('REWRITE_SOURCE_INVALID');
  const claim=checked.find(c=>c.fact_id===f.id)!;result+=points.slice(at,f.start).join('')+(claim.text??f.text);at=f.end;
 }
 return result+points.slice(at).join('');
}
function validateRenderedLayout(value:string,source:RewriteSource,claims:ModelClaims){
 const points=Array.from(value);let delta=0;
 for(const f of [...source.facts].sort((a,b)=>a.start-b.start)){
  const claim=claims.find(c=>c.fact_id===f.id)!,replacement=claim.text??f.text,size=Array.from(replacement).length;
  if(points.slice(f.start+delta,f.start+delta+size).join('')!==replacement)throw Error('REWRITE_PREVIEW_INVALID');
  delta+=size-(f.end-f.start);
 }
 if(points.length!==source.originalLength+delta)throw Error('REWRITE_PREVIEW_INVALID');
}
export async function makeRewritePreview(source:RewriteSource,language:RewriteLocale,model:string,raw:unknown,original:string,configurationId:string){
 const basis=RewriteSourceSchema.parse(source),derived=derive(basis,raw);
 const parsed=previewBase.parse({format:REWRITE_PREVIEW_FORMAT,generator:'ai-proposed-paraphrase',modelAcceptance:'not-accepted',modelIdentity:'unverified',semanticAssessment:'not-performed',sourceVerification:'current-at-preview-only',reviewStatus:'not-reviewed',promptVersion:REWRITE_PROMPT_VERSION,promptSha256:await rewriteSha256(REWRITE_SYSTEM_PROMPT),configurationId,declaredModel:model,requestedLanguage:language,source:basis,...derived,text:await renderRewriteOriginal(original,basis,derived.claims)});
 return {...parsed,...derived};
}
export type RewritePreview=Awaited<ReturnType<typeof makeRewritePreview>>;
export async function validateRewritePreview(raw:unknown,expected?:{source:RewriteSource;language:RewriteLocale;original:string}){
 const preview=previewBase.parse(raw),derived=derive(preview.source,{claims:preview.claims});
 if(preview.promptSha256!==await rewriteSha256(REWRITE_SYSTEM_PROMPT))throw Error('REWRITE_PREVIEW_INVALID');
 if(!sameJson(derived,{claims:preview.claims,review:preview.review})||expected&&(!sameJson(preview.source,expected.source)||preview.requestedLanguage!==expected.language||preview.text!==await renderRewriteOriginal(expected.original,expected.source,derived.claims)))throw Error('REWRITE_PREVIEW_INVALID');
 validateRenderedLayout(preview.text,preview.source,derived.claims);
 return {...preview,...derived};
}
export const RewriteReceiptSchema=z.strictObject({payload:z.string().min(1).max(REWRITE_RECEIPT_BYTES).refine(s=>safe(s)&&new TextEncoder().encode(s).length<=REWRITE_RECEIPT_BYTES),signature:sha});
export type RewriteReceipt=z.infer<typeof RewriteReceiptSchema>;
const receiptPayload=z.strictObject({format:z.literal('jobmatch-ai-rewrite-preview-receipt-v1'),id:z.uuid(),issuerKeyId:sha,issuedAt:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-REWRITE_RECEIPT_TTL),expiresAt:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),preview:z.unknown()}).refine(p=>p.expiresAt===p.issuedAt+REWRITE_RECEIPT_TTL);
/** Structural history only. Browser decoding is never MAC verification. */
export async function decodeRewriteReceipt(raw:unknown){
 const receipt=RewriteReceiptSchema.parse(raw),body=receiptPayload.parse(JSON.parse(receipt.payload));
 return {...body,preview:await validateRewritePreview(body.preview)};
}
