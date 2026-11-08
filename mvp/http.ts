import {boundedBody} from '../lib/body';
import {UserError} from '../lib/errors';
import {ZodError} from 'zod';
let total={count:0,until:0};
let active=0;
export function acquire(){if(active>=3)throw new UserError('Сервис занят. Повторите через несколько секунд.',429);active++;return ()=>{active--;};}
const buckets=new Map<string,{count:number,until:number}>();
export const privateHeaders={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'};
export function guard(request:Request){
 const origin=request.headers.get('origin');
 if(origin){
  const target=new URL(request.url),host=request.headers.get('host')||target.host,protocol=request.headers.get('x-forwarded-proto')||target.protocol.slice(0,-1);
  if(!['http','https'].includes(protocol)||origin!==`${protocol}://${host}`)throw new UserError('Откройте приложение и повторите действие.',403);
 }
 const now=Date.now(),key=(request.headers.get('x-forwarded-for')?.split(',')[0]??'local').slice(0,80);
 for(const [id,bucket] of buckets)if(bucket.until<=now)buckets.delete(id);
 if(total.until<=now)total={count:0,until:now+300000};
 if(++total.count>200)throw new UserError('Сервис занят. Повторите через несколько минут.',429);
 const bucket=buckets.get(key)??{count:0,until:now+300000};
 if(buckets.size>=2000&&!buckets.has(key))throw new UserError('Сервис занят. Повторите через несколько минут.',429);
 if(++bucket.count>40)throw new UserError('Слишком много запросов. Повторите через несколько минут.',429);
 buckets.set(key,bucket);
}
export async function jsonBody(request:Request,max=600000):Promise<unknown>{
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new UserError('Неверный формат запроса.',415);
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBody(request,max)));}
 catch(error){if(error instanceof UserError)throw error;throw new UserError('Не удалось прочитать запрос. Повторите действие.',400);}
}
export function errorResponse(error:unknown){
 const known=error instanceof UserError;
 return Response.json({error:known?error.message:error instanceof ZodError?'Проверьте файл и ссылку на вакансию.':'Не удалось выполнить действие. Повторите попытку.'},{status:known?error.status:error instanceof ZodError?400:500,headers:privateHeaders});
}
