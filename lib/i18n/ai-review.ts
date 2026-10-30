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
 "lifetime": "Результат не сохраняется автоматически и исчезает при уходе из редактора, смене исходника, фактов, владельца или ревизии.",
 "audit": {
  "title": "Проверьте смысл связи",
  "limit": "Правила отмечают только явные термины, сроки в годах, проценты и запись уровня английского. Отсутствие предупреждений не подтверждает соответствие или истинность фактов.",
  "unavailable": "Пояснения не рассчитаны: проверьте актуальность исходника и подтверждённых фактов.",
  "signals": {
   "no-linked-facts": "Подтверждённые факты не связаны; соответствие не установлено.",
   "literal-gap": "В связанных фактах не найдены все распознаваемые термины требования. Это не доказательство отсутствия навыка.",
   "coverage-unavailable": "Смысл полной формулировки не проверен. Совпадение слов не доказывает соответствие.",
   "quantity-difference": "Явные числовые значения различаются или не достигают указанной границы. Проверьте единицы и смысл сравнения.",
   "quantity-unknown": "Числа не удалось однозначно сопоставить по ограниченным правилам. Проверьте их вручную.",
   "level-below": "Указанный в связанных фактах уровень английского ниже требуемой записи. Проверьте актуальность и контекст.",
   "level-unknown": "Уровни не удалось однозначно сопоставить. Нужна ручная проверка."
  }
 },
 "errors": {
  "unavailable": "AI-разбор пока не подключён или временно недоступен. Обычный анализ доступен.",
  "conflict": "Данные изменились. Загрузите актуальный профиль.",
  "session": "Сессия истекла. Войдите повторно перед новым разбором.",
  "rate": "Слишком много запросов. Повторите разбор позже по желанию.",
  "large": "Для AI-разбора сократите профиль, вакансию или число и длину строк требований.",
  "source": "Нет подходящих отдельных строк для дословного разбора. Проверьте текст требований вакансии.",
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
 "lifetime": "The result is not saved automatically and disappears when leaving the editor or changing the source, facts, owner or revision.",
 "audit": {
  "title": "Review the meaning of this link",
  "limit": "Rules flag only explicit terms, durations in years, percentages and English-level labels. Even without warnings, review the meaning of the link and the truth of the facts manually.",
  "unavailable": "Annotations are unavailable. Check that the source and user-confirmed facts are current.",
  "signals": {
   "no-linked-facts": "No user-confirmed facts are linked; a match has not been established.",
   "literal-gap": "The linked facts do not contain all terms recognised by the rules. This does not prove a skill is absent.",
   "coverage-unavailable": "The meaning of the full statement has not been checked. Shared words do not establish a match.",
   "quantity-difference": "Explicit quantities differ or do not meet the stated bound. Check the units and whether the values are comparable.",
   "quantity-unknown": "The limited rules could not compare the quantities unambiguously. Review them manually.",
   "level-below": "The linked English-level label is below the requirement label. Check its context and whether it is current.",
   "level-unknown": "The level labels could not be compared unambiguously. Manual review is required."
  }
 },
 "errors": {
  "unavailable": "AI review is not connected or is temporarily unavailable. Rule-based analysis is available.",
  "conflict": "Data changed. Load the current profile.",
  "session": "Your session expired. Sign in again before a new review.",
  "rate": "Too many requests. You may run a new review later.",
  "large": "Shorten the profile, vacancy, or the number and length of requirement lines before AI review.",
  "source": "There are no eligible standalone lines for literal review. Check the vacancy requirements.",
  "invalid": "The AI response failed quote and fact validation. You may start a new review.",
  "interrupted": "AI review was interrupted. You may start a new review.",
  "network": "The connection to AI review was lost. No result was received. You can start a new request manually.",
  "failed": "AI review did not complete. You may start a new review."
 }
};
export const aiReviewCopy={ru,en};
export type AiReviewErrorKey=keyof typeof ru.errors;
/** Status is authoritative; response/exception messages are never displayed. */
export function aiReviewStatusError(status:number):AiReviewErrorKey{return ({503:'unavailable',409:'conflict',401:'session',429:'rate',413:'large',422:'source',504:'interrupted'} as const)[status as 503|409|401|429|413|422|504]||'failed';}
