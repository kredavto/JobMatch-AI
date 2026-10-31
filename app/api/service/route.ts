import {observeRoute} from '../../../lib/ops-telemetry';
import {consumeAuthQuota,localAuthKey} from '../../../lib/auth-quota';
import {WorkspaceCommandSchema} from '../../../lib/workspace-command';
import {validateEnglishVersionResult} from '../../../lib/ordinary-version-result';
import {ORDINARY_ENGLISH_TEMPLATE} from '../../../lib/ordinary-template';
import {prepareVersionCommand} from '../../../lib/version-command';
import {parseProviderAuth} from '../../../lib/auth-contract';
import {personalExport} from '../../../lib/personal-export';
import {boundedBody} from '../../../lib/body';import {UserError} from '../../../lib/errors';
import {NextRequest,NextResponse} from 'next/server';import {z} from 'zod';
import {supabase,readWorkspace,consumeQuota,identity,applyWorkspaceCommand} from '../../../lib/db';
import {parseVacancy,match,propose,DEMO_RESUME,DEMO_VACANCIES} from '../../../lib/engine';import {sameOrigin,userOf,rateLimit,failure} from '../../../lib/http';
export const runtime='nodejs';export const dynamic='force-dynamic';
const ok=(data:unknown)=>NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
async function get(req:NextRequest){try{const user=await userOf(req);await consumeQuota(user,'service');return ok({...await readWorkspace(user),ownerId:user.id});}catch(e){return failure(e);}}
async function post(req:NextRequest){try{sameOrigin(req);rateLimit('global',2000);const raw=new TextDecoder().decode(await boundedBody(req,300000));const b=JSON.parse(raw);const action=z.string().parse(b.action);
 if(['login','register','refresh'].includes(action)){rateLimit('auth',60);let data;
 if(action==='refresh'){const refresh=req.cookies.get('jm_refresh')?.value;if(!refresh)throw new Error('AUTH');await consumeAuthQuota('refresh',refresh);data=await supabase('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:refresh});}
 else {const {email,password}=z.object({email:z.email().max(200).transform(v=>v.toLowerCase()),password:z.string().min(12).max(128)}).parse(b);rateLimit('email:'+localAuthKey(email),10);if(action==='register'&&b.consent!==true)throw new UserError('Необходимо согласие на обработку данных',400,'CONSENT_REQUIRED');await consumeAuthQuota('credentials',email);if(action==='register')await consumeAuthQuota('mail',email);data=await supabase(action==='register'?'/auth/v1/signup':'/auth/v1/token?grant_type=password','POST',{email,password,...(action==='register'?{data:{consent_version:'privacy-v1',consent_at:new Date().toISOString()}}:{})});}
 let auth;try{auth=parseProviderAuth(data,action as 'login'|'register'|'refresh');}catch{throw new UserError('Некорректный ответ сервиса авторизации. Повторите попытку.',502,'AUTH_RESPONSE_INVALID');}if(auth.kind==='confirmation')return ok({confirmationRequired:true});if(b.expectedOwnerId!==undefined){const expected=z.uuid().parse(b.expectedOwnerId);const authenticated=await identity(auth.access_token);if(authenticated.id!==expected)throw new UserError('Повторный вход выполнен в другой аккаунт. Используйте исходный аккаунт; черновик не перенесен.',409,'OWNER_CHANGED');}const res=ok({ok:true});const opts={httpOnly:true,secure:req.nextUrl.protocol==='https:',sameSite:'strict' as const,path:'/'};res.cookies.set('jm_access',auth.access_token,{...opts,maxAge:auth.expires_in});res.cookies.set('jm_refresh',auth.refresh_token,{...opts,maxAge:604800});return res;}
 if(action==='logout'){try{const user=await userOf(req);rateLimit(user.id);if(b.expectedOwnerId===undefined||z.uuid().parse(b.expectedOwnerId)===user.id)await supabase('/auth/v1/logout?scope=global','POST',{},user.token);}catch(e){if(!(e instanceof Error)||e.message!=='AUTH')throw e;}const res=ok({ok:true});res.cookies.delete('jm_access');res.cookies.delete('jm_refresh');return res;}
 const user=await userOf(req);rateLimit(user.id);if(b.expectedOwnerId!==undefined&&z.uuid().parse(b.expectedOwnerId)!==user.id)throw new UserError('Аккаунт изменился. Обновите данные перед записью.',409,'OWNER_CHANGED');
 if(action==='delete'){if(b.confirm!=='УДАЛИТЬ')throw new UserError('Введите УДАЛИТЬ',400,'DELETE_CONFIRMATION_REQUIRED');await supabase('/rest/v1/rpc/delete_my_account','POST',{},user.token);const res=ok({ok:true});res.cookies.delete('jm_access');res.cookies.delete('jm_refresh');return res;}
 if(action==='export'){await consumeQuota(user,'service');return ok(await personalExport(user));}
 await consumeQuota(user,action==='analyze'?'analysis':'service');const rev=z.number().int().nonnegative().parse(b.revision);
 if(action==='restore')return ok({...await applyWorkspaceCommand(user,rev,WorkspaceCommandSchema.parse({action,id:b.id})),ownerId:user.id});
 if(action==='import'||action==='demo'||action==='fact'){const command=action==='demo'?{action,text:DEMO_RESUME,vacancy:DEMO_VACANCIES[0].text}:{action,text:b.text};return ok({...await applyWorkspaceCommand(user,rev,WorkspaceCommandSchema.parse(command)),ownerId:user.id});}
 if(action==='application'){const command={action,status:b.status,note:b.note,...(b.id===undefined?{title:b.title}:{id:b.id}),...(b.resumeVersionId===undefined?{}:{resumeVersionId:b.resumeVersionId}),...(b.specialty===undefined?{}:{specialty:b.specialty})};return ok({...await applyWorkspaceCommand(user,rev,WorkspaceCommandSchema.parse(command)),ownerId:user.id});}
 if(action==='goal'||action==='vacancy'||action==='verify'){const command=action==='verify'?{action,ids:b.ids,verified:b.verified}:{action,text:b.text};return ok({...await applyWorkspaceCommand(user,rev,WorkspaceCommandSchema.parse(command)),ownerId:user.id});}
 const state=await readWorkspace(user);if(rev!==state.revision)throw new Error('CONFLICT');
 if(action==='analyze'){if(!state.original||!state.vacancy)throw new UserError('Добавьте резюме и текст вакансии',400,'PROFILE_INPUT_REQUIRED');return ok({analysis:match(state.facts,parseVacancy(state.vacancy)),edits:propose(state.facts,parseVacancy(state.vacancy))});}
 if(action==='version'){
  const command=prepareVersionCommand(state,b.ids,b.templateVersion),result=await applyWorkspaceCommand(user,rev,command);
  if(command.template_version===ORDINARY_ENGLISH_TEMPLATE){try{return ok(validateEnglishVersionResult({...result,ownerId:result.ownerId??user.id},{...state,ownerId:state.ownerId??user.id},b.ids,user.id));}catch{throw new UserError('Ответ сохранения версии не прошёл проверку. Прочитайте историю без повтора записи.',502,'WRITE_RESULT_INVALID');}}
  return ok({...result,ownerId:user.id});
 }
 throw new UserError('Неизвестная операция',400,'OPERATION_UNSUPPORTED');
 }catch(e){return failure(e);}}

export const GET=observeRoute('service','GET',get);
export const POST=observeRoute('service','POST',post);
