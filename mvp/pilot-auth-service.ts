import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {parseProviderAuth} from '../lib/auth-contract';
import {jsonBody,privateHeaders} from './http';
import type {createPilotBackend} from './pilot-backend';
const Login=z.object({action:z.literal('login'),email:z.email().max(200),password:z.string().min(12).max(128)}).strict();
const Command=z.union([Login,z.object({action:z.enum(['refresh','logout'])}).strict()]);
export function createPilotAuthService(backend?:ReturnType<typeof createPilotBackend>){return async(request:Request)=>{
 const fail=(status:number)=>NextResponse.json({error:'Вход в ИИ недоступен. Локальная адаптация доступна.'},{status,headers:privateHeaders});
 if(!backend)return fail(503);
 const req=new NextRequest(request.url,{headers:request.headers});
 if(request.method==='POST'&&request.headers.get('origin')!==req.nextUrl.origin)return fail(403);
 try{
  if(request.method==='GET'){const token=req.cookies.get('jm_pilot_access')?.value;if(!token)return fail(401);const user=await backend.verify(token);return NextResponse.json({subject:user.id},{headers:privateHeaders});}
  if(request.method!=='POST')return fail(405);
  const b=Command.parse(await jsonBody(request,2048));
  const res=NextResponse.json({ok:true},{headers:privateHeaders});
  const opts={httpOnly:true,secure:req.nextUrl.protocol==='https:',sameSite:'strict' as const,path:'/'};
  if(b.action==='logout'){
   const token=req.cookies.get('jm_pilot_access')?.value;
   if(token)await backend.call('/auth/v1/logout?scope=local',{},token);
   for(const name of ['jm_pilot_access','jm_pilot_refresh'])res.cookies.set(name,'',{...opts,maxAge:0});
   return res;
  }
  const refresh=req.cookies.get('jm_pilot_refresh')?.value;
  if(b.action==='refresh'&&!refresh)return fail(401);
  const data=await backend.call('/auth/v1/token?grant_type='+(b.action==='login'?'password':'refresh_token'),b.action==='login'?{email:b.email,password:b.password}:{refresh_token:refresh});
  const auth=parseProviderAuth(data,b.action);if(auth.kind!=='session')return fail(401);
  await backend.verify(auth.access_token);
  res.cookies.set('jm_pilot_access',auth.access_token,{...opts,maxAge:auth.expires_in});res.cookies.set('jm_pilot_refresh',auth.refresh_token,{...opts,maxAge:604800});return res;
 }catch{return fail(401);}
};}
