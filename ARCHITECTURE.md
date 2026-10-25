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
