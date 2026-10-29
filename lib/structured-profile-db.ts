import {supabase,type Identity} from './db';
import {StructuredCommandSchema,validateStructuredProfile,type StructuredCommand} from './structured-profile';
import {UserError} from './errors';
export async function readStructuredProfile(user:Identity){
 const data=await supabase('/rest/v1/rpc/read_structured_profile','POST',{},user.token);
 try{return validateStructuredProfile(data,user.id);}catch{throw new UserError('Структурированный профиль не прошёл проверку. Данные оставлены без изменений.',502);}
}
export async function writeStructuredProfile(user:Identity,workspaceRevision:number,profileRevision:number,command:StructuredCommand){
 const data=await supabase('/rest/v1/rpc/command_structured_profile','POST',{p_workspace_revision:workspaceRevision,p_profile_revision:profileRevision,p_command:StructuredCommandSchema.parse(command)},user.token);
 try{const profile=validateStructuredProfile(data,user.id,workspaceRevision);if(profile.revision!==profileRevision+1)throw Error();return profile;}catch{throw new UserError('Ответ записи не прошёл проверку. Загрузите актуальные данные без повтора записи.',502);}
}
