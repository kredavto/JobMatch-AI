import {z} from 'zod';
export const MAX_FILE_BYTES=4_000_000;
export const MAX_TEXT_CHARS=100_000;
export const MAX_PARSER_RESPONSE_BYTES=800_000;
export const PARSER_ERRORS={
 INVALID:{status:400,message:'Не удалось безопасно прочитать файл. Сохраните простую копию или вставьте текст вручную.'},
 TOO_LARGE:{status:413,message:'Файл должен быть меньше 4 МБ'},
 TIMEOUT:{status:408,message:'Обработка файла превысила безопасные лимиты. Вставьте текст вручную или попробуйте более простой файл.'},
 BUSY:{status:503,message:'Импорт временно занят. Повторите позже или вставьте текст вручную.'},
 UNAVAILABLE:{status:503,message:'Импорт временно недоступен. Вставьте текст вручную или повторите позже.'}
} as const;
export type ParserCode=keyof typeof PARSER_ERRORS;
export const ParserResponseSchema=z.discriminatedUnion('ok',[
 z.object({ok:z.literal(true),text:z.string().refine(value=>value.trim().length>=5&&value.length<=MAX_TEXT_CHARS)}).strict(),
 z.object({ok:z.literal(false),code:z.enum(['INVALID','TOO_LARGE','TIMEOUT','BUSY','UNAVAILABLE'])}).strict()
]);
export type ParserResponse=z.infer<typeof ParserResponseSchema>;
export function documentExtension(filename:string){const ext=filename.toLowerCase().split('.').pop();return ext==='txt'||ext==='docx'||ext==='pdf'?ext:null;}
export function validParserToken(value:string|undefined):value is string{return typeof value==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(value);}
