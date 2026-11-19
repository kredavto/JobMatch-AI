import {z} from 'zod';
import {boundedBody} from '../lib/body';
export type PilotVerify=(token:string)=>Promise<{id:string;token:string}>;
const paths=new Set(['/auth/v1/user','/auth/v1/token?grant_type=password','/auth/v1/token?grant_type=refresh_token','/auth/v1/logout?scope=local','/rest/v1/rpc/session_is_active',...['consent_status','grant_consent','revoke_consent','reserve','can_deliver'].map(n=>'/rest/v1/rpc/ai_rewrite_'+n)]);
/** Server-only isolated config. Never falls back to legacy keys or service role. */
export function pilotConfig(env:Record<string,string|undefined>=process.env){
 const url=env.JOBMATCH_PILOT_SUPABASE_URL,key=env.JOBMATCH_PILOT_SUPABASE_PUBLISHABLE_KEY;
 if(env.JOBMATCH_PILOT_ENABLED!=='true'||url!=='https://xhpkjvlttfiaxbpgbjcp.supabase.co'||!key?.startsWith('sb_publishable_'))return null;
 return {url,key};
}
export function createPilotBackend(config:{url:string;key:string},fetcher:typeof fetch){
 async function call(path:string,body:unknown,token?:string){
  if(!paths.has(path))throw Error('PILOT_UNAVAILABLE');
  try{
   const signal=AbortSignal.timeout(10000);
   const res=await fetcher(config.url+path,{method:path==='/auth/v1/user'?'GET':'POST',headers:{apikey:config.key,...(token?{Authorization:`Bearer ${token}`}:{ }),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal,redirect:'error',credentials:'omit',cache:'no-store'});
   if(!res.ok){await res.body?.cancel();throw Error();}
   return JSON.parse(new TextDecoder().decode(await boundedBody({body:res.body,headers:res.headers,signal},65536)));
  }catch{throw Error('PILOT_UNAVAILABLE');}
 }
 const verify:PilotVerify=async token=>{const u=await call('/auth/v1/user',undefined,token);if(!z.string().uuid().safeParse(u?.id).success||u.is_anonymous===true||!(u.email_confirmed_at||u.phone_confirmed_at)||await call('/rest/v1/rpc/session_is_active',{},token)!==true)throw Error('AUTH');return {id:u.id,token};};
 return {call,verify};
}
