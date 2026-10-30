import {normalize,terms,type Fact,type Requirement} from './engine';
import {evidenceIssue} from './evidence-review';
/** Suggestions for human review only. Never evidence and never a score contribution. */
export function unverifiedCandidates(facts:Fact[],requirement:Requirement):Fact[]{
 if(evidenceIssue(requirement.quote))return [];
 return facts.filter(fact=>!fact.verified&&!evidenceIssue(fact.text)&&(
  normalize(fact.text)===normalize(requirement.quote)||
  terms(fact.text).some(term=>requirement.terms.includes(term))
 ));
}
