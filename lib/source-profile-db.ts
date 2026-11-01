import {supabase,type Identity,readWorkspace} from './db';
import {UserError} from './errors';
import {validateSourceProfile,validateSourceWriteAck,storesSource,type SourceCommand,type SourceContext} from './source-profile';
export async function readSourceProfile(user:Identity){
 const value=await supabase('/rest/v1/rpc/read_source_profile','POST',{},user.token);
 try{return validateSourceProfile(value,user.id);}catch{throw new UserError('Структурированный профиль не прошёл проверку.',502);}
}
export async function sourceStorageAvailable(user:Identity){
 const value=await supabase('/rest/v1/rpc/source_profile_storage_ready','POST',{},user.token);
 if(typeof value!=='boolean')throw new UserError('Настройка профиля не прошла проверку.',502);
 return process.env.JOBMATCH_SOURCE_PROFILE_ENABLED==='true'&&value;
}
export async function commandSourceProfile(user:Identity,workspaceRevision:number,profileRevision:number,command:SourceCommand){
 if(storesSource(command)&&!await sourceStorageAvailable(user))throw new UserError('Сохранение структурированного профиля недоступно.',503);
 const [before,workspace]=await Promise.all([readSourceProfile(user),readWorkspace(user)]);
 if(before.workspace_revision!==workspaceRevision||workspace.revision!==workspaceRevision||before.revision!==profileRevision)throw Error('CONFLICT');
 const context:SourceContext={ownerId:user.id,revision:workspaceRevision,original:workspace.original,factIds:workspace.facts.map(f=>f.id)};
 try{validateSourceProfile(before,user.id,context);}catch{throw Error('CONFLICT');}
 let value:unknown;
 try{value=await supabase('/rest/v1/rpc/command_source_profile','POST',{p_workspace_revision:workspaceRevision,p_profile_revision:profileRevision,p_command:command,p_accept:storesSource(command)?'STORE_REVIEWED_SOURCE_PROFILE':'REMOVE_SOURCE_PROFILE_DATA'},user.token);}
 catch(error){if(error instanceof Error&&['AUTH','CONFLICT','RATE'].includes(error.message)||error instanceof UserError&&error.status<500)throw error;throw new UserError('Результат записи неизвестен. Перечитайте профиль перед новым действием; автоматического повтора нет.',502);}
 try{return validateSourceWriteAck(value,before,command,context);}catch{throw new UserError('Ответ записи не прошёл проверку. Перечитайте профиль перед новым действием; автоматического повтора нет.',502);}
}
