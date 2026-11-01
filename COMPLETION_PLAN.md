# JobMatch AI — завершение полного проекта

Цель владельца: «доделай весь проект до конца», 28 октября 2026. Это шире раннего MVP. Не подменять завершение проекта процентом закрытых пунктов MVP; не объявлять отсутствие разрешений реализованной интеграцией.

## 1. Завершить эксплуатационную приёмку MVP
- [x] Ядро правил, подтверждения, версии, DOCX/TXT/JSON, трекер, история и аналитика: результаты baseline 0.32/0.33 в VERIFICATION.md.
- [x] Синтетический PostgreSQL 17 dump/restore и SQL-тесты: PR #1, успешный CI run 40645763293.
- [x] PR #1 и #2 объединены по явному разрешению владельца; baseline main `b05c45d0b77fd1b25916892611ccc622d4b4b128`, опубликована 0.34.0. Разрешение относилось к этим двум PR, не к будущим объединениям/релизам.
- [ ] Проверить доставку регистрации и восстановления на согласованном тестовом адресе, новый/старый пароль, одноразовую ссылку и отзыв сессий.
- [ ] Восстановить реальную копию провайдера в отдельном проекте, подтвердить RPO/RTO, целостность, RLS и чтение приложением. Синтетический restore не заменяет этот этап.
- [ ] Решение оператора о допустимом размещении данных, политика, retention и удаление копий. Эти решения не выдумывать за владельца.
- [ ] Полный живой сценарий на домене Vercel после финальных изменений.

## 2. AI с доказательствами
- [x] Реализовать отдельный необязательный разбор требований с собственным inference endpoint, структурированным ответом, точными цитатами, подтверждёнными fact IDs и согласием на запрос.
- [x] Проверить отказы схемы/происхождения, владельца/ревизии, лимиты, запрет redirect, отключение по умолчанию; HTTP fixture и мобильные UI-проверки.
- [ ] Развернуть и настроить собственную модель; endpoint, модель, размещение и ресурсы должны быть реально доступны. Не включать отправку данных стороннему LLM по умолчанию.
- [ ] Живой прогон модели и RU/EN evaluation: отрицания, сложные требования, длительность/уровень, числа, prompt injection, отсутствие свидетельств и ложные связи.
- [ ] Структурированный профиль: должности, даты, образование, сертификаты, достижения с исходными диапазонами и явным подтверждением.
- [ ] Переписывание и письма с проверкой фактов/чисел/противоречий, preview, отменой и отдельной неизменяемой версией. Точный extractive gate не является семантической верификацией переписанного текста.
  - [x] Независимый main-only этап: source-current/dirty/paused guards перед TXT и bounded lexical review ручных правок чисел/отрицаний с явным подтверждением. Смысл, генеративное переписывание и immutable server version не закрыты. [Контракт](docs/LETTER_SAFETY_MAIN.md).
- [ ] Сохранять происхождение и версию модели/шаблона для принятых AI-изменений; миграция и regression tests.

## 3. hh.ru
- [ ] Повторно проверить официальную схему и условия для модели соискателя; получить разрешение приложения и доступные scopes.
- [ ] Generated client и contract tests только подтверждённых операций; OAuth с допустимым state/PKCE, шифрованием токенов, отзывом и ротацией.
- [ ] Чтение вакансий/собственных резюме — только при подтверждённом доступе.
- [ ] Изменение/публикация/отклики — только при документированном контракте и явном подтверждении конкретного действия пользователем. Если операция недоступна, она остаётся внешним блокером; ручной перенос сохраняется.

## 4. Надёжность и безопасность
- [ ] Централизованный anti-abuse для публичной авторизации, WAF, защита от скомпрометированных паролей при поддержке тарифа.
- [ ] Изолированный parser/OCR worker с жёсткими CPU/RAM/time limits, карантин/сканирование и безопасным возвратом текста на подтверждение.
- [ ] Завершить переход с дублирующего JSON snapshot на команды сущностей, с планом совместимости/отката и SQL-тестами.
  - [x] В отдельной ветке реализованы команды goal/vacancy/verify: компактный payload, единая блокировка с legacy writers, атомарный ответ и SQL-suite. Рабочая БД не мигрирована; merge/публикация этого изменения не выполнены.
  - [ ] Следом: команды import/fact/application/version/restore; затем проверка паритета и отдельная миграция удаления дублирующих массивов. Существующий snapshot остаётся для совместимости и отката.
- [ ] Резервирование, мониторинг без PII, оповещения, incident response и документированная проверка восстановления.
- [ ] Нагрузочные/негативные проверки и независимый security review перед коммерческой эксплуатацией.

## 5. Интерфейс, аналитика, напоминания
- [ ] Полный RU/EN перевод экранов/ошибок/дат/offline и выбор языка.
- [ ] Ручной аудит доступности и установка PWA на реальных Android/iOS.
- [ ] Сохранённые задачи/напоминания, часовые пояса и доставка с явным разрешением пользователя, отказами и отменой.
- [ ] Аналитика специальностей и исходов; не выдавать корреляции за причинный рост приглашений.

## 6. Финальный релиз
- [ ] Согласованная спецификация, все обязательные критерии и внешние разрешения закрыты.
- [ ] Чистая установка, lint/types/unit/SQL/build/E2E, живой multi-account workflow без пропусков на финальной версии.
- [ ] Проверенные rollback/restore, release checklist, руководство оператора и пользователя.
- [ ] Опубликовать после подтверждения конкретного релиза владельцем; зафиксировать commit и доказательства приёмки.

Внешние зависимости текущего этапа: разрешения на новые merge/релизы, согласованный почтовый тест, доступ к копиям/тестовому проекту, решение о данных, сервер модели и разрешения hh.ru. План хранится в git; сам по себе не создаёт фоновую задачу или расписание работы.

## Сверка 29 октября 2026
- `main` на старте этой задачи: `38117e007909d13cc87a73e3efe488a6c134aba9` (PR #3 merged), Vercel deployment `dpl_G6XSXvaskLfuxKsN4WiyrCN8fUyg` READY. В production найден `public.apply_workspace_command(integer,jsonb)`. Поэтому более ранние записи этого плана о ветке/неприменённой миграции устарели; полный живой паритет команд этим не подтверждается.
- В отдельной ветке подготовлен кандидат 0.35 почтового UX и application CI. Приёмка доставки, копии провайдера и решение о данных не закрываются тестами на mocks.

### Main-only local letter snapshot
- [x] Separate consented JSON download with selected-source/template provenance,
  bounded strict offline consistency validation and exact lexical acknowledgements.
  Unsigned editable local file only; no immutable/server version, semantic
  verification or profile-completeness claim. See `docs/LETTER_SNAPSHOT_MAIN.md`.

### Exact-main adaptation diagnostic — 31 October 2026
- [x] One bounded actual pinned CPU run of current-main adaptation on frozen
  synthetic RU/EN inputs; [complete original report](evaluation/adaptation/results/20261031-exact-main.md).
- [ ] Model acceptance remains open: 0/16 gold passes, 14 provenance rejections,
  2 gold mismatches despite 16 completed backend responses. No true rewriting,
  human semantic/held-out acceptance or production activation established.

### 1 ноября 2026 — main-only серверный протокол писем (кандидат)
- Старт: свежий `main a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, прочитаны четыре плана и 61 открытый PR. PR #66–#69 — отклонённые/непринятые исследования; их модельная/пороговая серия остановлена, результаты не повышены до приёмки.
- [x] В [PR #72](https://github.com/kredavto/JobMatch-AI/pull/72) реализован отдельный backend/storage/export блок: подписанный source-current preview, явное принятие, атомарная неизменяемая версия, owner/session RLS, frozen v1 history reader и ограниченный NDJSON экспорт. На executable `b25db42ba8d76510343a6ed997e24079d4b7c8c7` прошли 703 unit/route, 30 Python, 116 browser (2 live SKIP), lint/types/build, PG17 full/populated incremental и native 15-table restore. Это приёмка технического блока в тестах, не production/семантическая/пользовательская приёмка. [Контракт](docs/SAVED_LETTER_PROTOCOL.md).
- [x] В [PR #73](https://github.com/kredavto/JobMatch-AI/pull/73) поверх PR #72 подключены отдельное согласие на серверное хранение источников, preview/accept, история, unknown-result recovery и owner/dirty/paused guards. Локально: 737 unit/route, 30 Python, 140 browser PASS/2 live SKIP, lint/types/build PASS. Рабочее включение/пользовательская live-приёмка не выполнены. [Контракт UI](docs/SAVED_LETTER_UI.md).
- Выключено по умолчанию, ключ не создан, SQL не применён. CLI/advisors/provider restore не проверены. Исторические разрешения на #1/#2 и отдельный main-only #62 не дают разрешения на это объединение/развёртывание/релиз. Общая приёмка AI и полного проекта, SMTP/recovery, реальная копия Supabase и решение оператора о ПД остаются открыты.

### Продолжение 1 ноября 2026 — UI версий писем
- Свежая сверка main `a3a9ef0…`, четырёх документов и 62 открытых PR; #72 ещё не merged. UI-кандидат зависит от точного head #72 `9a7fc605…`, не включает старый миграционный стек. Default-off и все внешние разрешения сохранены.
- Remote Application CI и native PG17 regression на `ffd8ae6…` PASS: 737 unit, 140 browser/2 live SKIP, 30 Python и 15-table synthetic restore; не provider/live acceptance.
- Серверная история доступна в «Моих версиях» без анализа; загрузка актуального профиля сохраняет черновик письма и сбрасывает разрешение на сохранение при изменении источников. Неопределённая запись требует явного чтения истории, точного сверения попытки и нового preview перед новой записью. Автоматического повтора нет.
- [ ] Следующий независимый технический блок: сверить и перенести подходящие исправления runtime-зависимостей из неприменённых security PR в узкий main-only кандидат; новый npm audit и регрессии импорта. Не считать старые результаты #52/#53 доказательством безопасности текущего main.
- Модель/семантическое переписывание, live SMTP/recovery, реальная копия Supabase и решение оператора о ПД остаются открыты. Merge/релиз/production SQL не выполнялись.

### 1 ноября 2026 — узкий main-only dependency security кандидат
- Свежий main `a3a9ef0…`, четыре документа, открытые PR и security #52/#53 сверены. Их старый стек не переносится. Отдельные #72/#73 реализуют протокол/UI писем и остаются не объединёнными; этот кандидат не активирует их.
- [x] В [PR #74](https://github.com/kredavto/JobMatch-AI/pull/74) исправлены текущие runtime PDF/ZIP зависимости и dev redirect dependency, проверен узкий estree/minimatch override и использован поддерживаемый PDF native canvas 1.1.0. Реальный аудит: runtime **2→0**, full **19→15 moderate records** по одному advisory. Строгий полный gate реально exit 1; полная security acceptance не закрыта. [Доказательства](security/MAIN_DEPENDENCY_SECURITY_20261101.md).
- [ ] Поддерживаемая миграция оставшегося lint graph/ESLint end-of-support без advisory waiver и несовместимого общего major override.
- Локально: 623 unit/route,20 Node security,28 Python,114 browser PASS/2 live SKIP,lint/types/build PASS. Native/provider/mail/AI acceptance не подменяются этими тестами. Merge/release/production SQL/config не выполнялись.

Remote #74 Application/audit/legacy-PG17 CI на `3a3336b…` подтвердили623unit,20security,28Python,114browserPASS/2liveSKIP,типизацию/сборку и runtime0/full15/strictFullExit1. Это не полная security или provider acceptance.

### Source-backed manual profile — PR #75, code verified; not operational acceptance

- [PR #75](https://github.com/kredavto/JobMatch-AI/pull/75), isolated branch `feat/source-backed-profile-20261101`, executable head `6046bad5df08ff5b61d2cef8e655e0edfa21aaa6`, tree `306f7ff62fcad3c0c0eb4d372fcaab21d7ee6707`. Based on unmerged #73, with #74 fixes explicitly integrated. Fresh main remains `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`; no main merge or release. Owner-approved historic #1/#2 merges do not authorize subsequent merges/releases.
- Implemented manual employment/education/certification/achievement fields bound to literal raw Unicode ranges; separate unconfirmed add and user confirmation. CRLF/CR textarea selections map back to raw source. Typed records do not change master facts, scores, letters or hh.ru.
- Extra full-source storage requires a separate consent, API flag and native capability, all default OFF. Retraction/delete/Clear remain available with storage disabled; Clear removes the cached text/IDs while preserving owner/revision against replay. Same-text reimport with new fact IDs requires explicit reset without transferred confirmation. No semantic/model acceptance is claimed.
- Actual checks: 804 unit/API tests in 57 files, 32 Python tests, 20 security tests, 161 browser PASS / 2 live-account SKIP; lint/types/build pass. PG17 full + populated 15→17 migration, 20 writers / 1 commit / 19 native conflicts, 50-entry cap, revoked-session/owner guards, rollback, cascade and 17 populated fingerprints after native dump/restore plus intentional source corruption detection pass. Existing letter/legacy protocols also pass. All 41 PR files were read back at the immutable executable head and matched local content and Git blob IDs. Evidence is in VERIFICATION.md.
- Runtime audit remains 0 catalog findings; full inventory still has 15 moderate development package records and strict full gate exits 1. Independent security review, model/held-out/semantic acceptance, real SMTP/password recovery, actual Supabase-copy restore/RPO/RTO and operator PD placement/retention/withdrawal remain OPEN. Synthetic Auth/restore and the current automated CPU diagnostic are not substituted for these gates. Supabase CLI/advisors and production SQL/config were not run.
- Next available technical block: isolate TXT/DOCX/PDF parsing from the HTTP process with bounded wall time/resources and malicious-file regressions, then separately verify OCR. Current main still executes `extractDocument` inside `/api/import`; dependency patching alone is not parser isolation. Review the existing unmerged parser work against the supported PDF 6.2.108/Node runtime before adapting it. Other internal work remains, so this automation is not paused for external blockers.

## 2026-11-01 — PR #79 current pre-auth quota integration: native evidence

Fresh main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, four plans and68 open PRs read. Above unmerged #75, adapt existing signed pre-auth quota/aggregate maintenance onto current letters/source schema; retain original two migration bytes, no old stack/CI acceptance. Add bounded 128-byte/two-second/no-redirect/exact200-boolean RPC and native actual signer→loopbackHTTP→anonSQL verification. Executable `ade1eb5c7f529de7cdd2f4dabae17222ef8dc640`, tree `7dc04e8a6807924752ad08a3efe6c7cb903d954c`, [PR #79](https://github.com/kredavto/JobMatch-AI/pull/79): [quota PG17.11](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814896) PASS (actual production signer/HTTP codec→anon SQL,all5scopes,wrong/missing key,clean/populated incremental/full schemas,ACL/RLS/signatures/limits/rollback,status/purge,20connections10allowed/10denied,SKIP LOCKED). [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814899) PASS:846unit/API/60files,lint/types/build,161browserPASS/2liveSKIP; local40Python and20securityPASS. [Source17-table](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814842), [letter15-table](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814763), [legacy13-table](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814856) native concurrency/synthetic dump/restore regressions PASS. All28 files immutable-read back with exact content/blob equality; CI PR merge tree equals this executable tree. No hosted PostgREST/Auth/WAF/load or provider-copy restore claimed. Next internal block: integrate remaining entity write commands with current immutable letter/source provenance and native SQL parity/rollback tests. Default local remains, no key seeded/provisioned, production change/mail/paid resource/merge/release. WAF/direct Auth controls, real mailbox/provider restore/PD decision and final operations OPEN. Guide docs/CURRENT_AUTH_QUOTA.md; historic #1/#2 approval does not authorize new releases/merges.

## 2026-11-01 — PR #80 current application commands: actual native provenance evidence

Fresh main/four plans `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`,69 open PRs read. Above unmerged #79, adapt #4 compact application command to current source/letter/quota schema, preserving original migration bytes. Server-owned ID/date/history/version ownership, legacy IDs, note/link changes at event cap, no snapshot read/write or retry/fallback. Current UTF8/well-formed Unicode and installed Zod4.6.7 code-point bounds covered. Executable `c83fd751322591442677b848e5f557cbd95b18f2`, tree `58dd3794e2f2398fff68a24a36bf2461ba560229`, [PR #80](https://github.com/kredavto/JobMatch-AI/pull/80): [current app-command PG17.11](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629719) PASS (pinned populated17-table+quota predecessor/full schema,SQL lifecycle/ownership/limits/legacy rollback/Unicode,actual wire+ack,confirmed source profile and immutable letters preserved,stale preview refused/new-context preview accepted,20writers/1commit/19conflicts,17populated-table native restore/application corruption). [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629582)876unit/API/60files,lint/types/build,161browserPASS/2liveSKIP. Local41Python/20securityPASS. Current [source](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629686),[letters](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629630),[quota](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629622),[legacy13-table/fiveSQL](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629565) regressions PASS. All20files exact immutable content/blob readback; CI merge tree equals executable tree. Synthetic Auth/transport/native restore is not hosted PostgREST/provider backup/SMTP/model acceptance. Guide docs/CURRENT_APPLICATION_COMMANDS.md. Full cutover/array removal and external SMTP/provider restore/PD/model/operations remain OPEN; no production change/merge/release. Next: current import/fact then version/restore commands and parity/rollback evidence.

## 2026-11-01 — PR #81 current import/fact commands: actual service and SQL evidence

Fresh main/four plans `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, 70 open PRs read. Above unmerged #80, adapt #5 import/demo/fact commands with original migration bytes: compact CAS text intent, SQL-owned fresh unverified IDs, raw text/ECMAScript trim/order/duplicate and CP-vs-UTF16 bounds, no snapshot or retry/fallback. Executable `993329cc1550dc4986c10081f7f2aabd9a46e9c1`, tree `eb2558e2282d618bf7df7253e068d1555347b4bb`, [PR #81](https://github.com/kredavto/JobMatch-AI/pull/81): [current PG17.11 service/profile protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/41308606849/job/124854088581) PASS. Actual production service→loopback HTTP→SQL, current rule metadata/history/apps preserved, 256 Unicode +8 boundary JS/SQL cases, fresh unverified IDs, stale cache then explicit cleanup/review without auto-verification, stale/current letters, 20 imports/1 commit/19 conflicts, 17 populated-table native restore/corruption. [Application](https://github.com/kredavto/JobMatch-AI/actions/runs/41308606873) 900 unit/API /61 files, lint/types/build, 161 browser PASS /2 live-account SKIP; local 43 Python/20 security PASS. Current application/source/letter/quota/legacy-six-SQL regressions PASS. All22 files immutable content/blob readback and actual CI merge tree match executable. First native fixture selected the unrelated demo name and correctly failed composer; it now explicitly verifies eligible B2B evidence without weakening the gate, and a clean full rerun passes. Synthetic Auth/transport is not hosted PostgREST/SMTP/provider restore/model acceptance. Guide docs/CURRENT_PROFILE_COMMANDS.md. No production action, merge or release; full project remains OPEN. Next: current version/restore commands, then normalized read/parity/cutover/rollback.

## 2026-11-01 — current version/restore commands (native CI pending)

Fresh main/four plans `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`,71 open PRs. Above unmerged #81, adapt #6 with original migration bytes: one-read revision-bound rules evaluation, SQL-owned text/evidence/ID/time, ID-only no-read restore, optional/unknown fields and immediate history chain, cap100/CAS/no retry/fallback. Main HTTP no longer uses saveWorkspace; snapshot/legacy compatibility still retained. Local930unit/API/63files,45Python,lint/types/build pass. Actual32-per-path renderer parity/service/evaluation-write race/current provenance/20restores/17-table native restore proof pending. SQL does not attest relevance or recompute caller RPC aggregates; official HTTP computes rules, not qualified AI. Guide docs/CURRENT_VERSION_COMMANDS.md. No production action/merge/release; external SMTP/provider restore/PD/model/operations OPEN. Next: normalized parity/read/write/cutover and rollback checks.
