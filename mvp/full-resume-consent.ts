import {z} from 'zod';
export const FULL_CONSENT_KEY='jobmatch.groq-full-resume-consent.v1';
export const ACCOUNT_FULL_POLICY='groq-full-resume-account-v1';
export const FULL_POLICY='groq-full-resume-v1';
export const FULL_NOTICE='Только для редактирования вашего собственного резюме. По вашей команде полный текст резюме будет передаваться Groq для предложений переформулировки. Вакансия и метаданные профиля не передаются. Возможна обработка и хранение в США; Zero Data Retention не подтверждён. Groq может сохранять ввод и ответ для надёжности и проверки злоупотреблений до 30 дней, а при требовании закона дольше. Сохранение смысла и фактов не гарантируется. Согласие запоминается только в этом браузере для последующих адаптаций до отзыва или изменения условий. Не разрешайте на общем устройстве. Удалите пароли, документы, сведения о здоровье и другие лишние чувствительные данные. Автопроверка неполная. Отзыв остановит будущие запросы, но не удалит уже переданные данные.';
const Consent=z.object({policy:z.literal(FULL_POLICY),recipient:z.literal('groq'),scope:z.literal('this-browser'),id:z.string().uuid(),granted:z.boolean(),at:z.string().datetime()}).strict();
export function readFullConsent(raw:string|null){if(!raw)return null;if(raw.length>1000)return null;try{const c=Consent.parse(JSON.parse(raw));return c.granted?c:null;}catch{return null;}}
export function writeFullConsent(storage:Pick<Storage,'getItem'|'setItem'>,expected:string|null,granted:boolean){
 if(storage.getItem(FULL_CONSENT_KEY)!==expected)throw Error('CONSENT_CHANGED');
 const record=Consent.parse({policy:FULL_POLICY,recipient:'groq',scope:'this-browser',id:crypto.randomUUID(),granted,at:new Date().toISOString()});
 const raw=JSON.stringify(record);storage.setItem(FULL_CONSENT_KEY,raw);return raw;
}
/** Known-marker guard only, not anonymization, legal clearance or complete DLP. */
export function validateFullResume(text:unknown):string{
 if(typeof text!=='string'||text.trim().length<20||text.length>10000)throw Error('RESUME_LIMIT');
 if(/[\p{Cf}]/u.test(text)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text))throw Error('SENSITIVE_OR_HIDDEN_MARKER');
 if(/\b\d{3}[- ]\d{2}[- ]\d{4}\b|\b\d{9}\b|\b\d{11,19}\b|(?:\bsk-|\bghp_|\bAIza)[A-Za-z0-9_-]{12,}|-----BEGIN .*PRIVATE KEY|(?:password|пароль|passport|паспорт|снилс|инн|ssn|taxpayer|api[_ -]?key|secret|диагноз|принимаю препарат|медицинск[а-я]*|номер карты)\s*[:=№]/iu.test(text))throw Error('SENSITIVE_OR_HIDDEN_MARKER');
 return text; // Names/contact text is never silently removed or rewritten.
}
export function resumeFacts(text:string){
 validateFullResume(text);const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(lines.length>80||lines.some(s=>s.length>2000))throw Error('RESUME_STRUCTURE_LIMIT');
 return lines.map((text,i)=>({id:`line-${i+1}`,text}));
}
