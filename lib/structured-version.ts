import {z} from 'zod';
import {PROFILE_FIELDS,StructuredProfileSchema,type StructuredProfile} from './structured-profile';
export const TEMPLATE_VERSION='structured-literal-v1';
export const CONTEXT_GUARD_VERSION='line-risk-v1';
// Frozen template labels: changing them requires a new template version.
const kinds={employment:'Работа',education:'Образование',certification:'Сертификат',achievement:'Достижение'};
const labels={title:'Название',organization:'Организация',start:'Начало / дата выдачи',end:'Окончание',description:'Описание',credential:'Номер сертификата'};
const risk=/(^|[^\p{L}])(не|нет|без|никогда|изучаю|планирую|хочу|буду|собираюсь|no|not|never|cannot|can.t|don.t|doesn.t|didn.t|haven.t|hasn.t|wasn.t|weren.t|without|learning|studying|planning)([^\p{L}]|$)|ignore|system prompt|игнорир|инструкци|<script|plan to|want to learn|will learn/iu;
export function contextIssue(profile:StructuredProfile,entry:StructuredProfile['entries'][number]){
 const source=Array.from(profile.source_original);
 for(const field of Object.values(entry.fields)){
  const before=source.slice(0,field.start).join(''),after=source.slice(field.end).join('');
  const context=before.slice(before.lastIndexOf('\n')+1)+field.quote+after.split('\n')[0];
  if(risk.test(context))return 'В исходной строке есть отрицание, план или инструкция. Дословный шаблон не может безопасно перенести этот фрагмент.';
 }
 return null;
}
export function renderStructuredVersion(snapshot:StructuredProfile){
 return 'Структурированные сведения\n\n'+snapshot.entries.map(entry=>kinds[entry.kind]+'\n'+PROFILE_FIELDS.filter(name=>entry.fields[name]).map(name=>labels[name]+': '+entry.fields[name]!.quote).join('\n')).join('\n\n');
}
const snapshotSchema=StructuredProfileSchema.superRefine((profile,ctx)=>{
 if(!profile.source_matches||profile.revision<1||!profile.source_original.trim()||profile.source_original.includes('\0')||!profile.source_fact_ids.length||!profile.entries.length||profile.entries.some(entry=>!entry.confirmed||contextIssue(profile,entry)))ctx.addIssue({code:'custom',message:'Источник или подтверждение не допускает дословную версию'});
});
const hashSchema=z.string().regex(/^[0-9a-f]{64}$/);
const previewFields={template_version:z.literal(TEMPLATE_VERSION),context_guard_version:z.literal(CONTEXT_GUARD_VERSION),generator:z.literal('literal-template'),model_version:z.null(),snapshot:snapshotSchema,text:z.string().max(200000),preview_hash:hashSchema};
export const StructuredPreviewSchema=z.object(previewFields).strict().superRefine((value,ctx)=>{if(value.text!==renderStructuredVersion(value.snapshot))ctx.addIssue({code:'custom',message:'Текст не соответствует снимку'});});
export const StructuredVersionSchema=z.object({...previewFields,format:z.literal('jobmatch-structured-version-v1'),id:z.uuid(),created:z.iso.datetime({offset:true})}).strict().superRefine((value,ctx)=>{if(value.text!==renderStructuredVersion(value.snapshot))ctx.addIssue({code:'custom',message:'Текст не соответствует снимку'});});
export type StructuredPreview=z.infer<typeof StructuredPreviewSchema>;
export type StructuredVersion=z.infer<typeof StructuredVersionSchema>;
export const EntryIdsSchema=z.array(z.uuid()).min(1).max(50).refine(ids=>new Set(ids).size===ids.length);
export const VersionRequestSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('preview'),expectedOwnerId:z.uuid(),workspaceRevision:z.number().int().nonnegative(),profileRevision:z.number().int().positive(),entryIds:EntryIdsSchema}).strict(),
 z.object({action:z.literal('save'),expectedOwnerId:z.uuid(),workspaceRevision:z.number().int().nonnegative(),profileRevision:z.number().int().positive(),entryIds:EntryIdsSchema,previewHash:hashSchema,accept:z.literal('SAVE_LITERAL_VERSION')}).strict()
]);
export const VersionListSchema=z.object({format:z.literal('jobmatch-structured-version-list-v1'),ownerId:z.uuid(),versions:z.array(z.object({id:z.uuid(),created:z.iso.datetime({offset:true}),template_version:z.literal(TEMPLATE_VERSION),profile_revision:z.number().int().positive(),workspace_revision:z.number().int().nonnegative(),text_length:z.number().int().positive().max(200000),preview_hash:hashSchema}).strict()).max(20)}).strict().refine(value=>new Set(value.versions.map(row=>row.id)).size===value.versions.length);
export type VersionList=z.infer<typeof VersionListSchema>;
/** NUL framing, fixed field order, Unicode UTF-8. No JSON object-key ordering dependency. */
export async function structuredPreviewHash(value:Omit<StructuredPreview,'preview_hash'>){
 const s=value.snapshot;
 const parts=[value.template_version,value.context_guard_version,value.generator,'null',s.format,s.ownerId,String(s.revision),String(s.workspace_revision),String(s.source_workspace_revision),String(s.source_fact_ids.length),...s.source_fact_ids,s.source_original,'true',value.text];
 for(const entry of s.entries){parts.push(entry.id,entry.kind,entry.created,'true');for(const name of PROFILE_FIELDS){const field=entry.fields[name];parts.push(name,field?String(field.start):'',field?String(field.end):'',field?.quote??'');}}
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(parts.join('\0')));
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function validateStructuredPreview(value:unknown,ownerId:string,workspaceRevision?:number,profileRevision?:number,entryIds?:string[]){
 const result=StructuredPreviewSchema.parse(value);const s=result.snapshot;
 if(s.ownerId!==ownerId||(workspaceRevision!==undefined&&s.workspace_revision!==workspaceRevision)||(profileRevision!==undefined&&s.revision!==profileRevision)||(entryIds&&(entryIds.length!==s.entries.length||s.entries.some(entry=>!entryIds.includes(entry.id))))||await structuredPreviewHash(result)!==result.preview_hash)throw Error('Происхождение или текст версии не прошли проверку');
 return result;
}
export async function validateStructuredVersion(value:unknown,ownerId:string){
 const result=StructuredVersionSchema.parse(value);
 await validateStructuredPreview(Object.fromEntries(Object.entries(result).filter(([name])=>!['format','id','created'].includes(name))),ownerId);
 return result;
}
