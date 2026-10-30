import {MatchMetadataSchema} from './match-config';
import {z} from 'zod';
import {FactSchema} from './engine';
import type {Workspace} from './db';
const id=z.string().min(1);
const fact=FactSchema.extend({id}).passthrough();
const status=z.enum(['Планируется','Отклик отправлен','Просмотрено','Приглашение','Отказ','Интервью','Оффер']);
const date=z.string().refine(value=>/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)===value.slice(0,10),'Invalid date');
const version=z.object({
 id,created:date,text:z.string(),vacancy:z.string(),evidence_ids:z.array(id),score:z.number().min(0).max(100),
 evidence_snapshot:z.array(fact).optional(),profile_revision:z.number().int().nonnegative().optional(),
 engine_version:z.string().optional(),template_version:z.string().optional(),match_metadata:MatchMetadataSchema.optional(),restored_from:id.optional()
}).passthrough();
const application=z.object({
 id,title:z.string(),status,note:z.string(),created:date,
 events:z.array(z.object({status,date}).passthrough()),resumeVersionId:id.nullable().optional()
}).passthrough();
/** Validate without defaults/coercion: malformed reads must never become writable empty profiles.
 * Unknown fields survive the compatibility snapshot round trip. This is not a write authorization gate.
 */
export const WorkspaceSchema:z.ZodType<Workspace>=z.object({
 ownerId:z.uuid().optional(),revision:z.number().int().nonnegative(),original:z.string(),facts:z.array(fact),
 vacancy:z.string(),goal:z.string(),versions:z.array(version),applications:z.array(application)
}).passthrough().superRefine((workspace,ctx)=>{
 for(const field of ['facts','versions','applications'] as const){
  const ids=workspace[field].map(row=>row.id);
  if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',path:[field],message:'Duplicate IDs'});
 }
});
