import {z} from 'zod';
import {evidenceIssue} from './evidence-review';
export const FactSchema=z.object({id:z.string(),text:z.string().min(1).max(2000),source:z.string(),verified:z.boolean()});
export type Fact=z.infer<typeof FactSchema>;
import {categories,weights,contributions,type Category} from './match-config';
export {categories,weights,type Category} from './match-config';
export type Requirement={id:string;quote:string;category:Category;must:boolean;terms:string[]};
export type Match={requirement:Requirement;status:'matched'|'partial'|'missing'|'unknown';confidence:number;evidence_ids:string[];reason:string};
export const aliases:Record<string,string[]>={sql:['sql'],crm:['crm','срм'],bitrix24:['bitrix24','битрикс24','битрикс 24'],b2b:['b2b','корпоративные продажи'],python:['python','питон'],excel:['excel','эксель'],typescript:['typescript'],react:['react'],postgresql:['postgresql','postgres'],management:['управление командой','руководство командой'],english:['английский','english'],sales:['продажи','продаж'],analytics:['аналитика','аналитики'],negotiation:['переговоры','переговоров']};
export const normalize=(s:string)=>s.toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();
function hasTerm(text:string,term:string){const n=normalize(text);return aliases[term].some(a=>new RegExp('(^|[^\\p{L}\\p{N}])'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^\\p{L}\\p{N}])','u').test(n));}
export const terms=(text:string)=>Object.keys(aliases).filter(k=>hasTerm(text,k));
const risky=(s:string)=>evidenceIssue(s)!==null;
export function parseFacts(text:string,source='Введено пользователем'):Fact[]{return text.split(/\r?\n/).map(t=>t.trim()).filter(Boolean).map((text,i)=>({id:`ev-${i+1}`,text,source,verified:false}));}
export function parseVacancy(text:string):Requirement[]{
 const seen=new Set<string>();let section:Category='context';let required=false;
 return text.split(/\r?\n/).flatMap((raw,i)=>{const quote=raw.trim();if(!quote||seen.has(normalize(quote)))return [];seen.add(normalize(quote));
 if(/^(обязательные требования|требования|must.have)[:\s]*$/i.test(quote)){section='mandatory';required=true;return [];}
 if(/^(желательно|будет плюсом|nice.to.have)[:\s]*$/i.test(quote)){section='skills';required=false;return [];}
 if(/^(задачи|обязанности)[:\s]*$/i.test(quote)){section='context';required=false;return [];}
 const must=required||/обязательно|необходимо|must.have/i.test(quote);
 const category:Category=must?'mandatory':/опыт|достиж|лет|года/i.test(quote)?'experience':terms(quote).length?'skills':section;
 return [{id:`req-${i+1}`,quote,category,must,terms:terms(quote)}];});
}
export function match(facts:Fact[],requirements:Requirement[]){
 const rows:Match[]=requirements.map(requirement=>{const valid=facts.filter(f=>f.verified&&!risky(f.text));
 const excluded=facts.filter(f=>f.verified&&risky(f.text)&&requirement.terms.some(t=>hasTerm(f.text,t)));
 if(risky(requirement.quote)||excluded.length)return {requirement,status:'unknown' as const,confidence:0,evidence_ids:[],reason:excluded.length?'Связанные подтвержденные строки содержат отрицание, намерение или инструкции. Уточните противоречие; они не доказывают навык.':'Формулировка требования нуждается в ручной проверке.'};
 const exact=valid.filter(f=>normalize(f.text)===normalize(requirement.quote));
 if(exact.length)return {requirement,status:'matched',confidence:1,evidence_ids:exact.map(f=>f.id),reason:'Дословное подтверждение всей формулировки.'};
 const supporting=valid.filter(f=>requirement.terms.some(t=>hasTerm(f.text,t)));
 const covered=requirement.terms.filter(t=>supporting.some(f=>hasTerm(f.text,t)));
 // Token overlap never proves experience duration, seniority, proficiency or a compound claim.
 const simple=requirement.terms.length===1&&aliases[requirement.terms[0]].some(a=>normalize(requirement.quote).replace(/^[-•]\s*/,'')===a);
 const unverified=facts.some(f=>!f.verified&&requirement.terms.some(t=>hasTerm(f.text,t)));
 const status:Match['status']=risky(requirement.quote)?'unknown':covered.length?(simple?'matched':'partial'):unverified||!requirement.terms.length?'unknown':'missing';
 return {requirement,status,confidence:status==='matched'?0.9:status==='partial'?0.45:0,evidence_ids:status==='unknown'?[]:supporting.map(f=>f.id),reason:status==='partial'?'Есть связанные термины; уровень, срок и полное требование не доказаны.':status==='missing'?'В подтвержденных фактах нет свидетельств. Это не доказательство отсутствия навыка.':status==='unknown'?'Нужна ручная проверка требования или подтверждение факта.':'Навык найден в подтвержденном факте.'};});
 const parts=categories.map(category=>{const subset=rows.filter(r=>r.requirement.category===category);return {category,weight:weights[category],count:subset.length,value:subset.length?subset.reduce((n,r)=>n+contributions[r.status],0)/subset.length:null};});
 const active=parts.filter(p=>p.value!==null);const denominator=active.reduce((n,p)=>n+p.weight,0);
 const score=denominator?Math.round(active.reduce((n,p)=>n+p.weight*(p.value??0),0)/denominator*100):0;
 return {score,rows,parts,blockers:rows.filter(r=>r.requirement.must&&r.status!=='matched'),coverage:requirements.length?Math.round(rows.filter(r=>r.status!=='unknown').length/requirements.length*100):0};
}
export type Edit={id:string;text:string;evidence_ids:string[];reason:string};
export function propose(facts:Fact[],requirements:Requirement[]):Edit[]{const result=match(facts,requirements);const rank=new Map<string,number>();for(const row of result.rows)for(const id of row.evidence_ids)rank.set(id,(rank.get(id)||0)+(row.requirement.must?2:1));return facts.filter(f=>f.verified&&rank.has(f.id)&&!risky(f.text)).sort((a,b)=>(rank.get(b.id)||0)-(rank.get(a.id)||0)).map(f=>({id:`edit-${f.id}`,text:f.text,evidence_ids:[f.id],reason:'Вынести подтвержденный факт в начало: он связан с требованиями вакансии.'}));}
export function gate(edit:Edit,facts:Fact[]){return edit.evidence_ids.length===1&&facts.some(f=>f.id===edit.evidence_ids[0]&&f.verified&&f.text===edit.text&&!risky(f.text));}
export function renderVersion(original:string,edits:Edit[],facts:Fact[]){if(edits.some(e=>!gate(e,facts)))throw new Error('Правка не подтверждена исходным фактом');const promoted=new Set(edits.map(e=>e.text));return edits.length?'РЕЛЕВАНТНЫЙ ОПЫТ\n'+edits.map(e=>e.text).join('\n')+'\n\nПРОФИЛЬ\n'+original.split(/\r?\n/).filter(line=>!promoted.has(line.trim())).join('\n'):original;}
export function vacancyId(input:string){if(/^\d{1,15}$/.test(input))return input;const u=new URL(input);if(u.protocol!=='https:'||u.hostname!=='hh.ru'||u.port||u.username||u.password||u.hash||!/^\/vacancy\/\d{1,15}\/?$/.test(u.pathname))throw new Error('Допустим только https://hh.ru/vacancy/ID');return u.pathname.split('/')[2];}
export const DEMO_RESUME='Мария Примерова — вымышленный профиль\nМенеджер корпоративных продаж\nООО «Демо Север», 2021–2025\nВела корпоративные продажи B2B с использованием Битрикс24.\nГотовила отчеты в Excel для команды продаж.\nПроводила переговоры с корпоративными клиентами.\nВыполнила годовой план продаж на 112% в 2024 году.\nОбразование: Демо-университет, менеджмент, 2021.';
export const DEMO_VACANCIES=[{title:'Менеджер B2B · Демо Орбита',text:'Менеджер B2B — вымышленная вакансия\nОбязательные требования:\nB2B\nБитрикс24\nExcel\nЖелательно:\nПереговоры\nЗадачи:\nВедение корпоративных клиентов'},{title:'Аналитик · Демо Вектор',text:'Аналитик — вымышленная вакансия\nОбязательные требования:\nSQL\nExcel\nЖелательно:\nPython\nЗадачи:\nАналитика продаж'},{title:'Инженер · Демо Квант',text:'Инженер — вымышленная вакансия\nОбязательные требования:\nPython\nSQL\nPostgreSQL\nОпыт разработки от 5 лет\nЖелательно:\nReact'}];
