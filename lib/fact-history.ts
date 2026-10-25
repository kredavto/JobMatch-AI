import {z} from 'zod';
import {UserError} from './errors';
import {FactSchema} from './engine';
import {supabase,type Identity} from './db';
export const HistorySchema=z.object({id:z.number().int().positive(),workspace_revision:z.number().int().nonnegative(),kind:z.enum(['baseline','change']),captured_at:z.string(),facts:z.array(FactSchema)});
export type FactHistory=z.infer<typeof HistorySchema>;
export async function readFactHistory(user:Identity,before?:number){
 const result=z.array(HistorySchema).safeParse(await supabase('/rest/v1/fact_history?select=id,workspace_revision,kind,captured_at,facts&user_id=eq.'+user.id+'&order=id.desc&limit=20'+(before?'&id=lt.'+before:''),'GET',undefined,user.token));
 if(!result.success)throw new UserError('Некорректный ответ сервиса истории. Повторите позже.',502);
 const rows=result.data;
 return {rows,next:rows.length===20?rows.at(-1)!.id:null};
}
