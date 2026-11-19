import {NextRequest} from 'next/server';
import type {PilotVerify} from './pilot-backend';
import {z} from 'zod';
import type {PilotPrincipal} from './principal-rewrite-service';
/** Existing Auth user + active-session verification; never trust a client subject. */
export function createPilotAuthenticator(verify:PilotVerify=async()=>{throw Error('AUTH');}){
 return async(request:Request):Promise<PilotPrincipal|null>=>{
  const token=new NextRequest(request.url,{headers:request.headers}).cookies.get('jm_pilot_access')?.value;
  if(!token)return null;
  try{const user=await verify(token);if(!z.string().uuid().safeParse(user.id).success)return null;return {id:user.id,token};}catch{return null;}
 };
}
