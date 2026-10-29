import {normalizeLocale,type UiLocale,type Copy} from './locale';
const ru={
 title:'Дословные версии структуры',
 intro:'Шаблон structured-literal-v1 переносит только выбранные подтверждённые поля. Прочие сведения исходного резюме будут пропущены. Это отдельный текст, который нужно проверить перед использованием. Подтверждение принадлежит пользователю; проверки квалификации и смысла моделью нет.',
 templateLanguage:'Шаблон использует русские названия полей. Исходные цитаты и сохранённый текст не переводятся при смене языка интерфейса.',
 invalidReply:'Не удалось получить и проверить ответ версии. Прочитайте историю и профиль без повтора записи.',
 blocked:'Результат запроса неизвестен. Сначала прочитайте историю версий и обновите структурированный профиль. Запись автоматически не повторяется.',
 selectLegend:'Записи для версии',include:'Включить: ',empty:'Нет доступных подтверждённых записей. Подтвердите поля и проверьте их контекст в источнике.',
 guard:'Консервативный фильтр line-risk-v1 блокирует строки с отрицанием, планом или инструкцией. Он может отклонить допустимую строку и не обнаруживает все смысловые противоречия.',
 risky:(name:string)=>`Недоступна запись «${name}»: В исходной строке есть отрицание, план или инструкция. Дословный шаблон не может безопасно перенести этот фрагмент.`,
 preview:'Предпросмотр дословной версии',previewTitle:'Предпросмотр — ещё не сохранён',
 provenance:(template:string,source:number,revision:number,count:number)=>`Шаблон: ${template}. Источник: ${source}; структура: ${revision}. Записей: ${count}. Исходный текст и точные диапазоны будут сохранены вместе с версией.`,
 accept:'Проверил текст, пропущенные сведения и контекст; сохранить эту дословную версию',save:'Сохранить отдельную неизменяемую версию',cancel:'Отменить предпросмотр',history:'Прочитать историю дословных версий',
 historyCount:(count:number)=>`Сохранено: ${count}/20. История содержит подтверждения на момент сохранения; текущая структура могла измениться.`,
 summary:(revision:number,length:number)=>`структура ${revision} · ${length} символов`,open:(id:string)=>`Открыть версию ${id}`,
 savedTitle:'Сохранённая дословная версия',id:'ID:',created:'Создана:',
 savedMeta:(template:string)=>`Шаблон: ${template}; генератор: literal-template; модель не использовалась. Подтверждение и источник относятся к моменту сохранения.`,
 snapshot:'Снимок источника и диапазонов',downloadText:'Скачать дословную версию TXT',downloadJson:'Скачать версию с происхождением JSON'
};
const en:Copy<typeof ru>={
 title:'Literal structure versions',
 intro:'The structured-literal-v1 template copies only selected confirmed fields. Other information from the original resume is omitted. Review this separate text before use. Confirmation is your assertion; no model verifies qualifications or meaning.',
 templateLanguage:'This template uses Russian field labels. Source quotations and saved text are not translated when the interface language changes.',
 invalidReply:'A verified version response could not be obtained. Read the history and profile without repeating the write.',
 blocked:'The request outcome is unknown. Read the version history and refresh the structured profile first. The write is not retried automatically.',
 selectLegend:'Records for the version',include:'Include: ',empty:'No confirmed records are available. Confirm the fields and review their source context.',
 guard:'The conservative line-risk-v1 filter blocks lines containing negation, plans or instructions. It may reject a valid line and does not detect every semantic contradiction.',
 risky:name=>`Record “${name}” is unavailable: its source line contains negation, a plan or an instruction. The literal template cannot safely copy this passage.`,
 preview:'Preview literal version',previewTitle:'Preview — not saved yet',
 provenance:(template,source,revision,count)=>`Template: ${template}. Source revision: ${source}; structure revision: ${revision}. Records: ${count}. The source text and exact ranges will be saved with the version.`,
 accept:'I reviewed the text, omissions and context; save this literal version',save:'Save separate immutable version',cancel:'Cancel preview',history:'Read literal version history',
 historyCount:count=>`Saved: ${count}/20. History records confirmation at capture; the current structure may have changed.`,
 summary:(revision,length)=>`structure ${revision} · ${length} characters`,open:id=>`Open version ${id}`,
 savedTitle:'Saved literal version',id:'ID:',created:'Created:',savedMeta:template=>`Template: ${template}; generator: literal-template; no model was used. Confirmation and source describe the capture time.`,
 snapshot:'Source and range snapshot',downloadText:'Download literal version TXT',downloadJson:'Download version with provenance JSON'
};
export const structuredVersionCopy=(locale:UiLocale='ru'):Copy<typeof ru>=>normalizeLocale(locale)==='en'?en:ru;
