import {normalizeLocale,type UiLocale,type Copy} from './locale';
const ru={
 title:'Предложения из подписанных полей',intro:'Локальные правила читают разделы «Опыт работы», «Образование», «Сертификаты», «Достижения» и подписанные поля: «Должность», «Организация», «Начало», «Окончание», «Описание», «Номер сертификата». Пустая строка разделяет записи. Свободный текст автоматически не классифицируется. Проверьте тип, каждое поле, даты и дубли: исходный диапазон не подтверждает смысл или истинность.',
 run:'Предложить записи из источника',close:'Закрыть предложения',empty:'Поддерживаемые записи не найдены. Можно продолжить ручное выделение фрагментов.',unavailable:'Источник не подходит для безопасного построения предложений. Используйте ручное выделение.',
 summary:(count:number,rejected:number,outside:number)=>'Предложений: '+count+'. Пропущено неподдерживаемых блоков: '+rejected+'. Строк вне известных разделов: '+outside+'.',
 limit:'Показаны первые 20 предложений. Остальные не перенесены; проверьте источник вручную.',
 draft:'В черновике уже есть поля. Предложение их не заменяет: сначала явно очистите черновик или сохраните нужную запись.',
 adopt:(index:number)=>'Перенести предложение '+index+' в черновик',
 unconfirmed:'Перенос заполняет только черновик. Сохранение неподтверждённой записи и подтверждение её точности — отдельные действия.',
 warnings:{'date-uninterpreted':'Формат, точность или смысл даты неоднозначны. Дата останется дословной: порядок, длительность и стаж не вычисляются.','date-order':'В указанных датах начало позже окончания. Проверьте обе даты; правила их не исправляют.'},
 clear:'Очистить черновик полей',stale:'Источник черновика изменился. Поля сохранены для просмотра, но их нельзя добавить к новому источнику. Явно очистите черновик и выберите актуальные фрагменты.'
};
const en:Copy<typeof ru>={
 title:'Suggestions from labelled fields',intro:'Local rules read Employment, Education, Certifications and Achievements sections with labelled fields: Position, Organization, Start, End, Description and Certificate number. A blank line separates records. Free text is not classified automatically. Review the kind, every field, dates and duplicates: a source range does not prove meaning or truth.',
 run:'Suggest records from source',close:'Close suggestions',empty:'No supported records were found. You can continue selecting source passages manually.',unavailable:'The source cannot be used safely for suggestions. Select passages manually.',
 summary:(count,rejected,outside)=>'Suggestions: '+count+'. Unsupported blocks skipped: '+rejected+'. Lines outside known sections: '+outside+'.',
 limit:'Only the first 20 suggestions are shown. The rest were not copied; review the source manually.',
 draft:'The draft already has fields. Suggestions do not replace them: explicitly clear the draft first, or save the record you need.',
 adopt:index=>'Copy suggestion '+index+' to draft',
 unconfirmed:'Copying only fills the draft. Saving an unconfirmed record and confirming its accuracy are separate actions.',
 warnings:{'date-uninterpreted':'The date format, precision or meaning is ambiguous. It stays verbatim: order, duration and experience are not inferred.','date-order':'The stated start is later than the end. Review both dates; the rules do not correct them.'},
 clear:'Clear draft fields',stale:'The draft source changed. Fields remain visible, but cannot be added to the new source. Explicitly clear the draft and select current passages.'
};
export const structuredProposalCopy=(locale:UiLocale='ru'):Copy<typeof ru>=>normalizeLocale(locale)==='en'?en:ru;
