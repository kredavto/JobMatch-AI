import type {Copy} from './locale';
import {normalizeLocale,type UiLocale} from './locale';
import type {APPLICATION_STATUSES} from '../application-filter';
const ru={
 title:'Движение к следующей работе',manual:'Статусы обновляются вручную. Приложение не отправляет отклики.',
 vacancy:'Вакансия / компания',version:'Версия резюме для отклика',versionName:'Версия',unlinked:'Без привязки',add:'Добавить в трекер',
 linkedVersion:'Связанная версия резюме',status:'Статус',notes:'Заметки',
 unsaved:'Заметка не сохранена. Сначала сохраните её перед сменой статуса или версии резюме.',
 conflict:'Сохраненная заметка изменилась. Сравните тексты перед записью.',savedNote:'Сохраненная заметка',save:'Сохранить заметку',cancel:'Отменить правку заметки',
 history:'История статусов',datePolicy:'Время с указанным поясом показано в UTC. Даты без времени сохраняют точность до дня; значения без пояса или в неподдерживаемом формате показаны без пересчёта.',
 statuses:{'Планируется':'Планируется','Отклик отправлен':'Отклик отправлен','Просмотрено':'Просмотрено','Приглашение':'Приглашение','Отказ':'Отказ','Интервью':'Интервью','Оффер':'Оффер'}
} as const;
const en:Copy<typeof ru>={
 title:'Progress towards your next job',manual:'Statuses are updated manually. The app does not send applications.',
 vacancy:'Vacancy / company',version:'Resume version for application',versionName:'Version',unlinked:'Unlinked',add:'Add to tracker',
 linkedVersion:'Linked resume version',status:'Status',notes:'Notes',
 unsaved:'The note is not saved. Save it before changing the status or resume version.',
 conflict:'The saved note changed. Compare the texts before saving.',savedNote:'Saved note',save:'Save note',cancel:'Cancel note edit',
 history:'Status history',datePolicy:'Times with an explicit zone are shown in UTC. Day-only records keep day precision; values without a zone or in an unsupported format are shown without conversion.',
 statuses:{'Планируется':'Planned','Отклик отправлен':'Sent','Просмотрено':'Viewed','Приглашение':'Invitation','Отказ':'Rejection','Интервью':'Interview','Оффер':'Offer'}
};
export const trackerCopy={ru,en};
export function applicationStatusLabel(status:string,requestedLocale:UiLocale='ru'){
 const labels=trackerCopy[normalizeLocale(requestedLocale)].statuses;
 return Object.prototype.hasOwnProperty.call(labels,status)?labels[status as typeof APPLICATION_STATUSES[number]]:status;
}
