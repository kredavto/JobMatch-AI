import type {Application} from './db';
import {specialtyLabel} from './application-specialty';
export const APPLICATION_STATUSES=['Планируется','Отклик отправлен','Просмотрено','Приглашение','Отказ','Интервью','Оффер'] as const;
export type ApplicationFilter={query:string;status:string;version:string};
export const EMPTY_APPLICATION_FILTER:ApplicationFilter={query:'',status:'',version:''};
const normalize=(value:string)=>value.normalize('NFC').toLocaleLowerCase('ru-RU').replaceAll('ё','е').replace(/\s+/g,' ').trim();
/** All query words must occur in saved title/notes/specialty; filters combine with AND. No mutation. */
export function filterApplications(applications:Application[],filter:ApplicationFilter):Application[]{
 const words=normalize(filter.query).split(' ').filter(Boolean);
 return applications.filter(application=>{
  const text=normalize(application.title+' '+application.note+' '+(specialtyLabel(application)??''));
  return words.every(word=>text.includes(word))&&(!filter.status||application.status===filter.status)&&(!filter.version||(filter.version==='unlinked'?!application.resumeVersionId:application.resumeVersionId===filter.version));
 });
}
