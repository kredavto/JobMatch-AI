# Архитектура

## Текущая реализация
Next.js 16 App Router + TypeScript + React, CSS без UI-фреймворка, Zod. Vercel Node 24, регион функций Frankfurt. PostgreSQL в отдельном Supabase-проекте. Auth и RLS — Supabase. Сервис обращается к REST API с токеном конкретного пользователя и publishable key; service_role ключ не используется.

Browser → Next /api/service → Supabase Auth / PostgREST → PostgreSQL (RLS).
Browser → /api/import → извлечение текста в памяти → проверка пользователем → сохранение.

lib/engine.ts: чистые правила, evidence gate, оценка, предложения и версии.
lib/db.ts: адаптер PostgreSQL REST, типы Workspace/Version/Application.
lib/http.ts: origin, session verification, ограничения частоты, ошибки.
lib/hh.ts: строго отключенный HHProvider, подготовка ручного переноса.

Модель LLM не подключена. Весь анализ выполняется правилами в приложении; никакой внешний inference. Интерфейс AIProvider обозначает направление расширения, но не реализует self-hosted модель.

## Согласованность
save_workspace — транзакционный RPC: блокировка по auth.uid, проверка revision, изменение JSONB и audit в одной транзакции. Повторный запрос со старой revision = 409. Restore создает новую версию. Токены хранятся только HttpOnly cookie. Мастер-профиль не меняется при создании версии.

## Отличия от целевого стека
Prisma, Tailwind/shadcn и Redis не внедрены. SQLite был заменен до публикации: Vercel не использует локальные файлы для хранения резюме. Нормализованная целевая модель описана в DATA_MODEL.md; текущие данные сгруппированы в JSONB владельца.

## Развертывание
npm ci; npm run lint; npm run typecheck; npm test; npm run build.
Переменные SUPABASE_URL и SUPABASE_PUBLISHABLE_KEY — на сервере. Схема в supabase/schema.sql, примененная миграция отражена в supabase/migrations.
Настройка Supabase Site URL и собственного SMTP требуется для полноценной публичной регистрации. При стандартном email-подтверждении пользователь возвращается в приложение и входит после подтверждения адреса.

## Итерация 0.2
lib/body.ts ограничивает поток запроса до разбора JSON/multipart. lib/documents.ts выполняет проверку архива и извлечение; lib/errors.ts отделяет публичные ошибки от внутренних. consume_quota RPC использует PostgreSQL atomic upsert, поэтому квоты едины для Vercel-инстансов. Старый in-memory limiter сохранен только как дополнительная защита. Миграция аддитивная, совместима с предыдущим приложением. Для отката приложения таблицу квот удалять не нужно.


## История фактов (0.3)
`public.fact_history` хранит id, user_id (FK auth.users, ON DELETE CASCADE), workspace_revision, kind (baseline/change), facts JSONB, captured_at. Это независимая таблица снимков; текущая модель workspace пока не полностью нормализована. AFTER-триггер в private использует узкое SECURITY DEFINER для append-only записи, проверяет auth.uid и активную сессию. История создается атомарно при изменении массива facts; неизмененные факты не дают лишнего снимка. RLS позволяет только SELECT владельцу с активной сессией; клиентские INSERT/UPDATE/DELETE запрещены grants. Администратор БД по-прежнему обладает привилегиями — это не криптографический журнал.

Начальные записи baseline означают дату фиксации состояния, не время подтверждения. `/api/fact-history` читает по 20 снимков с курсором id; `?export=1` передает NDJSON по страницам. Последняя запись `{"complete":true}` подтверждает полное завершение; при прерывании/таймауте файл нужно скачать повторно. JSON-экспорт профиля содержит ссылку на отдельный экспорт истории. Для полного архива нужны оба файла. История хранится до удаления аккаунта; автоматического сокращения срока хранения пока нет. На время экспорта новые снимки после начала не включаются.


## Переход хранения (0.4)
Чтение: service → readWorkspace → public.read_workspace() → workspace metadata + profile_facts/resume_versions/applications/application_events, единый SQL-снимок. Запись: service → save_workspace → optimistic revision/advisory lock → workspace update → fact_history и sync_workspace_entities в той же транзакции. Нарушение FK откатывает все изменения, включая журнал и ревизию. Триггер пропускает синхронизацию при изменении только цели/вакансии; upsert не обновляет неизменившиеся строки. Внутренний project_workspace — SECURITY INVOKER без клиентских EXECUTE; вызывается только миграцией или узким SECURITY DEFINER-триггером с проверкой владельца и сессии.

Откат приложения к 0.3 совместим: прежний payload сохранен и продолжает синхронизировать новые таблицы. Не удалять старый payload до отдельного contract-релиза и проверки резервного восстановления. В случае ошибки самого триггера нужна отдельная административная миграция, а не автоматический обход ограничений. Нормализованные таблицы нельзя редактировать вручную без согласованного изменения источника записи. Миграция завершится ошибкой при несовместимых/дублирующихся идентификаторах или нарушенных связях — данные не исправляются молча.


## Граница записи (0.5)
`public.save_workspace` — совместимая SECURITY INVOKER обертка. `private.commit_workspace` выполняет только действия владельца из allowlist, с активной сессией, advisory lock и optimistic revision. Отдельные internal SECURITY INVOKER валидаторы проверяют факты, версии и отклики; они недоступны клиентам. Прямой DML по workspace и журналам отозван, поэтому обход RPC через Data API закрыт. Старые permissive write policies сохранены, но не предоставляют доступ без DML grants.

Схема остается expand/compatibility: запись принимает снимок, валидирует переход состояния, затем атомарно обновляет JSON, нормализованные таблицы и историю. Следующий contract-этап должен заменить снимок отдельными небольшими командами и убрать дублирование. Откат приложения 0.4 совместим с разрешенными действиями, но прямые DML-клиенты намеренно больше не поддерживаются.


## PWA (0.6)
Client Connectivity подписывается на online/offline через useSyncExternalStore и регистрирует /sw.js только в production. Navigator.onLine — подсказка состояния сети, не проверка доступности сервера; ошибки API по-прежнему обрабатывает client-api. Worker не кеширует Next.js приложение: offline.html самодостаточен, без JS и данных профиля. Успешная первая онлайн-загрузка нужна для установки; если браузер запрещает service worker, сетевой режим продолжает работать. Manifest и четыре публичных файла — единственные ресурсы офлайн-сценария. Установка зависит от браузера; собственный install prompt не навязывается.

### Analytics 0.9
AnalyticsPanel calculates read-only aggregates from the authenticated workspace already loaded by the application. lib/analytics.ts contains pure UTC cohort/filter/summary/CSV functions; no new provider or database access is introduced. The previous cohort is the immediately preceding inclusive period of equal length. Response outcomes use all recorded events, not only events inside the cohort window. Persisted Russian status values remain API/domain data, separate from RU/EN presentation dictionaries. Version grouping reflects the current application-to-version link, not a reconstructed historical assignment.

### Workspace response validation 0.10
WorkspaceSchema is shared by the server read boundary and browser state installation. Required values are validated without coercion/defaults; nested unknown fields are retained for compatibility. A malformed read becomes a generic 502 on the server. A malformed response to a browser mutation has unknown commit outcome, so the existing recovery flow blocks repeat writes until explicit reload. Original drafts remain in React memory. This does not replace RLS, database transition validators, or evidence verification.

### Analysis integrity boundary 0.11
analysis-response.ts validates the response structure and compares the complete rules-v1 result with a reconstruction from the request's facts/vacancy snapshot. Object key order is ignored; ordered arrays, evidence, quotes, scores, blockers and reasons must agree. Unknown protocol fields are ignored. Edits also pass gate before state installation. A mismatch clears the old editor result and enters explicit reload recovery. This is a deterministic provider integrity check, not independent semantic validation. Server-side version generation and database write gates remain authoritative.

### Personal export 0.12
personal-export.ts reads a workspace, records an application-server cutoff, pages the owner-bound audit log by ascending UUID, reads consent and rechecks the workspace revision. Queries use created <= cutoff and the current user's token. It continues to an empty page even when a provider returns fewer than 200 rows. Failed reads, nonadvancing cursors or revision conflicts produce no JSON archive. Memory/time bounds are 10,000 audit rows and 51 page requests; exceeding either fails explicitly. A future streaming exporter is required above those limits.

ExportSchema defines jobmatch-personal-data-v1 with complete=true scoped only to workspace-audit-consent. Browser download is gated on validation. Fact-history remains a separate NDJSON stream; the two downloads are not a single transactional snapshot. The application-server cutoff is not a database snapshot identifier. No credentials/tokens are included.

### Fact history transport 0.13
history-schema.ts is shared without server dependencies. Pages contain at most 20 records, strictly descending positive integer IDs below the requested cursor. next equals the last ID, or null only for an empty page. This may require an additional empty-page request in the UI.

history-stream.ts emits one NDJSON record per pull, reads the next page only when needed and suppresses subsequent reads/enqueues after cancellation. An in-flight upstream request can finish but is not emitted after cancellation. Output limits are 5000 records or 50 MiB; failures terminate with complete:false. Full-export requests cannot specify before. A missing terminal complete:true also means the download is incomplete. Historical rows remain append-only under existing DB permissions; no schema migration is introduced.

### Auth contracts 0.14
auth-contract.ts distinguishes a raw GoTrue signup-user response from token grant responses. Login/refresh require validated access_token, refresh_token, bearer token_type and integer expires_in (1..604800 seconds); cookies are only installed after validation. Registration can instead return confirmationRequired when the raw response is a user with an ID/email and no token fields. Browser acknowledgments accept exactly ok:true, or confirmationRequired:true only for registration.

Logout tries global revocation for a valid current identity. AUTH failures allow local cookie cleanup; other provider errors remain errors. Local cleanup after expiration does not assert global revocation. Same-origin checks still apply. Supabase signup behavior checked against its official internal/api/signup.go source on 2026-10-25; validation is a protocol check, not JWT signature verification, which remains the responsibility of the authenticated identity flow.

### Same-owner reauthentication 0.15
Service workspace responses add ownerId derived from authenticated identity; it is transport metadata and is not written to the workspace payload. The new client supplies expectedOwnerId for service actions. The server compares it with authenticated identity before accessing/mutating a workspace. On re-login it verifies the newly issued token identity before installing cookies. A mismatched grant is not installed or returned to the client.

The in-memory original owner anchors draft-preserving reload/re-login. A missing owner cannot enable reauthentication with preserved drafts. Same-owner success refreshes server state while keeping text inputs, clearing analysis/history and requiring explicit save. Ordinary logout clears all draft fields. A stale-tab logout cleans local cookies without global revocation of a different account.

expectedOwnerId is an additive stale-tab safeguard, not an authorization credential or replacement for RLS; older clients may omit it. Browser-memory drafts disappear on page close/reload. No localStorage, IndexedDB or offline PII storage is added.

## Защита от смены аккаунта при чтении (0.16)
История и импорт принимают optional `x-jobmatch-owner`; загрузка NDJSON использует `expectedOwnerId` в URL (UUID, не секрет и не credential). Все переданные значения должны совпадать с identity текущей сессии. Несовпадение — 409 до чтения истории/тела файла; malformed UUID — 400. Проверяются и повторные query-параметры. Отсутствие hint сохраняет совместимость, но не отменяет auth/RLS. Уже начатый ответ относится к проверенной сессии запроса; глобальная отмена при смене cookies не реализована.

## Карьерный помощник (0.17)
В редакторе после анализа доступен план развития и подготовки к интервью. Локальный модуль `career-coach` повторно сопоставляет сохраненные факты и вакансию, показывает evidence, приоритеты и учебные задания, экспортирует выбранную группу в TXT. План не сохраняется автоматически и не изменяет профиль/балл. Сложные требования остаются неподтвержденными; отсутствие свидетельств не означает отсутствие компетенции. Генеративный AI не подключен.

## Сопроводительное письмо (0.18)
После анализа в редакторе доступен локальный шаблон четырех стилей. `composeLetter` принимает только 1–5 уникальных правок из текущего `propose`, повторно проверяет `gate` и переносит факты дословно. Вакансия не вставляется в письмо как инструкция. Вводные фразы о намерениях требуют проверки пользователем. После ручных изменений подтверждение экспорта сбрасывается, новые формулировки не объявляются подтвержденными. TXT содержит ровно отредактированный текст; отправки, серверного хранения и обновления профиля нет. Ориентир 100–170 слов не достигается искусственным добавлением опыта; краткий стиль может быть короче, длинные факты не обрезаются.

## Проверка evidence (0.19)
`evidenceIssue` — общий консервативный фильтр целой строки: возможные инструкции, русские/английские отрицания и планы обучения. Подтвержденная, но исключенная строка с термином требования блокирует положительное сопоставление этого требования (unknown, confidence 0, без evidence_ids), в том числе при конфликте с другой положительной строкой. Несвязанные навыки не блокируются. Предложения и gate используют тот же фильтр, письма получают факты через propose/gate. Отрицания в требованиях проверяются до точного сопоставления. Это не полная семантическая проверка и не защита от всех prompt injection: модели и выполнение инструкций из текста отсутствуют. Широкие английские отрицания и проверка целой строки могут исключать допустимые формулировки; интерфейс предлагает уточнить/разделить утверждения. Правила уточнены в рамках протокола rules-v1; исторические версии и сохраненные баллы неизменны, повторный анализ использует текущие правила.

## Метаданные оценки (0.20)
Optional `ResumeVersion.match_metadata` содержит `rules_revision`, `weights`, `contributions`, `requirements`, `outcomes`. Используется существующий JSONB `resume_versions.extra`, без миграции. Сервер формирует сводку из того же результата match, что и score; клиент не задает ее при сохранении. WorkspaceSchema проверяет типы, диапазоны, сумму весов и счетчиков. Старые версии без поля допустимы; restore сохраняет метаданные оригинала. `rules-v1` остается протоколом, `rules_revision` обозначает редакцию поведения и конфигурации (ее необходимо менять при будущих изменениях правил). Для полного воспроизведения не хватает полного снимка исходных фактов/строк сопоставления; эти сведения не выдумываются для истории.

## Помесячная аналитика (0.21)
`monthlyResults` агрегирует уже отфильтрованные приложения. Группа — UTC-месяц первого непланового события; outcomes используют всю сохраненную историю, включая более поздние месяцы. Каждое приложение считается один раз в каждой колонке; просмотры/приглашения/офферы требуют явного события, интервью включает оффер по существующему определению. Запланированные и пустые месяцы исключены. CSV содержит численные проценты до двух знаков, UI округляет до целого и показывает числитель/знаменатель. Крайние месяцы могут быть неполными при фильтре дат. Новых таблиц, API-вызовов и внешней передачи данных нет.

## Календарный экспорт (0.22)
ICS формируется в браузере по RFC 5545 (https://www.rfc-editor.org/rfc/rfc5545), разделы 3.1, 3.3.11, 3.6.1, 3.6.6. UTC DTSTART/DTEND/DTSTAMP, UUID UID, CRLF, folding до 75 UTF-8 октетов без разрыва символа, escaping TEXT и удаление управляющих символов. Только VEVENT и optional DISPLAY VALARM; нет ATTENDEE, ORGANIZER, METHOD, email или загрузки внешних ресурсов. CLASS:PRIVATE — пометка календаря, не шифрование. Файл содержит название выбранной вакансии и ручное описание; пользователь сам решает, куда импортировать. UID стабилен при повторном скачивании неизмененного черновика; после изменения создается новый, календарь может создавать дубликаты. Местное время проверяется обратным сравнением компонентов (включая DST-пропуски); повторяющееся осеннее время разрешается Date браузера, UTC явно показан до скачивания. Реальные календарные клиенты и доставки уведомлений отдельно не проверены.
