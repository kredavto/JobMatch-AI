import {WorkspaceCommandSchema,type WorkspaceCommand} from './workspace-command';
import type {MatchMetadata} from './match-config';
import {z} from 'zod';
import {WorkspaceSchema} from './workspace-schema';
import {UserError} from './errors';
import {boundedBody} from './body';
import type {Fact} from './engine';
export type Version={id:string;created:string;text:string;vacancy:string;evidence_ids:string[];score:number;evidence_snapshot?:Fact[];profile_revision?:number;engine_version?:string;match_metadata?:MatchMetadata;restored_from?:string};
export type Application={id:string;title:string;status:string;note:string;created:string;events:{status:string;date:string}[];resumeVersionId?:string|null};
export type Workspace={ownerId?:string;revision:number;original:string;facts:Fact[];vacancy:string;versions:Version[];applications:Application[];goal:string};
export const empty=():Workspace=>({revision:0,original:'',facts:[],vacancy:'',versions:[],applications:[],goal:''});

export type Identity={id:string;token:string;email?:string};
function config(){const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new UserError('База данных не настроена',503);return {url,key};}
export async function supabase(path:string,method='GET',body?:unknown,token?:string){
 const {url,key}=config();let res:Response;
 const preAuthQuota=path==='/rest/v1/rpc/consume_auth_quota';
 const signal=AbortSignal.timeout(preAuthQuota?2000:15000);
 try{res=await fetch(url+path,{method,headers:{apikey:key,...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',...(preAuthQuota?{redirect:'error' as const}:{}),signal});}catch(e){throw new UserError(e instanceof Error&&e.name==='TimeoutError'?'Сервис не ответил вовремя. Повторите позже.':'Сервис временно недоступен. Повторите позже.',503);}
 let text:string;try{
  if(preAuthQuota){
   if(res.status!==200||res.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'){void res.body?.cancel().catch(()=>{});throw Error('Quota protocol');}
   text=new TextDecoder('utf-8',{fatal:true}).decode(await boundedBody({headers:res.headers,body:res.body,signal},128,2000));
  }else text=await res.text();
 }catch{throw new UserError('Сервис временно недоступен. Повторите позже.',503);}
 // HTTP failures take precedence over HTML/malformed bodies from a proxy.
 if(res.status===429)throw new Error('RATE');
 if(res.status>=500){
  const mailPath=path.split('?')[0];
  if(['/auth/v1/signup','/auth/v1/recover','/auth/v1/resend'].includes(mailPath))throw new UserError('Сервис регистрации или запроса писем временно недоступен. Если ошибка повторяется, администратору нужно проверить почтовый сервис и журнал авторизации.',503);
  throw new UserError('Сервис временно недоступен. Повторите позже.',503);
 }
 let data;try{data=text?JSON.parse(text):null;}catch{throw new UserError('Некорректный ответ сервиса. Повторите позже.',502);}
 const authPath=path.startsWith('/auth/v1/'),code=typeof data?.error_code==='string'?data.error_code:data?.code;
 if(!res.ok&&authPath&&res.status===400&&code==='invalid_credentials')throw new UserError('Неверная почта или пароль JobMatch AI. Если забыли пароль, воспользуйтесь восстановлением доступа.',400);
 if(!res.ok&&authPath&&(res.status===400||res.status===422)){
  const endedSession=['session_expired','session_not_found'].includes(code);
  const endedRefresh=path==='/auth/v1/token?grant_type=refresh_token'&&['refresh_token_not_found','refresh_token_already_used'].includes(code);
  if(endedSession||endedRefresh)throw new Error('AUTH');
 }

 if(!res.ok){if(data?.message==='PROJECTION_CONFLICT')throw new UserError('Проверка целостности хранилища не пройдена. Запись остановлена. Обратитесь к администратору.',503);if(data?.message==='AUTH'&&['/rest/v1/rpc/letter_signing_ready','/rest/v1/rpc/read_saved_letters','/rest/v1/rpc/read_saved_letter','/rest/v1/rpc/accept_saved_letter','/rest/v1/rpc/read_source_profile','/rest/v1/rpc/source_profile_storage_ready','/rest/v1/rpc/command_source_profile','/rest/v1/rpc/source_version_storage_ready','/rest/v1/rpc/preview_source_version','/rest/v1/rpc/save_source_version','/rest/v1/rpc/read_source_version','/rest/v1/rpc/list_source_versions','/rest/v1/rpc/clear_source_versions'].includes(path))throw new Error('AUTH');if(data?.message==='SOURCE_VERSION_UNAVAILABLE'&&path==='/rest/v1/rpc/save_source_version')throw new UserError('Сохранение структурированных версий недоступно.',503);if(data?.message==='UNSAFE_CONTEXT'&&['/rest/v1/rpc/preview_source_version','/rest/v1/rpc/save_source_version'].includes(path))throw new UserError('В исходной строке есть отрицание, план или инструкция. Проверьте контекст.',400);if(data?.message==='SOURCE_PROFILE_UNAVAILABLE'&&path==='/rest/v1/rpc/command_source_profile')throw new UserError('Сохранение структурированного профиля недоступно.',503);if(data?.message==='LETTER_UNAVAILABLE')throw new UserError('Серверное сохранение писем недоступно.',503);if(data?.message==='INVALID_WRITE')throw new UserError('Изменение не прошло проверку. Обновите данные и повторите действие.',400);if(data?.message==='CONFLICT')throw new Error('CONFLICT');if(res.status===429)throw new Error('RATE');if(res.status===401||res.status===403)throw new Error('AUTH');if(data?.error_code==='email_not_confirmed')throw new UserError('Подтвердите почту и вернитесь для входа');if(['over_email_send_rate_limit','over_request_rate_limit'].includes(code))throw new Error('RATE');if(path.includes('/auth/'))throw new UserError('Не удалось выполнить запрос авторизации. Проверьте данные и подтверждение почты.');throw new UserError('Ошибка базы данных. Повторите запрос позже.',502);}return data;
}
export async function readWorkspace(user:Identity):Promise<Workspace>{const data=await supabase('/rest/v1/rpc/read_workspace','POST',{},user.token);if(data===null)return empty();const parsed=WorkspaceSchema.safeParse(data);if(!parsed.success)throw new UserError('Некорректный ответ хранилища. Повторите позже.',502);return parsed.data;}
export async function saveWorkspace(user:Identity,state:Workspace,revision:number,action:string):Promise<Workspace>{const result=await supabase('/rest/v1/rpc/save_workspace','POST',{p_revision:revision,p_payload:state,p_action:action},user.token);return {...state,revision:result};}
export async function identity(token:string):Promise<Identity>{if(!token)throw new Error('AUTH');const u=await supabase('/auth/v1/user','GET',undefined,token);const active=await supabase('/rest/v1/rpc/session_is_active','POST',{},token);if(active!==true||!z.string().uuid().safeParse(u?.id).success)throw new Error('AUTH');return {id:u.id,email:u.email,token};}

export async function consumeQuota(user:Identity,bucket:'service'|'import'|'analysis'){const allowed=await supabase('/rest/v1/rpc/consume_quota','POST',{p_bucket:bucket},user.token);if(allowed===false)throw new Error('RATE');if(allowed!==true)throw new UserError('Некорректный ответ сервиса квот',502);}

/** Commands never send the workspace snapshot. The RPC returns its own atomic result. */
export async function applyWorkspaceCommand(user:Identity,revision:number,command:WorkspaceCommand):Promise<Workspace>{
 const parsed=WorkspaceCommandSchema.parse(command);
 const result=await supabase('/rest/v1/rpc/apply_workspace_command','POST',{p_revision:revision,p_command:parsed},user.token);
 const state=WorkspaceSchema.safeParse(result);
 if(!state.success||state.data.revision!==revision+1||(state.data.ownerId!==undefined&&state.data.ownerId!==user.id))throw new UserError('Некорректный ответ записи. Обновите данные перед повтором.',502);
 return state.data;
}
