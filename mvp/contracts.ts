import {z} from 'zod';
export const VacancySchema=z.object({
 title:z.string().trim().min(1).max(300),company:z.string().max(300),url:z.string().url().max(2048),
 text:z.string().min(20).max(30000),skills:z.array(z.string().trim().min(1).max(100)).max(80)
}).strict();
export type Vacancy=z.infer<typeof VacancySchema>;
export const AdaptSchema=z.object({resume:z.string().trim().min(20).max(100000),vacancy:VacancySchema}).strict();
export const ExportSchema=z.object({text:z.string().min(1).max(120000),title:z.string().min(1).max(300),format:z.enum(['docx','pdf'])}).strict();
