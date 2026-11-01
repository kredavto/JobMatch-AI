import {createHmac,randomBytes} from 'node:crypto';
import {supabase} from './db';
import {UserError} from './errors';
export const AUTH_PROTECTION_UNAVAILABLE='Защита авторизации временно недоступна. Повторите позже.';
export type AuthScope='credentials'|'mail'|'refresh'|'exchange'|'update';
const localKey=randomBytes(32);
/** Process-local identity only, never the raw email/token in the local Map. */
export const localAuthKey=(value:string)=>createHmac('sha256',localKey).update(value).digest('hex');
export async function consumeAuthQuota(scope:AuthScope,subject:string){
 const mode=process.env.JOBMATCH_AUTH_QUOTA_MODE??'local';
 if(mode==='local')return;
 const key=process.env.JOBMATCH_AUTH_QUOTA_SECRET;
 if(mode!=='required'||!key||!/^[a-f0-9]{64}$/.test(key))throw new UserError(AUTH_PROTECTION_UNAVAILABLE,503,'AUTH_PROTECTION_UNAVAILABLE');
 const secret=Buffer.from(key,'hex');
 const p_subject=createHmac('sha256',secret).update('jobmatch-auth-subject-v1\n'+scope+'\n'+subject).digest('hex');
 const p_timestamp=Math.floor(Date.now()/1000);
 const p_signature=createHmac('sha256',secret).update(`jobmatch-auth-quota-v1\n${scope}\n${p_subject}\n${p_timestamp}`).digest('hex');
 let result:unknown;
 try{result=await supabase('/rest/v1/rpc/consume_auth_quota','POST',{p_scope:scope,p_subject,p_timestamp,p_signature});}
 catch{throw new UserError(AUTH_PROTECTION_UNAVAILABLE,503,'AUTH_PROTECTION_UNAVAILABLE');}
 if(result===false)throw new Error('RATE');
 if(result!==true)throw new UserError(AUTH_PROTECTION_UNAVAILABLE,503,'AUTH_PROTECTION_UNAVAILABLE');
}
