import {supabase,type Identity} from './db';
import {UserError} from './errors';
/** Capability only; does not activate storage or waive normal owner/session/revision checks. */
export async function requireOrdinaryEnglishReady(user:Identity){
 let ready:unknown;
 try{ready=await supabase('/rest/v1/rpc/ordinary_english_ready','POST',{},user.token);}
 catch(error){if(error instanceof Error&&error.message==='AUTH')throw error;throw new UserError('Английское оформление пока недоступно для сохранения.',503,'UPSTREAM_UNAVAILABLE');}
 if(ready!==true)throw new UserError('Английское оформление пока недоступно для сохранения.',503,'UPSTREAM_UNAVAILABLE');
}
