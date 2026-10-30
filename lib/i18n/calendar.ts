import type {Copy} from './locale';
const ru={
 title:'Напоминание по отклику',intro:'Подготовьте файл ICS для своего календаря. Приложение не создает событие, не отправляет сообщения и не меняет статус отклика. Черновик не сохраняется при уходе из раздела.',
 empty:'Сначала добавьте вакансию в трекер.',application:'Отклик для напоминания',chooseApplication:'Выберите отклик',kind:'Тип события',
 kinds:{'Интервью':'Интервью','Повторный контакт':'Повторный контакт','Подготовка к интервью':'Подготовка к интервью'},
 when:'Дата и время в выбранном часовом поясе',zone:'Часовой пояс IANA для файла',zoneHelp:'Начальное значение — пояс устройства. Проверьте или укажите именованный пояс, например Europe/Moscow. Поддерживаются даты 2000–2099.',
 offset:'Выберите повторяющееся время',chooseOffset:'Выберите UTC-смещение',ambiguous:'Это местное время встречается дважды при переходе часов. Выберите нужное смещение; без выбора файл не создаётся.',
 preview:'Время в файле (UTC):',previewHelp:'Календарь отображает его в своем часовом поясе.',
 duration:'Длительность',minute:(count:number)=>count+' минут',description:'Описание события',alarm:'Добавить уведомление за 15 минут',
 privacy:'В файл попадут название выбранной вакансии и введенное описание. Заметки трекера и резюме не добавляются. Уведомления и повторный импорт зависят от календаря: проверьте настройки и отсутствие дубликатов после импорта.',
 template:'Название типа события в файле остаётся на русском; название вакансии и описание передаются дословно.',
 download:'Скачать напоминание (ICS)',ready:'Файл подготовлен. Импортируйте его в календарь и проверьте время и уведомление. Событие пока не создано.',
 errors:{application:'Выберите отклик',time:'Укажите корректную местную дату 2000–2099 и время с точностью до минуты.',zone:'Укажите доступный именованный часовой пояс IANA.',gap:'Такого местного времени нет из-за перехода часов. Выберите другое время.',choose:'Выберите UTC-смещение повторяющегося времени.',offset:'Выбранное смещение не соответствует времени и поясу. Выберите его заново.',prepare:'Не удалось подготовить файл. Повторите скачивание по желанию.'}
} as const;
const en:Copy<typeof ru>={
 title:'Application calendar reminder',intro:'Prepare an ICS file for your calendar. The app does not create an event, send messages or change the application status. This draft is cleared when you leave this section.',
 empty:'Add a vacancy to the tracker first.',application:'Application for reminder',chooseApplication:'Choose an application',kind:'Event type',
 kinds:{'Интервью':'Interview','Повторный контакт':'Follow-up','Подготовка к интервью':'Interview preparation'},
 when:'Date and time in the selected time zone',zone:'IANA time zone for the file',zoneHelp:'The initial value is the device zone. Check it or enter a named zone, such as Europe/Moscow. Dates from 2000 to 2099 are supported.',
 offset:'Choose the repeated time',chooseOffset:'Choose a UTC offset',ambiguous:'This local time occurs twice during a clock change. Choose the intended offset; no file is created until you choose.',
 preview:'Time in the file (UTC):',previewHelp:'Your calendar displays it in its own time zone.',
 duration:'Duration',minute:(count:number)=>count+' minutes',description:'Event description',alarm:'Add a reminder 15 minutes before',
 privacy:'The file includes the selected vacancy title and your description. Tracker notes and resumes are excluded. Notifications and repeated imports depend on your calendar: check its settings and look for duplicates after import.',
 template:'The event type in the file remains in Russian; the vacancy title and description are copied verbatim.',
 download:'Download reminder (ICS)',ready:'The file is ready. Import it into your calendar and check the time and notification. No event has been created yet.',
 errors:{application:'Choose an application',time:'Enter a valid local date from 2000 to 2099 and a time to the minute.',zone:'Enter an available named IANA time zone.',gap:'This local time does not exist because of a clock change. Choose another time.',choose:'Choose the UTC offset for this repeated local time.',offset:'The selected offset does not match the time and zone. Choose it again.',prepare:'The file could not be prepared. You may try downloading again.'}
};
export const calendarCopy={ru,en};
export type CalendarError=keyof typeof ru.errors;
