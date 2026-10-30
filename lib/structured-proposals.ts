import {StructuredCommandSchema,type ProfileFields,type SourceField} from './structured-profile';
import {evidenceIssue} from './evidence-review';
export const STRUCTURED_PROPOSAL_VERSION='labelled-source-v1';
export const MAX_STRUCTURED_PROPOSALS=20;
export type ProposalWarning='date-uninterpreted'|'date-order';
export type StructuredProposal={kind:'employment'|'education'|'certification'|'achievement';fields:ProfileFields;warnings:ProposalWarning[]};
export type StructuredProposals={version:typeof STRUCTURED_PROPOSAL_VERSION;status:'available'|'unavailable';candidates:StructuredProposal[];rejectedBlocks:number;outsideLines:number;limitReached:boolean};
const headings=new Map<string,StructuredProposal['kind']>([
 ['employment','employment'],['work experience','employment'],['опыт работы','employment'],
 ['education','education'],['образование','education'],
 ['certification','certification'],['certifications','certification'],['сертификаты','certification'],['сертификат','certification'],
 ['achievement','achievement'],['achievements','achievement'],['достижения','achievement'],['достижение','achievement']
]);
const labels=new Map<string,keyof ProfileFields>([
 ['title','title'],['position','title'],['program','title'],['название','title'],['должность','title'],['программа','title'],
 ['organization','organization'],['company','organization'],['institution','organization'],['организация','organization'],['компания','organization'],['учебное заведение','organization'],
 ['start','start'],['start date','start'],['issue date','start'],['начало','start'],['дата выдачи','start'],
 ['end','end'],['end date','end'],['окончание','end'],
 ['description','description'],['achievement','description'],['описание','description'],['достижение','description'],
 ['credential','credential'],['certificate number','credential'],['номер сертификата','credential']
]);
const normalized=(text:string)=>text.trim().toLowerCase().replace(/ё/g,'е');
function literalDate(text:string):number[]|null{
 const match=/^([0-9]{4})(?:-([0-9]{2})(?:-([0-9]{2}))?)?$/.exec(text);
 if(!match)return null;
 const year=Number(match[1]),month=match[2]===undefined?undefined:Number(match[2]),day=match[3]===undefined?undefined:Number(match[3]);
 if(year===0||month!==undefined&&(month<1||month>12))return null;
 if(day!==undefined){const days=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];if(day<1||day>days[month!-1])return null;}
 return day!==undefined?[year,month!,day]:month!==undefined?[year,month]:[year];
}
function dateWarnings(fields:ProfileFields):ProposalWarning[]{
 const start=fields.start?literalDate(fields.start.quote):null,end=fields.end?literalDate(fields.end.quote):null;
 if(fields.start&&!start||fields.end&&!end||start&&end&&start.length!==end.length)return ['date-uninterpreted'];
 if(start&&end){for(let i=0;i<start.length;i++){if(start[i]<end[i])break;if(start[i]>end[i])return ['date-order'];}}
 return [];
}
/** Labelled source suggestions only. No inference, normalization, confirmation, writes or network. */
export function proposeStructuredEntries(source:unknown):StructuredProposals{
 const base={version:STRUCTURED_PROPOSAL_VERSION} as const;
 const unavailable=():StructuredProposals=>({...base,status:'unavailable',candidates:[],rejectedBlocks:0,outsideLines:0,limitReached:false});
 if(typeof source!=='string'||source.length>200000||!source.isWellFormed()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(source))return unavailable();
 if(Array.from(source).length>100000)return unavailable();
 const result:StructuredProposals={...base,status:'available',candidates:[],rejectedBlocks:0,outsideLines:0,limitReached:false};
 let kind:StructuredProposal['kind']|null=null,fields:ProfileFields={},invalid=false,seen=false,offset=0;
 function flush(){
  if(!seen)return;
  const input=StructuredCommandSchema.safeParse({action:'add',kind,fields});
  if(invalid||!input.success||input.data.action!=='add')result.rejectedBlocks++;
  else if(result.candidates.length===MAX_STRUCTURED_PROPOSALS)result.limitReached=true;
  else result.candidates.push({kind:input.data.kind,fields:input.data.fields,warnings:dateWarnings(input.data.fields)});
  fields={};invalid=false;seen=false;
 }
 const parts=source.split(/(\r\n|[\r\n\u2028\u2029])/u);
 for(let i=0;i<parts.length;i+=2){
  const raw=parts[i],lineStart=offset;offset+=Array.from(raw).length+(parts[i+1]?.length??0);
  const trimmed=raw.trim();
  if(!trimmed){flush();continue;}
  const heading=headings.get(normalized(trimmed.replace(/^#{1,3}[ \t]+/u,'').replace(/:$/u,'')));
  if(heading){flush();kind=heading;continue;}
  if(!kind){result.outsideLines++;continue;}
  seen=true;
  const colon=raw.indexOf(':'),label=colon<0?'':normalized(raw.slice(0,colon).replace(/^\s*[-*•][ \t]+/u,'')),name=labels.get(label);
  if(!name){invalid=true;flush();kind=null;continue;}
  if(Object.hasOwn(fields,name)||(name==='credential'&&kind!=='certification')){invalid=true;continue;}
  const remainder=raw.slice(colon+1),quote=remainder.trim(),start=lineStart+Array.from(raw.slice(0,colon+1+remainder.length-remainder.trimStart().length)).length;
  const value:SourceField={quote,start,end:start+Array.from(quote).length};
  if(evidenceIssue(quote)){invalid=true;continue;}
  fields[name]=value;
 }
 flush();
 return result;
}
