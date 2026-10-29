import {supabase,type Identity} from './db';
import {VersionRequestSchema,VersionListSchema,validateStructuredPreview,validateStructuredVersion,type VersionList,type StructuredVersion} from './structured-version';
import {UserError} from './errors';
import type {z} from 'zod';
export async function structuredVersionCommand(user:Identity,input:z.infer<typeof VersionRequestSchema>){
 const params={p_workspace_revision:input.workspaceRevision,p_profile_revision:input.profileRevision,p_entry_ids:input.entryIds};
 const data=await supabase('/rest/v1/rpc/'+(input.action==='save'?'save_structured_version':'preview_structured_version'),'POST',input.action==='save'?{...params,p_preview_hash:input.previewHash,p_accept:input.accept}:params,user.token);
 try{
  if(input.action==='preview')return await validateStructuredPreview(data,user.id,input.workspaceRevision,input.profileRevision,input.entryIds);
  const version=await validateStructuredVersion(data,user.id);
  if(version.preview_hash!==input.previewHash||version.snapshot.workspace_revision!==input.workspaceRevision||version.snapshot.revision!==input.profileRevision||version.snapshot.entries.length!==input.entryIds.length||version.snapshot.entries.some(entry=>!input.entryIds.includes(entry.id)))throw Error();
  return version;
 }catch{throw new UserError('Ответ версии не прошёл проверку. Загрузите историю и профиль без повтора записи.',502);}
}
export async function listStructuredVersions(user:Identity){
 const data=await supabase('/rest/v1/rpc/list_structured_versions','POST',{},user.token);
 try{const list=VersionListSchema.parse(data);if(list.ownerId!==user.id)throw Error();return list;}catch{throw new UserError('История версий не прошла проверку.',502);}
}
export async function readStructuredVersion(user:Identity,id:string){
 const data=await supabase('/rest/v1/rpc/read_structured_version','POST',{p_id:id},user.token);
 if(data===null)throw new UserError('Версия не найдена.',404);
 try{const version=await validateStructuredVersion(data,user.id);if(version.id!==id)throw Error();return version;}catch{throw new UserError('Происхождение версии не прошло проверку.',502);}
}
/** Fixed list, one validated record per pull. Only complete:true closes a full archive. */
export function structuredVersionStream(list:VersionList,read:(id:string)=>Promise<StructuredVersion>,limit=40*1024*1024){
 let index=0,bytes=0,cancelled=false;const encoder=new TextEncoder();
 const line=(value:unknown)=>encoder.encode(JSON.stringify(value)+'\n');
 return new ReadableStream<Uint8Array>({async pull(controller){
  if(cancelled)return;
  try{
   if(index===list.versions.length){controller.enqueue(line({complete:true,format:'jobmatch-structured-version-export-v1',ownerId:list.ownerId,versions:index}));controller.close();return;}
   const summary=list.versions[index];const version=await read(summary.id);if(cancelled)return;
   // A fixed immutable list must not silently substitute a different record.
   if(version.id!==summary.id||version.preview_hash!==summary.preview_hash||version.snapshot.ownerId!==list.ownerId)throw Error();
   const chunk=line(version);if(bytes+chunk.byteLength>limit)throw Error();bytes+=chunk.byteLength;index++;controller.enqueue(chunk);
  }catch{if(cancelled)return;controller.enqueue(line({complete:false,error:'Экспорт прерван. Файл неполный; повторите чтение истории.'}));controller.close();}
 },cancel(){cancelled=true;}});
}
