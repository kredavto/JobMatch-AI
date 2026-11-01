# План развития

## Выполнено в раннем MVP
- RU responsive интерфейс, регистрация/вход, импорт и ручной текст.
- Подтверждение строк-фактов, оригинал, цели поиска.
- Парсер правил, match/evidence/confidence, честный score.
- Дословное продвижение фактов, выбор/отмена, сравнение, сохранение и восстановление.
- TXT/JSON, ручной hh.ru перенос, трекер, rates, CSV, экспорт/удаление.
- PostgreSQL/Supabase RLS, серверные модули, тесты и Vercel.

## Выполнено: надежность, итерация 0.2
- Централизованные квоты PostgreSQL для API приложения: service 120/мин, import 10/мин, analysis 20/мин. Атомарный счетчик на пользователя, fail-closed при ошибке базы.
- Ограничение входящего потока, лимит файла 4 МБ; проверка DOCX-архива до парсера, UTF-8 и сигнатур, ограничение распаковки.
- Безопасные ошибки без путей/секретов; 413 и 429 с Retry-After; усилена проверка Origin.
- Снимок evidence и ревизии профиля в новых версиях; история происхождения восстановленной версии.
- Привязка отклика к принадлежащей пользователю версии; старые данные остаются совместимыми.
- Unit/route tests для вредоносных файлов, конкурирующих ревизий и связей; расширен E2E.

## Выполнено: восстановление синхронизации, итерация 0.2.1
- При 409, потере ответа или ошибке сервера запись не повторяется автоматически.
- Загрузка актуальной ревизии сохраняет введенные тексты резюме, вакансии и цели в открытой вкладке; серверные тексты доступны для сравнения.
- Устаревший анализ сбрасывается после синхронизации. При начальной недоступности сервера показана повторная загрузка.
- Черновики не сохраняются на диск и исчезают после закрытия/перезагрузки вкладки. Полноценный offline режим и автоматическое слияние не реализованы.

## Выполнено: история фактов, итерация 0.3
- Отдельная таблица fact_history со снимками фактов; триггер фиксирует изменения в одной транзакции с workspace.
- Начальные снимки существующих профилей помечены baseline; даты старых подтверждений не реконструируются.
- Owner-only RLS с проверкой активной сессии; клиенты не имеют INSERT/UPDATE/DELETE истории; каскадное удаление аккаунта.
- Просмотр 20 снимков на страницу, скачивание снимка и потоковый экспорт всей истории NDJSON.
- Новые UUID фактов при переимпорте; подтверждения не наследуются.
- Это первый шаг нормализации: текущие факты, версии и отклики пока остаются в JSONB workspace.

## Выполнено: реляционные сущности, итерация 0.4
- Текущие факты, версии, отклики и события откликов вынесены в profile_facts, resume_versions, applications, application_events.
- Сервер читает согласованный снимок через read_workspace RPC из отдельных таблиц.
- Составной FK (user_id, resume_version_id) запрещает привязку чужой или отсутствующей версии; события связаны с откликом FK.
- Запись совместима со старым JSON API: триггер синхронизирует таблицы атомарно. JSON пока сохраняется для совместимости и отката.
- Клиентам разрешено только чтение собственных строк при активной сессии; прямые изменения реляционных таблиц закрыты.
- Сохранены старые ID, порядок, даты как исходные строки, optional поля и снимки evidence. Удаление аккаунта каскадное.

## Выполнено: защищенная запись, итерация 0.5
- Прямые INSERT/UPDATE/DELETE workspace, audit_log и consent_records закрыты для клиента. SELECT требует активной сессии.
- save_workspace сохраняет совместимый контракт, но вызывает private commit с проверкой владельца, сессии, ревизии и разрешенной операции.
- Импорт не подтверждает факты; verify меняет только флаг, добавление факта сохраняет прежние факты.
- Старые версии неизменяемы; новая версия проходит проверку evidence, снимка фактов, ревизии и точного текста. Восстановление сохраняет данные исходной версии.
- Изменение отклика затрагивает одну запись; события добавляются в конец без переписывания истории.
- Совместимый JSON payload остается. Это защита границы записи, а не окончательный отказ от snapshot API.

## Выполнено: безопасный offline fallback, итерация 0.6
- Service worker кеширует только offline.html и три значка; API, рабочие страницы и черновики не попадают в Cache Storage.
- На открытой странице есть уведомление о потере сети. Фоновой синхронизации, очереди изменений и автоматических повторов нет.
- Для нового открытия без сети доступна справочная страница; после очистки кеша — минимальный текстовый fallback.
- Manifest дополнен id/scope и PNG-значками 192/512; в настройках есть инструкция установки через браузер.
- Offline-сценарий проверен в Chromium на мобильном viewport. Установка на физических Android/iOS и полный WCAG-аудит остаются отдельной проверкой.

## Выполнено: базовая доступность, итерация 0.7
- Skip link, фокус на заголовке после перехода между разделами, скрытие декоративных значков от скринридера.
- Подпись таблицы и заголовки колонок; горизонтальная прокрутка доступна с клавиатуры.
- Исправлен найденный axe недостаточный контраст подзаголовка и номеров шагов; видимый фокус select/таблицы, кнопки не ниже 44 px.
- Добавлены Playwright/axe проверки входа, восьми разделов и результатов анализа на viewport 1280 и 390 px.
- Это ограниченный автоматический аудит WCAG 2/2.1 A/AA, а не подтверждение полной доступности. Ручная проверка скринридером и RU/EN словари остаются в плане.

## Выполнено: основа локализации, итерация 0.8
- Типизированные RU/EN словари для навигации, результатов сопоставления, подписей входа, загрузки/сети, клиентских fallback-ошибок и metadata.
- Разделы используют стабильные TabId, а не русские названия. Восстановление синхронизации использует явное состояние, а не префикс уведомления.
- После постороннего уведомления об успехе сравнение с серверным текстом остается доступным; несохраненный черновик не меняется.
- Русский остается единственным включенным языком. Полный перевод экранов, API errors, дат, offline assets и переключатель языка еще не реализованы.
- Ручной скринридер-аудит не выполнялся: доступной среды NVDA/VoiceOver/TalkBack нет. Автоматические axe/keyboard проверки повторены.

## Выполнено: аналитика периодов и версий, итерация 0.9
- Экран аналитики вынесен в отдельный компонент; весь его статический текст вынесен в типизированные RU/EN словари. Включен русский.
- Фильтры по включительному периоду UTC и текущей привязке версии резюме; сброс фильтров и пустые/ошибочные состояния.
- Сравнение с непосредственно предшествующим периодом той же длины; количества и знаменатели указаны явно.
- Таблица результатов по версиям и CSV только выбранных записей с защитой от формул.
- Когорта определяется первым зарегистрированным событием после планирования; исходы — всей историей отклика. Это не подтвержденные hh.ru даты отправки и не причинная оценка резюме.
- Напоминания, задачи и отдельная временная динамика по специальностям остаются в плане.

## Выполнено: проверка ответов рабочего пространства, итерация 0.10
- Единая Zod-схема проверяет вложенные факты, версии, отклики и события в read_workspace на сервере и перед установкой состояния интерфейса.
- Нет автоматического исправления поврежденных полей или замены отсутствующего профиля пустым. Только null от RPC для нового пользователя остается штатным empty workspace.
- Дубликаты ID, некорректные даты, типы и баллы блокируют загрузку; неизвестные поля сохраняются для совместимости snapshot API.
- Поврежденный ответ записи оставляет черновик в памяти и блокирует повтор до явной загрузки. Ошибка импорта не заменяет текст резюме.
- Browser tests: 403/429, поврежденные read/write/import ответы, отсутствие автоматических повторов. Это не contract-тест активной интеграции hh.ru.
- Проверка всех ответов анализа/экспорта и переход на отдельные команды остаются дальнейшей работой.

## Выполнено: проверка результата анализа, итерация 0.11
- Проверяется структура ответа анализа, затем весь результат rules-v1 сверяется с вычислением по фактам и вакансии текущего запроса.
- Правки проходят evidence gate до установки в интерфейс. Неизвестные/неподтвержденные evidence, выдуманный текст, измененные цитаты, баллы, blockers, дубли и пропуски отклоняются.
- Новый анализ сразу сбрасывает прежний результат и выбранные правки; после отказа старую версию нельзя принять как актуальную.
- При ошибке доступно явное обновление данных и повторный анализ, без автоматических записей.
- Проверка относится к текущему детерминированному движку. Она не доказывает качество его семантики и не заменяет серверную проверку при сохранении. Будущему self-hosted AI нужен отдельный контракт.
- Проверка экспорта персональных данных и остальных протокольных ответов остается в плане.

## Выполнено: проверяемый экспорт данных, итерация 0.12
- Журнал действий читается с keyset pagination до пустой страницы, а не одним запросом; короткая страница не считается концом.
- Owner-фильтр и пользовательский токен применяются ко всем запросам. Повтор/неправильный порядок ID, поврежденная схема, обрыв чтения или изменение ревизии профиля прерывают экспорт.
- Версионированный JSON содержит complete, scope и exported_at; браузер проверяет схему до скачивания.
- Полная история фактов остается отдельным NDJSON. Интерфейс не называет два файла единым транзакционным снимком.
- Ограничение: до 10 000 строк журнала и 51 запроса страниц, иначе явная ошибка без файла. Для более крупных журналов нужен потоковый экспорт. Проверка протоколов auth/history остается в плане.

## Выполнено: целостность истории и потокового экспорта, итерация 0.13
- Общая схема страниц истории проверяет вложенные факты, timestamp, порядок ID и точность следующего курсора на сервере и в браузере.
- Концом истории считается только пустая страница; короткие ответы провайдера больше не обрезают выдачу.
- Ошибка следующей страницы не изменяет уже загруженные снимки; повтор доступен вручную.
- NDJSON выдает одну запись на pull; после отмены нет новых запросов страниц и записи результата уже выполнявшегося запроса в закрытый stream.
- Повтор страницы и лимиты (5000 снимков / 50 МиБ) завершают экспорт с complete:false. Полный экспорт с before отклоняется.
- Для архивов выше лимита требуется отдельный расширенный экспорт; auth-протоколы и SMTP/recovery остаются в плане.

## Выполнено: контракты авторизации, итерация 0.14
- Отсутствующий token больше не означает confirmationRequired для login/refresh. Регистрация с подтверждением требует валидной формы user; сессия требует пары токенов, типа bearer и корректного срока.
- Cookies устанавливаются только после проверки всего ответа. Данные токенов не возвращаются браузерному JavaScript.
- Клиент проверяет acknowledgment login/register/refresh/logout/delete до перехода состояния. Некорректный ответ выхода не стирает открытый черновик.
- Истекшая/отсутствующая сессия допускает локальный logout с очисткой cookies; глобальный отзыв других сессий в этом случае не заявляется. Неавторизационные ошибки провайдера не маскируются успехом.
- SMTP/recovery, улучшение повторного входа с черновиком и живые межустройственные сценарии остаются в плане.

## Выполнено: повторный вход с черновиком, итерация 0.15
- После 401 при записи, импорте, истории или явной загрузке доступна форма повторного входа без перезагрузки вкладки.
- В ответах workspace передается ownerId; новый клиент отправляет expectedOwnerId. Повторный вход проверяет новую сессию на сервере до установки cookies.
- Черновик сохраняется только при подтверждении того же владельца. Загрузка профиля другого аккаунта не смешивается с открытым текстом.
- После восстановления нужны сравнение с сервером и явное сохранение. Анализ и история сбрасываются для повторной проверки; пароль очищается после попытки.
- Обычный выход очищает вспомогательные черновики. Logout из устаревшей вкладки не отзывает глобально сессии другого владельца.
- Черновики остаются только в памяти вкладки. SMTP/recovery и живые межустройственные проверки остаются в плане.

## Выполнено: привязка истории и импорта к аккаунту вкладки, итерация 0.16
- История и импорт передают ожидаемого владельца; сервер сравнивает его с аутентифицированной сессией до квоты, чтения БД или парсинга файла.
- Ссылка полного NDJSON содержит ожидаемого владельца. После смены аккаунта старая ссылка возвращает ошибку без архива.
- При 409 истории/импорта открывается повторный вход; черновик не заменяется и запрос не повторяется автоматически.
- Подсказка владельца не дает полномочий: аутентификация и RLS обязательны. Старые клиенты без подсказки совместимы; это не запрет пользователю читать собственные данные напрямую.
- Межустройственные проверки с реальными аккаунтами остаются в плане.

## Выполнено: карьерный план по правилам, итерация 0.17
- В результатах анализа — фильтруемый план подготовки: сначала неподтвержденные обязательные требования, затем остальные.
- Для SQL, Python, Excel, CRM, Битрикс24, B2B, управления и английского — конкретные учебные задания; для остальных требований — общий способ проверки через проект.
- Вопросы для репетиции, дословные подтвержденные факты с evidence/source, экспорт выбранной группы в TXT, переход к уточнению профиля.
- Нет автоматического подтверждения, изменения score или передачи внешнему AI. Отсутствие доказательств не объявляется несоответствием. Это первая версия coach, не self-hosted AI и не семантическая оценка квалификации.

## Выполнено: сопроводительные письма по шаблону, итерация 0.18
- Четыре стиля, выбор 1–5 подтвержденных связанных фактов; фактические фрагменты дословны и проходят существующий evidence gate.
- Ручное редактирование, счетчик слов с ориентиром 100–170, восстановление шаблона, экспорт TXT после проверки пользователем.
- Редактирование отменяет подтверждение экспорта; измененный текст явно помечается как не проверенный по evidence. Стиль руководителя не добавляет управленческого опыта.
- Черновик в памяти компонента, без автосохранения и отправки; смена стиля/фактов/ревизии или уход из редактора сбрасывает его. Генеративная персонализация и постоянное хранение писем остаются в плане.

## Выполнено: отрицания, планы и противоречия в evidence, итерация 0.19
- Единая консервативная проверка русских/английских отрицаний, намерений и возможных инструкций применяется в match, propose и gate, включая письма и coach.
- Связанная подтвержденная строка с отрицанием/планом переводит требование в unknown, даже при наличии положительной строки; конфликт требует уточнения.
- В редакторе видны исключенные строки, причины и переход к профилю. Исходный текст и статусы подтверждения не меняются.
- Проверка строковая, не семантическая: возможны пропуски сложных отрицаний и консервативные ложные отказы. Уточнение пользователем остается обязательным. Старые сохраненные версии и их баллы не пересчитываются.

## Выполнено: происхождение оценки, итерация 0.20
- Веса и вклад статусов вынесены в match-config, добавлен идентификатор редакции правил.
- Новые версии получают неизменяемую сводку: редакция, веса, вклад статусов, количество требований и распределение результатов. Сводка сохраняется в существующем extra и JSON-экспорте.
- История показывает сохраненные сведения; восстановление наследует исходные правила и балл. Для старых версий показано отсутствие сведений, без приписывания текущей редакции.
- Сводка не содержит полного профиля и строк сопоставления, поэтому не является полным воспроизводимым снимком анализа. SQL проверяет неизменность сохраненной версии, но не пересчитывает семантику.

## Выполнено: помесячная аналитика, итерация 0.21
- Сводка групп откликов по UTC-месяцу первого зарегистрированного события после планирования; действуют фильтры периода и версии.
- Отправленные, явно зафиксированные просмотры/приглашения/офферы, интервью или оффер, ответы и rates с числителем/знаменателем.
- CSV выбранной сводки, мобильная прокручиваемая таблица, пустое состояние, RU/EN словари (включен RU).
- Повтор статуса не увеличивает счетчик; поздние результаты относятся к исходной группе. Пропущенные этапы не восстанавливаются по предположению. Месяцы без откликов не заполняются искусственными строками.
- Динамика по специальностям, напоминания и задачи остаются в плане; причинный эффект изменений резюме не заявляется.

## Выполнено: календарные напоминания через ICS, итерация 0.22
- В трекере можно подготовить интервью, повторный контакт или подготовку к интервью для выбранного отклика.
- Местное время устройства, preview UTC, длительность 15/30/60/90 минут, optional DISPLAY-уведомление за 15 минут; экспорт ICS после явного действия.
- Нет отправки сообщений, приглашений, автоматического создания события, серверного хранения или изменения статуса отклика. Заметки и резюме не включаются.
- Черновик сбрасывается при уходе из раздела. Пользователь импортирует файл сам; поддержка уведомлений и повторного импорта зависит от календаря. Постоянные задачи и собственные push/email-напоминания остаются в плане.

## Выполнено: ошибки обновления сессии, итерация 0.23
- Документированные коды завершения сессии/refresh-токена при HTTP 400/422 переводятся в повторный вход; неизвестные ошибки не считаются истечением токена.
- HTTP 5xx провайдера возвращаются как временная недоступность, включая HTML-ответ; 429 сохраняет rate-limit независимо от формата тела. Ошибка чтения ответа не раскрывает детали.
- Обновление сессии при восстановлении черновика передает ожидаемого владельца. Несовпадение открывает повторный вход без переноса черновика.
- После outage и ручного retry завершенная сессия показывает форму входа, а не оставшийся экран сбоя. Автоматических повторов записи нет.
- SMTP/password recovery и живые межустройственные проверки остаются в плане.

## Выполнено: живой интеграционный прогон, итерация 0.24
- Локальная production-сборка проверена с реальными Supabase Auth/PostgreSQL на двух временных вымышленных аккаунтах.
- Вход, импорт текста, подтверждение фактов, анализ, сохранение/скачивание версии, привязка отклика, перезагрузка и история фактов прошли без mocks этих запросов.
- Изоляция двух профилей, отказ чужому expectedOwnerId, история/экспорт только владельца, global logout с отзывом второй сессии и независимостью другого аккаунта, удаление второго аккаунта проверены живыми запросами.
- Полный прогон: 43 passed, без пропусков. Тесты принимают только специально названные disposable-аккаунты; добавлена проверка от случайного использования реальных адресов.
- После прогона оба fixture-профиля, сессии и связанные прикладные записи удалены; нулевые остатки подтверждены SQL. Временный файл пароля удален. SMTP/recovery, реальные физические устройства и полная эксплуатационная готовность еще не проверены.

## Следующий этап: надежность (оставшиеся задачи)
- Настроить SMTP, recovery и redirect URL, общую политику данных/локализации.
- Завершить переход записи на отдельные команды сущностей; после периода совместимости убрать дублирующие массивы JSON. История фактов и основные реляционные сущности уже реализованы.
- Централизованный anti-abuse для неавторизованных запросов/WAF; карантин файлов, изолированный OCR/parser worker, резервирование и мониторинг.
- Полный a11y-аудит, RU/EN словари, проверка установки PWA на физических Android/iOS. Безопасный offline fallback уже реализован; офлайн-анализ и хранение PII не планируются без отдельного решения.
- Дополнить E2E матрицу: многовкладочность, потеря сети, 403/429/схемы провайдера, импорт вредоносных файлов.

## Затем: AI
- Подключить self-hosted inference с Zod-схемами, constrained output и семантическим evidence gate.
- Извлечение структурированных должностей/дат/сертификатов и сложных требований.
- Переписывание без фактических добавлений; сопроводительные письма 100–170 слов.
- Условия/зарплата/география, развивающий coach, проверки чисел и противоречий.

## Затем: hh.ru
Получить разрешение и подтвердить операции; generated client, OAuth state/PKCE при поддержке, encrypted tokens и rotation, contract tests по официальной схеме. Не включать недокументированные методы.

## Аналитика и масштабирование
Напоминания, задачи, динамика по специальностям и дальнейшие срезы. Фильтры периода/версии, экспорт выборки и сравнение соседних когорт реализованы в 0.9. Корреляции не представлять как причинный эффект. Redis/BullMQ только после появления реально фоновых задач.

## 0.25 — completed: saved resume DOCX export
- Authenticated owner-bound export with quota and no-store headers; text-only OOXML, Unicode/XML validation and size limit.
- History download link, unit roundtrip/security checks and mobile browser download check.
- Remaining: visual cross-editor verification; original formatting is not reconstructed.

## 0.26 — completed: inline DOCX download recovery
- Loading state, duplicate-click guard, fixed inline errors, explicit retry, response MIME/ZIP checks.
- Abort on leaving the tab and 30-second timeout; no late downloads after unmount.
- Added browser checks for 401/409/429/503, invalid success response, retry and cancellation.

## 0.27 — completed: stricter DOCX import envelope
- Reject duplicate/case-folded/NFC-equivalent part names, directory/file collisions, dot and encoded traversal-like segments, control characters and Unix symlink entries before extraction.
- Reject standard word/embeddings and word/activeX parts, and VBA binary parts; ordinary images remain allowed.
- Real multipart route tests with synthetic generated DOCX cover successful text extraction, rejected objects, owner authentication and safe errors; database identity/quota are mocked.
- This is a conservative package filter, not antivirus, content-type inspection or parser isolation. Nonstandard disguised payloads and resource isolation require the planned isolated worker. Users can remove embedded objects or paste text manually.

## 0.28 — completed: request-body deadlines and cancellation
- Shared boundedBody now limits total streaming read time to 15 seconds for service JSON and file upload bodies, in addition to existing byte limits.
- Disconnect/timeout returns 408; partial bytes are never parsed. Source read errors become safe 400 responses. Reader locks, timers and abort listeners are released.
- Cancel hooks cannot block error responses or mask the original failure. No automatic write retry; browser test verifies draft retention on 408.
- Deadline starts when body reading starts (not at ingress) and is cooperative with the event loop. This does not bound parser CPU time or replace WAF/isolated workers.

## 0.29 — completed: cooperative PDF lifecycle deadlines
- A 15-second explicit promise deadline bounds asynchronous PDF loading/text extraction; timeout yields a safe 408 and late continuations stop before subsequent page/text operations.
- Destroy is called once; cleanup errors cannot hide the original result, and cleanup waiting is bounded to one second. Deadline and cleanup timers are cleared.
- Lifecycle tests cover stalled loading/cleanup, late continuation, synchronous/asynchronous destroy errors and parser error redaction. A synthetic PDF tests actual text extraction.
- No hard CPU/memory isolation: a blocked event loop cannot run timers, a stuck destroy may retain resources, and dynamic module initialization precedes the deadline. An isolated worker remains required.

## 0.30 — completed: application tracker search and filters
- Search saved title/notes, filter current status and associated resume version (including unlinked), combine criteria, reset and show matching/total counts.
- Empty states, mobile controls and RU/EN filter dictionaries; existing edit actions retained.
- Filters are in-memory view state only, with no server writes and no impact on calendar or analytics. Unsaved note drafts are not searched; permanent reminders/tasks and specialty analytics remain planned.

## 0.31 — completed: comparison of saved resume versions
- Select two saved versions; exact line differences, labeled additions/removals, same-version and empty states, mobile layout.
- Stored score comparison with explicit guard for incompatible/missing rule metadata or different vacancy text; no recalculation or causal claims.
- Bounded line alignment and rendered row count with visible fallback notices; full versions remain downloadable in history.
- Unit reconstruction checks and mobile E2E cover repeated lines, whitespace, large inputs, incompatible scores and absence of writes.

## Исправление после 0.31: переносы строк в сравнении
- Большие документы с одинаковым текстом и разными CRLF/LF больше не показываются целиком как удаление и добавление.
- Сообщение о совпадении текста использует тот же нормализованный результат, что и diff.

## 0.32 — сохранение черновиков заметок
- Явная кнопка сохранения вместо записи на blur исключает гонку с изменением статуса/версии.
- Черновики живут в памяти вкладки при фильтрации и переходах между разделами; logout/delete их очищают.
- При несовпадении исходной серверной заметки показаны предупреждение и сохраненный текст. Отмена правки явная; автоматических повторов нет.
- Черновики не переживают перезагрузку/закрытие вкладки и не записываются в localStorage.

## 0.33 — password recovery implementation
- Separate request/link verification/password forms; PKCE S256 with HttpOnly recovery cookies, no browser token storage, no automatic mutation retry.
- Canonical APP_URL only; no user-controlled redirect. Global sign-out result reported separately from password update.
- Requires exact Supabase redirect allowlist and live mail acceptance; see docs/PASSWORD_RECOVERY.md. SMTP saved per owner report, delivery not verified.
## Продолжение после 0.32 — протокол восстановления
- Добавлен `BACKUP_RESTORE.md`: согласованный эталон, восстановление в изолированную базу, проверка данных, RLS/команд и браузерная приёмка.
- `scripts/backup_manifest.py` читает 13 таблиц в read-only repeatable-read транзакции и сравнивает количества и SHA-256 без сохранения строк/секретов.
- 11 локальных проверок сравнения и потокового протокола пройдены (28 октября 2026). Реальное восстановление, SMTP и решение о размещении персональных данных пока не подтверждены; пункты MVP остаются открытыми.

## Автоматизация тестового резервного восстановления
- Подготовлен CI PostgreSQL 17: synthetic seed → pg_dump → pg_restore → сравнение всех 13 таблиц → три SQL-suite → обнаружение порчи данных.
- Прогон не использует рабочие секреты; базы и временные копии очищаются. Это тест инструментов и прикладной схемы, а не эксплуатационное восстановление Supabase.
- Подтверждён успешный полный CI-прогон PostgreSQL 17, run 40645763293: копирование/восстановление, 13 непустых таблиц, три SQL-suite и обнаружение изменения содержимого.

## 0.34 — необязательный собственный AI-разбор
- Отдельный endpoint и панель: opt-in отправка сохранённой вакансии/подтверждённых фактов в self-hosted Ollama, constrained JSON, точные цитаты и IDs, проверки owner/revision и PostgreSQL quota.
- Выключен по умолчанию; требует отдельного сервера и живой проверки модели. Score, профиль и версии не меняются; это предложения для ручной оценки, не семантическая гарантия.
- Полный план завершения проекта: COMPLETION_PLAN.md. Контракт и ограничения: docs/SELF_HOSTED_AI.md.

## Следующий блок после 0.34 — команды goal/vacancy/verify (ветка)
- API больше не читает и не отправляет весь workspace для этих трёх операций; SQL строит новое состояние под owner/advisory lock и возвращает точный результат транзакции.
- Проверки сессии/ревизии, полей команды, неизвестных и повторяющихся ID; история, проекция и audit остаются атомарными. Конфликт не вызывает retry/fallback.
- Legacy save_workspace и JSON-проекция сохранены. Остальные команды и удаление массивов остаются открытыми; это частичный этап нормализации, а не её завершение.
- Перед выпуском применить additive migration `20261028110000_workspace_commands.sql`, затем код; откат кода совместим с оставленной функцией. Production не изменён.

## Кандидат 0.35 — завершение почтового UX
- Повторное подтверждение регистрации через официальный resend, непрозрачный ответ, ручной запрос и cooldown; без создания аккаунта/сессии.
- Сообщение регистрации учитывает существующие подтверждённые аккаунты и не обещает письмо. Актуализированы RU/EN подсказки о пароле и recovery.
- Единственный APP_URL для почтовых ссылок и запрет запросов с другого домена до отправки; иначе PKCE cookie и ссылка окажутся на разных origin.
- Понятные безопасные сообщения при 429/503 и неопределённом результате смены пароля; без raw SMTP ошибок и автоматических повторов.
- CI для lint/typecheck/unit/build/browser добавлен отдельно от synthetic SQL restore. Живые mail/backup/hosting gates остаются открытыми.

## 1 ноября 2026 — следующий main-only технический блок
После чтения свежего main `a3a9ef0…` и отклонённых исследований #66–#69 выбран backend-протокол серверных версий писем. Подготовлены отдельный подписанный preview, атомарное принятие с двумя ревизиями и актуальными источниками, active-session RLS, неизменяемость обычными командами, чтение старой версии без текущего ключа/шаблона и NDJSON экспорт. Ключ отсутствует, flag=false, production не менялся. Родительский блок проверяемого переписывания остаётся открытым: модель/семантическая приёмка и UI сохранения не закрыты. Следом — интеграция панели с этим протоколом и полноценные UI-сценарии. В [PR #72](https://github.com/kredavto/JobMatch-AI/pull/72) native PG17 full/populated incremental, 20 writers/1 commit/19 CONFLICT, 50-version cap, cascade и 15-table synthetic restore PASS; 703 unit/route, 30 Python, 116 browser PASS/2 live SKIP, lint/types/build PASS на executable `b25db42…`. В settings добавлена owner-bound ссылка экспорта и инструкция трёх файлов. Спецификация и границы: [SAVED_LETTER_PROTOCOL.md](docs/SAVED_LETTER_PROTOCOL.md).

## Продолжение 1 ноября 2026 — UI принятия и истории писем
В дочерней ветке поверх #72 добавлены отдельное storage consent, проверенный по текущему packet серверный preview, отдельное принятие, owner-bound история и проверяемые TXT/JSON downloads. Неопределённый ответ не повторяется; явное чтение истории сверяет точную квитанцию найденной попытки. История доступна без анализа, текущий черновик не заменяется старой версией и сохраняется при чтении профиля; owner/source/dirty/paused/expiry меняют контекст принятия. Локальные проверки: 737 unit/route, 30 Python, 140 browser PASS/2 live SKIP, lint/types/build PASS. Native/provider/live acceptance — отдельные уровни; ключ/SQL/config/merge/release не выполнялись. Далее — свежая проверка runtime dependency security на текущем main и узкий совместимый backport, не применение старого стека вслепую. [Контракт](docs/SAVED_LETTER_UI.md).

UI-кандидат оформлен в [PR #73](https://github.com/kredavto/JobMatch-AI/pull/73), зависит от #72; Application и native PG17 CI на `ffd8ae6…` успешны. Merge/релиз не выполнены; отдельное разрешение не подразумевается.

## 1 ноября 2026 — main-only security backport
Из неприменённых #52/#53 выделен узкий кандидат текущего main: PDF6.2.108, ZIP3.2.1, dev follow-redirects1.16.2, отдельный estree8.72.0→minimatch11.0.3 override с реальными caller/rules regression tests; PDF6 требует native canvas^1.0.0: установлен1.1.0, direct canvas0.1.80 сохранён. Runtime audit2→0,full19→15moderate records,strict all exit1. Полная безопасность не заявляется; следующий security этап — поддерживаемый lint graph и ESLint EOS. #72/#73 и большой старый стек не включены; user data/model/mail/provider/HH activation/SQL/release не выполнялись. [Результаты](security/MAIN_DEPENDENCY_SECURITY_20261101.md).

Узкий security backport оформлен в [PR #74](https://github.com/kredavto/JobMatch-AI/pull/74). App/audit/legacy restore на exact `3a3336b…` успешны, full strict gate внутри inventory явно failed1. Independent security/production acceptance открыта.

### PR #75: source-backed records — implementation and scoped checks complete

[PR #75](https://github.com/kredavto/JobMatch-AI/pull/75) implements manual source-range employment/education/certification/achievement records, a separate user confirmation step, owner/two-revision guards, default-OFF extra-source storage, cleanup while disabled, source-clearing revision tombstones and the explicit combined 17-table backup scope. It is based on #73 and integrates #74 fixes; none is merged/released by this work. Actual 804 unit/API, 32 Python, 20 security, 161 browser / 2 live SKIP, types/lint/build and native PG17 migration/concurrency/cap/cascade/synthetic-restore proofs are linked in VERIFICATION.md. This closes the manual typed-record slice, not semantic rewriting or operational acceptance.

Next: isolate current `/api/import` parsers from the HTTP process, bound wall time/resources and test hostile TXT/DOCX/PDF inputs against the patched supported parser dependencies; verify OCR separately. Reassess the old unmerged parser PR against current code rather than importing the whole migration stack. Qualified self-hosted AI/semantic rewriting, permitted hh.ru operations, anti-abuse, remaining command normalization/localization/reminders/monitoring and final operations continue. Real SMTP, provider restore, operator PD decisions and independent/full security acceptance remain open. Internal work remains, so no external-blocker pause or full-completion declaration is justified.

## 2026-11-01 — PR #79 current pre-auth quota integration: native evidence

Fresh main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, four plans and68 open PRs read. Above unmerged #75, adapt existing signed pre-auth quota/aggregate maintenance onto current letters/source schema; retain original two migration bytes, no old stack/CI acceptance. Add bounded 128-byte/two-second/no-redirect/exact200-boolean RPC and native actual signer→loopbackHTTP→anonSQL verification. Executable `ade1eb5c7f529de7cdd2f4dabae17222ef8dc640`, tree `7dc04e8a6807924752ad08a3efe6c7cb903d954c`, [PR #79](https://github.com/kredavto/JobMatch-AI/pull/79): [quota PG17.11](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814896) PASS (actual production signer/HTTP codec→anon SQL,all5scopes,wrong/missing key,clean/populated incremental/full schemas,ACL/RLS/signatures/limits/rollback,status/purge,20connections10allowed/10denied,SKIP LOCKED). [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814899) PASS:846unit/API/60files,lint/types/build,161browserPASS/2liveSKIP; local40Python and20securityPASS. [Source17-table](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814842), [letter15-table](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814763), [legacy13-table](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814856) native concurrency/synthetic dump/restore regressions PASS. All28 files immutable-read back with exact content/blob equality; CI PR merge tree equals this executable tree. No hosted PostgREST/Auth/WAF/load or provider-copy restore claimed. Next internal block: integrate remaining entity write commands with current immutable letter/source provenance and native SQL parity/rollback tests. Default local remains, no key seeded/provisioned, production change/mail/paid resource/merge/release. WAF/direct Auth controls, real mailbox/provider restore/PD decision and final operations OPEN. Guide docs/CURRENT_AUTH_QUOTA.md; historic #1/#2 approval does not authorize new releases/merges.

## 2026-11-01 — PR #80 current application commands: actual native provenance evidence

Fresh main/four plans `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`,69 open PRs read. Above unmerged #79, adapt #4 compact application command to current source/letter/quota schema, preserving original migration bytes. Server-owned ID/date/history/version ownership, legacy IDs, note/link changes at event cap, no snapshot read/write or retry/fallback. Current UTF8/well-formed Unicode and installed Zod4.6.7 code-point bounds covered. Executable `c83fd751322591442677b848e5f557cbd95b18f2`, tree `58dd3794e2f2398fff68a24a36bf2461ba560229`, [PR #80](https://github.com/kredavto/JobMatch-AI/pull/80): [current app-command PG17.11](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629719) PASS (pinned populated17-table+quota predecessor/full schema,SQL lifecycle/ownership/limits/legacy rollback/Unicode,actual wire+ack,confirmed source profile and immutable letters preserved,stale preview refused/new-context preview accepted,20writers/1commit/19conflicts,17populated-table native restore/application corruption). [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629582)876unit/API/60files,lint/types/build,161browserPASS/2liveSKIP. Local41Python/20securityPASS. Current [source](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629686),[letters](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629630),[quota](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629622),[legacy13-table/fiveSQL](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629565) regressions PASS. All20files exact immutable content/blob readback; CI merge tree equals executable tree. Synthetic Auth/transport/native restore is not hosted PostgREST/provider backup/SMTP/model acceptance. Guide docs/CURRENT_APPLICATION_COMMANDS.md. Full cutover/array removal and external SMTP/provider restore/PD/model/operations remain OPEN; no production change/merge/release. Next: current import/fact then version/restore commands and parity/rollback evidence.

## 2026-11-01 — PR #81 current import/fact commands: actual service and SQL evidence

Fresh main/four plans `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, 70 open PRs read. Above unmerged #80, adapt #5 import/demo/fact commands with original migration bytes: compact CAS text intent, SQL-owned fresh unverified IDs, raw text/ECMAScript trim/order/duplicate and CP-vs-UTF16 bounds, no snapshot or retry/fallback. Executable `993329cc1550dc4986c10081f7f2aabd9a46e9c1`, tree `eb2558e2282d618bf7df7253e068d1555347b4bb`, [PR #81](https://github.com/kredavto/JobMatch-AI/pull/81): [current PG17.11 service/profile protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/41308606849/job/124854088581) PASS. Actual production service→loopback HTTP→SQL, current rule metadata/history/apps preserved, 256 Unicode +8 boundary JS/SQL cases, fresh unverified IDs, stale cache then explicit cleanup/review without auto-verification, stale/current letters, 20 imports/1 commit/19 conflicts, 17 populated-table native restore/corruption. [Application](https://github.com/kredavto/JobMatch-AI/actions/runs/41308606873) 900 unit/API /61 files, lint/types/build, 161 browser PASS /2 live-account SKIP; local 43 Python/20 security PASS. Current application/source/letter/quota/legacy-six-SQL regressions PASS. All22 files immutable content/blob readback and actual CI merge tree match executable. First native fixture selected the unrelated demo name and correctly failed composer; it now explicitly verifies eligible B2B evidence without weakening the gate, and a clean full rerun passes. Synthetic Auth/transport is not hosted PostgREST/SMTP/provider restore/model acceptance. Guide docs/CURRENT_PROFILE_COMMANDS.md. No production action, merge or release; full project remains OPEN. Next: current version/restore commands, then normalized read/parity/cutover/rollback.

## 2026-11-01 — PR #82 current version/restore commands: native renderer and race evidence

Fresh main/four plans `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`,71 open PRs. Above unmerged #81, adapt #6 with original migration bytes: one-read revision-bound rules evaluation, SQL-owned text/evidence/ID/time, ID-only no-read restore, optional/unknown fields and immediate history chain, cap100/CAS/no retry/fallback. Main HTTP no longer uses saveWorkspace; snapshot/legacy compatibility still retained. Executable `9102098f094223abc6c4d573b4d1c7401ccf3e53`, tree `4e16e120585600eb9281514bc7d57e1d9edde8b3`, [PR #82](https://github.com/kredavto/JobMatch-AI/pull/82): [PG17.11 current version protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/41310572159/job/124859884457) PASS: pinned populated/full schema, 32 current prepare/render-vs-SQL cases per path, actual service version/ID-only restore with no snapshot writes, ignored client fields, optional/unknown legacy fields/immediate chain, real evaluation/write race refusal, source/letter preservation,20restores/1commit/19conflicts,17populated native restore/corruption. [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41310572106)930unit/API/63files,lint/types/build,161browserPASS/2liveSKIP; local45Python/20securityPASS. Current profile/application/source/letter/quota/legacy-seven-SQL regressions PASS. All24files exact immutable content/blob readback; actual CI merge tree equals executable tree. SQL does not attest relevance or recompute caller RPC aggregates; official HTTP computes rules, not qualified AI. Guide docs/CURRENT_VERSION_COMMANDS.md. No production action/merge/release; external SMTP/provider restore/PD/model/operations OPEN. Next: normalized parity/read/write/cutover and rollback checks.


## 2026-11-01 — PR #83 current projection parity: native read-only evidence

Fresh main/four plans `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`,72 open PRs read. Above unmerged #82 final `8e5b75b906bd278c9cab2fb08eaa66762319e6bf`, retain original #7 migration bytes and add current native integration. Private SECURITY INVOKER counts-only read-only preflight compares5core tables with3snapshot arrays; partial-RLS view, values/missing/excess rows/positions/reserved extras/orphans/hidden links refuse parity. No repair/cutover/array removal. Executable `cb0fb0a5040749cc307593897ef9988bb02af00c`, tree `33588ae8f828b5a1f68c218c22c6f1ef87889d48`, [PR #83](https://github.com/kredavto/JobMatch-AI/pull/83): [PG17.11 preflight](https://github.com/kredavto/JobMatch-AI/actions/runs/41312456815/job/124865501012) PASS: exact populated upgrade/full schema, unchanged fingerprints, full native corruption/scope/grants/legacy suite, actual service commands/read fingerprint stability, restricted-RLS CLI exit2, held uncommitted writer,8parallel repeatable readers/20writers/1commit/19conflicts,17populated native restore with separate current source/letter codecs, deliberate same-count version corruption CLI exit1/no repair. Original predecessor pins remain unchanged; exact additive suffix only. Local55Python/930unit/API/63files/20security/lint/types PASS; [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41312456672) build/unit/lint/types PASS; 161browser PASS/2live-account SKIP. Current version/profile/application/source/letter/quota/legacy8SQL native regressions PASS. All19files exact immutable content/blob readback; actual CI merge tree equal executable. Initial and diagnostic runs correctly refused a three-character vacancy in this new fixture; corrected to SQL role without changing the existing five-character rule or assertions, then clean current native passes. Guide docs/CURRENT_PROJECTION_PARITY.md. Checker covers5core tables, not source/letter semantic parity or all17 tables; native synthetic restore is not Supabase-copy/RPO/RTO acceptance. Historic #1/#2 owner-authorized merges recorded, no future authorization implied; no new main merge/release/prod action. Full project OPEN. Next internal block: commands/legacy commit reading canonical normalized state under owner lock, drift refusal and exact fact-history/rollback integration; then explicit entity writers/cutover. External real SMTP/password recovery,provider-copy restore,operator PD hosting/retention,qualified owned model/semantic/held-out and final live operations remain OPEN.


## 2026-11-01 — PR #84 canonical command state: current native evidence

Fresh main/four plans a3a9ef0c69e1e760010fc391234d66cd4a747e3b,73open PRs read. Above unmerged #83 final fd8dd0d1d81d7a9527b91dfb8da0013cae433355, retain original #8 migration bytes. Commands/legacy commit read normalized state under owner lock/CAS, refuse snapshot/structural drift without repair, retain arrays/legacy and capture exact normalized old fact history without double upsert history. Safe HTTP503/no retry/fallback. Executable c7477f96fb18924656ddf9bb837824e9985144e2, tree49a6cb00d85bd741c508963dc0064469ca906624, [PR #84](https://github.com/kredavto/JobMatch-AI/pull/84): [PG17.11 canonical protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/41314303341/job/124870994444) PASS — exact17populated predecessor/full schema, dirty preflight leaves data/definitions/grants/triggers unchanged, full/upgrade definitions equal, native canonical history/legacy/scope suite, actual service503/no retry/fallback/16domain fingerprints unchanged with legitimate private.request_quotas charge, confirmed current source+immutable letters preserved, held writer/20commands/1commit/19conflicts,17populated native restore/definitions/codecs/corruption refusal. [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41314303268)931unit/API/63files,lint/types/build,161browserPASS/2liveSKIP; local56Python/20securityPASS. Current parity/profile/application/version/source/letter/quota/legacy9SQL native regressions PASS. All20files exact immutable content/blob readback; actual CI merge tree equals executable. Initial new harness incorrectly named the quota exemption public.quota_counters; diagnostic identified the fingerprint assertion. Corrected exemption to the actual included private.request_quotas only, preserving all16other table comparisons and production guards; full new run passes. Guide docs/CURRENT_CANONICAL_READS.md. No provider Auth/PostgREST/SMTP/Supabase-copy/RPO/RTO/model acceptance; automatic unrelated CPU diagnostic is not qualification. Old #8 evidence not reused. Historic #1/#2 owner-authorized merges recorded; no new main merge/release/production action. Full project remains OPEN. Next internal stage: explicit normalized entity/history writes with fault injection/rollback, then storage cutover/rollback and parser/OCR/scanner integration. Real SMTP/password recovery,provider-copy restore,operator PD hosting/retention,qualified owned model/semantic/held-out,WAF/direct Auth and final live operations remain OPEN.


## 2026-11-01 — PR #85 explicit entity/history writes: current fault and rollback evidence

Fresh main/four plans a3a9ef0c69e1e760010fc391234d66cd4a747e3b,74open PRs read. Above unmerged #84 final a14ade7647215d6e7a29ca3024cf95ce871f836a, original #9 migration retained byte-for-byte. Entity projection/history now explicit in guarded commit; owner/session/CAS/input and complete output checks, no3payload triggers/2obsolete trigger functions, full arrays/legacy/client write revocations retained. No cutover/prod migration. Executable2ea5c01432ffb30592e49a453bc3f3f5f5be2ed2/tree096d95c60c674e3886176108320dd18eefe8f00e, [PR #85](https://github.com/kredavto/JobMatch-AI/pull/85): [PG17.11 explicit protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/41315694689/job/124875126665) PASS on first native run — exact17populated predecessor/full schema, early dirty+late post-removal migration failure with unchanged rows/definitions/ACL/triggers, full/upgrade definitions equal, fault injection projection/history/audit/consent on initial/existing command+legacy, validated argument/output scalar+mirror postconditions/revision0 baseline, actual current service503/no retry/fallback/no domain mutation except request quota, confirmed source/immutable letter provenance, held writer/20commands/1commit/19conflicts, real command-legacy create/update/independent-owner/revoked-waiter/table-gate probes on source+restored,17populated native restore/definitions/codecs/corruption refusal. [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41315694787)931unit/API/63files,lint/types/build,161browserPASS/2liveSKIP; local65Python/20security/lint/CJSsyntaxPASS. All9predecessor native protocols PASS. All24files immutable content/blob readback and actual CI merge tree match. Explicit historical fixture projection replaces removed administrative side effects, no production fallback; original pins unchanged/exact suffix/no filename sorting. Guide docs/CURRENT_EXPLICIT_WRITES.md. No provider Auth/PostgREST/SMTP/Supabase-copy/RPO/RTO/model acceptance. Historic #1/#2 merges remain owner-authorized only for those PRs; no new main merge/release/prod action. Full project OPEN. Next internal block: compact storage cutover/new checker/rollback preserving post-cutover writes, then separate parser/OCR/scanner integration. Real SMTP/password recovery,provider-copy restore,operator PD hosting/retention,qualified owned model/semantic/held-out,WAF/direct Auth/independent security and final live operations OPEN.


## 2026-11-01 — PR #86 logical backup preflight: current17-table native evidence

Fresh main/four plans a3a9ef0c69e1e760010fc391234d66cd4a747e3b,75open PRs read. Above unmerged #85 final47827b3cd01472a1b0d7706301caeb4eaedcbd75, split original #10 preparatory helper/logical fingerprints before compact cutover. Original20261028120140_workspace_entity_snapshot.sql retained byte-for-byte; closed STABLE SECURITY INVOKER helper/no public RPC/elevation/data rewrite/cutover. Explicit --logical-workspaces supports all13/15/17scopes in4logical formats, with4physical formats/default preserved; mixed scopes/formats refuse, source/letter/private config coverage retained. Executablee410699af822d98b2fa3c52c4a6b72e30dc9ff42/tree5c7cbddc26429a77afbe33bf6108e41b55015946, [PR #86](https://github.com/kredavto/JobMatch-AI/pull/86): [PG17.11 logical protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/41317616774/job/124880903190) PASS on first native run — exact17populated/two-owner predecessor/full schema, helper DDL rollback/unchanged rows/equal definitions/grants, closed helper,8CLI scope/format combinations/read-only0600/unknown fields, missing-helper+limited-RLS refusal without artifact, actual current service/source+letter codecs,17populated native physical+logical dump/restore/definitions, mirror-only drift distinguished from canonical value change and private letter-key corruption. Logical fingerprints explicitly do not prove physical mirror parity or real provider restore. [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41317616686)931unit/API/63files,lint/types/build,161browserPASS/2liveSKIP; local68Python/20security/lint/CJSsyntaxPASS. All10predecessor native protocols PASS. All20files immutable content/blob readback and actual CI merge tree match. Earlier pins unchanged/exact suffix/no filename sorting. Guide docs/CURRENT_LOGICAL_BACKUPS.md. Historic #1/#2 owner-authorized merges remain recorded and authorize no future publication; no new main merge/release/prod action. Full project OPEN. Next internal block: compact cutover/new checker/rollback preserving post-cutover writes and17-table logical values, then parser/OCR/scanner integration. Qualified model/semantic/held-out,real SMTP/password recovery,Supabase-copy restore/RPO/RTO,operator PD,WAF/direct Auth/independent security and final live acceptance remain OPEN.


## 2026-11-01 — PR #87 compact storage: current phase-separated native evidence

Fresh main/four plans a3a9ef0c69e1e760010fc391234d66cd4a747e3b,76open PRs read. Above unmerged #86 final554dbca9855af8171283ca0e17ecb73caf1eb12b, original #10 compact forward/explicit rollback SQL retained byte-for-byte. Atomic gate/v1 preflight/CHECK/full15MB input budget, normalized storage/full API+legacy contracts, rollback preserves all later data/revisions/times/history/audit/source/letters. Executable5fb3247892b7eb683562246734fcfc8db0aaf991/treecb2994c94c72e55216f5d9745ef567380bb6163f, [PR #87](https://github.com/kredavto/JobMatch-AI/pull/87): [PG17.11 compact protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/41322007547/job/124894020060) PASS on first native run — exact17populated mirror predecessor/full compact schema,10mirror/8compact suites by phase, early+late forward/rollback failure preserves rows/full catalog, clean/upgrade catalog equal, exact raw rollback/reapply before writes, all9persistent commands+legacy and actual current HTTP/rule metadata/profile stale→revoked-capability cleanup→manual field confirmation→separate fact verification/old+new immutable receipts/structural503/no replay/domain preservation except quota charge,17logical table equality across rollback/reapply after writes, actual command-legacy create/update/owner progress/revoked existing+first-workspace waiters/table gate, compact17populated native dump/restore/current codecs and content-versus-structure distinction. [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41322007546)931unit/API/63files,lint/types/build,161browserPASS/2liveSKIP; local75Python/20security/lint/CJSsyntaxPASS. All12other workflows PASS with explicit phase labels: business/profile/version/source/letter compact regressions, format-independent quota, and separately named mirror rollback compatibility. All36files exact immutable content/blob readback and actual CI merge tree equality. Earlier pins unchanged/exact known suffix/no filename sorting. Potential first-workspace revocation concern was ruled out by final transaction guard and new real regression: both methods AUTH/no partial data; no authentication fix claimed. v2 checker is structural, not value parity or model/provider truth. Guides docs/CURRENT_COMPACT_STORAGE.md and current17scope operator instructions. No production migration/history repair/main merge/release; historic #1/#2 authorization applies only to those merges. Full project OPEN. Next internal block: integrate parser/OCR/scanner proposals with current core provenance/normalization, then remaining product features. Qualified model/semantic/held-out,real SMTP/password recovery,Supabase-copy restore/RPO/RTO,operator PD,WAF/direct Auth/independent security and final live acceptance remain OPEN.

## 1 ноября 2026 — интеграция parser/OCR/scan с compact core (кандидат)

Текущий main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b` и открытые PR прочитаны заново. Ветка от проверенного #87 объединяет исходный код #78 с текущими командами, профилем и письмами; main/PR не объединены. По умолчанию inline, OCR/scan выключены. Синхронная отмена импорта перед сменой workspace/owner защищает более новый черновик. Добавлен сквозной тест реальных ограниченных Docker parser/gateway через проверяемый TLS и production import API к native PG17 compact: извлечение без записи, отдельный импорт, отказы владельца/байтов/worker, профиль/письма и 17-табличный синтетический restore. Auth/HTTP базы — stand-in, не hosted приёмка. Native CI выполнен; фактические SHA, ссылки и ограничения зафиксированы ниже.

Реальные SMTP/password recovery, копия провайдера/RPO/RTO, решение оператора о ПД, квалифицированная модель/семантическая оценка, разрешения hh.ru и финальная эксплуатация остаются OPEN. Разрешение #1/#2 не распространяется на новые merge/релизы. Следующий технический шаг после интеграционной проверки: контракт хранения происхождения hh.ru вакансии без разрешения записи в hh.ru.


Фактический результат #88: executable `8da431883fdd55a9b4a23bbc3c9f8000184e321c`, 981unit/API,183browserPASS/2liveSKIP,101worker/0skip,76Python,20security,lint/types/build. [Native Docker→TLS→API→compact SQL](https://github.com/kredavto/JobMatch-AI/actions/runs/41326356292/job/124907002449) и [реальные OCR/ClamAV](https://github.com/kredavto/JobMatch-AI/actions/runs/41326356413) PASS; текущие12PG-regression jobs и audit inventory PASS. Native restore17populated — синтетический, Auth/HTTP stand-in; provider restore/SMTP/ПД/модель/HH-разрешения/финальная приёмка остаются OPEN. Необязательный автоматический CPU diagnostic не является квалификацией модели. Ветка и [PR #88](https://github.com/kredavto/JobMatch-AI/pull/88) сохранены, merge/release не выполнялись. Детали, исправления тестового readiness и различие mirror/compact — в VERIFICATION.md и docs/CURRENT_PARSER_CORE_INTEGRATION.md.

## 1 ноября 2026 — текущие операционные наблюдения (кандидат после #88)

Заново прочитаны main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, четыре плана и78open PR. Код в отдельной ветке от #88: opt-in строгие наблюдения11API/14handlers, отдельные terminal исходы fact-history/server letters без чтения payload/IDs/ошибок, общий bounded budget и операторский read-only CLI. Production mode OFF; collector/доставка alerts/SLO/retention/capacity не приняты. Local1022unit/API,102Python,20security,lint/types/build и183browserPASS/2liveSKIP; real Next off/on guard/privacy/cap smoke PASS. Native текущего дерева выполнен; фактические результаты зафиксированы ниже. Подробный контракт: docs/CURRENT_OPERATIONS_MONITORING.md.

Durable HH-origin storage остаётся зависимым от решения оператора/HH о хранении, актуализации/архиве, удалении и копиях в версиях/экспортах; unsigned preview не становится разрешением хранения. Доступны дальнейшие внутренние блоки: структурированные версии, интеграция RU/EN и напоминаний. SMTP/recovery, provider-copy restore/RPO/RTO, ПД, квалификация модели и финальная эксплуатация остаются OPEN. Разрешение #1/#2 не относится к новым merge/release.

Фактический результат [PR #89](https://github.com/kredavto/JobMatch-AI/pull/89): executable `c0a99b0238e2f3c53a13c52dc7f7e5c9572342ef`,1022unit/API,102Python,20security,lint/types/build,183browserPASS/2liveSKIP. [Настоящий Next off/on](https://github.com/kredavto/JobMatch-AI/actions/runs/41328420619/job/124913153220):41TS/26Python/all14handlers/privacy/cap/CLI PASS. [Native current Docker→TLS→API→compact PG17](https://github.com/kredavto/JobMatch-AI/actions/runs/41328420677/job/124913153334):exactly-once closed import/service200/400/409/503 events и реальный file-only observed-alert, прежние17populated native restore/provenance assertions PASS.12PG-regression и реальный parser/OCR/ClamAV PASS;16relevant workflows PASS. No provider Auth/SMTP/copy restore/model/client-delivery/global monitoring acceptance. Production telemetryOFF, нет collector/alerts delivery/новой БД/merge/release. Полный журнал и границы — VERIFICATION.md; текущий контракт — docs/CURRENT_OPERATIONS_MONITORING.md.
