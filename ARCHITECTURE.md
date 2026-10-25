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
