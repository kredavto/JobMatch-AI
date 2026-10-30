import {z} from 'zod';
import {AiReviewSchema,AI_MAX_REQUIREMENTS} from './ai-review';
import {evidenceIssue} from './evidence-review';
import {UserError} from './errors';
export const SOURCE_QUOTE_CONTRACT='source-lines-v1';
export type AiQuoteContract='legacy'|typeof SOURCE_QUOTE_CONTRACT;
export const SOURCE_QUOTE_LIMITS={inputBytes:48000,lines:100,lineUnits:2000,requestBytes:64000} as const;
export function configuredAiQuoteContract():AiQuoteContract{
 const value=process.env.JOBMATCH_AI_QUOTE_CONTRACT;
 if(value===undefined||value===''||value==='legacy')return 'legacy';
 if(value===SOURCE_QUOTE_CONTRACT)return value;
 throw new UserError('AI-сервис не настроен.',503,'AI_NOT_CONFIGURED');
}
function limit():never{throw new UserError('Для AI-разбора сократите число или длину строк требований и объём профиля.',413,'AI_SOURCE_QUOTES_LIMIT');}
function unavailable():never{throw new UserError('В вакансии нет подходящих отдельных строк для дословного AI-разбора. Проверьте текст требований.',422,'AI_SOURCE_QUOTES_UNAVAILABLE');}
function wellFormed(value:string){
 for(let i=0;i<value.length;i++){const code=value.charCodeAt(i);if(code>=0xd800&&code<=0xdbff){const next=value.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))return false;}else if(code>=0xdc00&&code<=0xdfff)return false;}
 return true;
}
export type SourceQuoteSpan={start:number;end:number};
export type SourceQuoteCandidate={quote:string;spans:SourceQuoteSpan[]};
/** Unicode codepoint spans, exact raw-source substrings. No normalization, truncation or gold labels. */
export function sourceQuoteContract(vacancy:string){
 if(typeof vacancy!=='string')unavailable();
 if(vacancy.length>SOURCE_QUOTE_LIMITS.inputBytes)limit();
 if(!wellFormed(vacancy)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(vacancy))unavailable();
 if(new TextEncoder().encode(vacancy).byteLength>SOURCE_QUOTE_LIMITS.inputBytes)limit();
 const chars=Array.from(vacancy),candidates:SourceQuoteCandidate[]=[],byQuote=new Map<string,SourceQuoteCandidate>();
 let start=0,nonemptyLines=0,omittedRiskyLines=0;
 function add(end:number){
  const raw=chars.slice(start,end).join(''),quote=raw.trim();
  if(!quote)return;
  if(++nonemptyLines>SOURCE_QUOTE_LIMITS.lines||quote.length>SOURCE_QUOTE_LIMITS.lineUnits)limit();
  if(evidenceIssue(quote)){omittedRiskyLines++;return;}
  const left=Array.from(raw.slice(0,raw.length-raw.trimStart().length)).length,begin=start+left,finish=begin+Array.from(quote).length;
  if(chars.slice(begin,finish).join('')!==quote)unavailable();
  const span={start:begin,end:finish},found=byQuote.get(quote);
  if(found)found.spans.push(span);else{const candidate={quote,spans:[span]};byQuote.set(quote,candidate);candidates.push(candidate);}
 }
 for(let i=0;i<=chars.length;i++){
  if(i===chars.length||['\n','\r','\u2028','\u2029'].includes(chars[i])){add(i);if(chars[i]==='\r'&&chars[i+1]==='\n')i++;start=i+1;}
 }
 if(!candidates.length)unavailable();
 const entry=AiReviewSchema.shape.requirements.element;
 const quotedEntry=entry.extend({quote:z.enum(candidates.map(row=>row.quote))}).strict();
 const format=z.toJSONSchema(AiReviewSchema.extend({requirements:z.array(quotedEntry).max(AI_MAX_REQUIREMENTS)}));
 return {version:SOURCE_QUOTE_CONTRACT,candidates,nonemptyLines,omittedRiskyLines,sourceCodepoints:chars.length,format};
}
