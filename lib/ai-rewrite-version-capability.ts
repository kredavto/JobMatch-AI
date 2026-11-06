import {UserError} from './errors';
export type RewriteCapabilityRpc=(path:string,method:string,body:unknown,token:string)=>Promise<unknown>;
const boundary=(error:unknown)=>error instanceof Error&&['AUTH','CONFLICT','RATE'].includes(error.message);
/** Independent of current model/key/flags: a history assertion is trusted only
 * behind the installed, closed native namespace boundary, not a decoded file.
 */
export async function requireRewriteHistoryReady(token:string,call:RewriteCapabilityRpc){
 let ready:unknown;try{ready=await call('/rest/v1/rpc/rewrite_history_ready','POST',{},token);}catch(error){if(boundary(error))throw error;throw new UserError('История недоступна.',503,'AI_REWRITE_HISTORY_UNAVAILABLE');}
 if(typeof ready!=='boolean')throw new UserError('Ответ готовности истории некорректен.',502,'AI_REWRITE_STORAGE_CONFIG_INVALID');
 if(!ready)throw new UserError('История недоступна.',503,'AI_REWRITE_HISTORY_UNAVAILABLE');
}
export async function requireRewriteStorageReady(token:string,keyId:string,configurationId:string,call:RewriteCapabilityRpc){
 await requireRewriteHistoryReady(token,call);
 let ready:unknown;try{ready=await call('/rest/v1/rpc/rewrite_storage_ready','POST',{p_key_id:keyId,p_configuration_id:configurationId},token);}catch(error){if(boundary(error))throw error;throw new UserError('Сохранение недоступно.',503,'AI_REWRITE_STORAGE_UNAVAILABLE');}
 if(typeof ready!=='boolean')throw new UserError('Ответ готовности записи некорректен.',502,'AI_REWRITE_STORAGE_CONFIG_INVALID');
 if(!ready)throw new UserError('Сохранение недоступно.',503,'AI_REWRITE_STORAGE_UNAVAILABLE');
}
