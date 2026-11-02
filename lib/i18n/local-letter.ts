import {normalizeLocale,type UiLocale,type Copy} from './locale';
const ru={
region:'Сопроводительное письмо',
help:'Локальный шаблон с дословными подтвержденными фактами. Выберите до пяти фактов, связанных с сохраненной вакансией. Письмо не отправляется и не сохраняется автоматически. Черновик исчезает при уходе из редактора, смене стиля или выбранных фактов; скачайте его заранее.',
documentHint:'Шаблон документа: русский v1. Язык интерфейса не переводит письмо.',
blocked:'Сначала сохраните изменения профиля и вакансии и восстановите синхронизацию. Экспорт письма приостановлен.',
sourceChanged:'Источники изменились. Подготовьте письмо заново.',
empty:'Для письма пока нет подтвержденных связанных фактов. Уточните профиль и выполните анализ заново.',
evidence:'Evidence',style:'Стиль письма',styles:{professional:'Профессиональный',brief:'Краткий',confident:'Уверенный',executive:'Для руководителей'},
styleHelp:'Стиль «Для руководителей» не добавляет управленческий опыт. Вводные фразы о намерениях — шаблон: проверьте, что они вам подходят.',
generate:'Подготовить черновик письма',text:'Текст сопроводительного письма',
count:(value:number)=>'Слов: '+value+'. Ориентир: 100–170; краткий стиль может быть короче.',
length:'Длина вне ориентира. Сократите или дополните текст вручную, сохраняя точность фактов. Цифры и достижения автоматически не добавляются.',
edited:'Текст изменен вручную. Новые формулировки не проверены по evidence; проверьте каждое утверждение.',
literal:'Фактические фрагменты перенесены дословно из выбранных подтвержденных фактов. Проверьте уместность всего письма.',
restore:'Восстановить шаблон письма',whole:'Я проверил письмо, факты и формулировки о своих намерениях',
unavailable:'Текст недоступен для проверки: проверьте длину и символы или восстановите шаблон. Экспорт заблокирован.',
downloadTxt:'Скачать письмо (TXT)',
jsonHelp:'JSON содержит текст письма, выбранные исходные факты с их источниками и сохранённую вакансию: это чувствительные данные. Это редактируемый локальный снимок без подписи, не серверное подтверждение и не проверка истинности. Проверка файла подтверждает только внутреннюю согласованность, не полноту профиля или отсутствие пропущенных противоречий. Ничего не отправляется.',
sourceConsent:'Разрешаю включить выбранные источники и вакансию в скачиваемый JSON',
downloadJson:'Скачать снимок письма (JSON)',
errors:{generate:'Не удалось подготовить письмо: проверьте выбранные подтверждённые факты и сохранённую вакансию.',source:'Источники изменились. Подготовьте письмо заново.',download:'Не удалось скачать письмо. Проверьте источники и повторите вручную.'}
};
const en:Copy<typeof ru>={
region:'Cover letter',
help:'A local template with confirmed facts copied verbatim. Select up to five facts related to the saved vacancy. The letter is not sent or saved automatically. The draft disappears when you leave the editor or change its style or selected facts; download it first.',
documentHint:'Document template: Russian v1. Interface language does not translate the letter.',
blocked:'Save profile and vacancy changes and restore synchronization first. Letter export is paused.',
sourceChanged:'Sources changed. Prepare the letter again.',
empty:'There are no confirmed related facts for a letter yet. Clarify the profile and analyze again.',
evidence:'Evidence',style:'Letter style',styles:{professional:'Professional',brief:'Brief',confident:'Confident',executive:'Executive'},
styleHelp:'The Executive style does not add management experience. Statements about intentions are template wording; check that they apply to you.',
generate:'Prepare letter draft',text:'Cover letter text',
count:(value:number)=>'Words: '+value+'. Guide: 100–170; the brief style may be shorter.',
length:'The length is outside the guide. Edit it manually while keeping facts accurate. Numbers and achievements are not added automatically.',
edited:'The text was manually edited. New wording has not been checked against evidence; review every claim.',
literal:'Factual fragments were copied verbatim from selected confirmed facts. Review the relevance of the entire letter.',
restore:'Restore letter template',whole:'I reviewed the letter, facts and statements about my intentions',
unavailable:'Text is unavailable for review: check length and characters or restore the template. Export is blocked.',
downloadTxt:'Download letter (TXT)',
jsonHelp:'JSON includes the letter text, selected facts with sources and the saved vacancy: this is sensitive data. It is an editable unsigned local snapshot, not server confirmation or truth verification. File validation checks internal consistency only, not profile completeness or omitted contradictions. Nothing is sent.',
sourceConsent:'Allow selected sources and vacancy in the downloaded JSON',
downloadJson:'Download letter snapshot (JSON)',
errors:{generate:'The letter could not be prepared. Check selected confirmed facts and the saved vacancy.',source:'Sources changed. Prepare the letter again.',download:'The letter could not be downloaded. Check sources and retry manually.'}
};
const reviewRu={
region:'Просмотр изменений письма',
help:'Это ограниченное сравнение чисел и некоторых русских/английских маркеров отрицания, а не проверка смысла или истинности. Единицы, роли, контекст и многие противоречия не распознаются. Проверьте всё письмо, даже если числа не изменились.',
limit:'Слишком много чисел или маркеров для ограниченного сравнения. Сократите ручную правку либо выберите меньше исходных фактов и подготовьте письмо заново. Если лимит превышен в исходном шаблоне, его восстановление не поможет. Экспорт заблокирован.',
kinds:{'manual-edit':'Проверьте всю ручную правку','number-added':'Добавлено числовое выражение','number-removed':'Удалено числовое выражение','negation-added':'Добавлен маркер отрицания','negation-removed':'Удалён маркер отрицания'},
before:'Было',after:'Стало',ack:(value:number)=>'Я просмотрел(а) изменение '+value
};
const reviewEn:Copy<typeof reviewRu>={
region:'Review letter edits',
help:'This is a bounded comparison of numbers and some Russian/English negation markers, not verification of meaning or truth. Units, roles, context and many contradictions are not recognized. Review the entire letter even if numbers did not change.',
limit:'Too many numbers or markers for the bounded comparison. Reduce the manual edit, or select fewer source facts and prepare the letter again. Restoring a source template already over the limit will not help. Export is blocked.',
kinds:{'manual-edit':'Review the entire manual edit','number-added':'Numeric expression added','number-removed':'Numeric expression removed','negation-added':'Negation marker added','negation-removed':'Negation marker removed'},
before:'Before',after:'After',ack:(value:number)=>'I reviewed edit '+value
};
export const localLetterCopy={ru,en},letterReviewCopy={ru:reviewRu,en:reviewEn};
export type LocalLetterError='generate'|'source'|'download';
export function localLetterErrorText(error:LocalLetterError,locale:UiLocale='ru'){return localLetterCopy[normalizeLocale(locale)].errors[error];}
