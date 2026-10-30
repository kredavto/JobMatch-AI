import type {Copy} from './locale';
const ru={
 region:'Настройки приложения',device:'Приложение на устройстве',
 install:'Откройте меню браузера и выберите «Установить приложение» или «На экран Домой», если этот пункт доступен. Для установки и первого открытия нужен интернет.',
 offline:'При потере сети доступен только справочный офлайн-экран. Резюме, история и ответы API не сохраняются в офлайн-кэше приложения. Не закрывайте вкладку с несохраненным текстом; автоматической отправки изменений нет.',
 data:'Данные и интеграции',hosting:'Данные аккаунта хранятся в настроенном PostgreSQL/Supabase; приложение предназначено для размещения на Vercel. Допустимое размещение персональных данных, сроки хранения и удаление резервных копий должен подтвердить оператор.',
 capabilities:'Основной анализ использует консервативные правила. Собственный AI-разбор и изолированный parser/OCR требуют отдельной настройки оператором; наличие интерфейса не подтверждает их живую приёмку. Семантически проверенное переписывание ещё не принято. Приложение не выполняет запись в hh.ru; пароль hh.ru не нужен.',
 export:'Экспорт профиля, версий и откликов',facts:'Скачать полную историю фактов (NDJSON)',
 archive:'Для полного архива нужны все шесть файлов: основной JSON, история фактов, задачи, структурированный профиль дословные версии и журнал явного принятия текста из отдельной панели ниже. JSON содержит журнал до exported_at; файлы не составляют единый транзакционный снимок. В конце каждого NDJSON должна быть строка complete: true, иначе файл неполный. Лимит истории: 5000 снимков или 50 МиБ; для большего объема нужен расширенный экспорт.',
 tasks:'Экспорт задач',reminders:'Скачать сохранённые задачи и историю (NDJSON)',taskLimits:'До 100 задач и 50 событий на задачу. В конце должен быть complete: true. Если список изменён во время чтения или экспорт прерван, файл неполный. Отменённые и выполненные задачи тоже включаются.',
 structure:'Экспорт структуры',profile:'Скачать структурированный профиль и его источник',versions:'Скачать все дословные версии с происхождением (NDJSON)',versionLimits:'До 20 версий на аккаунт; экспорт до 40 МиБ. Версии содержат сохранённый источник. Сброс структуры не удаляет их; удаление аккаунта удаляет их из активной базы.',
 deleteTitle:'Удалить аккаунт и данные',deleteHelp:'Удалятся профиль, версии, отклики, задачи, структура, сессии и журнал аккаунта из активной базы. Скачанные вами файлы останутся на вашем устройстве. Сроки удаления резервных копий определяет оператор.',
 confirm:'Введите УДАЛИТЬ',remove:'Удалить безвозвратно',ownerUnknown:'Владелец профиля не установлен. Обновите страницу перед экспортом или удалением.'
} as const;
const en:Copy<typeof ru>={
 region:'Application settings',device:'App on your device',
 install:'Open your browser menu and choose Install app or Add to Home Screen if available. Installation and the first visit require an internet connection.',
 offline:'When offline, only the information screen is available. Resumes, history and API responses are not saved in the app offline cache. Keep this tab open with unsaved text; changes are not sent automatically.',
 data:'Data and integrations',hosting:'Account data is stored in the configured PostgreSQL/Supabase database; the app is designed for Vercel hosting. The operator must confirm permitted personal-data placement, retention and deletion of backup copies.',
 capabilities:'The main analysis uses conservative rules. Own-model AI review and isolated parser/OCR require separate operator configuration; a UI does not establish live acceptance. Semantically verified rewriting has not been accepted. The app does not write to hh.ru; your hh.ru password is not needed.',
 export:'Export profile, versions and applications',facts:'Download complete fact history (NDJSON)',
 archive:'A complete archive requires all six files: the main JSON, fact history, tasks, structured profile literal versions and the explicit text acceptance journal from the separate panel below. JSON includes the log up to exported_at; these files are not one transactional snapshot. Every NDJSON must end with complete: true, otherwise it is incomplete. Fact history is limited to 5000 snapshots or 50 MiB; larger histories need an extended export.',
 tasks:'Export tasks',reminders:'Download saved tasks and history (NDJSON)',taskLimits:'Up to 100 tasks and 50 events per task. The final record must have complete: true. If the list changes while reading or export is interrupted, the file is incomplete. Cancelled and completed tasks are included.',
 structure:'Export structured data',profile:'Download structured profile and its source',versions:'Download all literal versions with provenance (NDJSON)',versionLimits:'Up to 20 versions per account; export up to 40 MiB. Versions include their saved source. Resetting the structure does not remove them; account deletion removes them from the active database.',
 deleteTitle:'Delete account and data',deleteHelp:'Profile, versions, applications, tasks, structure, sessions and account log are removed from the active database. Downloaded files remain on your device. The operator determines backup-copy deletion periods.',
 confirm:'Type УДАЛИТЬ',remove:'Delete permanently',ownerUnknown:'The profile owner is unknown. Reload the page before exporting or deleting.'
};
export const settingsCopy={ru,en};
