import {z} from 'zod';
import {createHash} from 'node:crypto';
import {boundedBody} from './body';
import {UserError} from './errors';
import {hhVacancyId,HHObservationSchema,HH_PREVIEW_TTL_MS} from './hh-vacancy-contract';
const unavailable=()=>new UserError('HH import unavailable',503,'HH_IMPORT_UNAVAILABLE');
const invalid=()=>new UserError('Invalid HH response',502,'HH_IMPORT_INVALID');
const named=z.object({name:z.string().max(2000)});
const Vacancy=z.object({id:z.string(),name:z.string().min(1).max(2000),description:z.string().min(1).max(200000),archived:z.boolean(),employer:named.nullish(),area:named.nullish(),key_skills:z.array(named).max(200).optional()});
/** Server-only configuration: activation attests to reviewed registration, permissions and data use. */
export function hhVacancyConfig(){
 const agent=process.env.JOBMATCH_HH_USER_AGENT,token=process.env.JOBMATCH_HH_APP_ACCESS_TOKEN;
 if(process.env.JOBMATCH_HH_VACANCY_IMPORT!=='approved'||!agent||agent.length>200||!/^\S+\/\S+ \([^\s()@]+@[^\s()@]+\)$/.test(agent)||!token||token.length>4096||!/^[\x21-\x7e]+$/.test(token))throw new UserError('HH import disabled',503,'HH_IMPORT_DISABLED');
 return {agent,token};
}
/** Plain text only; never render upstream HTML. Decode once after removing markup. */
export function vacancyPlainText(html:string){
 const entities:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',bull:'•',laquo:'«',raquo:'»',hellip:'…'};
 // A forward-only token scan avoids quadratic backtracking on malformed '<' runs.
 const chunks:string[]=[];let offset=0,ignored:string|null=null;
 for(const match of html.matchAll(/<[^<>]*>/g)){
  if(!ignored)chunks.push(html.slice(offset,match.index));
  const tag=match[0],script=tag.match(/^<(script|style)\b/i);
  if(ignored){if(new RegExp(`^</${ignored}\\s*>$`,'i').test(tag))ignored=null;}
  else if(script)ignored=script[1].toLowerCase();
  else if(/^<\/?(?:p|div|li|ul|ol|h[1-6]|br|table|thead|tbody|tfoot|tr|td|th|dl|dt|dd|section|article|blockquote|hr)\b/i.test(tag))chunks.push('\n');
  offset=match.index+tag.length;
 }
 if(!ignored)chunks.push(html.slice(offset));
 return chunks.join('').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(whole,key:string)=>{
  if(key[0]!=='#')return entities[key.toLowerCase()]??whole;
  const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);
  return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'�';
 }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
export async function importHHVacancy(input:string,signal:AbortSignal){
 let id:string;try{id=hhVacancyId(input);}catch{throw new UserError('Invalid HH link',400,'HH_IMPORT_LINK');}
 const {agent,token}=hhVacancyConfig();
 const deadline=AbortSignal.any([signal,AbortSignal.timeout(10000)]);
 try{
  // Never fetch input, alternate_url, CAPTCHA URLs or redirect Location headers.
  const response=await fetch(`https://api.hh.ru/vacancies/${id}`,{method:'GET',headers:{Accept:'application/json','HH-User-Agent':agent,Authorization:`Bearer ${token}`},redirect:'error',cache:'no-store',credentials:'omit',signal:deadline});
  if(!response.ok||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??''))void response.body?.cancel().catch(()=>{});
  if(response.status===404)throw new UserError('HH vacancy not available',404,'HH_IMPORT_NOT_FOUND');
  if(response.status===429)throw new UserError('HH rate limit',429,'HH_IMPORT_RATE');
  if(!response.ok)throw unavailable();
  if(!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??''))throw invalid();
  const bytes=await boundedBody({headers:response.headers,body:response.body,signal:deadline},256000,10000);
  const parsed=Vacancy.safeParse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
  if(!parsed.success||parsed.data.id!==id)throw invalid();
  const vacancy=parsed.data;
  // Never return archived descriptions to clients or downstream draft consumers.
  if(vacancy.archived)throw new UserError('Вакансия в архиве. Импорт недоступен; выберите актуальную вакансию.',410,'HH_IMPORT_ARCHIVED');
  const text=[vacancyPlainText(vacancy.name),vacancy.employer&&vacancyPlainText(vacancy.employer.name),vacancy.area&&vacancyPlainText(vacancy.area.name),vacancyPlainText(vacancy.description),vacancy.key_skills?.map(s=>vacancyPlainText(s.name)).join(', ')].filter(Boolean).join('\n\n');
  if(!vacancyPlainText(vacancy.description)||text.length>30000)throw invalid();
  const checkedAt=Date.now(),url=`https://hh.ru/vacancy/${id}`;
  const provenance=HHObservationSchema.parse({format:'jobmatch-hh-observation-v1',source:'hh-api',vacancyId:id,canonicalUrl:url,fetchedAt:new Date(checkedAt).toISOString(),expiresAt:new Date(checkedAt+HH_PREVIEW_TTL_MS).toISOString(),textSha256:createHash('sha256').update(text,'utf8').digest('hex'),authority:'unsigned-observation',retention:'memory-only',usage:'preview-only'});
  return {id,url,text,archived:false as const,previewOnly:true as const,provenance};
 }catch(error){if(error instanceof UserError&&error.code?.startsWith('HH_IMPORT_'))throw error;throw unavailable();}
}
