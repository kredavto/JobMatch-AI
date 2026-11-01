import {z} from 'zod';
import {SourceProfileSchema,type SourceProfile} from './source-profile';
export const TEMPLATE_VERSION='source-literal-ru-v1';
export const CONTEXT_GUARD_VERSION='ascii-cyrillic-line-v1';
// Frozen labels/order/lexical grammar: changes require a new template/guard version.
export const SOURCE_VERSION_FIELDS=Object.freeze(['title','organization','start','end','description','credential'] as const);
const kinds={employment:'Работа',education:'Образование',certification:'Сертификат',achievement:'Достижение'};
const labels={title:'Название',organization:'Организация',start:'Начало / дата выдачи',end:'Окончание',description:'Описание',credential:'Номер сертификата'};
// Deliberately bounded lexical guard. ASCII/Russian folding is explicit in JS/SQL;
// it is not a semantic verifier or a claim about all languages/negations.
export const foldRiskText=(value:string)=>value.replace(/[A-ZА-ЯЁ]/g,letter=>letter.toLowerCase());
const risk=/(^|[^a-zа-яё])(не|нет|без|никогда|изучаю|планирую|хочу|буду|собираюсь|no|not|never|cannot|can.t|don.t|doesn.t|didn.t|haven.t|hasn.t|wasn.t|weren.t|without|learning|studying|planning)([^a-zа-яё]|$)|ignore|system prompt|игнорир|инструкци|<script|plan to|want to learn|will learn/;
export function contextIssue(profile:SourceProfile,entry:SourceProfile['entries'][number]){
 const source=Array.from(profile.source_original);
 for(const field of Object.values(entry.fields)){
  const before=source.slice(0,field.start).join(''),after=source.slice(field.end).join('');
  const context=before.slice(before.lastIndexOf('\n')+1)+field.quote+after.split('\n')[0];
  if(risk.test(foldRiskText(context)))return 'В исходной строке есть отрицание, план или инструкция. Дословный шаблон не может безопасно перенести этот фрагмент.';
 }
 return null;
}
export function renderSourceVersion(snapshot:SourceProfile){
 return 'Структурированные сведения\n\n'+snapshot.entries.map(entry=>kinds[entry.kind]+'\n'+SOURCE_VERSION_FIELDS.filter(name=>entry.fields[name]).map(name=>labels[name]+': '+entry.fields[name]!.quote).join('\n')).join('\n\n');
}
const snapshotSchema=SourceProfileSchema.superRefine((profile,ctx)=>{
 if(!profile.source_captured||!profile.source_matches||profile.revision<1||!profile.source_original.trim()||profile.source_original.includes('\0')||!profile.source_fact_ids.length||!profile.entries.length||profile.entries.some(entry=>!entry.confirmed||contextIssue(profile,entry)))ctx.addIssue({code:'custom',message:'Источник или подтверждение не допускает дословную версию'});
});
const hashSchema=z.string().regex(/^[0-9a-f]{64}$/);
const previewFields={template_version:z.literal(TEMPLATE_VERSION),context_guard_version:z.literal(CONTEXT_GUARD_VERSION),generator:z.literal('literal-template'),model_version:z.null(),snapshot:snapshotSchema,text:z.string().refine(value=>Array.from(value).length<=200000),preview_hash:hashSchema};
export const SourcePreviewSchema=z.object(previewFields).strict().superRefine((value,ctx)=>{if(value.text!==renderSourceVersion(value.snapshot))ctx.addIssue({code:'custom',message:'Текст не соответствует снимку'});});
export const SourceVersionSchema=z.object({...previewFields,format:z.literal('jobmatch-source-version-v1'),id:z.uuid(),created:z.iso.datetime({offset:true}),source_status:z.literal('at-save-only')}).strict().superRefine((value,ctx)=>{if(value.text!==renderSourceVersion(value.snapshot))ctx.addIssue({code:'custom',message:'Текст не соответствует снимку'});});
export type SourcePreview=z.infer<typeof SourcePreviewSchema>;
export type SourceVersion=z.infer<typeof SourceVersionSchema>;
export const EntryIdsSchema=z.array(z.uuid()).min(1).max(50).refine(ids=>new Set(ids).size===ids.length);
export const VersionRequestSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('preview'),expectedOwnerId:z.uuid(),workspaceRevision:z.number().int().min(0).max(2147483647),profileRevision:z.number().int().min(1).max(2147483647),entryIds:EntryIdsSchema}).strict(),
 z.object({action:z.literal('save'),expectedOwnerId:z.uuid(),workspaceRevision:z.number().int().min(0).max(2147483647),profileRevision:z.number().int().min(1).max(2147483647),entryIds:EntryIdsSchema,previewHash:hashSchema,accept:z.literal('SAVE_LITERAL_SOURCE_VERSION'),consentToStore:z.literal(true)}).strict()
]);
export const VersionListSchema=z.object({format:z.literal('jobmatch-source-version-list-v1'),ownerId:z.uuid(),collection_hash:hashSchema,versions:z.array(z.object({id:z.uuid(),created:z.iso.datetime({offset:true}),template_version:z.literal(TEMPLATE_VERSION),profile_revision:z.number().int().positive(),workspace_revision:z.number().int().nonnegative(),text_length:z.number().int().positive().max(200000),preview_hash:hashSchema}).strict()).max(20)}).strict().refine(value=>new Set(value.versions.map(row=>row.id)).size===value.versions.length);
export type VersionList=z.infer<typeof VersionListSchema>;
/** NUL framing, fixed field order, Unicode UTF-8. No JSON object-key ordering dependency. */
export async function sourcePreviewHash(value:Omit<SourcePreview,'preview_hash'>){
 const s=value.snapshot;
 const parts=[value.template_version,value.context_guard_version,value.generator,'null',s.format,s.ownerId,String(s.revision),String(s.workspace_revision),String(s.source_workspace_revision),String(s.source_fact_ids.length),...s.source_fact_ids,s.source_original,'true','true',s.sourceVerification,s.semanticAssessment,'null',value.text];
 for(const entry of s.entries){parts.push(entry.id,entry.kind,entry.created,'true');for(const name of SOURCE_VERSION_FIELDS){const field=entry.fields[name];parts.push(name,field?String(field.start):'',field?String(field.end):'',field?.quote??'');}}
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(parts.join('\0')));
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function validateSourcePreview(value:unknown,ownerId:string,workspaceRevision?:number,profileRevision?:number,entryIds?:string[]){
 const result=SourcePreviewSchema.parse(value);const s=result.snapshot;
 if(s.ownerId!==ownerId||(workspaceRevision!==undefined&&s.workspace_revision!==workspaceRevision)||(profileRevision!==undefined&&s.revision!==profileRevision)||(entryIds&&(entryIds.length!==s.entries.length||s.entries.some(entry=>!entryIds.includes(entry.id))))||await sourcePreviewHash(result)!==result.preview_hash)throw Error('Происхождение или текст версии не прошли проверку');
 return result;
}
export async function validateSourceVersion(value:unknown,ownerId:string){
 const result=SourceVersionSchema.parse(value);
 await validateSourcePreview(Object.fromEntries(Object.entries(result).filter(([name])=>!['format','id','created','source_status'].includes(name))),ownerId);
 return result;
}

export async function sourceCollectionHash(value:Pick<VersionList,'ownerId'|'versions'>){
 const parts=['jobmatch-source-version-collection-v1',value.ownerId,String(value.versions.length)];
 for(const row of value.versions)parts.push(row.id,row.created,row.template_version,String(row.profile_revision),String(row.workspace_revision),String(row.text_length),row.preview_hash);
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(parts.join('\0')));
 return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function validateSourceVersionList(value:unknown,ownerId:string){
 const result=VersionListSchema.parse(value);
 if(result.ownerId!==ownerId||await sourceCollectionHash(result)!==result.collection_hash)throw Error('SOURCE_VERSION_LIST');
 return result;
}
export const ClearVersionsSchema=z.strictObject({action:z.literal('clear'),expectedOwnerId:z.uuid(),collectionHash:hashSchema,accept:z.literal('DELETE_LITERAL_SOURCE_VERSIONS')});
