import {observeAiFailure,type AiFailureObserver} from './ai-diagnostics';
import {z} from 'zod';
import type {Fact} from './engine';
import {evidenceIssue} from './evidence-review';
export const AI_MAX_REQUIREMENTS=50;
export const AiReviewSchema=z.object({requirements:z.array(z.object({
 quote:z.string().min(1).max(2000),evidence_ids:z.array(z.string().min(1).max(100)).max(20)
}).strict()).max(AI_MAX_REQUIREMENTS)}).strict();
export type AiReview=z.infer<typeof AiReviewSchema>;
export function eligibleAiFacts(facts:Fact[]){return facts.filter(f=>f.verified&&!evidenceIssue(f.text));}
/** Exact citations establish provenance, not the semantic truth of the model's link. */
export function validateAiReview(value:unknown,facts:Fact[],vacancy:string,onFailure?:AiFailureObserver):AiReview{
 let parsed:AiReview;
 try{parsed=AiReviewSchema.parse(value);}catch(error){observeAiFailure(onFailure,'review-schema');throw error;}
 const eligible=eligibleAiFacts(facts),seen=new Set<string>();
 for(const row of parsed.requirements){
  if(row.quote!==row.quote.trim()||!vacancy.includes(row.quote)||seen.has(row.quote)||evidenceIssue(row.quote)){observeAiFailure(onFailure,'citation');throw new Error('INVALID_AI_CITATION');}
  seen.add(row.quote);
  if(new Set(row.evidence_ids).size!==row.evidence_ids.length||row.evidence_ids.some(id=>eligible.filter(f=>f.id===id).length!==1)){observeAiFailure(onFailure,'evidence');throw new Error('INVALID_AI_EVIDENCE');}
 }
 return parsed;
}
