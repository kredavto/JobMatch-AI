import {UserError} from './errors';
import {validateHistoryPage} from './history-schema';
import {supabase,type Identity} from './db';
export {HistorySchema,type FactHistory} from './history-schema';
export async function readFactHistory(user:Identity,before?:number){
 const raw=await supabase('/rest/v1/fact_history?select=id,workspace_revision,kind,captured_at,facts&user_id=eq.'+user.id+'&order=id.desc&limit=20'+(before?'&id=lt.'+before:''),'GET',undefined,user.token);
 try{
  // Only an empty page proves exhaustion; short pages can reflect provider limits.
  return validateHistoryPage({rows:raw,next:Array.isArray(raw)?raw.at(-1)?.id??null:null},before);
 }catch{throw new UserError('Некорректный ответ сервиса истории. Повторите позже.',502);}
}
