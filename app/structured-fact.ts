import {z} from 'zod';
/** UI-only clarification renderer. Values are user assertions, not source extraction/proof. */
const field=(max:number)=>z.string().max(max).refine(value=>!/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\uD800-\uDFFF]/u.test(value),'Invalid characters').transform(value=>value.trim()).refine(Boolean,'Required');
const month=z.string().regex(/^(19\d{2}|20\d{2}|2100)-(0[1-9]|1[0-2])$/);
export const StructuredFactSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('episode'),organization:field(120),role:field(120),from:month,to:month,continuous:z.boolean()}).strict(),
 z.object({kind:z.literal('quantity'),scope:z.enum(['personal','team','organization']),activity:field(240),count:z.string().regex(/^(0|[1-9]\d{0,8})$/),unit:field(60).refine(value=>!/%|процент|percent/i.test(value),'Counts only'),year:z.string().regex(/^(19\d{2}|20\d{2}|2100)$/)}).strict()
]);
export type StructuredFact=z.infer<typeof StructuredFactSchema>;
export type FactBasis={ownerId:string;revision:number};
export function currentMonth(){return new Date().toISOString().slice(0,7);}
export function renderStructuredFact(input:unknown,now=currentMonth()){
 month.parse(now);const value=StructuredFactSchema.parse(input);let text:string;
 if(value.kind==='episode'){
  if(value.from>value.to||value.to>now)throw Error('INVALID_PERIOD');
  text=`Эпизод моего опыта. Организация: ${value.organization}. Роль: ${value.role}. Период: ${value.from} — ${value.to}.`+(value.continuous?' Непрерывность этого эпизода заявлена мной.':'');
 }else{
  if(value.year>now.slice(0,4))throw Error('INVALID_PERIOD');
  const label={personal:'Личный количественный результат',team:'Количественный результат команды',organization:'Количественный результат организации'}[value.scope];
  text=`${label}. Действие или показатель: ${value.activity}. Количество: ${value.count}. Единица измерения: ${value.unit}. Период учёта: ${value.year}.`+(value.scope==='personal'?'':' Не использовать как личное достижение.');
 }
 if(text.length>2000)throw Error('FACT_TOO_LONG');
 return {format:'jobmatch-structured-clarification-v1' as const,text,fields:value};
}
/** The existing fact endpoint must acknowledge exactly a new unverified user clarification. */
export function addedClarification(before:{ownerId?:string;revision:number;original:string;facts:{id:string;text:string;source:string;verified:boolean}[]},after:{ownerId?:string;revision:number;original:string;facts:{id:string;text:string;source:string;verified:boolean}[]},text:string){
 const previous=new Set(before.facts.map(f=>f.id));const added=after.facts.filter(f=>!previous.has(f.id));
 return !!before.ownerId&&after.ownerId===before.ownerId&&after.revision===before.revision+1&&after.original===before.original+'\n'+text&&after.facts.length===before.facts.length+1&&before.facts.every(old=>after.facts.some(f=>f.id===old.id&&f.text===old.text&&f.source===old.source&&f.verified===old.verified))&&added.length===1&&added[0].text===text&&added[0].verified===false&&added[0].source==='Уточнение пользователя';
}
