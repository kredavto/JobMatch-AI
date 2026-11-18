import {UserError} from '../lib/errors';
import {boundedBody} from '../lib/body';

/** Server-only application credential. Never consumes applicant cookies or calls /me. */
export async function readHHAppVacancy(request:Request,id:string):Promise<unknown>{
 const access=process.env.JOBMATCH_HH_APP_ACCESS_TOKEN,userAgent=process.env.HH_USER_AGENT,origin=process.env.HH_APP_ORIGIN;
 if(!access||access.length>4096||/[\s\x00-\x1f\x7f]/.test(access)||!userAgent||/[\r\n]/.test(userAgent)||!origin)throw new UserError('Чтение вакансий hh.ru ещё не настроено владельцем приложения.',503);
 let validOrigin=false;
 try{const url=new URL(origin);validOrigin=url.protocol==='https:'&&url.origin===origin;}catch{}
 if(!validOrigin)throw new UserError('Чтение вакансий hh.ru ещё не настроено владельцем приложения.',503);
 if(request.headers.get('origin')!==origin||new URL(request.url).origin!==origin)throw new UserError('Откройте приложение и повторите действие.',403);
 if(!/^\d{1,15}$/.test(id))throw new UserError('Неверный номер вакансии.',400);
 const signal=AbortSignal.any([request.signal,AbortSignal.timeout(15000)]);
 try{
  signal.throwIfAborted();
  const response=await fetch('https://api.hh.ru/vacancies/'+id,{method:'GET',redirect:'error',cache:'no-store',signal,headers:{'HH-User-Agent':userAgent,Authorization:'Bearer '+access}});
  if(!response.ok){
   void response.body?.cancel().catch(()=>{});
   if(response.status===404)throw new UserError('Вакансия не найдена или больше недоступна.',404);
   if(response.status===401)throw new UserError('Токен приложения hh.ru недействителен. Владельцу нужно проверить настройку чтения вакансий.',503);
   if(response.status===403)throw new UserError('hh.ru отказал в доступе (чтение вакансии). Автоматические запросы остановлены; владельцу нужно проверить разрешения приложения.',403);
   if(response.status===429)throw new UserError('hh.ru временно ограничил запросы. Попробуйте позже.',429);
   throw new UserError('hh.ru временно недоступен. Попробуйте позже.',502);
  }
  return JSON.parse(new TextDecoder().decode(await boundedBody({headers:response.headers,body:response.body,signal},256000)));
 }catch(error){if(error instanceof UserError)throw error;throw new UserError('Не удалось получить ответ hh.ru. Повторите позже.',502);}
}
