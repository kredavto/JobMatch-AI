import {z} from 'zod';
export const PROFILE_KINDS=['employment','education','certification','achievement'] as const;
export const PROFILE_FIELDS=['title','organization','start','end','description','credential'] as const;
const text=z.string().min(1).refine(value=>value.trim().length>0&&Array.from(value).length<=500);
export const SourceFieldSchema=z.object({quote:text,start:z.number().int().min(0).max(100000),end:z.number().int().min(1).max(100000)}).strict().refine(value=>value.end>value.start&&value.end-value.start===Array.from(value.quote).length);
export const ProfileFieldsSchema=z.object({title:SourceFieldSchema.optional(),organization:SourceFieldSchema.optional(),start:SourceFieldSchema.optional(),end:SourceFieldSchema.optional(),description:SourceFieldSchema.optional(),credential:SourceFieldSchema.optional()}).strict();
const entryInput=z.object({kind:z.enum(PROFILE_KINDS),fields:ProfileFieldsSchema}).strict().superRefine((value,ctx)=>{
 if(!(value.kind==='achievement'?value.fields.description:value.fields.title))ctx.addIssue({code:'custom',message:'Укажите обязательное поле из источника'});
 if(value.fields.credential&&value.kind!=='certification')ctx.addIssue({code:'custom',message:'Номер относится только к сертификату'});
});
export const StructuredEntrySchema=entryInput.safeExtend({id:z.uuid(),confirmed:z.boolean(),created:z.iso.datetime({offset:true})});
export const StructuredCommandSchema=z.discriminatedUnion('action',[
 entryInput.safeExtend({action:z.literal('add')}),
 z.object({action:z.literal('confirm'),id:z.uuid(),confirmed:z.boolean()}).strict(),
 z.object({action:z.literal('delete'),id:z.uuid()}).strict(),
 z.object({action:z.literal('reset'),confirm:z.literal('RESET_STRUCTURED_PROFILE')}).strict()
]);
export type SourceField=z.infer<typeof SourceFieldSchema>;
export type ProfileFields=z.infer<typeof ProfileFieldsSchema>;
export type StructuredCommand=z.infer<typeof StructuredCommandSchema>;
export const StructuredProfileSchema=z.object({format:z.literal('jobmatch-structured-profile-v1'),ownerId:z.uuid(),revision:z.number().int().nonnegative(),workspace_revision:z.number().int().nonnegative(),source_workspace_revision:z.number().int().nonnegative(),source_original:z.string().refine(value=>Array.from(value).length<=100000),source_fact_ids:z.array(z.string().min(1).max(100)).max(500),source_matches:z.boolean(),entries:z.array(StructuredEntrySchema).max(50)}).strict().superRefine((profile,ctx)=>{
 if(profile.source_workspace_revision>profile.workspace_revision||new Set(profile.entries.map(row=>row.id)).size!==profile.entries.length||new Set(profile.source_fact_ids).size!==profile.source_fact_ids.length)ctx.addIssue({code:'custom',message:'Некорректная структура профиля'});
 const source=Array.from(profile.source_original);
 for(const entry of profile.entries)for(const field of Object.values(entry.fields))if(source.slice(field.start,field.end).join('')!==field.quote)ctx.addIssue({code:'custom',message:'Поле не совпадает с исходным диапазоном'});
});
export type StructuredProfile=z.infer<typeof StructuredProfileSchema>;
/** Explicit code-point offsets: DOM selection offsets are UTF-16 units. */
export function sourceSelection(source:string,start:number,end:number):SourceField{
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>source.length||end<=start)throw Error('Выделите фрагмент исходного текста');
 const quote=source.slice(start,end),prefix=source.slice(0,start);
 // Never split a surrogate pair at either boundary.
 if(/[\uD800-\uDBFF]$/.test(prefix)||/^[\uDC00-\uDFFF]/.test(quote)||/[\uD800-\uDBFF]$/.test(quote))throw Error('Выделение разделяет символ');
 return SourceFieldSchema.parse({quote,start:Array.from(prefix).length,end:Array.from(prefix+quote).length});
}
export function validateStructuredProfile(value:unknown,ownerId:string,workspaceRevision?:number){
 const result=StructuredProfileSchema.parse(value);
 if(result.ownerId!==ownerId||(workspaceRevision!==undefined&&result.workspace_revision!==workspaceRevision))throw Error('Профиль относится к другому аккаунту или ревизии. Загрузите актуальные данные.');
 return result;
}
