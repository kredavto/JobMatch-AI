import {normalizeLocale,type UiLocale,type Copy} from './locale';
const ru={
 title:'Структурированный профиль',
 intro:'Работа, образование, сертификаты и достижения из точных фрагментов сохранённого резюме. Подтверждение означает вашу проверку всех полей, а не независимую проверку. Эти записи не меняют Match Score; из выбранных подтверждённых записей можно отдельно сохранить дословную версию.',
 open:'Открыть структурированный профиль',refresh:'Обновить структурированный профиль',saved:'Сохранено в структурированном профиле',invalidReply:'Не удалось получить и проверить ответ профиля. Загрузите актуальные данные без повтора записи.',selectionError:'Выделите в сохранённом источнике от 1 до 500 символов.',
 aiWriteUnknown:'Результат сохранения AI-полей неизвестен. Запрос мог успеть записать данные. Обновите структурированный профиль перед новой записью.',
 noRetry:'Запись не повторяется автоматически. Загрузите актуальные данные.',mismatch:'Рабочее пространство изменилось. Обновите структурированный профиль.',
 stats:(revision:number,sourceRevision:number,count:number)=>`Редакция структуры: ${revision}. Исходная ревизия: ${sourceRevision}. Записей: ${count}/50.`,
 download:'Скачать структуру и источник',stale:'Резюме переимпортировано или состав фактов изменился. Прежняя структура сохранена как устаревшая. Скачайте её перед явным сбросом; добавление и новые подтверждения остановлены.',
 source:'Сохранённый источник структуры',addLegend:'Добавить запись из выделенных фрагментов',kind:'Тип записи',field:'Поле для выделения',capture:'Взять выделенный фрагмент',
 kinds:{employment:'Работа',education:'Образование',certification:'Сертификат',achievement:'Достижение'},
 fields:{title:'Должность / программа / название',organization:'Организация',start:'Начало / дата выдачи',end:'Окончание',description:'Описание / достижение',credential:'Номер сертификата'},
 shortRange:(start:number,end:number)=>`Символы ${start}–${end}`,
 range:(start:number,end:number)=>`Диапазон [${start}, ${end}) исходного текста`,
 removeField:(name:string)=>`Убрать поле «${name}»`,
 fieldHint:'Для достижения обязательно описание; для остальных записей — название. Даты и числа сохраняются дословно, без вывода стажа или уровня. Черновик полей хранится только в этой вкладке и исчезает при уходе из раздела.',
 add:'Сохранить неподтверждённую запись',confirm:'Подтверждаю точность и смысл всех полей этой записи',delete:'Удалить запись',resetTitle:'Явный сброс структуры',
 resetHint:'Удалит все структурированные записи и привяжет пустую структуру к текущему сохранённому резюме. Прежний источник структуры будет заменён. Сначала скачайте структуру и источник, если они нужны. Мастер-профиль, факты, обычные и дословные версии резюме сохранятся. Сохранённые версии содержат свой прежний источник.',
 resetAccept:'Разрешаю удалить все записи структуры и заменить её источник',reset:'Сбросить структуру'
};
const en:Copy<typeof ru>={
 title:'Structured profile',
 intro:'Build employment, education, certificate and achievement records from exact passages of the saved resume. Confirmation means you have reviewed every field, not independent verification. These records do not change Match Score; selected confirmed records can create a separate literal version.',
 open:'Open structured profile',refresh:'Refresh structured profile',saved:'Saved in the structured profile',invalidReply:'A verified profile response could not be obtained. Read current data without repeating the write.',selectionError:'Select between 1 and 500 characters in the saved source.',
 aiWriteUnknown:'The AI field save result is unknown. The request may have committed. Refresh the structured profile before another write.',
 noRetry:'The write is not retried automatically. Read current data.',mismatch:'The workspace changed. Refresh the structured profile.',
 stats:(revision,sourceRevision,count)=>`Structure revision: ${revision}. Source revision: ${sourceRevision}. Records: ${count}/50.`,
 download:'Download structure and source',stale:'The resume was reimported or the fact set changed. The previous structure remains as an outdated copy. Download it before an explicit reset; adding records and new confirmations is paused.',
 source:'Saved structure source',addLegend:'Add a record from selected passages',kind:'Record type',field:'Field for the selection',capture:'Capture selected passage',
 kinds:{employment:'Employment',education:'Education',certification:'Certificate',achievement:'Achievement'},
 fields:{title:'Position / program / title',organization:'Organization',start:'Start / issue date',end:'End',description:'Description / achievement',credential:'Certificate number'},
 shortRange:(start,end)=>`Characters ${start}–${end}`,range:(start,end)=>`Source range [${start}, ${end})`,removeField:name=>`Remove field “${name}”`,
 fieldHint:'Achievements require a description; other records require a title. Dates and numbers remain verbatim, without inferred duration or seniority. Draft fields stay only in this tab and are lost when leaving this section.',
 add:'Save unconfirmed record',confirm:'I confirm the accuracy and meaning of all fields in this record',delete:'Delete record',resetTitle:'Explicit structure reset',
 resetHint:'Deletes all structure records and links an empty structure to the current saved resume. The old structure source is replaced. Download the structure and source first if needed. The master profile, facts, ordinary and literal versions remain. Saved versions retain their own previous source.',
 resetAccept:'Allow deleting all structure records and replacing their source',reset:'Reset structure'
};
export const structuredProfileCopy=(locale:UiLocale='ru'):Copy<typeof ru>=>normalizeLocale(locale)==='en'?en:ru;
