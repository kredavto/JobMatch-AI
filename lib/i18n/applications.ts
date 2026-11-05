import {normalizeLocale,type UiLocale,type Copy} from './locale';
import {applicationFilterRu,applicationFilterEn} from './application-filter';
const ru={
specialty:{label:'Метка специальности',unclassified:'Без метки',edit:'Изменить метку',help:'Метка вводится вручную, без автоматического определения. Очистка меняет только черновик до сохранения.',unknown:'Старая метка имеет неизвестный формат. Она сохранится, пока вы явно не замените или не очистите её.',invalid:'Не более 120 символов, без пробелов по краям и управляющих символов.',conflict:'Сохранённая метка изменилась. Сравните значения перед записью.',saved:'Сохранённая метка',compare:'Сравнил с текущей меткой · продолжить редактирование',clear:'Очистить черновик метки',save:'Сохранить метку',cancel:'Отменить правку метки',pending:'Отмена удаляет только локальный черновик и не отменяет отправленный запрос.'},
title:'Движение к следующей работе',help:'Статусы обновляются вручную. Приложение не отправляет отклики.',
titleField:'Вакансия / компания',versionField:'Версия резюме для отклика',noLink:'Без привязки',version:(value:number)=>'Версия '+value,add:'Добавить в трекер',
filter:applicationFilterRu,linkedVersion:'Связанная версия резюме',status:'Статус',note:'Заметки',
unsaved:'Заметка не сохранена. Сначала сохраните её перед сменой статуса или версии резюме.',
conflict:'Сохраненная заметка изменилась. Сравните тексты перед записью.',savedNote:'Сохраненная заметка',
compare:'Сравнил с текущей заметкой · продолжить редактирование',saveNote:'Сохранить заметку',cancel:'Отменить правку заметки',
cancelPending:'Отмена правки удаляет только локальный черновик и не отменяет уже отправленный запрос.',
history:'История статусов отклика',
dateHelp:'Время событий показано в UTC. Если в старой записи нет времени или подтверждённого часового пояса, это отмечено отдельно.',
statuses:{'Планируется':'Планируется','Отклик отправлен':'Отклик отправлен','Просмотрено':'Просмотрено','Приглашение':'Приглашение','Отказ':'Отказ','Интервью':'Интервью','Оффер':'Оффер'}
};
const en:Copy<typeof ru>={
specialty:{label:'Specialty label',unclassified:'Unclassified',edit:'Edit specialty label',help:'Enter a label manually, without automatic inference. Clear changes only the draft until you save.',unknown:'The legacy label has an unknown format. It stays unchanged unless you explicitly replace or clear it.',invalid:'Use up to 120 characters, without leading or trailing whitespace or control characters.',conflict:'The saved label changed. Compare the values before writing.',saved:'Saved specialty label',compare:'I compared the current label · continue editing',clear:'Clear label draft',save:'Save specialty label',cancel:'Discard label edits',pending:'Discarding clears only the local draft and does not cancel a submitted request.'},
title:'Your applications',help:'Update statuses manually. The application does not send job applications.',
titleField:'Vacancy / company',versionField:'Resume version for the application',noLink:'Unlinked',version:(value:number)=>'Version '+value,add:'Add to tracker',
filter:applicationFilterEn,linkedVersion:'Linked resume version',status:'Status',note:'Notes',
unsaved:'This note is not saved. Save it before changing the status or resume version.',
conflict:'The saved note changed. Compare the texts before writing.',savedNote:'Saved note',
compare:'I compared the current note · continue editing',saveNote:'Save note',cancel:'Discard note edits',
cancelPending:'Discarding edits clears only the local draft and does not cancel submitted requests.',
history:'Application status history',
dateHelp:'Event times are shown in UTC. Older records without a time or confirmed UTC offset are labelled separately.',
statuses:{'Планируется':'Planned','Отклик отправлен':'Application sent','Просмотрено':'Viewed','Приглашение':'Invitation','Отказ':'Rejected','Интервью':'Interview','Оффер':'Offer'}
};
export const applicationsCopy={ru,en};
/** Presentation only: unknown future status values remain literal. */
export function applicationStatusText(value:string,locale:UiLocale='ru'){const statuses=applicationsCopy[normalizeLocale(locale)].statuses;return Object.hasOwn(statuses,value)?statuses[value as keyof typeof statuses]:value;}
