import {z} from 'zod';
import {validateRewritePreview,renderRewriteOriginal,rewriteSha256,type RewritePreview} from './ai-rewrite';
import {reviewLetterEdit} from './letter-edit-review';
const id=z.string().min(1).max(100);
const kept=z.strictObject({fact_id:id,reviewed:z.literal(true),action:z.literal('keep-source')});
const accepted=z.strictObject({fact_id:id,reviewed:z.literal(true),action:z.literal('accept-proposal')});
const edited=z.strictObject({fact_id:id,reviewed:z.literal(true),action:z.literal('edit'),text:z.string().min(1).max(2000).refine(s=>s.isWellFormed()&&!s.includes('\0')&&!!s.trim())});
export const RewriteReviewDecisions=z.array(z.discriminatedUnion('action',[kept,accepted,edited])).min(1).max(12);
export const RewriteReviewConfirmation=z.strictObject({consent:z.literal(true),reviewed:z.literal(true),decisions:RewriteReviewDecisions,acknowledgedReviewSha256:z.string().regex(/^[a-f0-9]{64}$/),acknowledgedIssueIds:z.array(z.string().min(1).max(1024)).max(128)});
/** Consistency/lexical review only. Caller must separately verify receipt MAC/current source. */
export async function prepareRewriteReview(raw:RewritePreview,original:string,rawDecisions:unknown){
 const preview=await validateRewritePreview(raw,{source:raw.source,language:raw.requestedLanguage,original});
 const input=RewriteReviewDecisions.parse(rawDecisions);
 if(input.length!==preview.source.facts.length||new Set(input.map(d=>d.fact_id)).size!==input.length||input.some(d=>!preview.source.facts.some(f=>f.id===d.fact_id)))throw Error('REWRITE_REVIEW_INVALID');
 const decisions=preview.source.facts.map(f=>input.find(d=>d.fact_id===f.id)!);
 const claims=decisions.map((decision,i)=>{
  const proposed=preview.claims[i];
  if(decision.action==='accept-proposal'&&proposed.status!=='proposed')throw Error('REWRITE_REVIEW_INVALID');
  return{fact_id:decision.fact_id,status:'proposed' as const,text:decision.action==='keep-source'?preview.source.facts[i].text:decision.action==='edit'?decision.text:proposed.text!};
 });
 const rows=decisions.map((decision,i)=>{
  const source=preview.source.facts[i].text,proposed=preview.claims[i].text??source,approved=claims[i].text;
  const comparisons=decision.action==='keep-source'?[]:[{basis:'source' as const,lexical:reviewLetterEdit(source,approved)},...(decision.action==='edit'?[{basis:'proposal' as const,lexical:reviewLetterEdit(proposed,approved)}]:[])];
  if(comparisons.some(c=>c.lexical.coverage!=='bounded-lexical-only'))throw Error('REWRITE_REVIEW_INVALID');
  return{fact_id:decision.fact_id,origin:decision.action==='keep-source'?'source' as const:decision.action==='edit'?'manual' as const:'model-proposal' as const,comparisons};
 });
 const issues=rows.flatMap(r=>r.comparisons.flatMap(c=>c.lexical.issues.map(issue=>({id:JSON.stringify([r.fact_id,c.basis,issue.id]),fact_id:r.fact_id,basis:c.basis,issue}))));
 if(issues.length>128)throw Error('REWRITE_REVIEW_INVALID');
 const rendered=await renderRewriteOriginal(original,preview.source,claims);
 const basis={format:'jobmatch-ai-rewrite-human-review-v1' as const,source:preview.source,configurationId:preview.configurationId,promptSha256:preview.promptSha256,requestedLanguage:preview.requestedLanguage,proposalClaims:preview.claims,decisions,claims,rows,issues,text:rendered,coverage:'bounded-lexical-only' as const,semanticAssessment:'not-performed' as const,modelAcceptance:'not-accepted' as const};
 return{...basis,reviewSha256:await rewriteSha256(JSON.stringify(basis))};
}
export async function confirmRewriteReview(preview:RewritePreview,original:string,raw:unknown){
 const input=RewriteReviewConfirmation.parse(raw),review=await prepareRewriteReview(preview,original,input.decisions);
 const actual=review.issues.map(i=>i.id).sort(),received=[...input.acknowledgedIssueIds].sort();
 if(input.acknowledgedReviewSha256!==review.reviewSha256||received.length!==new Set(received).size||received.length!==actual.length||received.some((id,i)=>id!==actual[i]))throw Error('REWRITE_REVIEW_INVALID');
 return{...review,reviewStatus:'user-confirmed' as const,confirmation:{consent:true as const,reviewed:true as const,acknowledgedReviewSha256:input.acknowledgedReviewSha256,acknowledgedIssueIds:review.issues.map(i=>i.id)}};
}
