import {WorkspaceCommandSchema,type WorkspaceCommand} from './workspace-command';
import type {MatchMetadata} from './match-config';
import {z} from 'zod';
import {WorkspaceSchema} from './workspace-schema';
import {UserError} from './errors';
import type {Fact} from './engine';
export type Version={id:string;created:string;text:string;vacancy:string;evidence_ids:string[];score:number;evidence_snapshot?:Fact[];profile_revision?:number;engine_version?:string;match_metadata?:MatchMetadata;restored_from?:string};
export type Application={id:string;title:string;status:string;note:string;created:string;events:{status:string;date:string}[];resumeVersionId?:string|null};
export type Workspace={ownerId?:string;revision:number;original:string;facts:Fact[];vacancy:string;versions:Version[];applications:Application[];goal:string};
export const empty=():Workspace=>({revision:0,original:'',facts:[],vacancy:'',versions:[],applications:[],goal:''});

export type Identity={id:string;token:string;email?:string};
function config(){const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new UserError('База данных не настроена',503,'DB_NOT_CONFIGURED');return {url,key};}
export async function supabase(path:string,method='GET',body?:unknown,token?:string){
 const {url,key}=config();let res:Response;
 try{res=await fetch(url+path,{method,headers:{apikey:key,...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});}catch(e){throw new UserError(e instanceof Error&&e.name==='TimeoutError'?'Сервис не ответил вовремя. Повторите позже.':'Сервис временно недоступен. Повторите позже.',503,e instanceof Error&&e.name==='TimeoutError'?'UPSTREAM_TIMEOUT':'UPSTREAM_UNAVAILABLE');}
 let text:string;try{text=await res.text();}catch{throw new UserError('Сервис временно недоступен. Повторите позже.',503,'UPSTREAM_UNAVAILABLE');}
 // HTTP failures take precedence over HTML/malformed bodies from a proxy.
 if(res.status===429)throw new Error('RATE');
 if(res.status>=500)throw new UserError('Сервис временно недоступен. Повторите позже.',503,'UPSTREAM_UNAVAILABLE');
 let data;try{data=text?JSON.parse(text):null;}catch{throw new UserError('Некорректный ответ сервиса. Повторите позже.',502,'UPSTREAM_INVALID_RESPONSE');}
 const authPath=path.startsWith('/auth/v1/'),code=typeof data?.error_code==='string'?data.error_code:data?.code;
 if(!res.ok&&authPath&&(res.status===400||res.status===422)){
  const endedSession=['session_expired','session_not_found'].includes(code);
  const endedRefresh=path==='/auth/v1/token?grant_type=refresh_token'&&['refresh_token_not_found','refresh_token_already_used'].includes(code);
  if(endedSession||endedRefresh)throw new Error('AUTH');
 }

 if(!res.ok){if(data?.message==='PROJECTION_CONFLICT')throw new UserError('Проверка целостности хранилища не пройдена. Запись остановлена. Обратитесь к администратору.',503,'STORAGE_INTEGRITY');if(data?.message==='UNSAFE_CONTEXT')throw new UserError('Исходная строка содержит отрицание, план или инструкцию. Проверьте контекст; дословная версия остановлена.',400,'UNSAFE_SOURCE_CONTEXT');if(data?.message==='INVALID_WRITE')throw new UserError('Изменение не прошло проверку. Обновите данные и повторите действие.',400,'WRITE_REJECTED');if(data?.message==='CONFLICT')throw new Error('CONFLICT');if(res.status===429)throw new Error('RATE');if(res.status===401||res.status===403)throw new Error('AUTH');if(data?.error_code==='email_not_confirmed')throw new UserError('Подтвердите почту и вернитесь для входа',400,'EMAIL_CONFIRMATION_REQUIRED');if(data?.error_code==='over_email_send_rate_limit')throw new Error('RATE');if(path.includes('/auth/'))throw new UserError('Не удалось войти или зарегистрироваться. Проверьте данные и подтверждение почты. Для публичной регистрации администратору нужен SMTP.',400,'AUTH_REJECTED');throw new UserError('Ошибка базы данных. Повторите запрос позже.',502,'DATABASE_REQUEST_FAILED');}return data;
}
export async function readWorkspace(user:Identity):Promise<Workspace>{const data=await supabase('/rest/v1/rpc/read_workspace','POST',{},user.token);if(data===null)return empty();const parsed=WorkspaceSchema.safeParse(data);if(!parsed.success)throw new UserError('Некорректный ответ хранилища. Повторите позже.',502,'WORKSPACE_INVALID_RESPONSE');return parsed.data;}
export async function saveWorkspace(user:Identity,state:Workspace,revision:number,action:string):Promise<Workspace>{const result=await supabase('/rest/v1/rpc/save_workspace','POST',{p_revision:revision,p_payload:state,p_action:action},user.token);return {...state,revision:result};}
export async function identity(token:string):Promise<Identity>{if(!token)throw new Error('AUTH');const u=await supabase('/auth/v1/user','GET',undefined,token);const active=await supabase('/rest/v1/rpc/session_is_active','POST',{},token);if(active!==true||!z.string().uuid().safeParse(u?.id).success)throw new Error('AUTH');return {id:u.id,email:u.email,token};}

export async function consumeQuota(user:Identity,bucket:'service'|'import'|'analysis'){const allowed=await supabase('/rest/v1/rpc/consume_quota','POST',{p_bucket:bucket},user.token);if(allowed===false)throw new Error('RATE');if(allowed!==true)throw new UserError('Некорректный ответ сервиса квот',502,'QUOTA_INVALID_RESPONSE');}

/** Commands never send the workspace snapshot. The RPC returns its own atomic result. */
export async function applyWorkspaceCommand(user:Identity,revision:number,command:WorkspaceCommand):Promise<Workspace>{
 const parsed=WorkspaceCommandSchema.parse(command);
 const result=await supabase('/rest/v1/rpc/apply_workspace_command','POST',{p_revision:revision,p_command:parsed},user.token);
 const state=WorkspaceSchema.safeParse(result);
 if(!state.success||state.data.revision!==revision+1||(state.data.ownerId!==undefined&&state.data.ownerId!==user.id))throw new UserError('Некорректный ответ записи. Обновите данные перед повтором.',502,'WRITE_RESULT_INVALID');
 return state.data;
}
