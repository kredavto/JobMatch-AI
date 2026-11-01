# Проверяемая готовность MVP

MVP: пользователь вручную импортирует резюме и текст вакансии, явно подтверждает факты, получает объяснимое сопоставление правилами, выбирает правки, сохраняет отдельную версию и экспортирует её для ручного переноса в hh.ru.

## Приемка
- [x] Импорт UTF-8 TXT, DOCX и текстового PDF; лимиты и безопасные сообщения ошибок.
- [x] Подтверждение фактов пользователем; неподтвержденные факты не повышают оценку.
- [x] Ручной текст вакансии и валидация ссылки hh.ru без скрытого API.
- [x] Match Score с объяснениями и обязательными требованиями; маркировка эвристики.
- [x] Выбор подтвержденных фрагментов, preview, отдельная версия и восстановление.
- [x] TXT/JSON/DOCX, доказательства в JSON, инструкции ручного переноса.
- [x] История и сравнение сохраненных версий.
- [x] Разграничение владельцев и серверные проверки записи; протестировано в предыдущем живом прогоне 0.24.
- [x] Итоговая приемка 0.32 с двумя временными аккаунтами, включая DOCX: 54 браузерных теста без пропусков (26 октября 2026).
- [ ] Эксплуатационная приемка публичной регистрации: собственный SMTP и восстановление доступа. SMTP сохранён по сообщению владельца; recovery реализован в 0.33, реальная доставка и полный recovery flow ещё не проверены.
- [ ] Решение о допустимом размещении реальных персональных данных и проверка восстановления из резервной копии.

Полный AI-парсер, self-hosted модель, официальная запись hh.ru, OCR, автоматические напоминания и расширенная аналитика относятся к последующим этапам. Движок правил и ручной перенос должны быть явно обозначены в интерфейсе. Проверки на mocks не заменяют итоговую живую приемку.

До закрытия оставшихся пунктов не объявлять MVP на 100% готовым к публичной эксплуатации.

Протокол резервного восстановления подготовлен в `BACKUP_RESTORE.md`; наличие инструмента сравнения не закрывает пункт реального восстановления.

## Текущий этап — 29 октября 2026
- Кандидат 0.35 добавляет повтор письма и исправляет указания при повторной регистрации уже подтверждённого аккаунта. Это программная готовность, не доказательство доставки Gmail.
- Для 100% публичного MVP всё ещё нужны согласованный почтовый прогон, финальный живой сценарий на Vercel, restore копии провайдера и решение оператора о размещении/хранении данных.

## 1 ноября 2026 — отдельный backend-кандидат писем
Source-current preview/accept, серверная история и экспорт подготовлены в отдельной ветке; панель сохранения ещё не подключена. Это не выполненная пользовательская приёмка и не семантическая верификация. Native PG17 full/populated incremental/RLS/15-table synthetic restore и 703 unit/route + 116 browser (2 live SKIP) прошли на executable `b25db42…`, [PR #72](https://github.com/kredavto/JobMatch-AI/pull/72). Это проверка отдельного технического блока; production SQL/ключ/включение не выполнены. Полная эксплуатационная приёмка, SMTP/recovery, реальный provider restore и решение оператора о ПД остаются открыты. Контракт: [SAVED_LETTER_PROTOCOL.md](docs/SAVED_LETTER_PROTOCOL.md).

## Продолжение 1 ноября 2026 — интерфейс серверных писем
Поверх ещё не объединённого #72 реализован пользовательский preview/accept/history flow с отдельным storage consent и unknown-result reconciliation. Черновик сохраняется при чтении актуального профиля; новая ревизия/источник требует нового просмотра. 737 unit/route, 30 Python, 140 browser PASS/2 live SKIP, lint/types/build PASS локально. Браузерный API управляемый; реальная Supabase/live приёмка и включение default-off не выполнены. Родительская модельная, семантическая и эксплуатационная приёмка остаётся открытой. [Контракт](docs/SAVED_LETTER_UI.md).

[PR #73](https://github.com/kredavto/JobMatch-AI/pull/73), exact executable `ffd8ae6…`: Application и native PG17 CI PASS с теми же 737/140/2 SKIP/30 результатами; production/live приёмка остаётся открытой.

## 1 ноября 2026 — текущие зависимости main
Узкий security кандидат исправляет runtime findings 2→0 и full inventory 19→15 moderate package records по одному minimatch advisory. Полная строгая проверка действительно exit 1, независимая security/эксплуатационная приёмка не закрыта. 623 unit/route,20 Node security,28 Python,114 browser PASS/2 live SKIP,lint/types/build PASS локально; production не менялся. [Отчёт](security/MAIN_DEPENDENCY_SECURITY_20261101.md).

[PR #74](https://github.com/kredavto/JobMatch-AI/pull/74), `3a3336b…`: App/audit/PG17 CI повторили локальные результаты; actual full gate остаётся1. Изолированная 13-table проверка не закрывает реальный restore Supabase или SMTP.

## PR #75 — manual source profile code verified; full acceptance OPEN

[PR #75](https://github.com/kredavto/JobMatch-AI/pull/75), executable `6046bad5df08ff5b61d2cef8e655e0edfa21aaa6`, has passed 804 unit/API tests, 32 Python checks, 20 security tests, 161 browser scenarios / 2 live SKIP, lint/types/build and the native PG17 source/letter/legacy protocols linked in VERIFICATION.md. Manual fields are literal source ranges; add is unconfirmed and user confirmation is separate. Same-text reimport, cleanup with storage off, monotonic Clear, concurrency, cap, cascade and 17 populated synthetic restore fingerprints are verified within that fixture scope.

It remains an unmerged dependent PR (#73 plus #74 fixes), with extra full-source storage OFF. Literal range agreement and user review do not prove truth, semantics or a working model. Full dependency gate still fails on 15 moderate development package records. Real recovery mail, actual Supabase restore/RPO/RTO, operator PD placement/retention/withdrawal, independent security, qualified model/held-out/semantic rewrite and final operations remain NOT ACCEPTED/open. Parser isolation/OCR and other internal blocks still require implementation/verification. No new merge/release permission is inferred from historic #1/#2 approval.

## 2026-11-01 — PR #79 current pre-auth quota integration: native evidence

Fresh main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, four plans and68 open PRs read. Above unmerged #75, adapt existing signed pre-auth quota/aggregate maintenance onto current letters/source schema; retain original two migration bytes, no old stack/CI acceptance. Add bounded 128-byte/two-second/no-redirect/exact200-boolean RPC and native actual signer→loopbackHTTP→anonSQL verification. Executable `ade1eb5c7f529de7cdd2f4dabae17222ef8dc640`, tree `7dc04e8a6807924752ad08a3efe6c7cb903d954c`, [PR #79](https://github.com/kredavto/JobMatch-AI/pull/79): [quota PG17.11](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814896) PASS (actual production signer/HTTP codec→anon SQL,all5scopes,wrong/missing key,clean/populated incremental/full schemas,ACL/RLS/signatures/limits/rollback,status/purge,20connections10allowed/10denied,SKIP LOCKED). [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814899) PASS:846unit/API/60files,lint/types/build,161browserPASS/2liveSKIP; local40Python and20securityPASS. [Source17-table](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814842), [letter15-table](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814763), [legacy13-table](https://github.com/kredavto/JobMatch-AI/actions/runs/41303814856) native concurrency/synthetic dump/restore regressions PASS. All28 files immutable-read back with exact content/blob equality; CI PR merge tree equals this executable tree. No hosted PostgREST/Auth/WAF/load or provider-copy restore claimed. Next internal block: integrate remaining entity write commands with current immutable letter/source provenance and native SQL parity/rollback tests. Default local remains, no key seeded/provisioned, production change/mail/paid resource/merge/release. WAF/direct Auth controls, real mailbox/provider restore/PD decision and final operations OPEN. Guide docs/CURRENT_AUTH_QUOTA.md; historic #1/#2 approval does not authorize new releases/merges.

## 2026-11-01 — PR #80 current application commands: actual native provenance evidence

Fresh main/four plans `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`,69 open PRs read. Above unmerged #79, adapt #4 compact application command to current source/letter/quota schema, preserving original migration bytes. Server-owned ID/date/history/version ownership, legacy IDs, note/link changes at event cap, no snapshot read/write or retry/fallback. Current UTF8/well-formed Unicode and installed Zod4.6.7 code-point bounds covered. Executable `c83fd751322591442677b848e5f557cbd95b18f2`, tree `58dd3794e2f2398fff68a24a36bf2461ba560229`, [PR #80](https://github.com/kredavto/JobMatch-AI/pull/80): [current app-command PG17.11](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629719) PASS (pinned populated17-table+quota predecessor/full schema,SQL lifecycle/ownership/limits/legacy rollback/Unicode,actual wire+ack,confirmed source profile and immutable letters preserved,stale preview refused/new-context preview accepted,20writers/1commit/19conflicts,17populated-table native restore/application corruption). [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629582)876unit/API/60files,lint/types/build,161browserPASS/2liveSKIP. Local41Python/20securityPASS. Current [source](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629686),[letters](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629630),[quota](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629622),[legacy13-table/fiveSQL](https://github.com/kredavto/JobMatch-AI/actions/runs/41305629565) regressions PASS. All20files exact immutable content/blob readback; CI merge tree equals executable tree. Synthetic Auth/transport/native restore is not hosted PostgREST/provider backup/SMTP/model acceptance. Guide docs/CURRENT_APPLICATION_COMMANDS.md. Full cutover/array removal and external SMTP/provider restore/PD/model/operations remain OPEN; no production change/merge/release. Next: current import/fact then version/restore commands and parity/rollback evidence.

## 2026-11-01 — current import/fact commands (native CI pending)

Fresh main/four plans `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, 70 open PRs read. Above unmerged #80, adapt #5 import/demo/fact commands with original migration bytes: compact CAS text intent, SQL-owned fresh unverified IDs, raw text/ECMAScript trim/order/duplicate and CP-vs-UTF16 bounds, no snapshot or retry/fallback. Local 900 unit/API / 61 files, 43 Python, lint/types/build pass. New actual service→loopback HTTP→native SQL, 256 Unicode +8 boundary comparisons, current rule/source/letter/history preservation, explicit stale-cache review/cleanup, 20 writers and populated 17-table native restore/corruption await CI. Synthetic Auth/transport is not hosted PostgREST/SMTP/provider restore/model acceptance. Guide docs/CURRENT_PROFILE_COMMANDS.md. No production action, merge or release; full project remains OPEN. Next: current version/restore commands, then normalized read/parity/cutover/rollback.
