import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {UserError} from '../lib/errors';
import {boundedBody} from '../lib/body';
import {privateHeaders} from './http';
const SESSION='__Host-jm-hh-session',STATE='__Host-jm-hh-state';
const unavailable=()=>new UserError('Подключение hh.ru ещё не настроено владельцем приложения.',503);
export function hhConfig(){
 if(process.env.JOBMATCH_HH_OAUTH_ENABLED!=='true')throw unavailable();
 const clientId=process.env.HH_CLIENT_ID,clientSecret=process.env.HH_CLIENT_SECRET,key=process.env.HH_SESSION_KEY,userAgent=process.env.HH_USER_AGENT,origin=process.env.HH_APP_ORIGIN;
 if(!clientId||!clientSecret||!key||!/^[a-f0-9]{64}$/i.test(key)||!userAgent||!origin)throw unavailable();
 const url=new URL(origin);
 if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password||/[\r\n]/.test(userAgent))throw unavailable();
 return {clientId,clientSecret,key:Buffer.from(key,'hex'),userAgent,origin,redirectUri:origin+'/api/mvp/hh/callback'};
}
export function hhConfigured(){try{hhConfig();return true;}catch{return false;}}
function seal(payload:object,kind:string){const {key,origin}=hhConfig(),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(kind+'|'+origin));const data=Buffer.concat([cipher.update(JSON.stringify(payload)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');}
function unseal(value:string,kind:string):unknown{try{if(value.length>3800)throw Error();const {key,origin}=hhConfig(),bytes=Buffer.from(value,'base64url'),decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));decipher.setAAD(Buffer.from(kind+'|'+origin));decipher.setAuthTag(bytes.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString());}catch{throw new UserError('Сессия hh.ru истекла. Войдите снова.',401);}}
function cookie(request:Request,name:string){return request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(name+'='))?.slice(name.length+1);}
function setCookie(name:string,value:string,age:number){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;}
const headers=()=>new Headers({...privateHeaders,'Referrer-Policy':'no-referrer'});
function assertOrigin(request:Request){const {origin}=hhConfig();if(request.headers.get('origin')!==origin||new URL(request.url).origin!==origin)throw new UserError('Откройте приложение и повторите действие.',403);}
const sessionSchema=z.object({token:z.string().min(1).max(1600),exp:z.number()});
function token(request:Request){const value=cookie(request,SESSION);if(!value)throw new UserError('Сначала авторизуйтесь в hh.ru.',401);const session=sessionSchema.parse(unseal(value,'session'));if(session.exp<=Date.now())throw new UserError('Сессия hh.ru истекла. Войдите снова.',401);return session.token;}
// Never forward provider text, request IDs, captcha URLs or arbitrary error values.
async function forbiddenHH(response:Response,signal:AbortSignal,path:string):Promise<UserError>{
 const operation=path==='/me'?'проверка аккаунта':path.startsWith('/resumes/mine')?'список резюме':path.startsWith('/resumes/')?'чтение резюме':path.startsWith('/vacancies/')?'чтение вакансии':'авторизация';
 let captcha=false;
 try{
  const raw:unknown=JSON.parse(new TextDecoder().decode(await boundedBody({headers:response.headers,body:response.body,signal},16000)));
  const parsed=z.object({errors:z.array(z.object({type:z.string().optional(),value:z.string().optional()})).max(20)}).safeParse(raw);
  if(parsed.success)captcha=parsed.data.errors.some(error=>error.type==='captcha_required'||error.value==='captcha_required');
 }catch{/* An unreadable or oversized error stays a generic access refusal. */}
 return new UserError(captcha
  ?'hh.ru отказал в доступе ('+operation+'): требуется CAPTCHA. Автоматические запросы остановлены; проверку нужно пройти на стороне hh.ru.'
  :'hh.ru отказал в доступе ('+operation+'). Проверьте разрешения приложения в hh.ru. Повторный вход сам по себе не подтверждает доступ.',403);
}
async function upstream(path:string,request:Request,access?:string,body?:URLSearchParams,options:{maxBytes?:number;vacancy?:boolean}={}){
 const config=hhConfig(),signal=AbortSignal.any([request.signal,AbortSignal.timeout(15000)]);
 try{
 const response=await fetch('https://api.hh.ru'+path,{method:body?'POST':'GET',redirect:'error',cache:'no-store',signal,headers:{'HH-User-Agent':config.userAgent,...(access?{Authorization:'Bearer '+access}:{}),...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:body?.toString()});
 if(!response.ok){if(options.vacancy&&response.status===404)throw new UserError('Вакансия не найдена или больше недоступна.',404);if(response.status===401)throw new UserError('Сессия hh.ru истекла или отозвана. Войдите снова.',401);if(response.status===403)throw await forbiddenHH(response,signal,path);if(response.status===429)throw new UserError('hh.ru временно ограничил запросы. Попробуйте позже.',429);throw new UserError('hh.ru временно недоступен. Попробуйте позже.',502);}
 return JSON.parse(new TextDecoder().decode(await boundedBody({headers:response.headers,body:response.body,signal},options.maxBytes??500000)));
 }catch(error){if(error instanceof UserError)throw error;throw new UserError('Не удалось получить ответ hh.ru. Повторите позже.',502);}
}
async function applicant(request:Request,access:string){const me=z.object({auth_type:z.literal('applicant')}).safeParse(await upstream('/me',request,access));if(!me.success)throw new UserError('Нужен аккаунт соискателя hh.ru.',403);}
export async function startHH(request:Request){
 assertOrigin(request);const config=hhConfig(),state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
 const url=new URL('https://hh.ru/oauth/authorize');url.search=new URLSearchParams({response_type:'code',client_id:config.clientId,redirect_uri:config.redirectUri,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
 const h=headers();h.append('Set-Cookie',setCookie(STATE,seal({state,verifier,exp:Date.now()+600000},'state'),600));
 return Response.json({url:url.href},{headers:h});
}
export async function callbackHH(request:Request){
 const config=hhConfig(),url=new URL(request.url),h=headers();h.append('Set-Cookie',setCookie(STATE,'',0));
 try{
 if(url.origin!==config.origin)throw Error();
 const raw=cookie(request,STATE);if(!raw)throw Error();
 const saved=z.object({state:z.string(),verifier:z.string(),exp:z.number()}).parse(unseal(raw,'state'));
 const state=url.searchParams.get('state')||'';
 if(saved.exp<=Date.now()||state.length!==saved.state.length||!timingSafeEqual(Buffer.from(state),Buffer.from(saved.state)))throw Error();
 if(url.searchParams.has('error'))throw Error();
 const code=url.searchParams.get('code');if(!code||code.length>2048)throw Error();
 const data=z.object({access_token:z.string().min(1).max(1600),expires_in:z.number().int().positive(),token_type:z.string()}).parse(await upstream('/token',request,undefined,new URLSearchParams({grant_type:'authorization_code',client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:config.redirectUri,code,code_verifier:saved.verifier})));
 if(data.token_type.toLowerCase()!=='bearer')throw Error();
 await applicant(request,data.access_token);
 // No refresh token retained: user reconnects after at most one hour.
 const age=Math.min(data.expires_in,3600);
 h.append('Set-Cookie',setCookie(SESSION,seal({token:data.access_token,exp:Date.now()+age*1000},'session'),age));h.set('Location',config.origin+'/?hh=connected');
 }catch{h.set('Location',config.origin+'/?hh=failed');}
 return new Response(null,{status:303,headers:h});
}
export async function hhSession(request:Request){
 if(!hhConfigured())return {configured:false,authenticated:false};
 if(!cookie(request,SESSION))return {configured:true,authenticated:false};
 try{await applicant(request,token(request));return {configured:true,authenticated:true};}catch(error){if(error instanceof UserError&&error.status===401)return {configured:true,authenticated:false};throw error;}
}
const idSchema=z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const itemSchema=z.object({id:idSchema,title:z.string().nullish(),updated_at:z.string().optional()});
async function ownResumes(request:Request,access:string){
 const result:{id:string;title:string}[]=[];
 for(let page=0;page<10;page++){
  const data=z.object({items:z.array(itemSchema).max(100),pages:z.number().int().min(0).max(10).optional()}).parse(await upstream('/resumes/mine'+(page?'?page='+page:''),request,access));
  result.push(...data.items.map(item=>({id:item.id,title:item.title||'Резюме без названия'})));
  if(data.pages===undefined||page+1>=data.pages)return result;
 }
 throw new UserError('Список резюме слишком большой для этой версии приложения.',422);
}
export async function listHHResumes(request:Request){const access=token(request);await applicant(request,access);return {items:await ownResumes(request,access)};}
const text=z.string().max(30000).nullish();
const resumeSchema=z.object({id:idSchema,title:text,skills:text,skill_set:z.array(z.string().max(300)).optional(),experience:z.array(z.object({company:text,position:text,start:text,end:text,description:text})).max(200).optional(),education:z.object({primary:z.array(z.object({name:text,organization:text,result:text,year:z.number().optional()})).max(100).optional()}).optional()});
export async function selectHHResume(request:Request,id:unknown){
 assertOrigin(request);const wanted=idSchema.parse(id),access=token(request);await applicant(request,access);
 if(!(await ownResumes(request,access)).some(item=>item.id===wanted))throw new UserError('Выберите собственное резюме из списка.',403);
 const r=resumeSchema.parse(await upstream('/resumes/'+encodeURIComponent(wanted),request,access));if(r.id!==wanted)throw new UserError('hh.ru вернул другое резюме.',502);
 // Do not forward contacts, photos, birth date, salary or unrelated personal fields to AI.
 const sections=[r.title,...(r.experience||[]).map(job=>[job.company,job.position,[job.start,job.end||'по настоящее время'].filter(Boolean).join(' — '),job.description].filter(Boolean).join('\n')),r.skill_set?.length?'Навыки: '+r.skill_set.join(', '):'',r.skills,r.education?.primary?.length?'Образование\n'+r.education.primary.map(item=>[item.name,item.organization,item.result,item.year].filter(Boolean).join(', ')).join('\n'):''].filter(Boolean);
 const value=sections.join('\n\n');if(value.length<20||value.length>100000)throw new UserError('В резюме слишком мало или слишком много текста для адаптации.',422);
 return {text:value,filename:(r.title||'Резюме hh.ru').slice(0,240),id:wanted};
}
export function logoutHH(request:Request){assertOrigin(request);const h=headers();h.append('Set-Cookie',setCookie(SESSION,'',0));h.append('Set-Cookie',setCookie(STATE,'',0));return Response.json({ok:true},{headers:h});}

// Only this authenticated, read-only operation is exposed; access tokens stay inside this module.
export async function readHHVacancy(request:Request,id:string):Promise<unknown>{
 assertOrigin(request);
 if(!/^\d{1,15}$/.test(id))throw new UserError('Неверный номер вакансии.',400);
 const access=token(request);
 await applicant(request,access);
 return upstream('/vacancies/'+id,request,access,undefined,{maxBytes:256000,vacancy:true});
}
