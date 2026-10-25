type AnalyticsMessages={
 period:string;title:string;from:string;to:string;version:string;all:string;unlinked:string;versionName:string;unknownVersion:string;reset:string;
 invalid:string;reversed:string;cohort:string;outcomes:string;counts:string;sent:string;responses:string;interviews:string;responseRate:string;interviewRate:string;
 responseDenominator:string;interviewDenominator:string;empty:string;comparison:string;noComparison:string;previous:string;current:string;
 breakdown:string;export:string;definitions:string;definitionText:string;limitation:string;csvHeaders:string[];
};
export const analyticsRu:AnalyticsMessages={
 period:'Период',title:'Период и версия резюме',from:'Начало периода (UTC)',to:'Конец периода (UTC)',version:'Версия резюме',all:'Все версии',unlinked:'Без привязки',versionName:'Версия',unknownVersion:'Недоступная версия',reset:'Сбросить фильтры',
 invalid:'Введите корректные даты.',reversed:'Начало периода не может быть позже окончания.',
 cohort:'Период включает оба дня и отбирает отклики по первому событию после «Планируется» (UTC), а не по дате добавления вакансии. Без периода показаны также запланированные вакансии.',
 outcomes:'Ответы и интервью учитывают всю сохраненную историю выбранных откликов, включая события после периода. Новые отклики имели меньше времени получить ответ.',
 counts:'Вакансий в выборке',sent:'Отправленные',responses:'С ответом',interviews:'С интервью / оффером',responseRate:'Доля ответов',interviewRate:'Доля интервью',
 responseDenominator:'с ответом / отправленных',interviewDenominator:'с интервью или оффером / отправленных',empty:'По этим фильтрам нет вакансий.',
 comparison:'Сравнение с предыдущим периодом',noComparison:'Для сравнения укажите начало и конец периода.',previous:'Предыдущий',current:'Выбранный',
 breakdown:'Результаты по версиям',export:'Экспорт выборки CSV',definitions:'Как считаются показатели',
 definitionText:'Отправленные: есть событие «Отклик отправлен», «Просмотрено», «Приглашение», «Отказ», «Интервью» или «Оффер» с корректной датой. Ответ: приглашение, отказ, интервью или оффер. Интервью: интервью или оффер. Каждый отклик учитывается один раз. Просмотр не считается ответом.',
 limitation:'Статусы вводятся вручную; история может быть неполной. Привязка версии отражает текущее состояние трекера. Сравнение не доказывает причинный эффект правок.',
 csvHeaders:['Вакансия','Статус','Создано','Первое событие после планирования (UTC)','ID версии']
};
export const analyticsEn:AnalyticsMessages={
 period:'Period',title:'Period and resume version',from:'Start date (UTC)',to:'End date (UTC)',version:'Resume version',all:'All versions',unlinked:'Unlinked',versionName:'Version',unknownVersion:'Unavailable version',reset:'Reset filters',
 invalid:'Enter valid dates.',reversed:'Start date must not be after end date.',
 cohort:'Both dates are inclusive. Applications are selected by their first event after Planned (UTC), not when the vacancy was added. With no date filter, planned vacancies are included.',
 outcomes:'Responses and interviews use the entire recorded history of selected applications, including events after the period. Recent applications have had less time to receive responses.',
 counts:'Vacancies selected',sent:'Sent',responses:'With a response',interviews:'With an interview / offer',responseRate:'Response rate',interviewRate:'Interview rate',
 responseDenominator:'with a response / sent',interviewDenominator:'with an interview or offer / sent',empty:'No vacancies match these filters.',
 comparison:'Comparison with the previous period',noComparison:'Set both dates to compare periods.',previous:'Previous',current:'Selected',
 breakdown:'Results by version',export:'Export selection as CSV',definitions:'Metric definitions',
 definitionText:'Sent: a recorded Sent, Viewed, Invitation, Rejection, Interview or Offer event with a valid date. Response: invitation, rejection, interview or offer. Interview: interview or offer. Each application is counted once. A view is not a response.',
 limitation:'Statuses are entered manually and history may be incomplete. Version links reflect the current tracker state. Comparisons do not establish a causal effect of edits.',
 csvHeaders:['Vacancy','Status','Created','First event after planning (UTC)','Version ID']
};
