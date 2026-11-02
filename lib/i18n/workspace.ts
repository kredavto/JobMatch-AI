import {normalizeLocale,type UiLocale} from './locale';
/** UI copy only. Evidence, request bodies, revisions and authorization never depend on these strings. */
export const workspaceErrors={
 "applicationUpdateInvalid":{"ru":"Ответ не подтверждает изменение именно этого отклика. Черновик оставлен. Запись могла завершиться; загрузите актуальные данные. Автоматического повтора нет.","en":"The response does not confirm the exact application update. The draft is preserved. The write may have completed; load current data. There is no automatic retry."},
 "applicationNoteConflict":{"ru":"Сохранённая заметка изменилась. Сравните её с черновиком и отдельно подтвердите новую базу перед записью.","en":"The saved note changed. Compare it with the draft and separately acknowledge the new base before writing."},
 "applicationCreateInvalid":{"ru":"Ответ не подтверждает создание именно этого отклика. Черновик оставлен. Запись могла завершиться; загрузите актуальные данные. Автоматического повтора нет.","en":"The response does not confirm creation of this exact application. The draft is preserved. The write may have completed; load current data. There is no automatic retry."},
 "writeResponseContextInvalid":{"ru":"Ответ записи не соответствует исходному аккаунту или следующей ревизии. Черновики оставлены. Загрузите актуальные данные; автоматического повтора нет.","en":"The write response does not match the original account or next revision. Drafts are preserved. Load current data; there is no automatic retry."},
 "demoUnavailable":{"ru":"Демо отключено: сохранённый профиль или несохранённые поля нельзя заменить. Сначала проверьте и сохраните либо вручную восстановите черновики.","en":"The demo is disabled: saved profile data or unsaved fields cannot be replaced. Review and save or manually restore your drafts first."},
 "profileWriteContextInvalid":{"ru":"Ответ сохранения профиля не соответствует исходному аккаунту или следующей ревизии. Черновики оставлены. Загрузите актуальные данные; автоматического повтора нет.","en":"The profile save response does not match the original account or next revision. Drafts are preserved. Load current data; there is no automatic retry."},
 "historyInvalid": {
  "ru": "История не прошла проверку. Загруженные снимки оставлены без изменений. Повторите загрузку.",
  "en": "History validation failed. Loaded snapshots are unchanged. Load history again."
 },
 "historyFailed": {
  "ru": "Не удалось загрузить историю",
  "en": "Could not load history."
 },
 "ownerChanged": {
  "ru": "Аккаунт изменился. Войдите повторно в исходный аккаунт. Черновик не перенесен.",
  "en": "The account changed. Sign in to the original account again. The draft was not transferred."
 },
 "sessionExpired": {
  "ru": "Сессия завершена или аккаунт изменился. Войдите повторно в исходный аккаунт. Черновик остается в этой вкладке.",
  "en": "The session ended or the account changed. Sign in to the original account again. Your draft stays in this tab."
 },
 "serverUnavailable": {
  "ru": "Сервер недоступен",
  "en": "The server is unavailable."
 },
 "reloadFirst": {
  "ru": "Сначала загрузите актуальные данные.",
  "en": "Load current data first."
 },
 "analysisInvalid": {
  "ru": "Результат анализа не соответствует сохраненным фактам или вакансии. Загрузите актуальные данные и повторите анализ.",
  "en": "The analysis does not match the saved facts or vacancy. Load current data and run the analysis again."
 },
 "exportInvalid": {
  "ru": "Экспорт не прошел проверку. Файл не создан. Повторите скачивание.",
  "en": "Export validation failed. No file was created. Download it again."
 },
 "clarificationInvalid": {
  "ru": "Ответ сервера не подтвердил добавление неподтверждённого уточнения. Загрузите актуальные данные; автоматического повтора нет.",
  "en": "The server response did not confirm the new unconfirmed clarification. Load current data; there is no automatic retry."
 },
 "actionFailed": {
  "ru": "Не удалось выполнить действие",
  "en": "Could not complete the action."
 },
 "importAuth": {
  "ru": "Войдите в исходный аккаунт.",
  "en": "Sign in to the original account."
 },
 "importConflict": {
  "ru": "Аккаунт или данные изменились. Загрузите актуальные данные.",
  "en": "The account or data changed. Load current data."
 },
 "importRate": {
  "ru": "Слишком много запросов. Повторите через минуту.",
  "en": "Too many requests. Try again in a minute."
 },
 "importInvalid": {
  "ru": "Не удалось безопасно прочитать файл. Сохраните простую копию или вставьте текст вручную.",
  "en": "The file could not be read safely. Save a simpler copy or paste the text manually."
 },
 "importLarge": {
  "ru": "Файл должен быть меньше 4 МБ",
  "en": "The file must be smaller than 4 MB."
 },
 "importTimeout": {
  "ru": "Обработка файла превысила безопасные лимиты. Вставьте текст вручную или попробуйте более простой файл.",
  "en": "File processing exceeded safe limits. Paste the text manually or try a simpler file."
 },
 "importOcrLimit": {
  "ru": "Для OCR допускается не более 3 сканированных страниц. Разделите PDF или вставьте текст вручную.",
  "en": "OCR allows at most 3 scanned pages. Split the PDF or paste the text manually."
 },
 "importUnavailable": {
  "ru": "Импорт временно недоступен. Вставьте текст вручную или повторите позже.",
  "en": "Import is temporarily unavailable. Paste the text manually or try again later."
 },
 "importResponseInvalid": {
  "ru": "Некорректный ответ импорта. Исходный текст оставлен в поле.",
  "en": "The import response is invalid. The original text remains in the field."
 },
 "importFailed": {
  "ru": "Импорт недоступен или ответ не прошёл проверку. Ваш черновик сохранён. Автоматического повтора нет.",
  "en": "Import is unavailable or the response failed validation. Your draft is preserved. There is no automatic retry."
 },
 "ownerUnknown": {
  "ru": "Не удалось определить исходный аккаунт. Скопируйте черновик перед перезагрузкой.",
  "en": "The original account could not be identified. Copy your draft before reloading."
 },
 "clipboardFailed": {
  "ru": "Копирование недоступно. Скачайте TXT.",
  "en": "Copying is unavailable. Download TXT instead."
 }
} as const;
export const workspaceNotices={
 "applicationSavedDraftPreserved":{"ru":"Отклик сохранён. Новый или отредактированный во время запроса черновик оставлен; он не отправлялся.","en":"Application saved. The new or edited draft is preserved; it was not submitted."},
 "profileSavedDraftPreserved":{"ru":"Данные сохранены на сервере. Несохранённый или отредактированный во время запроса текст оставлен в полях. Сравните черновики с серверной версией перед следующей записью.","en":"Data saved on the server. Unsaved text or edits made during the request remain in the fields. Compare your drafts with the server version before the next write."},
 "reloaded": {
  "ru": "Актуальные данные загружены. Ваш текст резюме, вакансии и цели оставлен в полях. Сравните его с серверной версией перед сохранением. Анализ нужно выполнить заново.",
  "en": "Current data loaded. Your resume, vacancy and goal drafts remain in the fields. Compare them with the server version before saving. Run the analysis again."
 },
 "confirmation": {
  "ru": "Если для адреса требуется подтверждение, проверьте письмо и папку «Спам». Если аккаунт уже создан, войдите с прежним паролем. Повторная регистрация не меняет пароль.",
  "en": "If the address needs confirmation, check your mail and spam folder. If the account already exists, sign in with the original password. Registering again does not change the password."
 },
 "signedIn": {
  "ru": "Вход восстановлен. Черновики резюме, вакансии и цели оставлены в полях. Сравните их с серверной версией перед сохранением.",
  "en": "Sign-in restored. Your resume, vacancy and goal drafts remain in the fields. Compare them with the server version before saving."
 },
 "exportReady": {
  "ru": "Файл профиля, версий, откликов, журнала и согласия подготовлен. Полную историю фактов скачайте отдельно. История серверных писем также скачивается отдельно.",
  "en": "The profile, versions, applications, audit and consent file is ready. Download full fact history separately. Server letter history is also a separate download."
 },
 "saved": {
  "ru": "Сохранено",
  "en": "Saved"
 },
 "importDraftChanged": {
  "ru": "Файл прочитан, но вы уже изменили черновик. Ваш текст сохранён. Для новой попытки выберите файл вручную.",
  "en": "The file was read, but you already changed the draft. Your text is preserved. Select the file manually to try again."
 },
 "importText": {
  "ru": "Текст извлечен. Проверьте его и нажмите «Сохранить мастер-профиль».",
  "en": "Text extracted. Review it and select “Save master profile”."
 },
 "copied": {
  "ru": "Текст скопирован",
  "en": "Text copied"
 }
} as const;
export const workspaceShell={
 "personal": {
  "ru": "ЛИЧНОЕ ПРОСТРАНСТВО",
  "en": "PERSONAL WORKSPACE"
 },
 "factsFirst": {
  "ru": "Факты прежде всего",
  "en": "Facts first"
 },
 "factsHint": {
  "ru": "Никаких выдуманных навыков. Каждая правка под вашим контролем.",
  "en": "No invented skills. You control every change."
 },
 "manual": {
  "ru": "● Ручной режим hh.ru",
  "en": "● Manual hh.ru mode"
 },
 "focus": {
  "ru": "Ваш реальный опыт — в фокусе нужной вакансии.",
  "en": "Bring your real experience into focus for the right vacancy."
 },
 "rules": {
  "ru": "Анализ правилами · без LLM",
  "en": "Rule-based analysis · no LLM"
 },
 "processing": {
  "ru": "Обрабатываем…",
  "en": "Processing…"
 },
 "reauthRegion": {
  "ru": "Повторный вход",
  "en": "Sign in again"
 },
 "reauthTitle": {
  "ru": "Восстановить вход",
  "en": "Restore sign-in"
 },
 "reauthHint": {
  "ru": "Войдите в тот же аккаунт. Черновики остаются только в памяти этой вкладки; не закрывайте и не перезагружайте ее. После входа изменения не отправляются автоматически.",
  "en": "Sign in to the same account. Drafts stay only in this tab’s memory; do not close or reload it. Signing in does not send your changes automatically."
 },
 "originalEmail": {
  "ru": "Почта исходного аккаунта",
  "en": "Original account email"
 },
 "reauthPassword": {
  "ru": "Пароль для повторного входа",
  "en": "Password to sign in again"
 },
 "reauthSubmit": {
  "ru": "Войти повторно",
  "en": "Sign in again"
 },
 "syncRegion": {
  "ru": "Восстановление синхронизации",
  "en": "Restore synchronization"
 },
 "syncTitle": {
  "ru": "Проверьте актуальные данные",
  "en": "Check current data"
 },
 "syncHint": {
  "ru": "Изменения могли сохраниться или поступить из другой вкладки. Автоматический повтор записи отключен. Несохраненный текст остается в этой вкладке до ее закрытия.",
  "en": "Changes may have been saved or arrived from another tab. Automatic write retries are disabled. Unsaved text stays in this tab until it is closed."
 },
 "reload": {
  "ru": "Загрузить актуальные данные",
  "en": "Load current data"
 },
 "serverTexts": {
  "ru": "Сохраненные на сервере тексты",
  "en": "Texts saved on the server"
 },
 "resume": {
  "ru": "Резюме",
  "en": "Resume"
 },
 "vacancy": {
  "ru": "Вакансия",
  "en": "Vacancy"
 },
 "goal": {
  "ru": "Цель",
  "en": "Goal"
 },
 "footer": {
  "ru": "JobMatch AI · Проверяемый MVP · Match Score не является оценкой hh.ru и не гарантирует интервью.",
  "en": "JobMatch AI · Verifiable MVP · Match Score is not an hh.ru rating and does not guarantee an interview."
 }
} as const;
export type WorkspaceErrorKey=keyof typeof workspaceErrors;
export type WorkspaceNotice={key:keyof typeof workspaceNotices}|{key:'importOcr';pages:number};
export function workspaceNoticeText(notice:WorkspaceNotice,locale:UiLocale='ru'){
 const language=normalizeLocale(locale);
 if(notice.key==='importOcr')return language==='en'?`OCR text recognized (pages: ${notice.pages}). Check names, dates, numbers and line order. Nothing is saved: review the text and select “Save master profile”.`:`Текст распознан OCR (страниц: ${notice.pages}). Проверьте имена, даты, числа и порядок строк. Ничего не сохранено: проверьте текст и нажмите «Сохранить мастер-профиль».`;
 return workspaceNotices[notice.key][language];
}
