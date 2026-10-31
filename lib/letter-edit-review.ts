import {z} from 'zod';
import {validateLetterExport} from './cover-letter';
export const LETTER_EDIT_REVIEW_VERSION='literal-edit-audit-v1';
const LIMIT=64;
type Span={quote:string;start:number;end:number};
export type LetterEditIssue={id:string;kind:'manual-edit'|'number-added'|'number-removed'|'negation-added'|'negation-removed';before:Span|null;after:Span|null};
// Lexical candidates only: neither quantities, grammatical scope nor truth are inferred.
const NUMBER=/[+\-−]?\p{N}+(?:[.,:/‐‑–—-]\p{N}+)*(?:[ \u00a0\u202f]?[%％])?/gu;
const NEGATION=/(?<![\p{L}\p{N}_])(?:не|нет|без|никогда|ни|no|not|never|without|\p{L}+n['’]t)(?![\p{L}\p{N}_])/giu;
function tokens(text:string,pattern:RegExp){
 const spans:Span[]=[];let previous=0,points=0;
 for(const match of text.matchAll(pattern)){
  if(spans.length===LIMIT)return null;
  points+=Array.from(text.slice(previous,match.index)).length;const size=Array.from(match[0]).length;
  spans.push({quote:match[0],start:points,end:points+size});points+=size;previous=match.index+match[0].length;
 }
 return spans;
}
function differences(before:Span[],after:Span[],kind:'number'|'negation'){
 const remaining=new Map<string,Span[]>();for(const span of before){const row=remaining.get(span.quote)??[];row.push(span);remaining.set(span.quote,row);}
 const added:Span[]=[];for(const span of after){const row=remaining.get(span.quote);if(row?.length)row.shift();else added.push(span);}
 const removed=[...remaining.values()].flat().sort((a,b)=>a.start-b.start);
 return [...removed.map((span,i)=>({id:kind+'-removed-'+i,kind:(kind+'-removed') as 'number-removed'|'negation-removed',before:span,after:null})),...added.map((span,i)=>({id:kind+'-added-'+i,kind:(kind+'-added') as 'number-added'|'negation-added',before:null,after:span}))];
}
/** Exact numeric/marker multisets with code-point spans; never a semantic pass. */
export function reviewLetterEdit(generated:string,approved:string){
 for(const text of [generated,approved])if(typeof text!=='string'||!text.isWellFormed()||!text.trim()||text.length>15000)throw Error('LETTER_EDIT_REVIEW_UNAVAILABLE');
 const edited=generated!==approved;
 const bn=tokens(generated,NUMBER),an=tokens(approved,NUMBER),bg=tokens(generated,NEGATION),ag=tokens(approved,NEGATION);
 const complete=bn!==null&&an!==null&&bg!==null&&ag!==null;
 const issues:LetterEditIssue[]=edited?[{id:'manual-edit',kind:'manual-edit',before:null,after:null}]:[];
 if(complete)issues.push(...differences(bn,an,'number'),...differences(bg,ag,'negation'));
 return {format:LETTER_EDIT_REVIEW_VERSION,coverage:complete?'bounded-lexical-only' as const:'token-limit' as const,semanticAssessment:'not-performed' as const,edited,issues};
}
const spanSchema=z.object({quote:z.string().min(1).max(15000),start:z.number().int().min(0).max(15000),end:z.number().int().min(1).max(15000)}).strict();
const reviewSchema=z.object({format:z.literal(LETTER_EDIT_REVIEW_VERSION),coverage:z.enum(['bounded-lexical-only','token-limit']),semanticAssessment:z.literal('not-performed'),edited:z.boolean(),issues:z.array(z.object({id:z.string().min(1).max(50),kind:z.enum(['manual-edit','number-added','number-removed','negation-added','negation-removed']),before:spanSchema.nullable(),after:spanSchema.nullable()}).strict()).max(257)}).strict();
const envelope=z.object({format:z.literal('jobmatch-reviewed-cover-letter-v1'),letter:z.unknown(),edit_review:reviewSchema,reviewed_issue_ids:z.array(z.string().min(1).max(50)).max(257)}).strict();
/** Recomputable unsigned local review. Historical cover-letter-v1 decoding stays unchanged. */
export function validateReviewedLetterExport(value:unknown){
 const packet=envelope.parse(value),letter=validateLetterExport(packet.letter),review=reviewLetterEdit(letter.generated_text,letter.approved_text);
 const required=review.issues.map(issue=>issue.id).sort();
 if(review.coverage==='token-limit'||JSON.stringify(packet.edit_review)!==JSON.stringify(review)||JSON.stringify(packet.reviewed_issue_ids)!==JSON.stringify(required))throw Error('LETTER_EDIT_REVIEW_REQUIRED');
 return {...packet,letter,edit_review:review};
}
