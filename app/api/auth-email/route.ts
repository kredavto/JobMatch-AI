import {observeRoute} from '../../../lib/ops-telemetry';
import {consumeAuthQuota,localAuthKey} from '../../../lib/auth-quota';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {boundedBody} from '../../../lib/body';
import {supabase} from '../../../lib/db';
import {sameOrigin,rateLimit,failure} from '../../../lib/http';
import {mailOrigin} from '../../../lib/mail-origin';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const input=z.object({email:z.email().max(200).transform(value=>value.toLowerCase())}).strict();
async function POSTHandler(req:NextRequest){try{
 sameOrigin(req);rateLimit('confirmation-global',30);
 const body=input.parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,4096))));
 const origin=mailOrigin(req.nextUrl.origin);
 rateLimit('confirmation-email:'+localAuthKey(body.email),1);
 await consumeAuthQuota('mail',body.email);
 await supabase('/auth/v1/resend?redirect_to='+encodeURIComponent(origin+'/'),'POST',{type:'signup',email:body.email});
 // The provider deliberately does not disclose whether an account is eligible.
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}}

export const POST=observeRoute('auth-email','POST',POSTHandler);
