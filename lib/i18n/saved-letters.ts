import {normalizeLocale,type UiLocale,type Copy} from './locale';
const ru={
region:'Серверные версии писем',
help:'Сервер хранит выбранные факты с источниками, вакансию, текст письма и сведения о вашем просмотре правок. Это дополнительные персональные данные. Сохранение не проверяет истинность или смысл; письмо не отправляется работодателю. Версии удаляются вместе с аккаунтом.',
serviceHelp:'Сервис по умолчанию отключён до отдельной настройки оператором. При включении можно сохранить до 50 версий. Дата принятия относится к этой версии; исходники могли измениться позже.',
ownerMissing:'Не удалось определить владельца. Серверные операции недоступны.',
read:'Прочитать историю писем',working:'Проверяем серверную версию…',
needsHistory:'Новая запись заблокирована до явного чтения истории. Не повторяйте сохранение автоматически. При уходе со страницы запрос мог завершиться; откройте историю в «Моих версиях».',
count:(value:number)=>'Прочитано версий: '+value+'/50.',empty:'В прочитанной истории писем пока нет.',
letter:(value:number)=>'Письмо '+value,historyRevision:(value:number)=>'ревизия профиля '+value,open:(value:number)=>'Открыть письмо '+value,
acceptedRegion:'Принятое серверное письмо',acceptedTitle:(value:number)=>'Принятое письмо '+value,
acceptedHelp:'Исторический текст; не заменяет текущий черновик. Смысл и истинность независимо не проверены.',
provenance:'Источники и происхождение принятого письма',template:'Шаблон',noModel:'Модель не использовалась приложением при создании шаблона.',profileRevision:'Ревизия профиля',vacancy:'Вакансия этой версии',confirmed:'подтверждено пользователем',
reviewCount:(value:number)=>'Отмечено изменений при принятии: '+value+'.',
reviewHelp:'Это записанное заявление о просмотре, не доказательство личности или смысловой проверки.',
jsonHelp:'JSON включает источники и подпись квитанции. Скачанный файл редактируем; браузер не доказывает подлинность подписи офлайн.',
downloadTxt:'Скачать принятое письмо TXT',downloadJson:'Скачать принятую версию JSON с источниками',
saveRegion:'Принятие серверного письма',saveTitle:'Сохранить отдельную серверную версию',
saveHelp:'Сначала завершите локальный просмотр письма и правок, затем явно прочитайте историю. Предпросмотр передаёт выбранные источники приложению, но не создаёт версию. Хранение произойдёт только после отдельного принятия. Несохранённый черновик хранится только в этой вкладке и исчезает при уходе из редактора, выходе или перезагрузке. Чтение актуального профиля не заменяет его; при смене источников потребуется новый просмотр.',
missingBasis:'Подготовьте письмо и завершите все локальные подтверждения.',
consent:'Разрешаю передать приложению выбранные источники и вакансию и хранить их с письмом после моего отдельного принятия',
preview:'Получить серверный предпросмотр письма',previewWorking:'Проверяем предпросмотр…',
previewTitle:'Предпросмотр серверной версии',previewSources:'Источники передаваемой версии',
previewHelp:'Будут сохранены именно эти текст и источники. Смысл независимо не проверен. Предпросмотр действует не более 10 минут; изменения черновика или синхронизации сбрасывают принятие.',
expired:'Предпросмотр истёк. Получите новый и примите его отдельно.',
accept:'Я принимаю именно показанную серверную версию письма',save:'Подтверждаю · сохранить серверное письмо',
errors:{session:'Восстановите вход в исходный аккаунт.',changed:'Данные изменились. Перечитайте историю и загрузите актуальный профиль перед новым предпросмотром.',unavailable:'Серверное сохранение писем пока недоступно. Локальный TXT/JSON остаётся доступен.',rate:'Лимит запросов. Повторите чтение вручную позже.',failed:'Ответ не получен или не прошёл проверку. Автоматического повтора нет.',unknownWrite:'Результат сохранения неизвестен. Сначала перечитайте историю. '},
notices:{read:'История прочитана. Новых записей не создано.',found:'Предыдущая попытка найдена и проверена в истории. Повторная запись не отправлялась.',pending:'Попытка не найдена в прочитанной истории; она могла ещё завершаться. Автоповтора нет. Для новой записи нужны новый предпросмотр и отдельное принятие.',saved:(version:number)=>'Сохранена серверная версия '+version+'. Текущий черновик и профиль не изменены.'}
};
const en:Copy<typeof ru>={
region:'Saved letter versions',
help:'The server stores selected facts and their sources, the vacancy, letter text and your reported review of edits. This is additional personal data. Saving does not verify truth or meaning; the letter is not sent to an employer. Versions are deleted with the account.',
serviceHelp:'The service is disabled by default until separately configured by the operator. When enabled, up to 50 versions can be saved. The acceptance date refers to this version; sources may have changed later.',
ownerMissing:'The owner could not be identified. Server operations are unavailable.',
read:'Read letter history',working:'Checking server version…',
needsHistory:'New writes are blocked until you explicitly read the history. Do not retry saving automatically. A request may have completed after leaving this section; open history in My versions.',
count:(value:number)=>'Versions read: '+value+'/50.',empty:'There are no letters in the history read.',
letter:(value:number)=>'Letter '+value,historyRevision:(value:number)=>'profile revision '+value,open:(value:number)=>'Open letter '+value,
acceptedRegion:'Accepted server letter',acceptedTitle:(value:number)=>'Accepted letter '+value,
acceptedHelp:'Historical text; it does not replace the current draft. Meaning and truth have not been independently verified.',
provenance:'Sources and provenance of the accepted letter',template:'Template',noModel:'The application did not call a model to generate this template.',profileRevision:'Profile revision',vacancy:'Vacancy for this version',confirmed:'confirmed by the user',
reviewCount:(value:number)=>'Edits acknowledged at acceptance: '+value+'.',
reviewHelp:'This is a recorded review statement, not proof of identity or semantic verification.',
jsonHelp:'JSON includes sources and the receipt signature. The downloaded file is editable; the browser does not prove signature authenticity offline.',
downloadTxt:'Download accepted letter TXT',downloadJson:'Download accepted version JSON with sources',
saveRegion:'Accept server letter',saveTitle:'Save a separate server version',
saveHelp:'Complete the local letter and edit review, then explicitly read history. Preview sends the selected sources to the application but does not create a version. Storage occurs only after separate acceptance. An unsaved draft stays only in this tab and disappears when you leave the editor, sign out or reload. Reading the current profile does not replace it; changed sources require a new review.',
missingBasis:'Prepare a letter and complete every local acknowledgement.',
consent:'Allow the selected sources and vacancy to be sent to the application and stored with the letter after my separate acceptance',
preview:'Get server letter preview',previewWorking:'Checking preview…',
previewTitle:'Server version preview',previewSources:'Sources of the version being sent',
previewHelp:'Exactly this text and these sources will be stored. Meaning is not independently verified. The preview lasts at most 10 minutes; draft or synchronization changes reset acceptance.',
expired:'The preview expired. Get a new preview and accept it separately.',
accept:'I accept exactly the server letter version shown',save:'Confirm · save server letter',
errors:{session:'Sign in again to the original account.',changed:'Data changed. Read history and load the current profile before a new preview.',unavailable:'Server letter storage is unavailable. Local TXT/JSON remains available.',rate:'Request limit reached. Retry reading manually later.',failed:'No response was received or it failed validation. There is no automatic retry.',unknownWrite:'The save outcome is unknown. Read history first. '},
notices:{read:'History read. No new records were created.',found:'The previous attempt was found and validated in history. No repeated write was sent.',pending:'The attempt was not found in the history read; it may still be completing. There is no automatic retry. A new write needs a new preview and separate acceptance.',saved:(version:number)=>'Server version '+version+' saved. The current draft and profile were not changed.'}
};
export const savedLettersCopy={ru,en};
export type SavedLetterFeedback={status:number;write:boolean};
export type SavedLetterNotice={key:'read'|'found'|'pending'}|{key:'saved';version:number};
export function savedLetterErrorText(error:SavedLetterFeedback,locale:UiLocale='ru'){const t=savedLettersCopy[normalizeLocale(locale)].errors;const message=error.status===401?t.session:error.status===409?t.changed:error.status===503?t.unavailable:error.status===429?t.rate:t.failed;return(error.write?t.unknownWrite:'')+message;}
export function savedLetterNoticeText(notice:SavedLetterNotice,locale:UiLocale='ru'){const t=savedLettersCopy[normalizeLocale(locale)].notices;return notice.key==='saved'?t.saved(notice.version):t[notice.key];}
