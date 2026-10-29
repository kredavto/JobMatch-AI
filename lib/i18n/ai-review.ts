import type {Copy} from './locale';
const ru={
 "title": "AI-разбор требований",
 "help": "Модель предлагает связи между цитатами вакансии и подтверждёнными фактами. Проверьте смысл каждой связи: цитата не доказывает соответствие. Результат не меняет Match Score или резюме.",
 "consent": "Разрешаю отправить сохранённый текст вакансии и подтверждённые допустимые факты на собственный AI-сервер оператора для этого запроса.",
 "dirty": "Сначала сохраните изменения профиля и вакансии.",
 "run": "Запустить AI-разбор",
 "busy": "Выполняем AI-разбор…",
 "empty": "Проверяемые требования не выделены.",
 "noEvidence": "Связанные подтверждённые факты не предложены.",
 "lifetime": "Результат не сохраняется автоматически и исчезает при уходе из редактора или смене владельца/ревизии.",
 "errors": {
  "unavailable": "AI-разбор пока не подключён или временно недоступен. Обычный анализ доступен.",
  "conflict": "Данные изменились. Загрузите актуальный профиль.",
  "session": "Сессия истекла. Войдите повторно перед новым разбором.",
  "rate": "Слишком много запросов. Повторите разбор позже по желанию.",
  "large": "Для AI-разбора сократите профиль или вакансию: лимит 48 КБ.",
  "invalid": "Ответ AI не прошёл проверку цитат и фактов. Повторите разбор по желанию.",
  "interrupted": "AI-разбор прерван. Повторите по желанию.",
  "network": "Связь с AI-разбором потеряна. Результат не получен. Новый запрос можно запустить вручную.",
  "failed": "AI-разбор не завершён. Повторите по желанию."
 }
} as const;
const en:Copy<typeof ru>={
 "title": "AI requirement review",
 "help": "The model suggests links between vacancy quotes and user-confirmed facts. Review the meaning of every link: a quote does not establish a match. The result does not change the Match Score or resume.",
 "consent": "I allow sending the saved vacancy text and eligible user-confirmed facts to the operator’s own AI server for this request.",
 "dirty": "Save the profile and vacancy changes first.",
 "run": "Run AI review",
 "busy": "Reviewing with AI…",
 "empty": "No verifiable requirements were identified.",
 "noEvidence": "No related user-confirmed facts were suggested.",
 "lifetime": "The result is not saved automatically and disappears when leaving the editor or changing owner/revision.",
 "errors": {
  "unavailable": "AI review is not connected or is temporarily unavailable. Rule-based analysis is available.",
  "conflict": "Data changed. Load the current profile.",
  "session": "Your session expired. Sign in again before a new review.",
  "rate": "Too many requests. You may run a new review later.",
  "large": "Shorten the profile or vacancy for AI review: the limit is 48 KB.",
  "invalid": "The AI response failed quote and fact validation. You may start a new review.",
  "interrupted": "AI review was interrupted. You may start a new review.",
  "network": "The connection to AI review was lost. No result was received. You can start a new request manually.",
  "failed": "AI review did not complete. You may start a new review."
 }
};
export const aiReviewCopy={ru,en};
export type AiReviewErrorKey=keyof typeof ru.errors;
/** Status is authoritative; response/exception messages are never displayed. */
export function aiReviewStatusError(status:number):AiReviewErrorKey{return ({503:'unavailable',409:'conflict',401:'session',429:'rate',413:'large',504:'interrupted'} as const)[status as 503|409|401|429|413|504]||'failed';}
