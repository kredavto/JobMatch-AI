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

### 1 ноября 2026 — узкий main-only dependency security кандидат
- Свежий main `a3a9ef0…`, четыре документа, открытые PR и security #52/#53 сверены. Их старый стек не переносится. Отдельные #72/#73 реализуют протокол/UI писем и остаются не объединёнными; этот кандидат не активирует их.
- [x] В [PR #74](https://github.com/kredavto/JobMatch-AI/pull/74) исправлены текущие runtime PDF/ZIP зависимости и dev redirect dependency, проверен узкий estree/minimatch override и использован поддерживаемый PDF native canvas 1.1.0. Реальный аудит: runtime **2→0**, full **19→15 moderate records** по одному advisory. Строгий полный gate реально exit 1; полная security acceptance не закрыта. [Доказательства](security/MAIN_DEPENDENCY_SECURITY_20261101.md).
- [ ] Поддерживаемая миграция оставшегося lint graph/ESLint end-of-support без advisory waiver и несовместимого общего major override.
- Локально: 623 unit/route,20 Node security,28 Python,114 browser PASS/2 live SKIP,lint/types/build PASS. Native/provider/mail/AI acceptance не подменяются этими тестами. Merge/release/production SQL/config не выполнялись.

Remote #74 Application/audit/legacy-PG17 CI на `3a3336b…` подтвердили623unit,20security,28Python,114browserPASS/2liveSKIP,типизацию/сборку и runtime0/full15/strictFullExit1. Это не полная security или provider acceptance.

### Current-compatible isolated parser — PR #76, scoped code/containment checks complete

- [PR #76](https://github.com/kredavto/JobMatch-AI/pull/76), branch `feat/isolated-parser-current-20261101`, executable `23ee0d69127e320a2b3f4abb25e03b71870d3fb5`, tree `4015a41731a40af0311d44bac732001c3dfe6660`. Fresh main/plans and 65 open PRs were read at the start; main was `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`. Based only on unmerged #74; old #11 was adapted without its old SQL chain. #72/#73/#75 remain separately verified unmerged candidates, not a qualified model or new merge/release authorization. Historic #1/#2 approval stays limited to those merges.
- Implemented owned HTTPS gateway → credential-free one-job parser, strict raw-byte/extension transport, no retry/redirect or inline fallback in worker mode, CPU/wall/FD/core and role-specific cgroup limits, read-only nonroot/caps-drop/NNP/seccomp/private-PID/internal-network controls and retirement/restart with fresh tmpfs. Unknown env names, proxy/preload selectors and app credentials refuse; only actual cwd-matching PWD metadata is admitted. The gateway keeps its independent token and has its own 128 MiB/0.25 CPU/32 PID ceiling.
- File imports are bounded strict Unicode/NUL-free editable drafts; a later edit epoch (including edit-then-restore) and owner/workspace cancellation prevent late replacement. Missing owner prevents transmission; upstream error bodies are not rendered. No fact is saved/confirmed automatically.
- Actual proof: 662 unit/API tests / 52 files, 36 real Linux process/runtime tests without skips, 20 security tests, lint/types/build, 125 browser PASS / 2 live SKIP. [Docker/HTTP containment](https://github.com/kredavto/JobMatch-AI/actions/runs/41298494191/job/124824335471) passed TXT/DOCX/PDF, credential separation/refusal, seven bad-startup env/budget probes, rootfs/seccomp/NNP/private PID/network inspection, one-job restart/tmpfs cleanup and actual kernel CPU SIGKILL/non-OOM + cgroup RAM OOM. Tested image `sha256:ba47d93b9b299199c51bcbe750c522297cc62c3defd403181b39e9b5bd7d59c4`, Node24.22.2/PDF6.2.108/supported canvas1.1.0/yauzl3.2.1. All 46 files matched local content/blob IDs after immutable-head readback. Detailed links/limits: VERIFICATION.md and docs/ISOLATED_PARSER.md.
- Inline compatibility remains the default; no owned HTTPS service, production flag/key/SQL, paid host or real user-data transfer was activated. Thus the complete parser/OCR/quarantine/live-deployment criterion remains OPEN. Runtime dependency inventory is 0; full development inventory still has 15 moderate package records and strict full gate exit 1. Independent security, actual SMTP/recovery, real Supabase-copy restore/RPO/RTO, operator PD placement/retention, qualified model/semantic/held-out and final operations remain open.
- Next available technical block: adapt and actually verify OCR above this current parser, with opt-in native Poppler/Tesseract, strict metadata and preserved draft review; scanning/quarantine follows separately. No prior OCR/model/provider result is promoted to current acceptance.

### Current-compatible native OCR — PR #77, synthetic engine/containment checks complete

- [PR #77](https://github.com/kredavto/JobMatch-AI/pull/77), branch `feat/bounded-native-ocr-20261101`, executable `36d608b9a35bdda7d859dfc28b992606c634cbc8`, tree `b99c4dd8c65d621227e2de820a58213a91f5a8af`, based on unmerged #76 final `c1b990136fc84b06382de182b1ab482b8c4dd18f`. At start main/four plans were freshly re-read at `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, with 66 then-open PRs; old #12 was adapted without old SQL or prior-proof substitution.
- Added explicit parser-only native OCR opt-in, fixed Poppler/Tesseract commands, private temporary files/cleanup, four-second command bounds, unchanged per-process CPU/FD/core and aggregate 1-CPU/15-second group controls, three OCR pages maximum with whole-document refusal. Strict PDF-only transient metadata and closed bounded OCR_LIMIT help preserve owner/edit/cancellation/Unicode/error-body/draft review guards. No save/confirmation is automatic.
- Actual current evidence: 673 unit/API tests / 52 files, lint/types/build; 135 browser PASS / 2 live SKIP. [Current native/Docker](https://github.com/kredavto/JobMatch-AI/actions/runs/41300249035/job/124829515900): all 54 native tests PASS with zero skips, actual image-only and mixed RU/EN recognition inside private containers, default OFF/blank/page-bound refusals, private modes/dimensions/cleanup/command deadline/output guards and previous credential/env/namespace/kernel CPU/RAM/restart controls. Image `sha256:6e908046c72f699999e2739944002ec072b30d90c7aa989eebfaccbc287692d4`, Tesseract5.3.0/Poppler22.12.0 (host tests Tesseract5.3.4), Node24.22.2/PDF6.2.108/canvas1.1.0; eng/rus weight hashes and links are recorded in VERIFICATION.md. All 27 changed files matched local content/blob IDs at the immutable source head.
- Local rus was absent: 50 native PASS / 4 SKIP were explicitly not counted as bilingual proof; mandatory installed-language CI and real changed container supplied it. These are frozen synthetic clear-font fixtures, not representative-document accuracy or qualified self-hosted LLM/semantic/held-out acceptance. OCR remains OFF; owned endpoint/privacy/live deployment are not activated. Fresh npm audit: runtime0/exit0, development15 moderate/strict-full exit1; native OS packages/independent security remain separate.
- Next technical block: current-compatible scanning/quarantine with bounded archive policies and actual ClamAV/definition/protocol evidence. Real hosting/TLS/PD placement/retention, SMTP/recovery, Supabase-copy restore/RPO/RTO, qualified model and full operations stay OPEN. Historic #1/#2 approval is not permission for current merges/releases; no paid service, production SQL/key, email, external LLM user-data transfer or hh.ru write occurred.

## 2026-11-01 — PR #78 current isolated scanning: actual disposable-engine evidence

Above unmerged #77, implement an opt-in bounded in-memory scan gate, real ClamAV INSTREAM adapter, signed loaded-database observer, private scanner/updater separation and required ZIP size policy. Main/four plans were freshly read at `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, with 67 open PRs; old #13/#14 are source material, not current acceptance. Scanner/OCR stay OFF, no production activation or merge/release. Executable `33cc4e87e900db400b1fdd8ef44f24cfed1f423a` / tree `dc0683a4d99c26efa509248a4a79627cc0cf0b76`: [PR #78](https://github.com/kredavto/JobMatch-AI/pull/78), [actual native/container/scanner CI](https://github.com/kredavto/JobMatch-AI/actions/runs/41302631250) PASS (101 worker tests / zero skips, real bilingual OCR + all parser boundaries + real FreshClam/ClamAV 1.4.6 loaded DB28171 dated 2026-11-01T06:27:34Z, signed readiness, marker/ZIP/nesting/encryption/limits/reload/clean/outage refusals and cleanup). [Application](https://github.com/kredavto/JobMatch-AI/actions/runs/41302631211) PASS: 673 unit/API,lint/types/build,135 browser PASS/2 live-account SKIP. Local security20 PASS; runtime audit0/exit0, full15moderate development package records/exit1. Initial local 97/4 Russian OCR skips were not used as real language proof. All31 changed files were fetched at the immutable source head with exact content/blob equality. This establishes synthetic disposable engine/containment behavior, not hosted or independent security acceptance. Next internal work: integrate current anti-abuse/normalized write commands with full-stack SQL and regression evidence; existing older PRs remain unmerged proposals. Guide: docs/DOCUMENT_SCANNING.md. Full parser/scanning/operations criterion remains open; owner-approved historical #1/#2 merges grant no future merge/release permission.
