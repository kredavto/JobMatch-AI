# JobMatch AI

Рабочая ранняя версия сервиса адаптации резюме с доказательствами. **Не production-ready коммерческий релиз.** Реализована консервативная оптимизация порядка подтвержденных фактов, а не генеративная перепись.

## Запуск
Node.js 24; PostgreSQL в Supabase.

```sh
npm ci
cp .env.example .env.local
# Настройте SUPABASE_URL и SUPABASE_PUBLISHABLE_KEY
npm run dev
```

В новой базе примените `supabase/schema.sql`. Для существующей установки — только непримененные миграции из `supabase/migrations`, после проверки текущей схемы. Включите email/password Auth; настройте Site URL и собственный SMTP. Подтверждение почты сохраняется включенным. После письма вернитесь в приложение и войдите. Не используйте пароль hh.ru.

## Проверки
```sh
npm run lint
npm run typecheck
npm test
npm run build
# Для browser E2E: установите Chromium и отдельную тестовую учетную запись
npx playwright install chromium
npm run test:e2e
```

## Первый сценарий
Создайте аккаунт → демо-профиль → подтвердите факты → выберите демо-вакансию → сохраните текст → анализ → выберите правки → подтвердите отдельную версию → скачайте TXT/JSON.

Внешний AI и HH API отключены. Публикация в hh.ru только вручную. Match Score — внутренняя эвристика; перестановка фактов не увеличивает оценку.

## Документы
[Спецификация](PRODUCT_SPEC.md) · [Архитектура](ARCHITECTURE.md) · [Возможности HH](HH_API_CAPABILITIES.md) · [Модель](DATA_MODEL.md) · [Безопасность](SECURITY.md) · [Roadmap](ROADMAP.md).

Текущая инфраструктура находится вне РФ: соответствие требованиям локализации персональных данных не подтверждено. До реального массового использования нужны юридическая/эксплуатационная приемка, SMTP и distributed anti-abuse. Подробнее SECURITY.md.

## Обновление 0.2 — надежность
Добавлены централизованные квоты, защита импорта, снимки доказательств в версиях и привязка откликов к версиям. Применяйте миграции по порядку, перед новым деплоем; `schema.sql` — сводная схема только для пустой базы. Прямые API-доступы владельца через Supabase RLS не заменяются лимитами приложения. Команды/compact storage подготовлены в зависимых PR; SMTP и эксплуатационная приёмка остаются в roadmap. Необязательный изолированный parser описан в [docs/ISOLATED_PARSER.md](docs/ISOLATED_PARSER.md); по умолчанию импорт использует прежний inline-режим.

### История фактов (0.3)
В «Мой профиль» нажмите «Обновить историю фактов». Каждый снимок содержит исходный текст фактов, evidence_id, источник и состояние подтверждения. Повторный импорт дает новые идентификаторы и требует нового подтверждения. В «Настройки» скачайте JSON профиля и отдельный NDJSON истории; полный экспорт истории заканчивается записью `{"complete":true}`. История доступна только владельцу и удаляется с аккаунтом.


### Хранилище 0.4
Приложение читает факты, версии и отклики из отдельных PostgreSQL-таблиц через read_workspace RPC. Старый формат записи сохраняется для совместимости; синхронизация и история атомарны. Миграции применяйте по порядку. SQL-интеграционные проверки: supabase/tests/fact_history.sql и supabase/tests/normalized_entities.sql (синтетические данные, ROLLBACK). Полная документация перехода и отката — ARCHITECTURE.md.


### Запись 0.5
Все изменения через приложение и разрешенные save_workspace операции. Прямое изменение workspace, audit и consent через Data API запрещено. Дополнительная проверка в PostgreSQL блокирует переписывание версий и подмену доказательств. SQL-тест write_gates.sql дополняет две существующие интеграционные проверки. Полный отказ от совместимого JSON-контракта еще в roadmap.


### PWA 0.6
Откройте приложение онлайн, затем используйте «Установить»/«На экран Домой» в меню поддерживаемого браузера. Без сети показывается справочный экран; резюме и история не кешируются. Черновик в уже открытой вкладке остается в памяти, но пропадет после ее закрытия/перезагрузки. Проверка: production build + Playwright tests/e2e/offline.spec.ts. Для локального HTTP service worker разрешен на localhost; dev-режим worker не регистрирует.

## Карьерный помощник (0.17)
В редакторе после анализа доступен план развития и подготовки к интервью. Локальный модуль `career-coach` повторно сопоставляет сохраненные факты и вакансию, показывает evidence, приоритеты и учебные задания, экспортирует выбранную группу в TXT. План не сохраняется автоматически и не изменяет профиль/балл. Сложные требования остаются неподтвержденными; отсутствие свидетельств не означает отсутствие компетенции. Генеративный AI не подключен.

## Сопроводительное письмо (0.18)
После анализа в редакторе доступен локальный шаблон четырех стилей. `composeLetter` принимает только 1–5 уникальных правок из текущего `propose`, повторно проверяет `gate` и переносит факты дословно. Вакансия не вставляется в письмо как инструкция. Вводные фразы о намерениях требуют проверки пользователем. После ручных изменений подтверждение экспорта сбрасывается, новые формулировки не объявляются подтвержденными. TXT содержит ровно отредактированный текст; отправки, серверного хранения и обновления профиля нет. Ориентир 100–170 слов не достигается искусственным добавлением опыта; краткий стиль может быть короче, длинные факты не обрезаются.

## Проверки с реальной авторизацией
`TEST_EMAIL` / `TEST_PASSWORD` включают workflow-тест. Дополнительный `TEST_EMAIL_B` включает изоляцию, отзыв сессий и удаление второго аккаунта (используется тот же тестовый пароль). Разрешены только разные вымышленные адреса `jobmatch-qa-<UUID v4>@example.test`, подтвержденные заранее администратором. Эти тесты изменяют профили; второй аккаунт удаляется при успешном прогоне. Нельзя передавать реальные учетные записи. После любого прогона администратор должен удалить оставшиеся fixture-аккаунты по точным UUID, проверить каскадное удаление и убрать временный файл учетных данных. Секреты не хранить в git, логах, скриншотах или trace. В отсутствие fixture-переменных live-тесты явно пропускаются; mocks продолжают работать. Лимит 15 минут относится к тестовому сценарию, а не к HTTP-таймаутам приложения.

### 0.25 — DOCX export
Saved versions offer **Скачать DOCX**. The authenticated, quota-limited `/api/resume-export?id=…&expectedOwnerId=…` reads only the active owner's workspace; unknown/foreign version IDs return 404 and stale owner hints return 409. Files are never cached. Export contains the saved version text only (not current profile, vacancy, evidence or score), A4, Arial 11pt, 20mm margins. CRLF/CR normalize to paragraph breaks; tabs and spaces are preserved. XML-invalid characters and text over 200,000 UTF-16 units are rejected without silent edits; TXT remains available. No hyperlinks, macros, remote resources or author metadata are generated. JSZip 3.10.2 is now an explicit dependency (previously transitive via Mammoth).

Structure follows [Microsoft's WordprocessingML documentation](https://learn.microsoft.com/en-us/office/open-xml/word/structure-of-a-wordprocessingml-document). Automated validation reads exported text back with Mammoth and checks package contents, owner boundaries and browser download. Visual rendering in Microsoft Word / LibreOffice and original resume layout reproduction are not certified. Since 0.26, download errors appear inline without leaving the workspace.

### 0.26 — recoverable DOCX downloads
The download button shows progress and prevents duplicate requests. Failed authentication, owner conflicts, missing versions, quotas and outages produce fixed localized inline messages. No automatic retries or upstream error text display. Successful responses require the DOCX MIME type, a ZIP header and a maximum 2 MiB downloaded blob (not full client-side OOXML validation). Pending fetches abort on unmount and after 30 seconds; late results cannot trigger a download. Browser tests cover retry and cancellation using mocked endpoints; real Word rendering remains unverified.

### 0.27 — stricter DOCX import
DOCX containing duplicate/ambiguous archive parts, symlinks, conventional embedded OLE/ActiveX objects or VBA binaries is rejected before text extraction. Save a copy without embedded objects or paste the text manually. Normal text and images remain supported. This conservative filter does not replace antivirus. Optional isolated parsing is described in [docs/ISOLATED_PARSER.md](docs/ISOLATED_PARSER.md). Synthetic multipart integration tests exercise the actual upload route and document extractor with mocked authentication/quota.

### 0.28 — interrupted uploads
Incoming file and JSON bodies have a 15-second total read deadline. An interrupted or stalled read returns 408 with a retry message; partial content is not processed. Existing drafts stay in the current tab and writes are not automatically retried. This is a body-transfer limit. Inline extraction remains cooperative; optional worker mode enforces separate container/process budgets (see [docs/ISOLATED_PARSER.md](docs/ISOLATED_PARSER.md)).

### 0.29 — PDF lifecycle
Stalled asynchronous PDF parsing returns a specific timeout error instead of relying on destroy to settle pending promises. Cleanup runs once, has a bounded wait, and cannot mask extraction errors. Tests include a generated one-page text PDF and simulated lifecycle failures. The default inline mode remains cooperative. Optional worker mode adds isolation and hard limits; OCR and antivirus remain roadmap items.

### 0.30 — application tracker filters
The tracker supports search across saved vacancy/company titles and notes, current-status filtering, and resume-version filtering including unlinked applications. Search is case-insensitive, treats ё/е alike and requires every query word; filters combine with AND. Counts, empty results and reset are provided. Filtering is local to the list, performs no writes and does not affect calendar/analytics. Controls reset when leaving the tab; unsaved notes are not indexed. Cards remain mounted while hidden so filtering does not discard their input state. RU/EN filter message dictionaries are included; UI remains Russian.

### 0.31 — saved-version comparison
My Versions lets you select two saved resumes and inspect an exact line diff. Added/removed lines have text labels as well as colors; moves appear as removal plus addition. Only line endings normalize. Saved scores display side by side; a numeric delta is shown only for the same vacancy text, engine, rules revision, weights and contributions. This is not evidence of causality or hiring success. Large comparisons fall back to whole-text removal/addition above 500,000 alignment cells; UI displays at most 1,000 diff rows and directs users to full downloads below. Comparison is read-only and local; selections reset on leaving the tab.

### 0.32 — explicit note saves
Tracker notes now use an explicit Save button. Unsaved notes survive list filters, tab navigation and failed writes in the current page memory. Status/version changes are disabled until the note is saved or discarded, preventing blur/status write races. If the server note changed, the original saved text is available for comparison. Logout and account deletion clear note drafts. Reloading or closing the page loses drafts; no browser persistent storage is used.

Восстановление пароля: `/recover`, обязательная серверная `APP_URL` и точный redirect allowlist Supabase. Настройка и приемка: [docs/PASSWORD_RECOVERY.md](docs/PASSWORD_RECOVERY.md). Доставка письма требует отдельной живой проверки.

## 0.34 — собственный AI-разбор требований
Необязательная панель в редакторе: отправка сохранённой вакансии и подтверждённых фактов на собственный Ollama endpoint по отдельному согласию. Выключена на сервере по умолчанию. Результат содержит только точные цитаты/ссылки на факты, требует ручной проверки и не меняет score или версию. Для работы нужен собственный сервер модели и защищённый шлюз; live модель ещё не принята. Настройка и ограничения: [SELF_HOSTED_AI.md](docs/SELF_HOSTED_AI.md). Полный план: [COMPLETION_PLAN.md](COMPLETION_PLAN.md).

### OCR сканированных PDF

Необязательный worker поддерживает OCR русского/английского текста при `PARSER_WORKER_OCR=true` в контейнере parser. По умолчанию выключен; inline не меняется. До трёх страниц без текстового слоя, без частичного результата при ошибке/превышении лимита. OCR возвращает черновик с предупреждением проверить имена, даты и числа; сохранение/подтверждение остаются явными. [Настройка и ограничения](docs/SCANNED_PDF_OCR.md). Это не антивирус или карантин.

### Подтверждение почты (кандидат 0.35)
`/confirm-email` позволяет повторить запрос подтверждения существующей регистрации. Уже подтверждённому аккаунту нужно войти с прежним паролем; повторная регистрация пароль не меняет. Положительный ответ запроса письма не доказывает доставку. `APP_URL` — обязательный точный HTTPS origin для запросов почтовых ссылок. Другие alias/preview должны открывать основной адрес.

## Предложения полей структуры — кандидат PR #51
После открытия структурированного профиля можно запросить локальные предложения из явно подписанных RU/EN разделов и полей сохранённого резюме. Предпросмотр и перенос в пустой черновик ничего не записывают: сохранение неподтверждённой записи и подтверждение её смысла остаются отдельными действиями. Даты сохраняются дословно, неоднозначность отмечается; стаж/квалификация не выводятся. Это не общий AI-парсер. Формат источника, предел20 предложений и ограничения: [docs/STRUCTURED_PROPOSALS.md](docs/STRUCTURED_PROPOSALS.md).

## Проверка зависимостей — кандидат PR #52, 31 октября 2026
В кандидате обновлены PDF.js/yauzl и совместимая patch-версия follow-redirects. Новый npm run audit:dependencies закрывает CI при runtime-находках или неполном/недоступном отчёте и явно сохраняет полный граф. На проверенном lock runtime0, full16 moderate от одного advisory minimatch в dev-инструментах; это не полный security clearance. npm run audit:dependencies:all остаётся ненулевым до закрытия полного графа. [Версии, первичные advisory, реальные регрессии и safe snapshots](security/DEPENDENCY_AUDIT_20261031.md). Кандидат не объединён/не выпущен; production0.34.0 не объявляется обновлённым.

### Lint dependency compatibility — candidate #53

Only the reviewed typescript-estree 8.72.0 consumer uses minimatch 11.0.3; legacy callable consumers stay separate. Real parser/project-service and effective ESLint rule/config regressions are included in `npm run test:dependency-security`. Fresh audit: runtime 0, full 15 moderate package records for one advisory; `npm run audit:dependencies:all` still fails. This does not close security acceptance. See [compatibility evidence and snapshots](security/LINT_COMPATIBILITY_20261031.md).
