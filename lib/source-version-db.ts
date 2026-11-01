import {observeStream} from './ops-telemetry';
import {supabase,type Identity} from './db';
import {UserError} from './errors';
import {VersionRequestSchema,VersionListSchema,validateSourcePreview,validateSourceVersion,validateSourceVersionList,type SourceVersion} from './source-version';
import type {z} from 'zod';

export async function sourceVersionStorageAvailable(user:Identity){
 if(process.env.JOBMATCH_SOURCE_VERSIONS_ENABLED!=='true'||process.env.JOBMATCH_SOURCE_PROFILE_ENABLED!=='true')return false;
 const value=await supabase('/rest/v1/rpc/source_version_storage_ready','POST',{},user.token);
 if(typeof value!=='boolean')throw new UserError('Настройка версий не прошла проверку.',502);
 return value;
}
export async function sourceVersionCommand(user:Identity,input:z.infer<typeof VersionRequestSchema>){
 if(input.action==='save'&&!await sourceVersionStorageAvailable(user))throw new UserError('Сохранение структурированных версий недоступно.',503);
 const params={p_workspace_revision:input.workspaceRevision,p_profile_revision:input.profileRevision,p_entry_ids:input.entryIds};
 let value:unknown;
 try{value=await supabase('/rest/v1/rpc/'+(input.action==='save'?'save_source_version':'preview_source_version'),'POST',input.action==='save'?{...params,p_preview_hash:input.previewHash,p_accept:input.accept}:params,user.token);}
 catch(error){
  if(input.action==='preview'||error instanceof Error&&['AUTH','CONFLICT','RATE'].includes(error.message)||error instanceof UserError&&error.status<500)throw error;
  throw new UserError('Результат сохранения неизвестен. Прочитайте историю без автоматического повтора.',502);
 }
 try{
  if(input.action==='preview')return await validateSourcePreview(value,user.id,input.workspaceRevision,input.profileRevision,input.entryIds);
  const version=await validateSourceVersion(value,user.id);
  if(version.preview_hash!==input.previewHash||version.snapshot.workspace_revision!==input.workspaceRevision||version.snapshot.revision!==input.profileRevision||version.snapshot.entries.length!==input.entryIds.length||version.snapshot.entries.some(e=>!input.entryIds.includes(e.id)))throw Error();
  return version;
 }catch{throw new UserError('Ответ версии не прошёл проверку. Прочитайте историю и профиль без повтора записи.',502);}
}
export async function listSourceVersions(user:Identity){
 const value=await supabase('/rest/v1/rpc/list_source_versions','POST',{},user.token);
 try{return await validateSourceVersionList(value,user.id);}catch{throw new UserError('История структурированных версий не прошла проверку.',502);}
}
export async function readSourceVersion(user:Identity,id:string){
 const value=await supabase('/rest/v1/rpc/read_source_version','POST',{p_id:id},user.token);
 if(value===null)throw new UserError('Версия не найдена.',404);
 try{const version=await validateSourceVersion(value,user.id);if(version.id!==id)throw Error();return version;}catch{throw new UserError('Происхождение версии не прошло проверку.',502);}
}
export async function clearSourceVersions(user:Identity,collectionHash:string){
 let value:unknown;
 try{value=await supabase('/rest/v1/rpc/clear_source_versions','POST',{p_collection_hash:collectionHash,p_accept:'DELETE_LITERAL_SOURCE_VERSIONS'},user.token);}
 catch(error){if(error instanceof Error&&['AUTH','CONFLICT','RATE'].includes(error.message)||error instanceof UserError&&error.status<500)throw error;throw new UserError('Результат удаления неизвестен. Прочитайте историю без автоматического повтора.',502);}
 try{const state=await validateSourceVersionList(value,user.id);if(state.versions.length)throw Error();return state;}catch{throw new UserError('Ответ удаления не прошёл проверку. Перечитайте историю.',502);}
}

export type SourceVersionReader=(id:string)=>Promise<unknown>;
/** Fixed immutable initial list, one verified version per pull; never client-delivery proof. */
export function sourceVersionStream(list:Awaited<ReturnType<typeof listSourceVersions>>,read:SourceVersionReader,signal?:AbortSignal,limit=64*1024*1024){
 const state=VersionListSchema.parse(list),finish=observeStream('source-versions');let index=0,bytes=0,started=false,stopped=false;const encoder=new TextEncoder();
 const line=(value:unknown)=>encoder.encode(JSON.stringify(value)+'\n');
 return new ReadableStream<Uint8Array>({async pull(controller){
  if(stopped)return;
  if(signal?.aborted){stopped=true;controller.close();finish('cancelled');return;}
  try{
   if(!started){started=true;controller.enqueue(line({format:'jobmatch-source-versions-export-v1',ownerId:state.ownerId,collectionHash:state.collection_hash,scope:'initial-version-list',exportedAt:new Date().toISOString()}));return;}
   if(index===state.versions.length){stopped=true;controller.enqueue(line({complete:true,count:index,collectionHash:state.collection_hash}));controller.close();finish('completion-enqueued');return;}
   const summary=state.versions[index],version:SourceVersion=await validateSourceVersion(await read(summary.id),state.ownerId);
   if(stopped)return;if(signal?.aborted){stopped=true;controller.close();finish('cancelled');return;}
   if(version.id!==summary.id||version.created!==summary.created||version.preview_hash!==summary.preview_hash||version.template_version!==summary.template_version||version.snapshot.revision!==summary.profile_revision||version.snapshot.workspace_revision!==summary.workspace_revision||Array.from(version.text).length!==summary.text_length)throw Error();
   const chunk=line(version);if(bytes+chunk.byteLength>limit)throw Error();bytes+=chunk.byteLength;index++;controller.enqueue(chunk);
  }catch{if(!stopped){stopped=true;controller.enqueue(line({complete:false,count:index,error:'EXPORT_INCOMPLETE'}));controller.close();finish('incomplete-enqueued');}}
 },cancel(){stopped=true;finish('cancelled');}});
}
