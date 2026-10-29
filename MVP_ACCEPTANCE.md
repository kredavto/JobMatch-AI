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


## Дословные версии структуры — зависимая ветка, 29 октября 2026
- Выбранные подтверждённые записи дают отдельный literal outline: preview, отмена, явное сохранение, фиксированные template/guard и снимок происхождения, owner/session/revision gates, immutable history/export. Шаблон не выводит стаж/числа и консервативно блокирует строки с отрицаниями/планами/инструкциями; это не семантическая проверка.
- Все четыре export-файла нужны для полного пользовательского архива; version NDJSON complete marker/40 МиБ, storage cap20. Backup v4 включает 16 таблиц; v3 остаётся историческим форматом на15. Контракт docs/STRUCTURED_VERSIONS.md. Модель/генеративное переписывание/письма и live provider приёмка не закрыты.
- PR #20: https://github.com/kredavto/JobMatch-AI/pull/20 . Финальный CI40852385996 SUCCESS:547 Vitest,36 Python,70 E2E/2 live SKIP, PostgreSQL/concurrency/restore16. Parser/OCR/ClamAV и legacy restore regression SUCCESS; не объединён/не выпущен. Доказательства и ограничения — VERIFICATION.md.


## Сохранённые задачи трекера — зависимая ветка, 29 октября 2026
- CRUD-команды с отдельной ревизией, owner/session/source workspace lock, история и audit rollback; явное время IANA/local/offset/UTC, DST gap/fold без неявного сдвига. Pending/overdue/completed/cancelled, явное удаление всей истории, постоянный UID/SEQUENCE для ICS.
- Экспорт задач/истории — пятый файл, NDJSON с проверкой ревизии каждого detail и финального списка; full backup v5/19 таблиц. Контракт docs/SAVED_REMINDERS.md. Это хранение/ручное чтение задач, не scheduler или delivery. Внешняя доставка, реальные календари и live provider приёмка открыты.
- PR #21: https://github.com/kredavto/JobMatch-AI/pull/21 . CI40856050922 SUCCESS —564 unit,37 Python,75 E2E/2 live SKIP, PostgreSQL/20 concurrent commands/restore19/history corruption. Worker/OCR/ClamAV и legacy restore regression SUCCESS. Доказательства/ограничения — VERIFICATION.md; не объединён/не выпущен, delivery и live acceptance открыты.


## Public API error codes — зависимая ветка, 29 октября 2026
- Стабильные codes/status и RU/EN каталог, additive error/code, безопасная редакция исключений и unknown fallback; все публичные домены и client consumers используют общий контракт. HTTP-based auth/conflict/no-retry и code-less RU совместимость сохраняются. Parser forwarding больше не сравнивает русский текст.
- Английский UI не включён: полный перевод экранов/дат/offline/context и двуязычная приёмка остаются открытыми. Контракт docs/API_ERROR_CODES.md; ни SMTP/LLM/новые интеграции, ни SQL/production этим этапом не меняются.
- PR #22: https://github.com/kredavto/JobMatch-AI/pull/22 . CI40859422415 SUCCESS —592 unit,37 Python,79 E2E/2 live SKIP и native PostgreSQL/restore19; evaluator fixture и parser/OCR/ClamAV SUCCESS. Доказательства/ограничения — VERIFICATION.md. Не объединён/не выпущен; полная локализация и live acceptance открыты.


## Typed RU/EN structured components — зависимая ветка, 29 октября 2026
- Source-backed profile/literal versions/tasks: полные typed copy, semantic feedback при смене locale без потери draft/selection/request state и explicit-zone даты с неизменными machine ISO/JSON. Accepted wall time+offset не пересчитывается по IANA; UTC показан отдельно.
- Production UI остаётся RU. Семь изолированных реальных React component browser cases с synthetic API проверяют RU/EN, неизменность commands/source/hash/export, in-flight locale change и historical zone warning. Это не полный English app acceptance. Frozen literal-v1 output не переводится. Контракт docs/STRUCTURED_UI_LOCALIZATION.md; другие экраны/offline/context и языковая приёмка открыты.
- PR #23: https://github.com/kredavto/JobMatch-AI/pull/23 . CI40865862032 SUCCESS —598 unit,37 Python,86 E2E/2 live SKIP и native19-table/concurrency/restore. Evaluator fixtures и worker/OCR/ClamAV SUCCESS; доказательства/ограничения — VERIFICATION.md. Не объединён/не выпущен; full English UI и live/operator acceptance открыты.

## Текущий этап — 29 октября 2026
- Кандидат 0.35 добавляет повтор письма и исправляет указания при повторной регистрации уже подтверждённого аккаунта. Это программная готовность, не доказательство доставки Gmail.
- Для 100% публичного MVP всё ещё нужны согласованный почтовый прогон, финальный живой сценарий на Vercel, restore копии провайдера и решение оператора о размещении/хранении данных.


## Основной профиль RU/EN — PR #24, 29 октября 2026
- ProfilePanel с typed RU/EN copy цели/импорта/фактов/истории, исходными command payloads и explicit UTC. Успешное добавление факта не стирает следующий введённый черновик; double-click защищён до render. Production UI остаётся RU; shared page feedback и полная языковая приёмка открыты.
- Включён свежий main3322011 с уже объединённым владельцем PR #15; mail origin/provider feedback согласованы со стабильным API error catalog и не теряют recovery hints. Независимые PR #17/#18 не объединяются этим этапом.
- Локально624 unit/56files,37 Python, lint/types/build и96 Playwright PASS/2 live-account SKIP. PR https://github.com/kredavto/JobMatch-AI/pull/24 ; CI40879658922/40879658972/40879658997 SUCCESS на1fbe482:624 unit,37 Python,96 E2E/2 live SKIP, native PostgreSQL/restore19 и parser/OCR/ClamAV. Нет нового merge/release/SQL/production changes. Реальные SMTP/recovery, copy restore, operator hosting/privacy и model/HH/final acceptance остаются открытыми.


## Workspace feedback RU/EN — PR #25, 29 октября 2026
- Общие уведомления/ошибки страницы, включая late write/OCR и внутренние validation failures, переводятся по semantic state без replay/refetch/потери draft/selection. Unexpected exception.message не отображается; новый import очищает старый success notice. Production wrapper остаётся RU, English fixture — тестовая композиция.
- Локально629 unit/57files, lint/types/clean build и101 Playwright PASS/2 live SKIP; CI40886919527/40886919678/40886919456 SUCCESS:629 unit/37 Python/101 E2E (2 live SKIP), native19/concurrency/restore и parser/OCR/ClamAV. PR https://github.com/kredavto/JobMatch-AI/pull/25 . Контракт docs/WORKSPACE_FEEDBACK_LOCALIZATION.md. Shell/auth/recovery/other screens/global/offline и полноценная двуязычная приёмка остаются открытыми. Merge/release/live provider acceptance не выполнены.


## Auth shell/confirmation/recovery RU/EN — PR #26, 29 октября 2026
- Typed RU/EN copy и semantic error/status/stage/success state сохраняют fields/consent/owner/PKCE/cooldown при locale change без replay. Recovery pending ref, late unmount guard и cleanup timers; это UI lifecycle, не отмена server/provider action. Partial session-revocation warning и uncertain-password advice сохраняются в обеих локалях. Production wrappers остаются RU.
- Локально634 unit/58files/lint/types/build,109 Playwright PASS/2 live SKIP,8 новых actual-form/shell cases и mobile axe/overflow/screenshots. PR https://github.com/kredavto/JobMatch-AI/pull/26 ; CI40891965719/40891965814/40891965727 SUCCESS:634 unit/37 Python/109 E2E (2 live SKIP), native19/concurrency/restore и76 worker/OCR/ClamAV checks. Контракт docs/AUTH_SHELL_LOCALIZATION.md. Live SMTP/recovery/provider restore/operator consent/privacy/hosting и полный English app не приняты; merge/release не выполнены.


## Overview/vacancy RU/EN и сохранность source drafts — PR #27, 29 октября 2026
- Typed RU/EN/defaultRU views с прежними manual counts/source examples/canonical payloads. Demo защищает saved facts и unsaved source drafts; late import/demo/fact reply сохраняет новый текст, late demo уважает navigation. Local link feedback очищается на edit и не стирает service error; ID/examples не делают HH calls/autosave.
- Локально634 unit/58files/lint/types/build и116 E2E PASS/2 live SKIP;7 новых actual-workspace cases/English mobile axe/overflow/screenshots. PR https://github.com/kredavto/JobMatch-AI/pull/27 ; runtime5e2f0ba CI40898977427/40898977555/40898977499 SUCCESS:634 unit/37 Python/116 browser (2 live SKIP), native19/concurrency/restore и76 worker/OCR/ClamAV checks. Контракт docs/OVERVIEW_VACANCY_LOCALIZATION.md. Full English/live/operator acceptance остаётся открытой; merge/release/API/SQL/production changes не выполнялись.


## Редактор правил RU/EN и контекст сохранённых источников — PR #28, 29 октября 2026
- Отдельный EditorPanel/defaultRU показывает сохранённые resume/vacancy и число user-confirmed facts. Несохранённые поля блокируют analysis, выбор/отмену правок и version save; guard есть и на границе отправки. Новые drafts и выбранный раздел сохраняются при late analysis/version success. Смена locale не повторяет requests и сохраняет selection/history/preview.
- Текущие reason strings переводятся только при отображении после прежней rules-v1 validation. Unknown reasons остаются verbatim. Score/weights/quotes/fact IDs/source objects/commands/JSON не меняются; обычный version template остаётся RU с пояснением в English UI. Production остаётся RU; соседние AI/coach/letter views и полный English app ещё не приняты.
- GitHub CI на runtime e2a72f9d4b37cd76e60a7c7b9a387a16d98cc4bd:638 unit/59files,37 Python/lint/types/build и122 Playwright PASS/2 live-account SKIP;4 новых engine-backed unit cases и6 actual-workspace browser cases. English mobile axe/overflow PASS, SYNTHETIC screenshot из CI просмотрен. Локальная среда недоступна, результаты являются CI-проверками, а не локальным запуском.
- PR https://github.com/kredavto/JobMatch-AI/pull/28 ; Structured/PostgreSQL40906629708, Application40906629948, Parser/OCR/ClamAV40906629967 SUCCESS. Native19-table/concurrency/реальный dump/restore синтетических данных и76 worker checks прошли; это не копия провайдера/не SMTP/не принятая модель. Контракт docs/EDITOR_LOCALIZATION.md. Merge/release/live/operator gates остаются открытыми. Следующий внутренний блок — обычные версии/сравнение/metadata и даты, затем оставшийся UI и global locale flow.


## Обычные версии и DOCX RU/EN — PR #29, 29 октября 2026
- Подготовлены OrdinaryVersionsPanel/VersionComparison/MatchMetadataPanel с typed RU/EN/defaultRU history/provenance/snapshot/metadata/transfer copy. Исторические metadata не реконструируются; сравнение баллов остаётся ограниченным прежним engine/vacancy/rules gate, без утверждения о росте приглашений. Источники/TXT/JSON/DOCX/extra JSON fields/commands не переводятся.
- Instants показываются в явно названном UTC. Date-only сохраняет точность дня с missing time/zone note, offset-less legacy остаётся verbatim без device-zone conversion. Comparison IDs и pending DOCX сохраняются при locale change; owner/version change сбрасывает bound request и отменяет старое чтение, поздний download исключён. DOCX errors semantic/redacted, retry явный; restore pending guard не меняет последующую navigation/source drafts.
- Runtime48a512b1ceeca7c8ae599341f4cdbcb9cfc06d6b: CI40911691714/40911691484/40911691621 SUCCESS —643 unit/60files,37 Python/lint/types/build,133 browser PASS/2 live SKIP,76 worker checks, native19/concurrency/synthetic dump/restore.11 новых actual-component E2E/5 unit, mobile axe/overflow и просмотр SYNTHETIC CI screenshot PASS. Local executor недоступен: результаты CI, а не локальные запуски.
- PR https://github.com/kredavto/JobMatch-AI/pull/29 , docs/VERSION_HISTORY_LOCALIZATION.md. Production остаётся RU, English fixture не равен принятому глобальному интерфейсу. Следующий внутренний блок — coach/letters/AI review presentation; реальная модель/SMTP/recovery/provider-copy restore/operator hosting/privacy и полный live workflow остаются открытыми. Нет merge/release/production SQL/paid infra/real mail/LLM/HH writes.
