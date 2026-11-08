import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {request as httpsRequest} from 'node:https';
import {z} from 'zod';
import {UserError} from '../lib/errors';
import {boundedBody} from '../lib/body';
import {hhVacancyConfig,vacancyPlainText} from '../lib/hh-vacancy';
import {hhVacancyId} from '../lib/hh-vacancy-contract';
import {VacancySchema,type Vacancy} from './contracts';
const HH=/^(?:[a-z0-9-]+\.)?hh\.ru$/;
export function safeUrl(input:string){
 let url:URL;try{url=new URL(input);}catch{throw new UserError('Укажите полную HTTPS-ссылку на вакансию.');}
 if(input.length>2048||url.protocol!=='https:'||url.username||url.password||url.port||isIP(url.hostname.replace(/^\[|\]$/g,''))||!url.hostname.includes('.')||/[\u0000-\u0020\\]/.test(input))throw new UserError('Укажите публичную HTTPS-ссылку на вакансию.');
 url.hash='';return url;
}
export function publicIPv4(ip:string){
 if(isIP(ip)!==4)return false;
 const [a,b,c]=ip.split('.').map(Number);
 return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===2))||(a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113));
}
async function page(url:URL,signal:AbortSignal):Promise<{status:number;location?:string;html:string}>{
 const addresses=await lookup(url.hostname,{all:true,family:4});
 if(!addresses.length||addresses.some(a=>!publicIPv4(a.address)))throw new UserError('Эта ссылка недоступна для загрузки.',400);
 const address=addresses[0].address;
 return new Promise((resolve,reject)=>{
  const request=httpsRequest(url,{method:'GET',signal,headers:{Accept:'text/html,application/xhtml+xml','User-Agent':'JobMatch/1.0 (+https://github.com/kredavto/JobMatch-AI)','Accept-Encoding':'identity'},lookup:(_hostname,_options,callback)=>{callback(null,[{address,family:4}]);}},response=>{
   const status=response.statusCode??502;
   if([301,302,303,307,308].includes(status)){response.resume();resolve({status,location:response.headers.location,html:''});return;}
   if(status!==200||!/^text\/html|^application\/xhtml\+xml/i.test(response.headers['content-type']??'')){response.destroy();reject(new UserError(status===403||status===401?'Сайт ограничивает автоматическое чтение этой вакансии. Выберите доступную публичную ссылку.':'Не удалось прочитать вакансию по ссылке.',502));return;}
   const chunks:Buffer[]=[];let size=0;
   response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>1000000){response.destroy();reject(new UserError('Страница вакансии слишком большая.',413));}else chunks.push(chunk);});
   response.on('end',()=>resolve({status,html:Buffer.concat(chunks).toString('utf8')}));response.on('error',reject);
  });
  request.setTimeout(10000,()=>request.destroy(new Error('timeout')));request.on('error',reject);request.end();
 });
}
function text(value:unknown,max=30000){return typeof value==='string'?vacancyPlainText(value).slice(0,max):'';}
function skills(value:unknown):string[]{
 const values=Array.isArray(value)?value:typeof value==='string'?value.split(/[,;\n]/):[];
 return [...new Set(values.filter((s):s is string=>typeof s==='string').map(s=>text(s,100).trim()).filter(Boolean))].slice(0,80);
}
function jobPosting(value:unknown,depth=0):Record<string,unknown>|undefined{
 if(depth>8||!value||typeof value!=='object')return;
 if(Array.isArray(value)){for(const item of value){const found=jobPosting(item,depth+1);if(found)return found;}return;}
 const obj=value as Record<string,unknown>,types=Array.isArray(obj['@type'])?obj['@type']:[obj['@type']];
 if(types.includes('JobPosting'))return obj;
 return jobPosting(obj['@graph'],depth+1)||jobPosting(obj.mainEntity,depth+1);
}
export function parseVacancy(html:string,url:string):Vacancy{
 for(const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)){
  try{
   const job=jobPosting(JSON.parse(match[1]));if(!job)continue;
   if(typeof job.validThrough==='string'&&Number.isFinite(Date.parse(job.validThrough))&&Date.parse(job.validThrough)<Date.now())throw new UserError('Срок публикации вакансии истёк. Выберите актуальную вакансию.',410);
   const company=job.hiringOrganization&&typeof job.hiringOrganization==='object'?text((job.hiringOrganization as Record<string,unknown>).name,300):'';
   const parsed=VacancySchema.safeParse({title:text(job.title,300),company,url,text:text(job.description),skills:skills(job.skills)});
   if(parsed.success)return parsed.data;
  }catch(error){if(error instanceof UserError)throw error;}
 }
 const titleMatch=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i);
 const content=html.match(/<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)\s*>/i);
 const description=content?text(content[1]):'';
 const parsed=VacancySchema.safeParse({title:text(titleMatch?.[1],300),company:'',url,text:description,skills:[]});
 if(!parsed.success||description.length<100)throw new UserError('На странице не найден текст вакансии. Нужна прямая публичная ссылка на её описание; страницы входа и каталоги не подходят.',422);
 return parsed.data;
}
async function hh(url:URL,signal:AbortSignal):Promise<Vacancy>{
 let id:string;try{id=hhVacancyId(url.href);}catch{throw new UserError('Нужна ссылка вида https://hh.ru/vacancy/123456.');}
 let config:ReturnType<typeof hhVacancyConfig>;try{config=hhVacancyConfig();}catch{throw new UserError('Импорт hh.ru пока не подключён. Приложение не входит в аккаунт и не отправляет отклики; для работы с hh.ru требуется разрешённая интеграция.',503);}
 const response=await fetch(`https://api.hh.ru/vacancies/${id}`,{headers:{Accept:'application/json','HH-User-Agent':config.agent,Authorization:`Bearer ${config.token}`},signal,redirect:'error',cache:'no-store'});
 if(response.status===404)throw new UserError('Вакансия не найдена или больше недоступна.',404);
 if(!response.ok)throw new UserError('HeadHunter временно не отдал вакансию. Повторите позже.',502);
 const raw=JSON.parse(new TextDecoder().decode(await boundedBody({headers:response.headers,body:response.body,signal},256000)));
 const schema=z.object({id:z.string(),name:z.string(),description:z.string(),archived:z.boolean(),employer:z.object({name:z.string()}).nullish(),key_skills:z.array(z.object({name:z.string()})).optional()});
 const data=schema.parse(raw);
 if(data.id!==id)throw new UserError('Получен неверный ответ HeadHunter.',502);
 if(data.archived)throw new UserError('Вакансия в архиве. Выберите актуальную вакансию.',410);
 return VacancySchema.parse({title:text(data.name,300),company:text(data.employer?.name,300),url:`https://hh.ru/vacancy/${id}`,text:text(data.description),skills:skills(data.key_skills?.map(s=>s.name))});
}
export async function loadVacancy(input:string,signal:AbortSignal){
 let url=safeUrl(input.trim());const timeout=AbortSignal.any([signal,AbortSignal.timeout(15000)]);
 if(HH.test(url.hostname))return hh(url,timeout);
 try{
  for(let redirects=0;redirects<4;redirects++){
   const response=await page(url,timeout);
   if(response.location){url=safeUrl(new URL(response.location,url).href);if(HH.test(url.hostname))throw new UserError('Используйте прямую ссылку на вакансию hh.ru.',400);continue;}
   return parseVacancy(response.html,url.href);
  }
  throw new UserError('Слишком много перенаправлений. Используйте прямую ссылку на вакансию.',422);
 }catch(error){if(error instanceof UserError)throw error;throw new UserError('Не удалось загрузить страницу вакансии. Проверьте ссылку или повторите позже.',502);}
}
