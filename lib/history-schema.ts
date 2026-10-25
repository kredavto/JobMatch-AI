import {z} from 'zod';
import {FactSchema} from './engine';
const cursor=z.number().int().positive().max(2147483647);
export const HistorySchema=z.object({id:cursor,workspace_revision:z.number().int().nonnegative(),kind:z.enum(['baseline','change']),captured_at:z.iso.datetime({offset:true}),facts:z.array(FactSchema).max(500)});
export type FactHistory=z.infer<typeof HistorySchema>;
const pageSchema=z.object({rows:z.array(HistorySchema).max(20),next:cursor.nullable()});
export function validateHistoryPage(value:unknown,before?:number){
 const parsed=pageSchema.safeParse(value);
 if(!parsed.success)throw new Error('INVALID_HISTORY');
 const {rows,next}=parsed.data;let previous=before??2147483648;
 for(const row of rows){if(row.id>=previous)throw new Error('INVALID_HISTORY');previous=row.id;}
 if(next!==(rows.at(-1)?.id??null))throw new Error('INVALID_HISTORY');
 return parsed.data;
}
