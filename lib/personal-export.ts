import {z} from 'zod';
import {readWorkspace,supabase,type Identity} from './db';
import {AuditSchema,ConsentSchema,ExportSchema} from './export-schema';
import {UserError} from './errors';
const pageSchema=z.array(AuditSchema).max(200);
export async function personalExport(user:Identity){
 const workspace=await readWorkspace(user),cutoff=new Date().toISOString();
 const audit:z.infer<typeof AuditSchema>[]=[];let cursor='';let exhausted=false;
 // Continue until an empty page, even if the provider caps pages below our requested limit.
 for(let page=0;page<=50;page++){
  const raw=await supabase('/rest/v1/audit_log?select=id,action,created&user_id=eq.'+encodeURIComponent(user.id)+'&created=lte.'+encodeURIComponent(cutoff)+'&order=id.asc&limit=200'+(cursor?'&id=gt.'+cursor:''),'GET',undefined,user.token);
  const parsed=pageSchema.safeParse(raw);
  if(!parsed.success)throw new UserError('Некорректный ответ экспорта. Повторите скачивание.',502);
  if(!parsed.data.length){exhausted=true;break;}
  for(const row of parsed.data){
   if(row.id<=cursor||Date.parse(row.created)>Date.parse(cutoff))throw new UserError('Некорректный порядок данных экспорта. Повторите скачивание.',502);
   cursor=row.id;audit.push(row);
  }
  if(audit.length>10000)break;
 }
 if(!exhausted)throw new UserError('Журнал слишком велик для этого формата экспорта. Файл не создан; требуется потоковый экспорт журнала.',413);
 const consent=ConsentSchema.array().max(1).safeParse(await supabase('/rest/v1/consent_records?select=version,created&user_id=eq.'+encodeURIComponent(user.id),'GET',undefined,user.token));
 if(!consent.success)throw new UserError('Некорректный ответ экспорта. Повторите скачивание.',502);
 const latest=await readWorkspace(user);
 if(latest.revision!==workspace.revision)throw new Error('CONFLICT');
 return ExportSchema.parse({format:'jobmatch-personal-data-v1',complete:true,scope:'workspace-audit-consent',exported_at:cutoff,fact_history_export:'/api/fact-history?export=1',structured_profile_export:'/api/structured-profile?export=1',structured_version_export:'/api/structured-versions?export=1',user:{id:user.id,...(user.email?{email:user.email}:{})},workspace,audit,consent:consent.data});
}
