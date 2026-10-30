import type {Copy} from './locale';
import {normalizeLocale,type UiLocale} from './locale';
const ru={
 "letter": {
  "title": "Сопроводительное письмо",
  "help": "Локальный шаблон с дословными подтвержденными фактами. Выберите до пяти фактов, связанных с сохраненной вакансией. Письмо не отправляется и не сохраняется автоматически. Черновик исчезает при уходе из редактора, смене ревизии, стиля или выбранных фактов; скачайте его заранее.",
  "template": "Язык шаблона выбирается отдельно. Факты переносятся дословно и могут остаться на языке источника. Смена языка интерфейса не переводит уже подготовленное письмо.",
  "outputLanguage": "Язык шаблона письма",
  "languageHelp": "Смена языка шаблона очищает черновик и подтверждение. Смена языка интерфейса сохраняет их.",
  "json": "Скачать письмо и происхождение (JSON)",
  "provenanceHelp": "JSON содержит выбранные факты, исходную вакансию, версию шаблона и одобренный текст. Это неподписанный локальный снимок, не подтверждение подлинности источника и не семантическая проверка. Ручные правки явно отмечены.",
  "empty": "Для письма пока нет подтвержденных связанных фактов. Уточните профиль и выполните анализ заново.",
  "style": "Стиль письма",
  "styles": {
   "professional": "Профессиональный",
   "brief": "Краткий",
   "confident": "Уверенный",
   "executive": "Для руководителей"
  },
  "styleHelp": "Стиль «Для руководителей» не добавляет управленческий опыт. Вводные фразы о намерениях — шаблон: проверьте, что они вам подходят.",
  "generate": "Подготовить черновик письма",
  "text": "Текст сопроводительного письма",
  "words": "Слов",
  "guide": "Ориентир: 100–170; краткий стиль может быть короче.",
  "lengthHelp": "Длина вне ориентира. Сократите или дополните текст вручную, сохраняя точность фактов. Цифры и достижения автоматически не добавляются.",
  "edited": "Текст изменен вручную. Новые формулировки не проверены по evidence; проверьте каждое утверждение.",
  "verbatim": "Фактические фрагменты перенесены дословно из выбранных подтвержденных фактов. Проверьте уместность всего письма.",
  "restore": "Восстановить шаблон письма",
  "approve": "Я проверил письмо, факты и формулировки о своих намерениях",
  "download": "Скачать письмо (TXT)",
  "dirty": "В резюме или вакансии есть несохранённые изменения. Действия с письмом заблокированы; ручной текст сохранён. Сначала сохраните либо восстановите исходные поля.",
  "blocked": "Действия с письмом приостановлены. Дождитесь завершения текущего запроса или загрузите актуальные данные.",
  "errors": {
   "style": "Неизвестный стиль",
   "vacancy": "Сначала сохраните вакансию",
   "selection": "Выберите от 1 до 5 разных подтвержденных фактов",
   "evidence": "Факт больше не подтвержден или не связан с вакансией",
   "failed": "Не удалось подготовить письмо",
   "download": "Не удалось скачать письмо. Текст остался в поле; повторите скачивание по желанию."
  }
 },
 "coach": {
  "region": "Карьерный помощник",
  "title": "План развития и подготовка к интервью",
  "help": "Локальные рекомендации по правилам, без передачи данных AI-провайдеру. Сначала — неподтвержденные обязательные требования. План строится по сохраненному профилю.",
  "caveat": "«Не подтверждено» не означает «Не соответствует». Отсутствие навыка автоматически не устанавливается; сложные требования требуют ручной проверки.",
  "filter": "Показать требования",
  "all": "Все требования",
  "unconfirmed": "Не подтверждено",
  "supported": "Соответствует по правилам",
  "shown": "Показано",
  "of": "из",
  "empty": "В этой группе требований нет.",
  "mandatory": "Обязательное",
  "partial": "Есть частичное совпадение терминов; срок, уровень и всё требование не доказаны.",
  "evidence": "Подтвержденные факты",
  "source": "Источник",
  "steps": "Что сделать",
  "questions": "Вопросы для репетиции",
  "download": "Скачать план подготовки (TXT)",
  "downloadError": "Не удалось скачать план. Повторите скачивание по желанию.",
  "profile": "Добавить уточнение в профиль",
  "exportHelp": "Скачивается выбранная группа. План не меняет факты, резюме или Match Score. Учебные задания — предложения, а не выполненные достижения.",
  "template": "Язык экспорта выбирается отдельно. Переводятся только известные формулировки рекомендаций; исходные цитаты и факты остаются дословными.",
  "outputLanguage": "Язык TXT-плана",
  "languageHelp": "Смена языка интерфейса сохраняет выбранный язык экспорта, фильтр и открытые рекомендации.",
  "advice": {
   "sql": "На открытом или синтетическом наборе данных составьте запросы с JOIN, группировкой и оконной функцией. Сохраните запросы и объясните проверки результата.",
   "python": "Создайте небольшой скрипт обработки синтетических данных: проверка входа, преобразование, отчет и тесты. Сохраните код и инструкцию запуска.",
   "excel": "На синтетических данных подготовьте таблицу с формулами, сводным отчетом и проверкой ошибок. Объясните, какое решение поддерживает отчет.",
   "bitrix24": "Если доступен учебный стенд Битрикс24, настройте демонстрационную воронку и опишите этапы и правила переходов. Не используйте реальные клиентские данные.",
   "crm": "В учебной CRM опишите демонстрационную воронку, поля карточки и правила качества данных. Укажите, какую именно систему использовали.",
   "b2b": "Подготовьте учебный кейс корпоративной продажи: профиль компании, вопросы для выявления потребностей и предложение. Отделите учебный сценарий от реальных сделок.",
   "management": "Разберите реальную или учебную командную задачу: роли, план, риски и обратную связь. Явно укажите, был ли у вас опыт руководства людьми.",
   "english": "Подготовьте краткий рассказ о своем проекте на английском и запишите ответы на вопросы о вашей роли. Самопроверка не подтверждает уровень по CEFR.",
   "supported": "Выберите подтвержденный пример и подготовьте рассказ: задача, ваша роль, действия и известный результат. Не добавляйте отсутствующие цифры.",
   "clarify": "Сначала проверьте, есть ли такой опыт. Если есть — добавьте точное уточнение в профиль и подтвердите его отдельно.",
   "project": "Если опыта нет, сформулируйте небольшой учебный проект по этому требованию с проверяемым результатом. Отметьте его как учебный.",
   "artifact": "Пометьте учебный проект как учебный. Сохраните артефакт: код, отчет, описание проекта или отзыв. Не добавляйте навык в резюме до реального выполнения и проверки результата.",
   "supportedQuestion": "Какую задачу вы решали, какую часть выполнили лично и чем подтверждается результат?",
   "unconfirmedQuestion": "Есть ли у вас реальный пример по этому требованию? Если нет — как честно объяснить текущий уровень и план обучения?",
   "qualityQuestion": "Какие ограничения и ошибки возникли? Как вы проверяли качество своей работы?"
  }
 }
} as const;
const en:Copy<typeof ru>={
 "letter": {
  "title": "Cover letter",
  "help": "A local template using user-confirmed facts verbatim. Select up to five facts related to the saved vacancy. The letter is not sent or saved automatically. The draft disappears when leaving the editor or changing the revision, style or selected facts; download it first.",
  "template": "Choose the template language separately. Facts are copied verbatim and may remain in their source language. Changing the interface language does not translate an existing letter.",
  "outputLanguage": "Letter template language",
  "languageHelp": "Changing the template language clears the draft and approval. Changing the interface language preserves them.",
  "json": "Download letter and provenance (JSON)",
  "provenanceHelp": "JSON includes selected facts, the source vacancy, template version and approved text. It is an unsigned local snapshot, not source authentication or semantic verification. Manual edits are explicitly marked.",
  "empty": "There are no confirmed related facts for a letter yet. Clarify your profile and analyze it again.",
  "style": "Letter style",
  "styles": {
   "professional": "Professional",
   "brief": "Brief",
   "confident": "Confident",
   "executive": "Executive"
  },
  "styleHelp": "Executive style does not add management experience. Statements of intent are template wording: check that they apply to you.",
  "generate": "Prepare letter draft",
  "text": "Cover letter text",
  "words": "Words",
  "guide": "Suggested range: 100–170; brief style may be shorter.",
  "lengthHelp": "The length is outside the suggested range. Edit it manually while keeping facts accurate. Numbers and achievements are not added automatically.",
  "edited": "You edited the text manually. New wording has not been checked against evidence; review every claim.",
  "verbatim": "Factual fragments were copied verbatim from selected user-confirmed facts. Review the whole letter for relevance.",
  "restore": "Restore letter template",
  "approve": "I reviewed the letter, facts and statements of intent",
  "download": "Download letter (TXT)",
  "dirty": "The resume or vacancy has unsaved changes. Letter actions are blocked; your manual text is preserved. Save or restore the source fields first.",
  "blocked": "Letter actions are paused. Wait for the current request to finish or load current data.",
  "errors": {
   "style": "Unknown style.",
   "vacancy": "Save the vacancy first.",
   "selection": "Select 1 to 5 different user-confirmed facts.",
   "evidence": "A fact is no longer confirmed or related to the vacancy.",
   "failed": "The letter could not be prepared.",
   "download": "The letter could not be downloaded. The text remains in the field; you may try downloading again."
  }
 },
 "coach": {
  "region": "Career assistant",
  "title": "Development and interview preparation plan",
  "help": "Local rule-based advice, with no data sent to an AI provider. Unconfirmed mandatory requirements come first. The plan uses the saved profile.",
  "caveat": "Unconfirmed does not establish a mismatch. The absence of a skill is not inferred automatically; complex requirements need manual review.",
  "filter": "Show requirements",
  "all": "All requirements",
  "unconfirmed": "Unconfirmed",
  "supported": "Supported by rules",
  "shown": "Showing",
  "of": "of",
  "empty": "There are no requirements in this group.",
  "mandatory": "Mandatory",
  "partial": "Some terms overlap; the duration, level and full requirement are not proven.",
  "evidence": "User-confirmed facts",
  "source": "Source",
  "steps": "What to do",
  "questions": "Practice questions",
  "download": "Download preparation plan (TXT)",
  "downloadError": "The plan could not be downloaded. You may try downloading again.",
  "profile": "Add a clarification to the profile",
  "exportHelp": "The selected group is downloaded. The plan does not change facts, the resume or Match Score. Exercises are suggestions, not completed achievements.",
  "template": "Choose the export language separately. Only known advice wording is translated; source quotes and facts remain verbatim.",
  "outputLanguage": "TXT plan language",
  "languageHelp": "Changing the interface language preserves the export language, filter and open advice.",
  "advice": {
   "sql": "Use an open or synthetic dataset to write queries with a JOIN, grouping and a window function. Save the queries and explain how you checked the results.",
   "python": "Build a small script to process synthetic data: input validation, transformation, reporting and tests. Save the code and instructions.",
   "excel": "Use synthetic data to create a spreadsheet with formulas, a summary report and error checks. Explain which decision the report supports.",
   "bitrix24": "If a Bitrix24 training environment is available, configure a demo pipeline and describe its stages and transition rules. Do not use real customer data.",
   "crm": "In a training CRM, describe a demo pipeline, record fields and data-quality rules. Name the system you used.",
   "b2b": "Prepare a practice B2B sales case: company profile, discovery questions and a proposal. Separate the exercise from real deals.",
   "management": "Review a real or practice team task: roles, plan, risks and feedback. State explicitly whether you managed people.",
   "english": "Prepare a short account of your project in English and record answers about your role. Self-assessment does not establish a CEFR level.",
   "supported": "Choose a confirmed example and prepare an account of the task, your role, actions and known result. Do not add missing numbers.",
   "clarify": "First check whether you have this experience. If so, add a precise clarification to your profile and confirm it separately.",
   "project": "If you lack the experience, define a small practice project for this requirement with a checkable result. Label it as practice.",
   "artifact": "Label the project as practice. Keep an artifact: code, report, project description or feedback. Do not add the skill to your resume before completing the work and checking its result.",
   "supportedQuestion": "What task did you solve, which part did you do personally, and what supports the result?",
   "unconfirmedQuestion": "Do you have a real example for this requirement? If not, how can you explain your current level and learning plan honestly?",
   "qualityQuestion": "What limitations and errors arose? How did you check your work?"
  }
 }
};
export const letterCoachCopy={ru,en};
export type LetterErrorKey=keyof typeof ru.letter.errors;
const errorKeys=new Map<string,LetterErrorKey>(['style','vacancy','selection','evidence'].map(key=>[ru.letter.errors[key as 'style'|'vacancy'|'selection'|'evidence'],key as LetterErrorKey] as const));
export function letterFailure(error:unknown):LetterErrorKey{return error instanceof Error?errorKeys.get(error.message)||'failed':'failed';}
const adviceKeys=new Map<string,keyof typeof ru.coach.advice>((Object.keys(ru.coach.advice) as (keyof typeof ru.coach.advice)[]).map(key=>[ru.coach.advice[key],key] as const));
/** Translate only known fixed advice; source evidence and unknown advice remain verbatim. */
export function careerAdvice(value:string,requestedLocale:UiLocale='ru'){const key=adviceKeys.get(value),locale=normalizeLocale(requestedLocale);return key?{text:letterCoachCopy[locale].coach.advice[key],catalogued:true}:{text:value,catalogued:false};}
