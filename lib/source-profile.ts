import {z} from 'zod';
export const SOURCE_PROFILE_FORMAT='jobmatch-source-profile-v1';
export const PROFILE_KINDS=['employment','education','certification','achievement'] as const;
export const PROFILE_FIELDS=['title','organization','start','end','description','credential'] as const;
export const profileLabels={employment:'Работа',education:'Образование',certification:'Сертификат',achievement:'Достижение'};
export const fieldLabels={title:'Должность / программа / название',organization:'Организация',start:'Начало / дата выдачи',end:'Окончание',description:'Описание / достижение',credential:'Номер сертификата'};
const validText=(value:string)=>value.isWellFormed()&&!value.includes('\0');
const revision=z.number().int().min(0).max(2147483647);
const quote=z.string().min(1).max(1000).refine(value=>validText(value)&&!!value.trim()&&Array.from(value).length<=500);
export const SourceFieldSchema=z.strictObject({quote,start:z.number().int().min(0).max(100000),end:z.number().int().min(1).max(100000)}).refine(f=>f.end>f.start&&f.end-f.start===Array.from(f.quote).length);
export const ProfileFieldsSchema=z.strictObject({title:SourceFieldSchema.optional(),organization:SourceFieldSchema.optional(),start:SourceFieldSchema.optional(),end:SourceFieldSchema.optional(),description:SourceFieldSchema.optional(),credential:SourceFieldSchema.optional()});
const entryInput=z.strictObject({kind:z.enum(PROFILE_KINDS),fields:ProfileFieldsSchema}).superRefine((value,ctx)=>{
 if(!(value.kind==='achievement'?value.fields.description:value.fields.title))ctx.addIssue({code:'custom',message:'Укажите обязательное поле из источника'});
 if(value.fields.credential&&value.kind!=='certification')ctx.addIssue({code:'custom',message:'Номер относится только к сертификату'});
});
export const SourceEntrySchema=entryInput.safeExtend({id:z.uuid(),confirmed:z.boolean(),created:z.iso.datetime({offset:true})});
export const SourceCommandSchema=z.discriminatedUnion('action',[
 entryInput.safeExtend({action:z.literal('add')}),
 z.strictObject({action:z.literal('confirm'),id:z.uuid(),confirmed:z.boolean()}),
 z.strictObject({action:z.literal('delete'),id:z.uuid()}),
 z.strictObject({action:z.literal('reset'),confirm:z.literal('RESET_SOURCE_PROFILE')}),
 z.strictObject({action:z.literal('clear'),confirm:z.literal('CLEAR_SOURCE_PROFILE_DATA')})
]);
const factId=z.string().min(1).max(400).refine(v=>validText(v)&&Array.from(v).length<=200);
export const SourceProfileSchema=z.strictObject({
 format:z.literal(SOURCE_PROFILE_FORMAT),ownerId:z.uuid(),revision,workspace_revision:revision,source_workspace_revision:revision,
 source_original:z.string().max(200000).refine(v=>validText(v)&&Array.from(v).length<=100000),source_fact_ids:z.array(factId).max(500),
 source_captured:z.boolean(),source_matches:z.boolean(),entries:z.array(SourceEntrySchema).max(50),
 sourceVerification:z.literal('exact-ranges-only'),semanticAssessment:z.literal('not-performed'),modelVersion:z.null()
}).superRefine((p,ctx)=>{
 if(p.source_workspace_revision>p.workspace_revision||new Set(p.entries.map(e=>e.id)).size!==p.entries.length||new Set(p.source_fact_ids).size!==p.source_fact_ids.length||
  (!p.source_captured&&(p.entries.length>0||!p.source_matches||p.source_workspace_revision!==p.workspace_revision))||
  (p.source_captured&&(p.revision===0||!p.source_original.trim()||p.source_fact_ids.length===0)))ctx.addIssue({code:'custom',message:'Некорректная структура профиля'});
 const source=Array.from(p.source_original);
 for(const entry of p.entries)for(const field of Object.values(entry.fields))if(source.slice(field.start,field.end).join('')!==field.quote)ctx.addIssue({code:'custom',message:'Поле не совпадает с исходным диапазоном'});
});
export type SourceField=z.infer<typeof SourceFieldSchema>;
export type ProfileFields=z.infer<typeof ProfileFieldsSchema>;
export type SourceCommand=z.infer<typeof SourceCommandSchema>;
export type SourceProfile=z.infer<typeof SourceProfileSchema>;
export type SourceContext={ownerId:string;revision:number;original:string;factIds:string[]};
export const storesSource=(command:SourceCommand)=>command.action==='add'||command.action==='reset'||command.action==='confirm'&&command.confirmed;
/** Exact raw source offsets in Unicode code points; never normalise the stored quote. */
export function sourceSelection(source:string,start:number,end:number):SourceField{
 if(!validText(source)||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>source.length||end<=start)throw Error('INVALID_SOURCE_SELECTION');
 const quote=source.slice(start,end),prefix=source.slice(0,start);
 if(/[\uD800-\uDBFF]$/.test(prefix)||/^[\uDC00-\uDFFF]/.test(quote)||/[\uD800-\uDBFF]$/.test(quote))throw Error('INVALID_SOURCE_SELECTION');
 return SourceFieldSchema.parse({quote,start:Array.from(prefix).length,end:Array.from(prefix+quote).length});
}
export const sourceDisplayText=(source:string)=>source.replace(/\r\n?/g,'\n');
/** Textarea values normalise CRLF and CR to LF. Map their UTF16 offsets back to raw source. */
export function sourceSelectionFromDisplay(source:string,start:number,end:number){
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start)throw Error('INVALID_SOURCE_SELECTION');
 let raw=0,display=0,rawStart=-1,rawEnd=-1;
 for(;;){if(display===start)rawStart=raw;if(display===end){rawEnd=raw;break;}if(raw===source.length)break;raw+=source[raw]==='\r'&&source[raw+1]==='\n'?2:1;display++;}
 if(rawStart<0||rawEnd<0)throw Error('INVALID_SOURCE_SELECTION');return sourceSelection(source,rawStart,rawEnd);
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function validateSourceProfile(value:unknown,ownerId:string,context?:SourceContext){
 const p=SourceProfileSchema.parse(value);if(p.ownerId!==ownerId)throw Error('SOURCE_PROFILE_OWNER');
 if(context){const matches=!p.source_captured||p.source_original===context.original&&same(p.source_fact_ids,context.factIds);
  if(context.ownerId!==ownerId||p.workspace_revision!==context.revision||p.source_matches!==matches||!p.source_captured&&(p.source_original!==context.original||!same(p.source_fact_ids,context.factIds)))throw Error('SOURCE_PROFILE_CONTEXT');}
 return p;
}
export function duplicateSourceEntry(p:SourceProfile,command:SourceCommand){return command.action==='add'&&p.entries.some(e=>e.kind===command.kind&&same(ProfileFieldsSchema.parse(e.fields),ProfileFieldsSchema.parse(command.fields)));}
/** Validate an atomic reply before committing profile state or clearing any form draft. */
export function validateSourceWriteAck(value:unknown,before:SourceProfile,command:SourceCommand,context:SourceContext){
 before=validateSourceProfile(before,context.ownerId,context);command=SourceCommandSchema.parse(command);
 const next=validateSourceProfile(value,context.ownerId,context);
 if((command.action==='add'||command.action==='confirm'&&command.confirmed)&&!before.source_matches)throw Error('SOURCE_PROFILE_ACK');
 if(before.ownerId!==context.ownerId||before.workspace_revision!==context.revision||next.revision!==before.revision+1)throw Error('SOURCE_PROFILE_ACK');
 const oldById=new Map(before.entries.map(e=>[e.id,e]));
 if(command.action==='clear'||command.action==='reset'){
  if(next.entries.length||next.source_captured!==(command.action==='reset')||next.source_workspace_revision!==context.revision||next.source_original!==context.original||!same(next.source_fact_ids,context.factIds)||!next.source_matches)throw Error('SOURCE_PROFILE_ACK');
 }else{
  if(!next.source_captured)throw Error('SOURCE_PROFILE_ACK');
  if(before.source_captured){if(next.source_workspace_revision!==before.source_workspace_revision||next.source_original!==before.source_original||!same(next.source_fact_ids,before.source_fact_ids))throw Error('SOURCE_PROFILE_ACK');}
  else if(next.source_workspace_revision!==context.revision||next.source_original!==context.original||!same(next.source_fact_ids,context.factIds))throw Error('SOURCE_PROFILE_ACK');
  if(command.action==='add'){
   const added=next.entries.filter(e=>!oldById.has(e.id));
   if(duplicateSourceEntry(before,command)||next.entries.length!==before.entries.length+1||added.length!==1||added[0].confirmed||added[0].kind!==command.kind||!same(added[0].fields,command.fields)||before.entries.some(e=>!same(e,next.entries.find(n=>n.id===e.id))))throw Error('SOURCE_PROFILE_ACK');
  }else{
   if(!oldById.has(command.id)||next.entries.length!==before.entries.length-(command.action==='delete'?1:0))throw Error('SOURCE_PROFILE_ACK');
   for(const old of before.entries){const actual=next.entries.find(e=>e.id===old.id);if(old.id===command.id&&command.action==='delete'){if(actual)throw Error('SOURCE_PROFILE_ACK');}else if(!same(actual,old.id===command.id?{...old,confirmed:command.action==='confirm'?command.confirmed:old.confirmed}:old))throw Error('SOURCE_PROFILE_ACK');}
  }
 }
 return next;
}
