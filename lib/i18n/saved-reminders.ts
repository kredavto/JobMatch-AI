import {normalizeLocale,type UiLocale,type Copy} from './locale';
const ru={
 title:'Сохранённые задачи трекера',intro:'Задачи сохраняются в аккаунте и видны при открытии приложения. Проверяйте список вручную: автоматическая доставка, почта и push не включены. ICS можно импортировать в свой календарь отдельно.',
 open:'Открыть сохранённые задачи',refresh:'Обновить сохранённые задачи',notices:{create:'Задача сохранена. Внешнее уведомление не отправлялось.',update:'Изменения задачи сохранены. Внешнее уведомление не отправлялось.',complete:'Задача отмечена выполненной. Внешнее уведомление не отправлялось.',cancel:'Задача отменена в приложении. Уже импортированное событие календаря не отменяется автоматически.',delete:'Задача и её история удалены. Уже импортированное событие календаря нужно удалить самостоятельно.'},invalidReply:'Не удалось получить и проверить ответ задач. Прочитайте актуальный список без повтора записи.',
 invalidTime:'Проверьте местную дату 2000–2099, время и именованный часовой пояс IANA.',timeDoesNotExist:'Такого местного времени нет из-за перехода часового пояса. Выберите другое время.',
 icsReady:'ICS подготовлен. Проверьте импорт, время и уведомление в календаре. Доставка зависит от календаря.',icsFailed:'Не удалось подготовить ICS',
 blocked:'Запись не повторяется автоматически. Прочитайте актуальный список и проверьте результат перед новой командой.',mismatch:'Рабочее пространство изменилось. Обновите список задач.',
 stats:(revision:number,count:number)=>`Редакция задач: ${revision}. Всего ${count}/100.`,asOf:'Просроченность рассчитана на',refreshTimeHint:'; обновите список для нового времени.',
 editingUnavailable:'Редактируемая задача завершена, отменена, удалена или достигла лимита изменений. Черновик оставлен; отмените редактирование перед созданием новой задачи.',
 editLegend:'Изменить задачу',createLegend:'Новая задача',application:'Отклик задачи',chooseApplication:'Выберите отклик',taskTitle:'Название задачи',description:'Описание задачи',
 limits:'До 200 символов в названии и 1000 в описании, считая Unicode-символы. Заметки отклика и резюме не добавляются.',localTime:'Местная дата и время задачи',zone:'Часовой пояс задачи',
 zoneHint:'Укажите IANA-пояс, например Europe/Moscow, Europe/Berlin или UTC. Часовой пояс устройства не подставляется вместо выбранного.',durationLabel:'Длительность задачи',duration:(minutes:number)=>`${minutes} минут`,
 checkTime:'Проверить время задачи',fold:'Время встречается дважды — выберите UTC-смещение',chooseOffset:'Выберите вариант',willSave:'Сохранится:',inZone:'в',instant:'Момент:',pastWarning:'Напоминание может быть в прошлом; проверьте дату.',
 accept:'Проверил название, часовой пояс и время; сохранить задачу',save:'Сохранить задачу',saveEdit:'Сохранить изменения задачи',cancelEdit:'Отменить редактирование задачи',show:'Показать задачи',
 filters:{pending:'Запланированные',overdue:'Просроченные',completed:'Выполненные',cancelled:'Отменённые',all:'Все'},
 status:{pending:'Запланирована',completed:'Выполнена',cancelled:'Отменена'},overdue:'Просрочена',empty:'Нет задач для выбранного фильтра.',applicationFallback:'Отклик',
 changedZone:'Текущие правила часового пояса недоступны или отличаются от сохранённого времени. UTC задачи не изменён; проверьте время и при необходимости явно измените задачу.',
 events:(count:number)=>`Событий: ${count}/50.`,edit:(title:string)=>`Изменить задачу «${title}»`,complete:(title:string)=>`Выполнена: ${title}`,cancel:(title:string)=>`Отменить задачу: ${title}`,download:(title:string)=>`Скачать ICS задачи: ${title}`,history:(title:string)=>`История задачи: ${title}`,delete:(title:string)=>`Удалить задачу: ${title}`,
 deleteHint:'Будут удалены задача и вся её история. Уже импортированное событие в календаре нужно удалить самостоятельно.',deleteAccept:'Удалить задачу и историю безвозвратно',deleteConfirm:'Подтвердить удаление задачи',keep:'Оставить задачу',
 historyTitle:'История сохранённой задачи',boardRevision:(revision:number)=>`редакция списка ${revision}`,actions:{create:'Создана',update:'Изменена',complete:'Выполнена',cancel:'Отменена'},
 finalHint:'Изменять можно только запланированную задачу. До 48 изменений, затем завершите/отмените её или явно удалите. Отмена в приложении не отменяет событие, уже импортированное в календарь. Черновик формы исчезает при уходе из раздела.'
};
const en:Copy<typeof ru>={
 title:'Saved tracker tasks',intro:'Tasks are saved in your account and shown when you open the application. Check the list manually: automatic delivery, email and push are not enabled. You can import ICS into your own calendar separately.',
 open:'Open saved tasks',refresh:'Refresh saved tasks',notices:{create:'Task saved. No external notification was sent.',update:'Task changes saved. No external notification was sent.',complete:'Task marked completed. No external notification was sent.',cancel:'Task cancelled in the application. An already imported calendar event is not cancelled automatically.',delete:'The task and its history were deleted. Remove an already imported calendar event yourself.'},invalidReply:'A verified task response could not be obtained. Read the current list without repeating the write.',
 invalidTime:'Check the local date (2000–2099), time and named IANA time zone.',timeDoesNotExist:'This local time does not exist because of a time-zone transition. Choose another time.',
 icsReady:'ICS is ready. Check the import, time and alert in your calendar. Delivery depends on the calendar.',icsFailed:'Could not prepare ICS',
 blocked:'The write is not retried automatically. Read the current list and check the outcome before a new command.',mismatch:'The workspace changed. Refresh the task list.',
 stats:(revision,count)=>`Task revision: ${revision}. Total ${count}/100.`,asOf:'Overdue status was calculated at',refreshTimeHint:'; refresh the list to update it.',
 editingUnavailable:'The task being edited was completed, cancelled, deleted or reached its edit limit. Your draft remains; cancel editing before creating a new task.',
 editLegend:'Edit task',createLegend:'New task',application:'Task application',chooseApplication:'Choose an application',taskTitle:'Task title',description:'Task description',
 limits:'Up to 200 Unicode characters in the title and 1000 in the description. Application notes and resumes are not added.',localTime:'Task local date and time',zone:'Task time zone',
 zoneHint:'Enter a named IANA zone, such as Europe/Moscow, Europe/Berlin or UTC. The device zone does not replace your selection.',durationLabel:'Task duration',duration:minutes=>`${minutes} minutes`,
 checkTime:'Check task time',fold:'This time occurs twice — choose a UTC offset',chooseOffset:'Choose an option',willSave:'Will save:',inZone:'in',instant:'Instant:',pastWarning:'The reminder may be in the past; check the date.',
 accept:'I checked the title, time zone and time; save the task',save:'Save task',saveEdit:'Save task changes',cancelEdit:'Cancel task editing',show:'Show tasks',
 filters:{pending:'Scheduled',overdue:'Overdue',completed:'Completed',cancelled:'Cancelled',all:'All'},status:{pending:'Scheduled',completed:'Completed',cancelled:'Cancelled'},overdue:'Overdue',empty:'No tasks match the selected filter.',applicationFallback:'Application',
 changedZone:'Current time-zone rules are unavailable or differ from the saved local time. The task UTC instant has not changed; review the time and explicitly edit the task if needed.',
 events:count=>`Events: ${count}/50.`,edit:title=>`Edit task “${title}”`,complete:title=>`Mark completed: ${title}`,cancel:title=>`Cancel task: ${title}`,download:title=>`Download task ICS: ${title}`,history:title=>`Task history: ${title}`,delete:title=>`Delete task: ${title}`,
 deleteHint:'This deletes the task and all its history. Remove an already imported calendar event yourself.',deleteAccept:'Permanently delete the task and history',deleteConfirm:'Confirm task deletion',keep:'Keep task',
 historyTitle:'Saved task history',boardRevision:revision=>`list revision ${revision}`,actions:{create:'Created',update:'Updated',complete:'Completed',cancel:'Cancelled'},
 finalHint:'Only scheduled tasks can be edited. After up to 48 edits, complete/cancel or explicitly delete the task. Cancelling in the app does not cancel an event already imported into a calendar. The form draft is lost when leaving this section.'
};
export const savedRemindersCopy=(locale:UiLocale='ru'):Copy<typeof ru>=>normalizeLocale(locale)==='en'?en:ru;
