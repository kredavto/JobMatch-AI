import {z} from 'zod';
import {VacancySchema} from './contracts';

export const ImportedResumeSchema=z.object({
 text:z.string().max(100000).refine(text=>text.trim().length>=20),
 filename:z.string().min(1).max(240)
});
export const AdaptedResumeSchema=z.object({
 title:z.string().min(1).max(300),text:z.string().min(1).max(120000),
 coverLetter:z.string().min(1).max(120000),mode:z.enum(['automatic','ai']),
 matchedSkills:z.array(z.string().min(1).max(100)).max(160),
 missingSkills:z.array(z.string().min(1).max(100)).max(160)
});
export {VacancySchema};

export async function responseJson<T>(response:Response,schema:z.ZodType<T>):Promise<T>{
 const data:unknown=await response.json().catch(()=>null);
 if(!response.ok){
  const error=z.object({error:z.string().min(1).max(1000).optional(),message:z.string().min(1).max(1000).optional()}).safeParse(data);
  throw new Error(error.success?(error.data.error||error.data.message||'Не удалось выполнить запрос. Попробуйте ещё раз.'):'Не удалось выполнить запрос. Попробуйте ещё раз.');
 }
 const parsed=schema.safeParse(data);
 if(!parsed.success)throw new Error('Не удалось прочитать ответ сервера. Повторите действие.');
 return parsed.data;
}
