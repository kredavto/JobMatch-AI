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
