import {z} from 'zod';
import {WorkspaceSchema} from './workspace-schema';
import {UserError} from './errors';
import type {Fact} from './engine';
export type Version={id:string;created:string;text:string;vacancy:string;evidence_ids:string[];score:number;evidence_snapshot?:Fact[];profile_revision?:number;engine_version?:string;restored_from?:string};
export type Application={id:string;title:string;status:string;note:string;created:string;events:{status:string;date:string}[];resumeVersionId?:string|null};
export type Workspace={ownerId?:string;revision:number;original:string;facts:Fact[];vacancy:string;versions:Version[];applications:Application[];goal:string};
export const empty=():Workspace=>({revision:0,original:'',facts:[],vacancy:'',versions:[],applications:[],goal:''});

export type Identity={id:string;token:string;email?:string};
function config(){const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new UserError('База данных не настроена',503);return {url,key};}
export async function supabase(path:string,method='GET',body?:unknown,token?:string){
 const {url,key}=config();let res:Response;
 try{res=await fetch(url+path,{method,headers:{apikey:key,...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});}catch(e){throw new UserError(e instanceof Error&&e.name==='TimeoutError'?'Сервис не ответил вовремя. Повторите позже.':'Сервис временно недоступен. Повторите позже.',503);}
 const text=await res.text();let data;try{data=text?JSON.parse(text):null;}catch{throw new UserError('Некорректный ответ сервиса. Повторите позже.',502);}
 if(!res.ok){if(data?.message==='INVALID_WRITE')throw new UserError('Изменение не прошло проверку. Обновите данные и повторите действие.',400);if(data?.message==='CONFLICT')throw new Error('CONFLICT');if(res.status===429)throw new Error('RATE');if(res.status===401||res.status===403)throw new Error('AUTH');if(data?.error_code==='email_not_confirmed')throw new UserError('Подтвердите почту и вернитесь для входа');if(data?.error_code==='over_email_send_rate_limit')throw new Error('RATE');if(path.includes('/auth/'))throw new UserError('Не удалось войти или зарегистрироваться. Проверьте данные и подтверждение почты. Для публичной регистрации администратору нужен SMTP.');throw new UserError('Ошибка базы данных. Повторите запрос позже.',502);}return data;
}
export async function readWorkspace(user:Identity):Promise<Workspace>{const data=await supabase('/rest/v1/rpc/read_workspace','POST',{},user.token);if(data===null)return empty();const parsed=WorkspaceSchema.safeParse(data);if(!parsed.success)throw new UserError('Некорректный ответ хранилища. Повторите позже.',502);return parsed.data;}
export async function saveWorkspace(user:Identity,state:Workspace,revision:number,action:string):Promise<Workspace>{const result=await supabase('/rest/v1/rpc/save_workspace','POST',{p_revision:revision,p_payload:state,p_action:action},user.token);return {...state,revision:result};}
export async function identity(token:string):Promise<Identity>{if(!token)throw new Error('AUTH');const u=await supabase('/auth/v1/user','GET',undefined,token);const active=await supabase('/rest/v1/rpc/session_is_active','POST',{},token);if(active!==true||!z.string().uuid().safeParse(u?.id).success)throw new Error('AUTH');return {id:u.id,email:u.email,token};}

export async function consumeQuota(user:Identity,bucket:'service'|'import'|'analysis'){const allowed=await supabase('/rest/v1/rpc/consume_quota','POST',{p_bucket:bucket},user.token);if(allowed===false)throw new Error('RATE');if(allowed!==true)throw new UserError('Некорректный ответ сервиса квот',502);}
