import {createHash,randomBytes} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {boundedBody} from '../../../lib/body';
import {supabase,identity} from '../../../lib/db';
import {parseProviderAuth} from '../../../lib/auth-contract';
import {sameOrigin,rateLimit,failure} from '../../../lib/http';
import {UserError} from '../../../lib/errors';
import {mailOrigin} from '../../../lib/mail-origin';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('request'),email:z.email().max(200).transform(v=>v.toLowerCase())}).strict(),
 z.object({action:z.literal('exchange'),code:z.string().min(1).max(2048).regex(/^[a-zA-Z0-9_-]+$/)}).strict(),
 z.object({action:z.literal('update'),password:z.string().min(12).max(128)}).strict()
]);
const ok=(value:unknown)=>NextResponse.json(value,{headers:{'Cache-Control':'no-store'}});
export async function POST(req:NextRequest){try{
 sameOrigin(req);rateLimit('recovery-global',30);
 const body=schema.parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,4096))));
 const options={httpOnly:true,secure:req.nextUrl.protocol==='https:',sameSite:'strict' as const,path:'/api/recovery',maxAge:600};
 if(body.action==='request'){
  // Never derive email destinations from Host / forwarded headers or user input.
  const origin=mailOrigin(req.nextUrl.origin);
  rateLimit('recovery-email:'+createHash('sha256').update(body.email).digest('hex'),3);
  const verifier=randomBytes(32).toString('base64url');
  const challenge=createHash('sha256').update(verifier).digest('base64url');
  await supabase('/auth/v1/recover?redirect_to='+encodeURIComponent(origin+'/recover'),'POST',{email:body.email,code_challenge:challenge,code_challenge_method:'s256'});
  const response=ok({ok:true});response.cookies.set('jm_recovery_verifier',verifier,options);response.cookies.set('jm_recovery_access','',{...options,maxAge:0});return response;
 }
 if(body.action==='exchange'){
  const verifier=req.cookies.get('jm_recovery_verifier')?.value;
  if(!verifier||!/^[A-Za-z0-9_-]{43}$/.test(verifier))throw new UserError('Откройте ссылку в том браузере, где запросили восстановление, или запросите новую.',400);
  const data=await supabase('/auth/v1/token?grant_type=pkce','POST',{auth_code:body.code,code_verifier:verifier});
  let auth;try{auth=parseProviderAuth(data,'login');}catch{throw new UserError('Не удалось проверить ссылку. Запросите новую.',502);}
  if(auth.kind!=='session')throw new UserError('Не удалось проверить ссылку.',502);
  const response=ok({ok:true});response.cookies.set('jm_recovery_access',auth.access_token,{...options,maxAge:Math.min(600,auth.expires_in)});response.cookies.set('jm_recovery_verifier','',{...options,maxAge:0});return response;
 }
 const token=req.cookies.get('jm_recovery_access')?.value;
 if(!token)throw new UserError('Ссылка не подтверждена или истекла. Запросите восстановление заново.',401);
 const user=await identity(token);
 const updated=await supabase('/auth/v1/user','PUT',{password:body.password},token);
 if(updated?.id!==user.id)throw new UserError('Не удалось подтвердить смену пароля. Попробуйте войти с новым паролем.',502);
 let sessionsRevoked=true;
 try{await supabase('/auth/v1/logout?scope=global','POST',{},token);}catch{sessionsRevoked=false;}
 const response=ok({ok:true,sessionsRevoked});response.cookies.set('jm_recovery_access','',{...options,maxAge:0});response.cookies.set('jm_recovery_verifier','',{...options,maxAge:0});response.cookies.delete('jm_access');response.cookies.delete('jm_refresh');return response;
 }catch(e){return failure(e);}}
