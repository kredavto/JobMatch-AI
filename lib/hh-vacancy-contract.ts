import {z} from 'zod';
/** Parse identifiers, never a network destination. Query/fragment tracking is discarded. */
export function hhVacancyId(input:string):string{
 const value=input.trim();
 if(value.length>2048||/[\u0000-\u0020\\\u007f]/.test(value))throw new Error('INVALID_HH_LINK');
 if(/^\d{1,15}$/.test(value))return value;
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.port||
 !/^(?:[a-z0-9-]+\.)?hh\.ru$/.test(url.hostname)||!/^\/vacancy\/\d{1,15}\/?$/.test(url.pathname))throw new Error('INVALID_HH_LINK');
 return url.pathname.split('/')[2];
}
export const HHVacancyResult=z.object({ownerId:z.uuid(),id:z.string().regex(/^\d{1,15}$/),url:z.string(),text:z.string().min(1).max(30000),archived:z.boolean()}).strict().superRefine((value,ctx)=>{if(value.url!==`https://hh.ru/vacancy/${value.id}`)ctx.addIssue({code:'custom',message:'Invalid canonical URL'});});
