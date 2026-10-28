import {z} from 'zod';
import type {Fact} from './engine';
import {evidenceIssue} from './evidence-review';
export const AiReviewSchema=z.object({requirements:z.array(z.object({
 quote:z.string().min(1).max(2000),evidence_ids:z.array(z.string().min(1).max(100)).max(20)
}).strict()).max(50)}).strict();
export type AiReview=z.infer<typeof AiReviewSchema>;
export function eligibleAiFacts(facts:Fact[]){return facts.filter(f=>f.verified&&!evidenceIssue(f.text));}
/** Exact citations establish provenance, not the semantic truth of the model's link. */
export function validateAiReview(value:unknown,facts:Fact[],vacancy:string):AiReview{
 const parsed=AiReviewSchema.parse(value),eligible=eligibleAiFacts(facts),seen=new Set<string>();
 for(const row of parsed.requirements){
  if(row.quote!==row.quote.trim()||!vacancy.includes(row.quote)||seen.has(row.quote)||evidenceIssue(row.quote))throw new Error('INVALID_AI_CITATION');
  seen.add(row.quote);
  if(new Set(row.evidence_ids).size!==row.evidence_ids.length||row.evidence_ids.some(id=>eligible.filter(f=>f.id===id).length!==1))throw new Error('INVALID_AI_EVIDENCE');
 }
 return parsed;
}
