import {z,ZodError} from 'zod';import {UserError} from './errors';
import {NextRequest,NextResponse} from 'next/server';import {identity} from './db';
import {apiErrors,isApiErrorCode,codeMatchesStatus,type ApiErrorCode,type ErrorLocale} from './i18n/api-errors';
const counters=new Map<string,{count:number;until:number}>();
export function rateLimit(key:string,max=120){const now=Date.now();if(counters.size>10000){for(const [k,v] of counters)if(v.until<now)counters.delete(k);if(counters.size>10000)throw new Error('RATE');}const c=counters.get(key);if(!c||c.until<now){counters.set(key,{count:1,until:now+60000});return;}if(++c.count>max)throw new Error('RATE');}
export async function userOf(req:NextRequest){return identity(req.cookies.get('jm_access')?.value||'');}
export function sameOrigin(req:NextRequest){
 const origin=req.headers.get('origin');if(!origin)throw new Error('ORIGIN');
 let url:URL;try{url=new URL(origin);}catch{throw new Error('ORIGIN');}
 const protocol=req.headers.get('x-forwarded-proto')||req.nextUrl.protocol.slice(0,-1);
 if(url.host!==(req.headers.get('host')||req.nextUrl.host)||url.protocol!==protocol+':'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('ORIGIN');
}
export function failure(e:unknown,locale:ErrorLocale='ru'){
 const known:Record<string,ApiErrorCode>={AUTH:'AUTH_REQUIRED',ORIGIN:'ORIGIN_REJECTED',CONFLICT:'REVISION_CONFLICT',RATE:'RATE_LIMITED'};
 let code:ApiErrorCode='INTERNAL_ERROR',status=500;
 if(e instanceof UserError){
  status=Number.isInteger(e.status)&&e.status>=400&&e.status<=599?e.status:500;
  code=isApiErrorCode(e.code)&&codeMatchesStatus(e.code,status)?e.code:'REQUEST_FAILED';
 }else if(e instanceof Error&&Object.hasOwn(known,e.message)){code=known[e.message];status=apiErrors[code].status!;}
 else if(e instanceof ZodError||e instanceof SyntaxError){code='INVALID_INPUT';status=400;}
 return NextResponse.json({error:apiErrors[code][locale==='en'?'en':'ru'],code},{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})}});
}

// An owner hint never grants access; authentication and RLS remain authoritative.
export function requireExpectedOwner(req:NextRequest,ownerId:string){
 const hints=[req.headers.get('x-jobmatch-owner'),...req.nextUrl.searchParams.getAll('expectedOwnerId')].filter((v):v is string=>v!==null);
 for(const hint of hints){const expected=z.uuid().parse(hint);if(expected!==ownerId)throw new UserError('Аккаунт изменился. Войдите повторно в исходный аккаунт. Черновик не перенесен.',409,'OWNER_CHANGED');}
}
