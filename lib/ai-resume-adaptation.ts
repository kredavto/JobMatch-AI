import {z} from 'zod';
import {eligibleAiFacts,validateAiReview,type AiReview} from './ai-review';
import {renderVersion,type Fact,type Edit} from './engine';
import {ORDINARY_TEMPLATE,ORDINARY_ENGLISH_TEMPLATE} from './ordinary-template';

export const ADAPTATION_FORMAT='jobmatch-ai-resume-adaptation-v1';
const schema=z.object({format:z.literal(ADAPTATION_FORMAT),generator:z.literal('ai-selected-literal'),modelAcceptance:z.literal('not-accepted'),review:z.unknown()}).strict();
/** Only whole original lines are promotable. A fact added independently to the profile is not a resume citation. */
export function adaptationFacts(facts:Fact[],original:string){
 const lines=new Set(original.split(/\r?\n/).map(line=>line.trim()).filter(Boolean));
 return eligibleAiFacts(facts).filter(f=>lines.has(f.text)&&facts.filter(other=>other.id===f.id).length===1);
}
export type AdaptationPreview={format:typeof ADAPTATION_FORMAT;generator:'ai-selected-literal';modelAcceptance:'not-accepted';review:AiReview};
export function validateAdaptation(value:unknown,facts:Fact[],original:string,vacancy:string):AdaptationPreview{
 const parsed=schema.parse(value);
 return {...parsed,review:validateAiReview(parsed.review,adaptationFacts(facts,original),vacancy)};
}
export function adaptationEdits(preview:AdaptationPreview,facts:Fact[],original:string,vacancy:string):Edit[]{
 const checked=validateAdaptation(preview,facts,original,vacancy),eligible=adaptationFacts(facts,original);
 const ids=[...new Set(checked.review.requirements.flatMap(row=>row.evidence_ids))];
 return ids.map(id=>({id:`ai-adaptation-${id}`,text:eligible.find(f=>f.id===id)!.text,evidence_ids:[id],reason:'AI-selected source quotation; requires manual review'}));
}
/** Selection is explicit; this does not save, mutate facts or establish semantic suitability. */
export function renderAdaptation(preview:AdaptationPreview,selected:string[],facts:Fact[],original:string,vacancy:string,locale:'ru'|'en'='ru'){
 const edits=adaptationEdits(preview,facts,original,vacancy);
 if(!selected.length||new Set(selected).size!==selected.length||selected.some(id=>!edits.some(edit=>edit.id===id)))throw Error('INVALID_ADAPTATION_SELECTION');
 return renderVersion(original,edits.filter(edit=>selected.includes(edit.id)),facts,locale==='en'?ORDINARY_ENGLISH_TEMPLATE:ORDINARY_TEMPLATE);
}
