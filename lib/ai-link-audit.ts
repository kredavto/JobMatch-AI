import {z} from 'zod';
import {FactSchema,aliases,terms,normalize,type Fact} from './engine';
import {validateAiReview,eligibleAiFacts,type AiReview} from './ai-review';
export const AI_LINK_AUDIT_VERSION='literal-quantities-v1';
export const AI_LINK_SIGNALS=['no-linked-facts','literal-gap','coverage-unavailable','quantity-difference','quantity-unknown','level-below','level-unknown'] as const;
export const AI_LINK_WARNING_SIGNALS=['literal-gap','quantity-difference','level-below'] as const;
export type AiLinkSignal=typeof AI_LINK_SIGNALS[number];
export type AiLinkNote={index:number;status:'warning'|'unknown'|'no-rule-warning';signals:AiLinkSignal[]};
export type AiLinkAudit={version:typeof AI_LINK_AUDIT_VERSION;semanticAssessment:'not-performed';status:'available'|'unavailable';links:AiLinkNote[]};
type Quantity={unit:'years'|'percent';value:number;bound:'eq'|'ge'|'gt'|'le'|'lt'};
type Parsed={quantity:Quantity|null;numeric:boolean;ambiguous:boolean;level:number|null;levelMentioned:boolean;terms:string[];words:Set<string>;simple:boolean};
const factsSchema=z.array(FactSchema.pick({id:true,text:true,verified:true}).extend({id:z.string().min(1).max(100)})).max(500);
const stop=new Set(['experience','years','year','least','most','than','minimum','maximum','percent','with','from','have','must','more','less','опыт','года','год','лет','менее','более','процент','процентов','необходимо','требуется']);
const levels=['A1','A2','B1','B2','C1','C2'];
function bound(prefix:string):Quantity['bound']|null{
 const s=normalize(prefix).slice(-80);
 if(/(?:about|approx(?:imately)?|около|примерно|~|≈)\s*$/u.test(s))return null;
 if(/(?:^|[^\p{L}])(?:not|не)\s+(?:at least|at most)\s*$/u.test(s))return null;
 // Negated upper/lower bounds precede their positive suffixes; embedded words are not operators.
 if(/(?:^|[^\p{L}])(?:at most|up to|maximum|max\.?|not more than|не более|до|<=|≤)\s*$/u.test(s))return 'le';
 if(/(?:^|[^\p{L}])(?:at least|minimum|min\.?|not less than|не менее|от|>=|≥)\s*$/u.test(s))return 'ge';
 if(/(?:^|[^\p{L}])(?:not|не)\s+(?:at least|at most|more than|less than|более|менее)\s*$/u.test(s))return null;
 if(/(?:^|[^\p{L}])(?:more than|over|более|>)\s*$/u.test(s))return 'gt';
 if(/(?:^|[^\p{L}])(?:less than|under|менее|<)\s*$/u.test(s))return 'lt';
 return 'eq';
}
function parse(text:string):Parsed{
 const n=normalize(text),named=terms(text),words=new Set((n.match(/\p{L}{3,}/gu)??[]).filter(word=>!stop.has(word)));
 const allLevels=[...n.matchAll(/(?:^|[^\p{L}\p{N}])([abc][12])(?=$|[^\p{L}\p{N}])/gu)];
 const explicit=[...n.matchAll(/(?:english|английск(?:ий|ого|ому|им|ом))\s*(?:[:—-]\s*)?([abc][12])(?=$|[^\p{L}\p{N}])/gu)];
 const level=allLevels.length===1&&explicit.length===1?levels.indexOf(explicit[0][1].toUpperCase()):null;
 const levelMentioned=allLevels.length>0;
 let remaining=n.replace(/(?:^|[^\p{L}\p{N}])[abc][12](?=$|[^\p{L}\p{N}])/gu,' ').replace(/(?:^|[^\p{L}\p{N}])(?:b2b|bitrix\s?24|битрикс\s?24)(?=$|[^\p{L}\p{N}])/gu,' '),quantity:Quantity|null=null;
 const matches=[...remaining.matchAll(/(?:^|[^\p{L}\p{N}.,])([+-]?\d+(?:[.,]\d+)?)\s*(years?|yrs?|лет|год(?:а|ов)?|%|percent|процент(?:а|ов)?)(?=$|[^\p{L}\p{N}])/gu)];
 let ambiguous=false;
 if(matches.length===1){
  const m=matches[0],raw=m[1],value=Number(raw.replace(',','.')),operator=bound(remaining.slice(0,m.index!));
  const unit:Quantity['unit']=/^(?:years?|yrs?|лет|год)/u.test(m[2])?'years':'percent';
  if(!Number.isFinite(value)||value<0||value>1_000_000||(unit==='years'&&value>100)||(raw.split(/[.,]/)[1]?.length??0)>2||operator===null)ambiguous=true;
  else quantity={unit,value,bound:operator};
  remaining=remaining.slice(0,m.index!)+remaining.slice(m.index!+m[0].length);
 }else if(matches.length>1)ambiguous=true;
 const numeric=/\p{N}/u.test(remaining)||matches.length>0;
 if(/\p{N}/u.test(remaining))ambiguous=true;
 const simple=named.length===1&&aliases[named[0]].some(alias=>normalize(text).replace(/^[-•]\s*/u,'')===alias);
 return {quantity,numeric,ambiguous,level,levelMentioned,terms:named,words,simple};
}
function satisfies(actual:number,required:Quantity){return required.bound==='ge'?actual>=required.value:required.bound==='gt'?actual>required.value:required.bound==='le'?actual<=required.value:required.bound==='lt'?actual<required.value:actual===required.value;}
/** Bounded, conservative annotations only. No qualification, semantic verification, Score/fact writes or network. */
export function auditAiLinks(review:unknown,facts:readonly Fact[],vacancy:string):AiLinkAudit{
 const base={version:AI_LINK_AUDIT_VERSION,semanticAssessment:'not-performed'} as const;
 try{
  if(typeof vacancy!=='string'||vacancy.length>100000)return {...base,status:'unavailable',links:[]};
  const input=factsSchema.parse(facts).map(fact=>({...fact,source:''}));
  const valid:AiReview=validateAiReview(review,input,vacancy);
  const parsedFacts=new Map(eligibleAiFacts(input).map(fact=>[fact.id,parse(fact.text)]));
  const links:AiLinkNote[]=valid.requirements.map((row,index)=>{
   if(!row.evidence_ids.length)return {index,status:'unknown',signals:['no-linked-facts']};
   const req=parse(row.quote),linked=row.evidence_ids.map(id=>parsedFacts.get(id)!);
   const signals:AiLinkSignal[]=[];
   if(req.terms.length&&req.terms.some(term=>!linked.some(fact=>fact.terms.includes(term))))signals.push('literal-gap');
   if(!req.simple)signals.push('coverage-unavailable');
   if(req.numeric){
    const relevant=linked.filter(fact=>fact.quantity?.unit===req.quantity?.unit&&[...req.words].some(word=>fact.words.has(word)));
    if(req.ambiguous||!req.quantity||relevant.length!==1||relevant[0].ambiguous||relevant[0].quantity?.bound!=='eq')signals.push('quantity-unknown');
    else if(!satisfies(relevant[0].quantity!.value,req.quantity))signals.push('quantity-difference');
   }
   if(req.levelMentioned){
    const found=linked.filter(fact=>fact.levelMentioned);
    if(req.level===null||found.length!==1||found[0].level===null)signals.push('level-unknown');
    else if(found[0].level<req.level)signals.push('level-below');
   }
   const warning=signals.some(code=>code==='literal-gap'||code==='quantity-difference'||code==='level-below');
   return {index,status:warning?'warning':signals.length?'unknown':'no-rule-warning',signals};
  });
  return {...base,status:'available',links};
 }catch{return {...base,status:'unavailable',links:[]};}
}
export function summarizeAiLinkAudit(audit:AiLinkAudit){
 if(audit.status!=='available')return {version:AI_LINK_AUDIT_VERSION,semanticAssessment:'not-performed' as const,status:'unavailable' as const,links:null,notes:null,warningLinks:null,unknownLinks:null,noRuleWarningLinks:null,signalCounts:null};
 return {version:AI_LINK_AUDIT_VERSION,semanticAssessment:'not-performed' as const,status:'available' as const,links:audit.links.length,notes:audit.links,warningLinks:audit.links.filter(row=>row.status==='warning').length,unknownLinks:audit.links.filter(row=>row.status==='unknown').length,noRuleWarningLinks:audit.links.filter(row=>row.status==='no-rule-warning').length,signalCounts:Object.fromEntries(AI_LINK_SIGNALS.map(code=>[code,audit.links.filter(row=>row.signals.includes(code)).length]))};
}
