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

## 1 ноября 2026 — source-backed literal versions (кандидат после #89)

Main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`,4плана и79open PR прочитаны заново. Новый отдельный block поверх #89: неизменяемые дословные версии выбранной подтверждённой структуры с snapshot/raw ranges/hash, отдельным preview+consent, defaultOFF flags+двумя SQL capabilities, owner RLS/idempotence20cap, отдельной hash-bound cleanup при отключённой записи, историческими TXT/JSON/NDJSON и явным18table backup scope. Master/legacy fact verification/rules не меняются; model_version:null, source_status:at-save-only. Grammar line-only/ASCII-Cyrillic не проверяет смысл или даты и не является генеративным переписыванием.

Local1093unit/API (71files),105Python,20security,types/lint/build и полный browser186PASS/2liveSKIP. Native PG17 source-version protocol PASS на executable `4ee2f1b3c0931ea84bc3867bca18889e2dc5dbf3` (tree `5cd6eca105d1444cf5787842b9009516061cb865`): [проверки миграции, конкуренции и18populated restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41337615502/job/124940657292). Ветка и [PR #90](https://github.com/kredavto/JobMatch-AI/pull/90) сохранены; новые merge/release не выполнялись. Native Auth/HTTP/restore остаётся synthetic fixture; real provider/model/SMTP/ПД acceptance не заявляется. Полный контракт и отдельное удаление копий — docs/CURRENT_SOURCE_VERSIONS.md. Новых dependencies/production flags/SQL/GRANT, HH writes, LLM user-data transfer, paid infra/mail/main merge/release нет. Историческое разрешение #1/#2 остаётся ограниченным ими. Следующие внутренние блоки: RU/EN, reminders и дальнейшая интеграция.


## 1 ноября 2026 — текущие коды ошибок RU/EN (кандидат после #90)

Заново прочитаны main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`,4плана и80open PR. Отдельная ветка от #90 адаптирует подготовку #22 к текущим compact/source/letters/parser/Auth contracts:121closed API codes с RU/EN копией,131явно размеченное production UserError site, redaction на HTTP boundary, безопасный client code/status mapping и неизменный строгий OCR_LIMIT400 wire. HTTP статусы/owner/revision/quotas/успешные ответы и запрет autoretry сохранены. Язык приложения пока RU; полный UI/date/offline перевод и переключатель не закрыты.

Local1125unit/API75files,105Python,20security,lint/types/build, полный browser190PASS/2liveSKIP. [Native current18table restore/session/codec protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/41339165358/job/124945292198),13current PG jobs, [real Next operational smoke](https://github.com/kredavto/JobMatch-AI/actions/runs/41339165307/job/124945292031) и real parser/OCR/ClamAV PASS на executable `0f0826d3dff0ff681b2d17ede400b0c0dbe59ef3` (tree `0a49f079a0a01cb6b435ae1ba1d27e6b7d1b9801`). Код сохранён в [PR #91](https://github.com/kredavto/JobMatch-AI/pull/91); merge/release не выполнялись. Без новых dependencies/SQL/flags/GRANT/mail/paid infra/model/HH write/main merge/release. Реальные SMTP/recovery/provider-copy/RPO/RTO/ПД/model/security/final ops OPEN; историческое #1/#2 разрешение не расширяется. Контракт и ограниченная legacy same-origin RU compatibility: docs/CURRENT_API_ERRORS.md. Следующий внутренний шаг: текущие экраны/даты/offline RU/EN до глобального переключателя.


## 1 ноября 2026 — текущие панели источника RU/EN (кандидат после #91)

Заново сверены main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`,4плана и81open PR. Отдельная ветка после #91:95typed UI messages, RU/EN labels и optional locale у текущих source-profile/source-version panels, язык текущих ошибок/уведомлений при отложенном ответе, UTC display истории. Язык не является owner/source key и не сбрасывает selection/caret/draft/consent/pending request. Frozen source-literal-ru-v1 framing, quotes/CRLF/emoji/ranges/IDs/snapshots/hashes/API payloads/downloads и правила записи не меняются; интерфейс это объясняет. Production defaultRU, глобальный переключатель пока выключен.

Local1130unit/API76files,105Python,20security,lint/types/build и3new actual React/browser scenarios PASS; новый browser fixture только loopback/tests, не production route/живой provider. Полный локальный defaultRU browser193PASS/2liveSKIP; дополнительный production Next isolation test1PASS (три fixture assets404). [Application CI](https://github.com/kredavto/JobMatch-AI/actions/runs/41342208857/job/124954431934) PASS1130unit/API76files,194browserPASS/2liveSKIP,lint/types/build;12current PG jobs, real Next ops и real parser/OCR/ClamAV PASS. [Source18restore/session/codec](https://github.com/kredavto/JobMatch-AI/actions/runs/41342208805/job/124954432195) PASS на executable `bb12ab4edbfc73264382a3063d4d0d96c6d0390e` (tree `d58a521b1de249df75698f0e9653bcbba78cc6d3`). Код в [PR #92](https://github.com/kredavto/JobMatch-AI/pull/92); новых merge/release нет. Контракт docs/CURRENT_SOURCE_LOCALES.md. Без новых dependencies/SQL/GRANT/flags/mail/paid infra/model/HH write/main merge/release. SMTP/recovery/provider-copy/RPO/RTO/ПД/model/security/full RUEN/final ops OPEN; прежнее #1/#2 разрешение не расширяется. Следующий внутренний шаг — остальные текущие экраны, даты и offline до глобального переключателя.


## 1 ноября 2026 — публичные формы авторизации RU/EN (кандидат после #92)

Заново прочитаны main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`,4плана и82open PR. Отдельная ветка после #92: controlled public AuthPanel, RU/EN public mail/recovery forms и retained status/stage feedback, synchronous duplicate guards, stable phase/caret/cooldown through locale changes, active-instance timer cleanup. Новая регистрационная context смена email/режима и признанный ACK/adoption/logout очищают локальное согласие; язык сохраняет его. Request receipts не обещают доставку. Production defaultRU; global/private-reauth/fullRUEN ещё не закрыты.

[Current-tree App CI](https://github.com/kredavto/JobMatch-AI/actions/runs/41346457148/job/124967199055) PASS1140unit/API78files,207browserPASS/2liveSKIP,lint/types/build на executable `5a62f079d7390f071c04625bfb4c69ce2ddfca21` (tree `a82ddef794b7c950309382cc3fc0401bbe6da349`).105Python/20security локально PASS;12currentPG/real Next ops/real parser-OCR-ClamAV PASS. [Source18restore/session/codec](https://github.com/kredavto/JobMatch-AI/actions/runs/41346457170/job/124967199442) PASS. Код в [PR #93](https://github.com/kredavto/JobMatch-AI/pull/93), merge/release не выполнялись. Контракт docs/CURRENT_AUTH_LOCALES.md. Legacy PD-disclosure/country copy сохранена, не проверена и не заменяет решение оператора. Root request/owner/revision pipelines, schema/lockfile/backend auth contracts не изменены. Нет реальных писем/SQL/GRANT/flags/paid infra/LLM user traffic/HH write/merge/release. SMTP/recovery/provider-copy/RPO/RTO/ПД/model/final ops OPEN; #1/#2 approval не расширено. Следующий внутренний шаг — workspace shell/reauth/sync feedback и другие текущие экраны до глобального выбора языка.


### Текущий shell / повторный вход / синхронизация — 1 ноября 2026

- [x] В отдельной ветке после #93 подготовлены RU/EN shell и feedback актуального WorkspacePage. Начало: свежий main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, четыре документа и 83 открытых PR прочитаны; база — immutable #93 `e188a31112ab76d2438b22c1b2b591a503e86763`. Общий выбор языка остаётся выключен; остальные экраны/даты/offline не объявляются переведёнными.
- [x] Повторный вход блокирует поля и повтор submit в том же кадре; явная загрузка имеет отдельную защиту. Сообщения хранят ключ/данные или RequestError/status. Смена языка не загружает данные и не повторяет запись. Wrong-owner ответ не усваивается; черновики и paused guards сохраняются.
- [x] Локально: 1147unit/API в79файлах, 105Python, 20security, lint/types/build PASS; семь новых browser-проверок actual Root/controller PASS; полный production Next browser214PASS/2liveSKIP, включая изменённые fixture-isolation assets. Mobile screenshot390px просмотрен, overflow/ограниченный axe PASS. [App CI](https://github.com/kredavto/JobMatch-AI/actions/runs/41348544296/job/124973511523) на executable `bdd418c057e73f8bec662dcb061ceec0ac4a1cbd` / tree `0e4b274e0124fbbe55c959dc02fa88af7ca1e1c9`: 1147unit/API79files,214browserPASS/2liveSKIP,lint/types/build PASS.15релевантных source-workflows PASS:12currentPG,ops,parser и приложение. [Native18restore/session/codec](https://github.com/kredavto/JobMatch-AI/actions/runs/41348544369/job/124973511588) PASS на синтетических данных; это не provider-copy restore. Код в [PR #94](https://github.com/kredavto/JobMatch-AI/pull/94), merge/release не выполнялись. Новый unit-файл сначала не попал в glob `**/*.test.ts` из-за `.tsx`; исправлен на `.ts`/createElement. Первый browser-case остановился на точном getByLabel textarea с исходным текстом; заменён на доступную роль textbox без ослабления проверок данных/каретки.
- Контракт: [CURRENT_WORKSPACE_LOCALES](docs/CURRENT_WORKSPACE_LOCALES.md). API/SQL/provider/lockfile/model/HH-write flags не менялись. SMTP/recovery/provider-copy/RPO/RTO/решение ПД/квалификация модели/final ops OPEN. Разрешение #1/#2 не расширяется; новый merge/release не выполнялся.
- Следующий внутренний шаг: остальные текущие экраны и даты, затем offline/metadata/connectivity и единый выбор языка с полной проверкой.


### Текущие демо и сохранение мастер-профиля — 1 ноября 2026

- [x] Свежие main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, четыре документа и84открытых PR сверены. База — ready/unmerged #94 `4d2fa712b3cadcdcb3d7f228cbd7f4e663be9e8e`, новая отдельная ветка. На исходной базе три browser-regression действительно FAILED: демо поверх unsaved resume, потеря новых полей после master-save, потеря очищенного черновика/выбранной вкладки после demo.
- [x] Actual Root/controller защищает master/demo pending refs, известного владельца/следующую ревизию ответа, epochs резюме/вакансии/цели и выбранную вкладку. Сохранённые сервером данные и оставленный локальный черновик явно различаются в ACK/сравнении; повторов записи нет. Legacy owner-less compatibility ограничена schema/revision; остальные mutation response paths не объявляются покрытыми.
- [x] Overview RU/EN и подключение уже переведённого current VacancyPanel к подготовленному locale без глобального selector. Только bounded overview design/copy из immutable #27, не старые backend/parser/HH contracts. Счётчики — пользовательские подтверждения/ручные статусы, не доказанная доставка HH.
- Локально1155unit/API80files,105Python,20security,lint/types/build PASS; все15новых browser-cases PASS; полный production Next browser229PASS/2liveSKIP, включая весь предыдущий набор. Mobile screenshot390px просмотрен, overflow/ограниченный axe PASS. [App CI](https://github.com/kredavto/JobMatch-AI/actions/runs/41350486284/job/124979380313) на executable `5a136f6ef3eeb90fcb9a2a883dbd8e465514763b` / tree `bda6feba27e4a3382ba383f6ae8dccace2877400`:1155unit/API80files,229browserPASS/2liveSKIP,lint/types/build PASS.15релевантных source-workflows PASS:12currentPG,ops,parser и приложение. [Native18restore/session/codec](https://github.com/kredavto/JobMatch-AI/actions/runs/41350486164/job/124979379789) PASS на синтетических данных; это не provider-copy restore. Код в [PR #95](https://github.com/kredavto/JobMatch-AI/pull/95), merge/release не выполнялись. Контракт [CURRENT_PROFILE_DRAFT_SAFETY](docs/CURRENT_PROFILE_DRAFT_SAFETY.md). Нет API/SQL/GRANT/flags/package-lock/model/document codec changes или писем/платной инфраструктуры/LLM user traffic/HH writes/merge/release.
- SMTP/recovery/provider-copy/RPO/RTO/ПД/model/final ops OPEN. #1/#2 historical approval не расширяется. Следом: оставшиеся поля профиля и даты/история, далее другие экраны/offline/global locale; общий аудит контекста ответов остальных write-команд остаётся отдельным внутренним пунктом.


### Текущий основной профиль / следующий факт / история — 1 ноября 2026

- Свежие main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, четыре документа и85открытых PR сверены; отдельная ветка после ready/unmerged #95 `f02b20b29681fda9aa3ffa5f4033d1dba854abfb`. Среда выполнения стала unavailable до подтверждения локальной регрессии; дальнейшая работа через pinned GitHub files/leased git commits и существующий CI. Локальные проверки не заявлены.
- [x] Реальный red baseline `851594005a27cfcf7debdc1fc050e6e9f64e732f`: [App CI](https://github.com/kredavto/JobMatch-AI/actions/runs/41352199608/job/124984631956)1155unit PASS/229browserPASS/2newFAIL/2liveSKIP. Оба новых FAIL получили пустое поле вместо следующего факта, включая ABA; production code baseline не менялся.
- [x] Подготовлен actual Root handler с epoch/pending/known-owner и existing addedClarification ACK перед очисткой; текущие act/load/upload, master/demo epochs, StructuredFactPanel и SkillConfirmationList сохранены. Main ProfilePanel/bulk labels/history RU/EN, явный UTC и исходный ISO/JSON без переписывания данных. [App CI](https://github.com/kredavto/JobMatch-AI/actions/runs/41352955020/job/124986879229) на executable `377d6c52dad962f19e836ee428b1369d35f9d2b7` / tree `7625e0bea48f234bfda177419b526cd00247c43d`:1160unit/API81files,239browserPASS/2liveSKIP,lint/types/build PASS. Все10новых browser-cases PASS; два red-baseline сценария теперь green.15релевантных source-workflows PASS:12currentPG,ops,parser и приложение; отдельный CPU diagnostic не квалифицирует модель. Локальные проверки/ручной просмотр screenshot не заявлены.
- Контракт [CURRENT_PROFILE_LOCALES](docs/CURRENT_PROFILE_LOCALES.md), [PR #96](https://github.com/kredavto/JobMatch-AI/pull/96). Новый глобальный язык не включён; остальные экраны/StructuredFactPanel v1/offline и общий audit write-response contexts остаются внутренними шагами.
- Нет API/SQL/GRANT/flags/lockfile/model/document codec changes, реальных писем/paid infra/LLM user traffic/HH writes/merge/release. SMTP/recovery/provider-copy/RPO/RTO/ПД/model/final ops OPEN. #1/#2 historical approval не расширяется.


### Контекст ответов остальных команд записи — 1 ноября 2026

- Свежие main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, четыре документа и86открытых PR сверены; отдельная ветка после ready/unmerged #96 `c7744dca17534002bf07da87fa03555574566cec`. Runtime unavailable; pinned GitHub files/leased commits/CI only, локальных проверок нет.
- [x] Реальный red baseline `c64b0d930bd9e42bd71e4a0f9f378b26703dab09`: [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41355055234/job/124993224864)1160unit PASS/239browserPASS/2newFAIL/2liveSKIP; production code не менялся, goal replies с чужим owner и старой revision не были отклонены.
- [x] Подготовлен единый validator всех9Workspace-producing commands: известный displayed owner до POST, тот же owner и revision+1 до adoption. Existing profile key/additional fact ACK/no-replay/paused guards сохранены. Delete требуетknown owner до отправки; отдельные auth/read/delete ACK contracts сохранены.
- Owner-less current-client writes из #95/#96 намеренно прекращены; read schema/данные не мигрируются, legacy read остаётся. Два writer-fixture файла получают current owner metadata/request assertions, read-only legacy fixtures не меняются. [App CI](https://github.com/kredavto/JobMatch-AI/actions/runs/41356459823/job/124997444664) на executable `e5c3068cabcddcd292d603c07f4e92832bfa2a7e` / tree `61a72300a3fc656a65234883f5c249b01c22c391`:1168unit/API82files,255browserPASS/2liveSKIP,lint/types/build PASS. Все16новых current-controller cases PASS.15релевантных source-workflows PASS:12currentPG/ops/parser/app; отдельный CPU diagnostic не квалифицирует модель. Локальных/manual visual проверок нет (runtime unavailable).
- Контракт [CURRENT_WRITE_RESPONSE_CONTEXT](docs/CURRENT_WRITE_RESPONSE_CONTEXT.md), [PR #97](https://github.com/kredavto/JobMatch-AI/pull/97). Нет API/SQL/RLS/GRANT/flags/auth/lockfile/model/document codec changes или реальных писем/paid infra/LLM user traffic/HH writes/merge/release. SMTP/recovery/provider-copy/RPO/RTO/ПД/model/final ops OPEN, #1/#2 permission не расширяется.
- Следом: остальные UI/конструктор уточнений/даты/offline/global locale и дальнейшая эксплуатационная приёмка. Tuple validator не является проверкой истинности фактов/полного entity delta или независимой Auth/provider аттестацией.


Первый CI исправления e1fb456:253browserPASS/2newverify-interactionFAIL/2liveSKIP, lint/types/unit/build PASS. В новых тестах check() ошибочно ожидал немедленный controlled-checkbox state до ACK; заменено на click с явной проверкой после ACK (success checked/refusal unchecked). Production code не менялся, отказ чужому owner/ревизии и сохранность данных не ослаблены. Результат полного исправленного CI фиксируется далее.


### Конструктор уточнения: RU/EN UI, русский v1 literal — 1 ноября 2026

- Свежие main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, четыре документа и87открытых PR прочитаны/сверены; отдельная ветка после ready/unmerged #97 `46961ac02e39d7277886bb92160257bbacaac50d`. Runtime unavailable, GitHub files/leased commits/CI only; локальных проверок нет.
- [x] Подготовлен optional/default-RU StructuredFactPanel UI:37fixedcopy+3closederror keys, late feedback в current locale. Поля/caret/preview/review/pending/basis не меняются от языка. Renderer/v1 wording остаётся на русском с явным hint/pre lang; user data/enum/month/count/scope/continuity не переводятся.
- [x] Source audit guards и changed/prepare/save byte-equal #97 после отмены только closed error-key/null substitutions. Owner/dirty/revision/duplicate/500cap/review/pending/ACK остаются; Root generic write guards и exact addedClarification сохранены. Полный исправленный CI выполнен; доказательства приведены ниже.
- Контракт [CURRENT_CLARIFICATION_LOCALES](docs/CURRENT_CLARIFICATION_LOCALES.md). Это ручная строка unverified, не AI rewrite/структурированное доказательство/tenure inference. Глобальный язык OFF, остальные экраны/offline и final acceptance OPEN.
- Нет API/SQL/GRANT/flags/auth/lockfile/model/renderer/codecs changes, реальных писем/paid infra/LLM user traffic/HH writes/merge/release. SMTP/recovery/provider-copy/RPO/RTO/ПД/model/final ops OPEN; #1/#2 permission не расширяется.


Первый CI bf3869c:lint/types PASS/1171unitPASS/1newunitFAIL, build/browser не запускались. Позитивная фикстура содержала U+200D в joined emoji, который неизменённый renderer v1 запрещает. Позитивные данные исправлены на разрешённый Unicode-символ, добавлены явный negative unit и browser-проверка отказа joiner/сохранения invalid input при смене языка; валидация/production code не ослаблены. Итог полного исправленного CI приведён ниже.


Фактический исправленный source #98 `5eb00282e09926534ff08ff6417304312342190f`, tree `33e13ae7bccbb297004b8ed435bb709a8c992983`, synthetic checkout `188bf945b2761872ab40ed6677c96241e1160fa3` tree-equal. [App CI](https://github.com/kredavto/JobMatch-AI/actions/runs/41359208029/job/125005730237): lint/types/build PASS;1173unit/API в83файлах PASS;261browserPASS/2liveSKIP. Все6новых controller-сценариев и5unit/SSR PASS.15релевантных source-workflows PASS; отдельный CPU diagnostic исключён из квалификации модели.11изменённых файлов immutable-readback: content и blob metadata равны ожидаемому/git tree index. Локального hash/test/build/manual visual результата нет. Production blobs между двумя CI попытками одинаковы; исправлены только fixtures/tests/docs.

[Native18restore/session/codec](https://github.com/kredavto/JobMatch-AI/actions/runs/41359207954/job/125005730145), [parser→verifiedTLS→productionAPI→compact17restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41359207963/job/125005730175), [Ops](https://github.com/kredavto/JobMatch-AI/actions/runs/41359208011/job/125005730382), [Parser/OCR](https://github.com/kredavto/JobMatch-AI/actions/runs/41359207978/job/125005730359) PASS, worker101/0skip. [ClamAV](https://github.com/kredavto/JobMatch-AI/actions/runs/41359207978/job/125005730617) PASS: engine1.4.6, loaded signed database28171(2026-11-01T06:27:34Z), observation22:52:53.613Z, refresh/reload/refusals. Логи содержат тот же synthetic checkout. Auth/HTTP bridge/data/restore синтетические; это не provider-copy/RPO/RTO/live delivery/globalSLO/unknown-threat/capacity acceptance. Renderer v1 и проверенные защищённые source/schema/auth/service/lockfile Git blobs совпадают с #97.

[PR #98](https://github.com/kredavto/JobMatch-AI/pull/98) следует за ready/unmerged #97; main merge/release не выполняются. Следом: редактор и оставшиеся экраны/даты/offline до отдельного global locale gate. SMTP/recovery/provider restore/ПД/model/final acceptance OPEN.


### Текущий редактор: контекст источников и RU/EN — 1 ноября 2026

Свежие main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, четыре документа и88открытых PR сверены. Отдельная ветка от ready/unmerged #98 `61aed851a6052554bb63586976ba0ee2c904cbbe`; final #98 App41359867918/job125007773671:1173unit83files/261browserPASS/2liveSKIP, все16workflows PASS. Runtime unavailable; pinned GitHub/leased refs/CI only, локальные/manual visual проверки не заявляются.

Новый блок: два regression-сценария проверяют dirty-source запрет версии и поздний анализ после смены вкладки на неизменённом коде. Итоги baseline и исправления приведены ниже; полный проект/EN/model/provider acceptance OPEN. #1/#2 объединены по отдельному разрешению, оно не распространяется на будущие merge/release. Письма/paid infra/LLM user traffic/HH writes не выполняются.


Подготовлено исправление текущего редактора: controlled ResumeEditorPanel с optional/defaultRU copy, fixed reason/category mapping; оригинал/факты/цитаты и русский v1 renderer не переводятся. Root хранит owner/revision/saved-source basis, блокирует выбор/undo/version и принудительные handlers при busy/paused/dirty/stale; ref закрывает same-tick duplicate analyze/version. Новый saved goal требует свежего анализа. Поздние analyze/version не меняют вкладку после более поздней навигации. Все API payload/guards #97 сохранены, engine/evidence/analysis-response/document renderer не меняются.8controller cases и5unit/SSR прошли полный исправленный CI; [контракт](docs/CURRENT_EDITOR_CONTEXT_LOCALES.md), [PR #99](https://github.com/kredavto/JobMatch-AI/pull/99). Глобальный язык OFF, AI/letters/career/history/tracker/settings/analytics/offline/final acceptance OPEN.


CI исправления attempt1 `232c23c3c3a174cc0756cefab1e99ccc58f64576` / App41361787864/job125013495090:1178unit84files,lint/types/build PASS; два исходных regressions и ещё5новых browser cases PASS,1new quote-selector FAIL. Полный browser suite не завершён: при extract ошибочно удалены соседние SourceProfilePanel/SourceVersionsPanel invocations, existing source-profile cases ожидали отсутствующие панели и job отменён по20минутному лимиту. Подключения восстановлены дословно с исходными owner/revision/dirty/boundary props. Все20существующих default/named UI component invocation counts сверены с #98; это разовый source audit, не замена E2E. Quote assertion уже отделяет literal от mandatory badge, validation/guards не ослаблялись. Итог полного исправленного CI приведён ниже; предыдущая попытка не выдаётся за PASS.


Фактический итог #99: executable source `e9f5d9c5081270ea19a36b6d770e4c150ab7b2b6`, tree `82e1c9fa7ef2712a511f0e77f7def8b18affb856`, synthetic checkout `05d2ec226819e67e966012ba10a89921cb7263e0` tree-equal. [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41363571347/job/125018920877) lint/types/build PASS;1178unit/API в84файлах PASS;269browserPASS/2liveSKIP. Все8новых controller cases и5unit/SSR PASS; existing source-profile21/source-version3cases PASS.15релевантных source-workflows PASS, отдельный CPU diagnostic не является квалификацией модели.12изменённых файлов immutable-readback content/blob metadata равны ожидаемому/git tree index.56защищённых engine/evidence/analysis-validator/schema/auth/service/lockfile/codec Git blobs совпадают с #98.20default/named UI invocation counts и дословные соседние source-panel bindings сверены. Локального hash/test/build/manual visual результата нет.

Red baseline `4b7ef92dcdd26feec6e0f7ca71fa364abe30f845` / tree `a904c009e43d98dbf89f3200039d770c455a3a4c`, checkout `42d6b4c3828dcdd93499be25b09d7183236db427` tree-equal: [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41361327297/job/125012119737)1173unit83files/261browserPASS/2newFAIL/2liveSKIP. Первый extract `232c23c3c3a174cc0756cefab1e99ccc58f64576`:1178unit84files/7newbrowserPASS/1quote-selectorFAIL; missing adjacent panels вызвали existing failures и отмену по20минутному лимиту, полного PASS нет. Quote-only correction `8f9b66521afe15e08d9da58fc95f0ca96b9124d6` / [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41361943291/job/125013972835):8newbrowserPASS, но тот же missing-panel failure/timeout; полного PASS нет. Итоговый source восстанавливает оба подключения дословно, существующие проверки не удалены и не ослаблены.

[Native18restore/session/codec](https://github.com/kredavto/JobMatch-AI/actions/runs/41363571396/job/125018919386), [parser→verifiedTLS→productionAPI→compact17restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41363571434/job/125018919489), [Ops](https://github.com/kredavto/JobMatch-AI/actions/runs/41363571345/job/125018919205), [Parser/OCR](https://github.com/kredavto/JobMatch-AI/actions/runs/41363571495/job/125018919912) PASS; worker101/0skip. [ClamAV](https://github.com/kredavto/JobMatch-AI/actions/runs/41363571495/job/125018919638) PASS:engine1.4.6/loaded database28171(2026-11-01T06:27:34Z), signed observation23:46:17.499Z, refresh/reload/refusals. Все эти логи содержат тот же source synthetic checkout. Auth/HTTP bridge/data/restore синтетические, не provider-copy/RPO/RTO/live SMTP/globalSLO/unknown-threat/capacity acceptance.

[PR #99](https://github.com/kredavto/JobMatch-AI/pull/99) после ready/unmerged #98. Следом: история/сравнение версий и DOCX-feedback, explicit date/time display; далее AI/letters/career/tracker/settings/analytics/offline/global language gate и final acceptance. SMTP/recovery/provider-copy/ПД/model/final ops OPEN; #1/#2 permission не расширяется. Main merge/release не выполнены.


### История версий, время и DOCX: текущая интеграция — 1–2 ноября 2026

Свежие main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, четыре документа и89открытых PR прочитаны/сверены; отдельная ветка от ready/unmerged #99 `9195d4108fcb04d1edc86cb70f54fd0be9f85412`. Final #99 App41364019434/job125020250233:1178unit84files/269browserPASS/2liveSKIP; все16final workflows PASS, native18synthetic PASS, CPU_SCOPE_DOCS_ONLY. Runtime unavailable; pinned GitHub/leased refs/readback/CI only, локальных/manual visual проверок нет.

Два regression-сценария проверяют timezone drift в текущей истории и недопустимое приписывание часового пояса legacy naive timestamp. Production baseline не изменён, результаты red/fix приведены ниже. Затем optional/defaultRU history/comparison/metadata/DOCX, literal exports и pending identity. Global language/final acceptance OPEN; SMTP/provider-copy/RPO/RTO/ПД/model не закрыты. #1/#2 merged по отдельному разрешению, не общее разрешение на merge/release. Письма/paid infra/LLM user traffic/HH writes не выполняются.


Подготовлена текущая интеграция истории/сравнения/metadata/DOCX (2 ноября): offset ISO→explicitUTC; date-only сохраняет день с оговоркой о несуществующем времени; naive legacy остаётся дословным с missing-zone qualifier. Raw created/text/vacancy/evidence/JSON не меняются, mixed snapshots показывают отдельные подтверждения. Root handlers/request path byte-equal после исключения import/view lines;18прочих UI invocations сохранены, source panels не затронуты. Restore local pending ref + known owner/pause/busy guards; DOCX owner/version key безlocale, cleanup controllers/timers, fixed error keys безraw Error.message.10browser и7unit/SSR прошли полный исправленный CI. [Контракт](docs/CURRENT_VERSION_HISTORY_LOCALES.md), [PR #100](https://github.com/kredavto/JobMatch-AI/pull/100).

Фактический red baseline `24bbfa5be480d5d424870c6d964ab907407d6824` / tree `bbda7650ade11bde417f9438957e4de010299409`, synthetic checkout `0d52ff91f13d50da932a63dd5277a458f894cdb8` tree-equal: [App41364837616/job125022682502](https://github.com/kredavto/JobMatch-AI/actions/runs/41364837616/job/125022682502)1178unit84files/269browserPASS/2newFAIL/2liveSKIP,lint/types/build PASS. Device-zone headers различаются, naive ISO превращался в локализованную строку без оговорки. Production не менялся; это воспроизведение дефектов, не успешная приёмка изменения. Runtime unavailable; локальных/manual visual результатов нет. SMTP/recovery/provider-copy/RPO/RTO/ПД/model/final ops OPEN, #1/#2 permission не расширяется.


Первый CI исправления `08bef91b707364e3eaceea49ec515061415be228` / tree `4d8ec299ddcf4117b4207af9955ff977bab416c6`, checkout `0a32bf6cc4a7e007d6e37ffdbbd2ea381de96cb6`: [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41365656329/job/125025157218)1185unit85files/274browserPASS/5newfixture-labelFAIL/2liveSKIP,lint/types/build PASS. Даты/history/exports/restore и все старые сценарии PASS. Пять DOCX-сценариев не прошли точный getByLabel: implicit label тестовой страницы включал тексты options. Fixture исправлен на явные htmlFor/id; production code и assertions не меняются, повторный полный CI выполнен, доказательства приведены ниже.


Фактический исправленный source #100 `ef4cd34938f020e79ef8c461cf20da1face8cb8e`, tree `e6717892166f77817ebbfb985e38f7d1a452df5a`, synthetic checkout `92f748a8bc0292eb6449b007e453d9ab0be2801c` tree-equal. [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41366702711/job/125028257563) lint/types/build PASS;1185unit/API85files PASS;279browserPASS/2liveSKIP. Все10новых browser и7unit/SSR PASS, старые сценарии не удалены/не ослаблены.15релевантных source-workflows PASS; отдельный CPU diagnostic не квалифицирует модель.18изменённых файлов immutable-readback:content/blob metadata равны ожидаемому/git tree index.7production Git blobs равны первой попытке, исправлен только label fixture и docs.58защищённых schema/auth/service/engine/codecs/renderer/diff/lockfile blobs совпадают с #99; Root handlers/request path byte-equal,18прочих UI invocations сохранены. Локального hash/test/build/manual visual результата нет.

[Native18restore/session/codec](https://github.com/kredavto/JobMatch-AI/actions/runs/41366702856/job/125028257944), [parser→verifiedTLS→productionAPI→compact17restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41366702804/job/125028257942), [Ops](https://github.com/kredavto/JobMatch-AI/actions/runs/41366702727/job/125028257484), [Parser/OCR](https://github.com/kredavto/JobMatch-AI/actions/runs/41366702672/job/125028257146) PASS; worker101/0skip. [ClamAV](https://github.com/kredavto/JobMatch-AI/actions/runs/41366702672/job/125028257345) PASS:engine1.4.6/loaded database28171(2026-11-01T06:27:34Z),signed observation2026-11-02T00:23:02.029Z,refresh/reload/refusals. Все эти логи содержат тот же source checkout. Auth/HTTP bridge/data/restore синтетические, не provider-copy/RPO/RTO/live SMTP/globalSLO/unknown-threat/capacity acceptance.

[PR #100](https://github.com/kredavto/JobMatch-AI/pull/100) после ready/unmerged #99. UI показывает explicitUTC до целых секунд; исходный offset/дробная часть в created/JSON не изменены. Legacy date-only/naive не получают вымышленного instant. DOCX guard/late errors/owner-version cleanup, raw TXT/JSON/clipboard и restore body проверены на synthetic fixtures, не на реальном provider account. Следом: AI-review/adaptation presentation и context consent/results; затем letters/career/tracker/settings/analytics/offline/global language gate и final acceptance. SMTP/recovery/provider-copy/ПД/model/final ops OPEN; #1/#2 permission не расширяется. Main merge/release не выполнены.


### Экспериментальные AI-панели: контекст и RU/EN — 2 ноября 2026

Свежие main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, четыре документа и90открытых PR прочитаны/сверены. Отдельная ветка от ready/unmerged #100 `97021c6eeeaa007c702e0cc87a0a46dc393a8b6a`; final #100 App41367334151/job125030172564:1185unit85files/279browserPASS/2liveSKIP,все16workflows PASS;native18synthetic PASS;CPU_SCOPE_DOCS_ONLY. Runtime unavailable,pinned GitHub/leased refs/readback/CI only,локальных/manual visual проверок нет.

Два controller regression cases проверяют non-JSON503 fixed feedback и отзыв review consent/result при paused workspace на неизменённом production. Red/fix результаты приведены ниже. Следом closed RU/EN copy, source-bound request state/timer cleanup и bounded JSON read без изменения AI provenance/semantics/flags. Qualified model остаётся OPEN; main diagnostic0/16gold не выдаётся за принятую модель. SMTP/recovery/provider-copy/RPO/RTO/ПД/final ops OPEN. #1/#2 merged по отдельному разрешению, не общее разрешение на merge/release. Письма/paid infra/LLM user traffic/HH writes не выполняются.


Подготовлена текущая AI UI интеграция: fixed RU/EN review keys и extracted adaptation copy; locale не входит в source/readiness identity, consent, requests или literal draft. Review теперь source-bound (owner/revision/factual tuples/vacancy/readiness), revoke consent/results и cleanup25s timers; adaptation existing source/readiness key не ослаблен, lifetime уточняет ephemeral reset при pause. Успешные JSON ограничены2MiB declared/actual bytes, strictUTF8; non-OK body не парсится и не становится Error.message вUI. Root401/409 boundary callbacks приостанавливают записи безauto-reload/replay. Root handlers unchanged,19прочих importedUI invocations сохранены.16browser и8unit/SSR прошли полный CI; доказательства приведены ниже. [Контракт](docs/CURRENT_AI_CONTEXT_LOCALES.md), [PR #101](https://github.com/kredavto/JobMatch-AI/pull/101).

Фактический red baseline `f4def7247f5f64b6cbd044e9de9bf850dd811a0c` / tree `e0f08e7b1003e13f6b46773d2536b54d02964aa2`, synthetic checkout `56f56de7956f4a6e9c5beaa39d0d0b1760fb62c5` tree-equal: [App41368772732/job125034514406](https://github.com/kredavto/JobMatch-AI/actions/runs/41368772732/job/125034514406)1185unit85files/279browserPASS/2newFAIL/2liveSKIP,lint/types/build PASS. Первый case показал raw JSON parser text с synthetic PRIVATE marker вместо fixed503; второй оставил consent checked при paused workspace. API/model/citation/eligible-fact/literal validators/flags не меняются. Gold0/16 остаётся NOT ACCEPTED. SMTP/recovery/provider-copy/RPO/RTO/ПД/final ops OPEN; #1/#2 permission не расширяется. Нет реальных писем/paid infra/LLM user traffic/HH writes/merge/release, локальных/manual visual результатов нет.


Фактический source #101 `350bafcbc4950f3e70843b3d4b3d050b42404f5d`, tree `1b58d2ebdaa4c86b7d3b1762ca24bdfb6917d518`, synthetic checkout `1d7eba29bd58d080282ac0a20beee3cd42d6c5e6` tree-equal. [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41370252424/job/125038981771) lint/types/build PASS;1193unit/API86files PASS;295browserPASS/2liveSKIP. Все16новых browser и8unit/SSR PASS, старые сценарии не ослаблены.15релевантных source-workflows PASS; отдельный CPU diagnostic не квалифицирует модель.16изменённых файлов immutable-readback content/blob metadata равны ожидаемому/git tree index.61защищённый schema/auth/service/engine/AI-contract/body/codecs/renderer/diff/lockfile blob совпадает с #100. Root handlers byte-equal;19существующих UI invocation counts сохранены. Локального hash/test/build/manual visual результата нет.

Red baseline `f4def7247f5f64b6cbd044e9de9bf850dd811a0c` / tree `e0f08e7b1003e13f6b46773d2536b54d02964aa2`, checkout `56f56de7956f4a6e9c5beaa39d0d0b1760fb62c5` tree-equal: [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41368772732/job/125034514406)1185unit85files/279browserPASS/2newFAIL/2liveSKIP. Старый parser error выводил synthetic PRIVATE fragment, consent оставался checked при paused workspace. Исправленный source использует status-before-parse/fixed keys и source/readiness identity; оба regression cases PASS. Модель/проверки точных цитат/eligible facts/дословный renderer не менялись.

[Native18restore/session/codec](https://github.com/kredavto/JobMatch-AI/actions/runs/41370252381/job/125038981616), [parser→verifiedTLS→productionAPI→compact17restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41370252382/job/125038981606), [Ops](https://github.com/kredavto/JobMatch-AI/actions/runs/41370252436/job/125038981836), [Parser/OCR](https://github.com/kredavto/JobMatch-AI/actions/runs/41370252398/job/125038982018) PASS; worker101/0skip. [ClamAV](https://github.com/kredavto/JobMatch-AI/actions/runs/41370252398/job/125038981866) PASS:engine1.4.6/loaded database28171(2026-11-01T06:27:34Z),signed observation2026-11-02T01:03:01.107Z,refresh/reload/refusals. Все логи содержат тот же source checkout. Auth/HTTP bridge/data/restore синтетические, не provider-copy/RPO/RTO/live SMTP/globalSLO/unknown-threat/capacity acceptance.

[PR #101](https://github.com/kredavto/JobMatch-AI/pull/101) после ready/unmerged #100. Model acceptance OPEN: archived main0/16gold остаётся NOT ACCEPTED. UI/HTTP fixture, bounded body и переведённое согласие не доказывают семантическую пригодность модели. Следом: панели писем/сохранённых писем и карьерного плана с сохранением draft/provenance; затем tracker/settings/analytics/offline/global language gate и final acceptance. SMTP/recovery/provider-copy/ПД/model/final ops OPEN; #1/#2 permission не расширяется. Main merge/release не выполнены.


### Серверные письма: текущие даты, RU/EN и ограничение чтения — 2 ноября 2026

Свежие main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, четыре документа и91открытый PR прочитаны/сверены. Отдельная ветка от ready/unmerged #101 `388abfa3793da108897d86ed1ac272333410dd5b`;final #101 App41371193596/job125041822538:1193unit86files/295browserPASS/2liveSKIP,все16workflows PASS,native18synthetic PASS,CPU_SCOPE_DOCS_ONLY. Runtime unavailable,pinned GitHub/leased refs/readback/CI only,локальных/manual visual результатов нет.

Два controller cases проверяют device-zone drift в серверной истории и late read notice после смены UI языка на неизменённом production. Red/fix результаты ожидаются. Блок сохраняет frozen snapshot/receipt/API/явное принятие и текущий draft, переводит только серверную панель; локальный шаблон остаётся RU. Клиентское чтение также проверяется на зависший cancel hook и body abort. Модель, SMTP/recovery/provider-copy/RPO/RTO/ПД/final ops OPEN; #1/#2 merged по отдельному разрешению, не разрешение на будущие merge/release. Письма/paid infra/LLM user traffic/HH writes не выполняются.


## Блок PR #102 — серверные версии писем: RU/EN, UTC и bounded transport (ветка, не main)

- Прочитаны свежие main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, четыре плана и 91 открытый PR; база — финальный #101 `388abfa3793da108897d86ed1ac272333410dd5b`, все 16 его workflow успешны. Разрешённые ранее объединения #1/#2 не разрешают новые merge/release.
- Baseline `1e8201eae0810616939856d06f7e1e469aa034e7`, CI checkout `89312c97d5889504acb7f07fa8d2cc69cd3a1064`, совпадающее дерево `2bd9c8dd3d5b52220c8d323ded57d21585608b0f`: Application run 41373725133 / job 125049397538 — 1193 unit в 86 файлах; 295 browser PASS, 2 новых FAIL, 2 live SKIP. Доказаны timezone-зависимая дата и неизменяемое русское уведомление позднего чтения.
- Реализованы default RU / optional EN для текущей серверной истории/предпросмотра/принятия, UTC записанного момента и семантические сообщения текущего языка. Язык не сбрасывает согласия и не входит в ключи/receipt/snapshot. Локальный композитор/lexical review остаётся RU; глобальный EN не включён.
- Reader сохраняет лимиты 2 100 000 bytes / 20 000 ms, ограничивает всё чтение и не ждёт зависший cancel hook. Проверки владельца/ревизий/происхождения, literal acceptance, codec/signing и reconciliation без автоповтора сохранены.
- Source CI и immutable readback завершены; фактические результаты перечислены ниже. [Контракт](docs/CURRENT_SAVED_LETTER_LOCALES.md). Локальный runtime недоступен; локальные/ручные visual результаты не заявлены.
- OPEN: локальный composer/review/career и остальные непереведённые экраны; SMTP/password recovery, реальный restore копии провайдера/RPO/RTO, решение оператора о ПД, квалификация модели (архивный 0/16 gold остаётся NOT ACCEPTED), финальная эксплуатационная приёмка. Ни адаптеры, ни синтетические фикстуры их не закрывают.


### PR #102 — зафиксированные результаты source CI

Source commit `7538891bc39b0e509227e0e93c1fba1775491afa`, tree `6e7d8783bfc4a0d167f9b84bda26c5cc8617f5c1`; синтетический CI checkout `8dcaeaad34b7826a4c71ad908388909a658b9c66` имеет то же дерево (это не объединение PR). Все 14 изменённых файлов прочитаны по immutable SHA и сверены с Git tree; 61 защищённый blob и полный префикс receipt validators совпадают с базой #101. Локальное вычисление хешей/тесты не заявлены.

- [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/41374789492), job 125052574499: lint, typecheck, build PASS; **1201 unit / 87 файлов; 306 browser PASS, 2 live SKIP**. Все 8 новых unit и 11 новых browser PASS; обе исходные регрессии исправлены.
- Все **15 относящихся к изменению workflow успешны**: 12 PostgreSQL protocol/integration, operational telemetry, isolated parser/AV, Application. Отдельный автоматический CPU diagnostic не является квалификацией модели и не используется как доказательство её приёмки.
- Native [41374789431](https://github.com/kredavto/JobMatch-AI/actions/runs/41374789431), job 125052574615: actual bounded containers/TLS/import API, compact SQL и 17 populated tables в synthetic native restore PASS. Core [41374789589](https://github.com/kredavto/JobMatch-AI/actions/runs/41374789589), job 125052574806: HTTP commands/immutable receipts/concurrent writers/rollback/reapply/restore PASS. Это одноразовые синтетические PostgreSQL среды, не реальная копия Supabase.
- Ops [41374789456](https://github.com/kredavto/JobMatch-AI/actions/runs/41374789456), job 125052574514: actual Next handlers, bounded file/alert checks PASS; не глобальный мониторинг/доставка.
- Parser/AV [41374789529](https://github.com/kredavto/JobMatch-AI/actions/runs/41374789529): parser job 125052575025 — **101 PASS / 0 SKIP**, real bilingual/mixed/blank/page-budget OCR и контейнерные лимиты PASS. AV job 125052574788: real ClamAV **1.4.6 / database 28171**, readiness observed `2026-11-02T01:54:53.411Z`, signed observer/архивы/encryption/отказы PASS. Все шесть изученных логов содержат source CI checkout выше.

Этот следующий commit меняет только пять Markdown-файлов с фактическими результатами. Код остаётся деревом проверенного source; финальное remote readback/CI отслеживается в PR. PR остаётся отдельной необъединённой веткой; релиз/main/production не изменены. Следующий технический блок — локальный композитор и lexical-review/career UI, без перевода или пересоздания frozen RU v1 документа при смене языка. Полный проект не принят: SMTP/recovery, provider-copy restore/RPO/RTO, решение оператора о ПД, модель и финальная эксплуатационная приёмка OPEN.
