import type {Copy} from './locale';
const ru={
 "nextLanguage": "Язык следующего черновика",
 "documentLanguage": "Язык экспортируемого плана",
 "russian": "Русский",
 "english": "English",
 "nextHelp": "Этот выбор относится к следующему нажатию «Подготовить черновик». Текущий текст, подтверждения и скачивания сохраняют свой язык до новой генерации. Смена языка интерфейса не переводит факты.",
 "currentVersion": "Версия текущего шаблона",
 "nextVersion": "Версия следующего шаблона",
 "englishLetterHint": "Английское оформление v1; выбранные факты остаются на языке источника. Ручные правки требуют прежней проверки всего письма, чисел и отрицаний. JSON — отдельная неподписанная локальная запись, не подтверждение источников, истины или смысла.",
 "englishPlanHint": "Английское оформление плана v1; цитаты вакансии и факты не переводятся. Известные инструкции взяты из замороженного словаря; неизвестные формулировки остаются как записаны. Это рекомендации, не выполненные достижения.",
 "serverUnavailable": "Для серверной версии английского письма нужны доступность сервиса, отдельное согласие на хранение, подписанный предпросмотр и явное принятие. Локальная JSON-запись остаётся неподписанной; история прежних русских версий доступна."
} as const;
const en:Copy<typeof ru>={
 "nextLanguage": "Language for the next draft",
 "documentLanguage": "Exported plan language",
 "russian": "Русский",
 "english": "English",
 "nextHelp": "This choice applies to the next Generate draft action. The current text, approvals and downloads retain their language until you generate again. Changing the interface language does not translate facts.",
 "currentVersion": "Current template version",
 "nextVersion": "Next template version",
 "englishLetterHint": "English framing v1; selected facts retain their source language. Manual edits require the existing whole-letter, number and negation review. JSON is a separate unsigned local record, not source authentication or verification of truth or meaning.",
 "englishPlanHint": "English plan framing v1; vacancy quotes and facts are not translated. Known instructions use a frozen dictionary; unknown wording remains as recorded. Advice is not a completed achievement.",
 "serverUnavailable": "An English server version requires service availability, separate storage consent, a signed preview and explicit acceptance. The local JSON record remains unsigned; earlier Russian version history remains available."
};
export const documentLanguageCopy={ru,en};
