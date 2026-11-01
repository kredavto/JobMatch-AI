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

## 1 ноября 2026 — текущие зависимости main
Узкий security кандидат исправляет runtime findings 2→0 и full inventory 19→15 moderate package records по одному minimatch advisory. Полная строгая проверка действительно exit 1, независимая security/эксплуатационная приёмка не закрыта. 623 unit/route,20 Node security,28 Python,114 browser PASS/2 live SKIP,lint/types/build PASS локально; production не менялся. [Отчёт](security/MAIN_DEPENDENCY_SECURITY_20261101.md).

[PR #74](https://github.com/kredavto/JobMatch-AI/pull/74), `3a3336b…`: App/audit/PG17 CI повторили локальные результаты; actual full gate остаётся1. Изолированная 13-table проверка не закрывает реальный restore Supabase или SMTP.

## PR #76 — scoped parser code/containment proof, full acceptance OPEN

[PR #76](https://github.com/kredavto/JobMatch-AI/pull/76) above unmerged #74 has actual current evidence: 662 unit/API, 36 Linux process/runtime, 20 security tests, lint/types/build, 125 browser PASS / 2 live SKIP; an actual Docker image and gateway/private parser passed document extraction, env/role/cgroup controls, retirement/tmpfs reset and CPU/RAM kill probes. See immutable source/image and CI links in VERIFICATION.md. Extraction is an unsaved reviewed draft; later/restored edits are preserved and error bodies are not rendered.

Inline remains the compatibility default and no approved owned HTTPS service is deployed. OCR, scanning/quarantine and real host/TLS/privacy/live acceptance remain OPEN. Runtime audit is 0; full development inventory still has 15 moderate records and strict-full exit1. This is not full-project, model, independent-security, SMTP or provider-restore acceptance. #1/#2 historic approval does not authorize new merges/releases or activation.

## PR #77 — actual synthetic native OCR proof; full acceptance OPEN

[PR #77](https://github.com/kredavto/JobMatch-AI/pull/77) above unmerged #76 passed current 673 unit/API, 54 required native tests with no skips and actual Docker RU/EN image-only/mixed/default-OFF/blank/whole-document page-bound checks, lint/types/build and 135 browser / 2 live SKIP. VERIFICATION.md records immutable source/image, engine versions and actual eng/rus weight hashes. Prior local bilingual skips and old #12 results were not used as current proof. Text stays an unsaved manually reviewed draft; malformed metadata and partial errors refuse.

OCR remains OFF. Clear synthetic fixtures do not establish representative-document accuracy or a qualified self-hosted LLM. Owned host/TLS/privacy/retention, antivirus/quarantine, independent/native security, model/semantic/held-out, real provider restore and SMTP/full operations remain OPEN. No new merge/release or production activation is authorized by historic #1/#2 approval.
