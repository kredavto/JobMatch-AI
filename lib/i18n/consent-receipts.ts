import type {Copy} from './locale';
const ru={
 region:'Журнал явного принятия текста',title:'Принятие опубликованных условий',
 intro:'Загрузите текст, опубликованный оператором, и прочитайте его перед явным принятием. Новые записи не восстанавливают старые согласия.',
 noticeLanguage:'Язык текста условий',load:'Загрузить актуальный текст и журнал',loading:'Загружаем…',noNotice:'Оператор ещё не опубликовал текст на выбранном языке. Принятие недоступно.',
 off:'Создание новых записей пока выключено оператором. Историю можно читать и экспортировать.',ownerUnknown:'Для чтения журнала нужен известный исходный аккаунт.',
 noticeTitle:'Опубликованный текст',version:'Версия',language:'Язык текста',digest:'SHA-256 точного текста',recordedAt:'Серверное время записи',
 checkbox:'Я прочитал(а) и принимаю весь показанный текст на указанном языке.',
 accept:'Явно принять этот текст',saving:'Записываем принятие…',already:'Для этого текста уже есть запись данного аккаунта.',
 recordDetails:'Просмотреть записанное принятие',saved:'Заявление о принятии записано.',savedReadFailed:'Принятие записано, но обновить журнал не удалось. Загрузите его перед следующим действием.',
 unknownOutcome:'Результат записи неизвестен. Загрузите журнал перед новым явным действием; автоматического повтора нет.',
 invalidReply:'Ответ журнала не прошёл проверку. Загрузите его заново без повторной записи.',
 loadFailed:'Не удалось загрузить журнал. Повторите чтение вручную.',downloadFailed:'Файл не создан. Повторите экспорт вручную.',
 blocked:'Перед новой записью загрузите актуальный журнал.',limit:'Достигнут лимит 200 записей. Обратитесь к оператору.',
 history:'Записи аккаунта',count:(n:number)=>'Всего записей: '+n,more:'Загрузить следующие записи',empty:'Явных записей принятия пока нет.',
 export:'Скачать полный журнал принятия (JSON)',exporting:'Проверяем полный журнал…',exportHelp:'Экспорт включает точные тексты и записи до зафиксированного номера. Новые записи после него не добавляются в файл.',
 legacy:'Историческое техническое наблюдение',legacyHelp:'Эта дата относится к старой записи workspace. Она не доказывает дату, язык или точный текст явного принятия.',
 boundary:'Запись сохраняет заявление этого аккаунта. Она не является цифровой подписью, проверкой личности или юридическим одобрением. Решения о размещении, сроках хранения и удалении копий принимает оператор.',
 localOnly:'Скачанный файл остаётся на вашем устройстве. Для удаления данных аккаунта используйте действие удаления в настройках.'
} as const;
const en:Copy<typeof ru>={
 region:'Explicit text acceptance journal',title:'Acceptance of published terms',
 intro:'Load the text published by the operator and read it before explicitly accepting. New records do not reconstruct earlier consent.',
 noticeLanguage:'Terms text language',load:'Load current text and journal',loading:'Loading…',noNotice:'The operator has not published text in the selected language. Acceptance is unavailable.',
 off:'The operator has disabled new acceptance records. History remains readable and exportable.',ownerUnknown:'A known original account is required to read the journal.',
 noticeTitle:'Published text',version:'Version',language:'Text language',digest:'SHA-256 of the exact text',recordedAt:'Server recording time',
 checkbox:'I have read and accept the entire displayed text in the indicated language.',
 accept:'Explicitly accept this text',saving:'Recording acceptance…',already:'This account already has a record for this text.',
 recordDetails:'View recorded acceptance',saved:'The acceptance statement was recorded.',savedReadFailed:'Acceptance was recorded, but the journal could not be refreshed. Load it before another action.',
 unknownOutcome:'The write outcome is unknown. Load the journal before another explicit action; there is no automatic retry.',
 invalidReply:'The journal response failed validation. Reload it without repeating the write.',
 loadFailed:'The journal could not be loaded. Retry reading manually.',downloadFailed:'No file was created. Retry export manually.',
 blocked:'Load the current journal before a new write.',limit:'The limit of 200 records has been reached. Contact the operator.',
 history:'Account records',count:(n:number)=>'Total records: '+n,more:'Load more records',empty:'No explicit acceptance records yet.',
 export:'Download complete acceptance journal (JSON)',exporting:'Checking the complete journal…',exportHelp:'The export includes exact texts and records through a fixed sequence number. Later records are not added to the file.',
 legacy:'Historical technical observation',legacyHelp:'This date belongs to the earlier workspace observation. It does not establish the date, language or exact text of explicit acceptance.',
 boundary:'A record preserves this account’s statement. It is not a digital signature, identity verification or legal approval. The operator decides placement, retention and backup-copy deletion.',
 localOnly:'Downloaded files remain on your device. Use account deletion in settings to remove account data.'
};
export const consentCopy={ru,en};
