import {z} from 'zod';
const token=z.string().min(1).max(8192).regex(/^[A-Za-z0-9._~+/=-]+$/);
const session=z.object({access_token:token,refresh_token:token,expires_in:z.number().int().positive().max(604800),token_type:z.string().refine(v=>v.toLowerCase()==='bearer')});
const signupUser=z.object({id:z.uuid(),email:z.email()});
/** Raw GoTrue /signup returns a user when email confirmation is required; token grants never do. */
export function parseProviderAuth(value:unknown,action:'login'|'register'|'refresh'){
 const parsed=session.safeParse(value);
 if(parsed.success)return {kind:'session' as const,...parsed.data};
 const object=value!==null&&typeof value==='object'?value as Record<string,unknown>:null;
 if(action==='register'&&object&&!['access_token','refresh_token','expires_in','token_type'].some(key=>key in object)&&signupUser.safeParse(value).success)return {kind:'confirmation' as const};
 throw new Error('INVALID_AUTH_RESPONSE');
}
const ok=z.object({ok:z.literal(true)}).strict();
const confirmation=z.object({confirmationRequired:z.literal(true)}).strict();
export function validateAuthAck(value:unknown,allowConfirmation=false){
 const parsed=(allowConfirmation?z.union([ok,confirmation]):ok).safeParse(value);
 if(!parsed.success)throw new Error('INVALID_AUTH_ACK');
 return parsed.data;
}
