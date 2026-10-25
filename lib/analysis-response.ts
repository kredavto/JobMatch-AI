import {z} from 'zod';
import {categories,gate,match,parseVacancy,propose,type Fact} from './engine';
const id=z.string().min(1);
const requirement=z.object({id,quote:z.string(),category:z.enum(categories),must:z.boolean(),terms:z.array(z.string())});
const row=z.object({requirement,status:z.enum(['matched','partial','missing','unknown']),confidence:z.number().min(0).max(1),evidence_ids:z.array(id),reason:z.string()});
const response=z.object({
 analysis:z.object({
  score:z.number().int().min(0).max(100),rows:z.array(row),
  parts:z.array(z.object({category:z.enum(categories),weight:z.number().nonnegative(),count:z.number().int().nonnegative(),value:z.number().min(0).max(1).nullable()})),
  blockers:z.array(row),coverage:z.number().int().min(0).max(100)
 }),
 edits:z.array(z.object({id,text:z.string().min(1).max(2000),evidence_ids:z.array(id),reason:z.string()})).max(500)
});
function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)]));
 return value;
}
/** Applies to the rules-v1 provider only. A future model needs its own explicit validation contract.
 * Bind requirements, score, citations and edits to the snapshot used to request this analysis.
 * Return locally reconstructed output only after the entire remote result passes comparison.
 */
export function validateAnalysisResponse(data:unknown,workspace:{facts:Fact[];vacancy:string}){
 const parsed=response.safeParse(data);
 if(!parsed.success)throw new Error('INVALID_ANALYSIS');
 const requirements=parseVacancy(workspace.vacancy);
 const expected={analysis:match(workspace.facts,requirements),edits:propose(workspace.facts,requirements)};
 if(parsed.data.edits.some(edit=>!gate(edit,workspace.facts))||
  JSON.stringify(canonical(parsed.data))!==JSON.stringify(canonical(expected)))throw new Error('INVALID_ANALYSIS');
 return expected;
}
