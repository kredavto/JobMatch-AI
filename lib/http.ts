import {z,ZodError} from 'zod';import {UserError} from './errors';
import {NextRequest,NextResponse} from 'next/server';import {identity} from './db';
const counters=new Map<string,{count:number;until:number}>();
export function rateLimit(key:string,max=120){const now=Date.now();if(counters.size>10000){for(const [k,v] of counters)if(v.until<now)counters.delete(k);if(counters.size>10000)throw new Error('RATE');}const c=counters.get(key);if(!c||c.until<now){counters.set(key,{count:1,until:now+60000});return;}if(++c.count>max)throw new Error('RATE');}
export async function userOf(req:NextRequest){return identity(req.cookies.get('jm_access')?.value||'');}
export function sameOrigin(req:NextRequest){
 const origin=req.headers.get('origin');if(!origin)throw new Error('ORIGIN');
 let url:URL;try{url=new URL(origin);}catch{throw new Error('ORIGIN');}
 const protocol=req.headers.get('x-forwarded-proto')||req.nextUrl.protocol.slice(0,-1);
 if(url.host!==(req.headers.get('host')||req.nextUrl.host)||url.protocol!==protocol+':'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('ORIGIN');
}
export function failure(e:unknown){
 const m=e instanceof Error?e.message:'';
 const known:Record<string,[number,string]>={AUTH:[401,'Войдите в приложение'],ORIGIN:[403,'Недопустимый источник запроса'],CONFLICT:[409,'Данные изменены в другой вкладке. Обновите страницу.'],RATE:[429,'Слишком много запросов. Повторите через минуту.']};
 const [status,error]=known[m]||(e instanceof UserError?[e.status,e.message]:e instanceof ZodError||e instanceof SyntaxError?[400,'Проверьте введенные данные']:[500,'Не удалось выполнить действие. Повторите позже.']);
 return NextResponse.json({error},{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})}});
}

// An owner hint never grants access; authentication and RLS remain authoritative.
export function requireExpectedOwner(req:NextRequest,ownerId:string){
 const hints=[req.headers.get('x-jobmatch-owner'),...req.nextUrl.searchParams.getAll('expectedOwnerId')].filter((v):v is string=>v!==null);
 for(const hint of hints){const expected=z.uuid().parse(hint);if(expected!==ownerId)throw new UserError('Аккаунт изменился. Войдите повторно в исходный аккаунт. Черновик не перенесен.',409);}
}
