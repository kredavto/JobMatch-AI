# Приёмка восстановления JobMatch AI

Этот протокол проверяет восстановление отдельно от рабочей базы. Пользовательский JSON-экспорт не заменяет резервную копию: он не включает Auth, политики доступа, функции и всю историю.

## Подготовка

1. Зафиксируйте ответственного, версию PostgreSQL/Supabase, commit приложения, дату копии, целевые RPO/RTO, срок хранения и способ шифрования. Не храните копии или пароли в git.
2. Создайте изолированный тестовый Supabase-проект с совместимой версией PostgreSQL. Отключите исходящую почту, webhooks и фоновые задания. Не подключайте к нему рабочий сайт. Восстановленные адреса пользователей не должны получать уведомления.
3. Используйте документированный механизм резервирования/восстановления провайдера с переносом схем `auth`, `public`, `private`, ролей/grants, функций, триггеров, политик и данных. Настройки SMTP, Site URL, redirect URLs, секреты проекта и внешние сервисы учитывайте отдельно: SQL-копия их не восстанавливает.
4. Для побайтового сравнения данных нужен эталон той же точки восстановления. На время создания эталона и копии остановите **все** записи, включая Auth refresh, входы и квоты. Не сравнивайте восстановленную копию со свободно меняющейся рабочей базой. Если остановка невозможна, создайте эталон на отдельном клоне той же snapshot/PITR-точки. Время копии и эталона запишите в протоколе.

## Проверка данных без записи в базу

Требуются Python 3 и `psql`. Подключение задавайте через `PGSERVICE` и защищённый `.pgpass` (режим 0600) либо стандартные PG-переменные. Пароли в аргументы команд не помещайте. Используйте административную роль с чтением всех строк, включая Auth и private. Скрипт задаёт `row_security=off`, чтобы неполный доступ через RLS завершался ошибкой.

На согласованном эталоне:

```sh
PGSERVICE=jobmatch_baseline python3 scripts/backup_manifest.py snapshot /secure/baseline.json
```

После восстановления в тестовую базу, **до входов, запуска приложения и SQL-тестов**:

```sh
PGSERVICE=jobmatch_restored python3 scripts/backup_manifest.py snapshot /secure/restored.json
python3 scripts/backup_manifest.py compare /secure/baseline.json /secure/restored.json
```

Каждый manifest собирается в одной repeatable-read read-only транзакции. Сравниваются количество и SHA-256 упорядоченных JSON-строк 13 таблиц: пользователи, identities, сессии, refresh tokens, workspace, факты, версии, отклики, события, история, аудит, согласия и квоты. В файлы попадают только числа и хеши; обрабатываемые строки проходят через память процесса. Хеши также храните закрыто. Уже существующий файл не перезаписывается. Ошибка таблицы/прав/таймаут не создаёт успешный manifest. Код выхода: 0 — успех, 1 — различия, 2 — ошибка проверки.

Изменение Auth-данных самим механизмом восстановления тоже даст различие. Не исключайте его автоматически: выясните причину, зафиксируйте допустимое преобразование и проверьте повторную авторизацию отдельно. PASS подтверждает только совпадение данных указанных таблиц, а не схемы и всего проекта. Новые таблицы требуют обновления списка в скрипте.

## Проверка поведения восстановленной базы

Только в изолированном тестовом проекте с отключённой доставкой выполните существующие транзакционные SQL-проверки:

```sh
PGSERVICE=jobmatch_restored psql -X -w -v ON_ERROR_STOP=1 -f supabase/tests/fact_history.sql
PGSERVICE=jobmatch_restored psql -X -w -v ON_ERROR_STOP=1 -f supabase/tests/normalized_entities.sql
PGSERVICE=jobmatch_restored psql -X -w -v ON_ERROR_STOP=1 -f supabase/tests/write_gates.sql
PGSERVICE=jobmatch_restored psql -X -w -v ON_ERROR_STOP=1 -f supabase/tests/workspace_commands.sql
PGSERVICE=jobmatch_restored psql -X -w -v ON_ERROR_STOP=1 -f supabase/tests/application_commands.sql
PGSERVICE=jobmatch_restored psql -X -w -v ON_ERROR_STOP=1 -f supabase/tests/profile_commands.sql
PGSERVICE=jobmatch_restored psql -X -w -v ON_ERROR_STOP=1 -f supabase/tests/version_commands.sql
PGSERVICE=jobmatch_restored psql -X -w -v ON_ERROR_STOP=1 -f supabase/tests/projection_parity.sql
```

Они создают синтетические данные и завершаются ROLLBACK; запуск на production не предусмотрен. Затем проведите браузерную приёмку с вымышленными аккаунтами на приложении, подключённом только к тестовому проекту: вход, чтение/сохранение версии, история, экспорт, изоляция двух владельцев, отзыв сессии и удаление. Настройки Auth, SMTP и восстановление пароля проверяются отдельным согласованным почтовым тестом.

При схеме, содержащей migration `20261028110004_projection_parity.sql`, отдельно проверьте совпадение snapshot и нормализованных таблиц командой `PGSERVICE=jobmatch_restored python3 scripts/check_projection_parity.py`. Она возвращает только счётчики в одной read-only транзакции; коды 0/1/2 означают паритет/расхождения/ошибку. Это дополняет, но не заменяет сравнение исходной и восстановленной копий. Полный контракт и ограничения: docs/PROJECTION_PARITY.md. На более ранней восстановленной схеме функцию нельзя считать доступной; не применяйте новые миграции до первичного manifest comparison той же точки восстановления.

## Результат приёмки

Запишите ID/время исходной копии, commit, начало/окончание восстановления, фактические RPO/RTO, manifest comparison, результаты SQL/браузерных проверок, допустимые расхождения и ответственного. После проверки удалите тестовый проект и копии по утверждённому сроку хранения. Секреты, адреса и строки резюме в отчёт не включайте.

До успешного реального восстановления пункт MVP остаётся открытым. 28 октября 2026 пройдены 11 локальных тестов сравнения и потокового протокола psql с подменённым процессом: неполный вывод, ошибка процесса, повтор таблицы, ошибка диска, запрет перезаписи эталона и очистка ресурсов. Файл публикуется атомарно после маркера завершения; UTF-8, DateStyle и bytea_output зафиксированы. Реальная копия не восстанавливалась; подключение настоящего psql этим прогоном не проверялось.

## Автоматический синтетический прогон PostgreSQL

Workflow `.github/workflows/backup-restore.yml` запускает отдельный PostgreSQL 17 в GitHub Actions без ключей Supabase и без рабочих данных. `scripts/local_restore_drill.py` создаёт две базы с уникальными именами, применяет текущую схему приложения и минимальный SQL-заменитель Auth, заполняет все 13 таблиц синтетическими строками, делает `pg_dump -Fc`, восстанавливает `pg_restore`, сравнивает manifest и запускает три SQL-suite на восстановленной базе. Затем изменяет содержимое при неизменном числе строк и требует обнаружения расхождения. Базы и временная копия удаляются после прогона.

SQL-заменитель Auth моделирует только таблицы и функции JWT для тестирования прикладной схемы. Он не проверяет настоящие Supabase Auth, SMTP, пароли, структуру полной схемы auth или настройки провайдера. Успешный CI не закрывает эксплуатационную приёмку реальной копии Supabase.

Локально запускать только на выделенном одноразовом PostgreSQL с заранее созданными NOLOGIN-ролями `anon` и `authenticated`. Требуются PostgreSQL 17 clients и Python 3; `PGHOST` — `127.0.0.1` или `::1`, `PGUSER` — администратор тестового кластера, `JOBMATCH_LOCAL_RESTORE=1`. В GitHub Actions допускается также hostname `postgres` для изолированного service-контейнера. PGSERVICE/PGHOSTADDR/PGSERVICEFILE запрещены. Инструмент не удаляет существующие базы: удаляются только уникальные базы, созданные им самим. Дамп не публикуется как CI artifact.

Подтверждённый синтетический прогон: [GitHub Actions 40645763293](https://github.com/kredavto/JobMatch-AI/actions/runs/40645763293), SUCCESS, 28 октября 2026. Полный результат и ограничения записаны в `VERIFICATION.md`.

## Структурированный профиль и дословные версии (зависимая схема PR #19/#20)

После установки обеих additive migrations полный manifest обязан охватывать **16** таблиц. На исходной и восстановленной базе одной и той же схемы используйте `snapshot ... --include-structured`: формат `jobmatch-backup-structured-v4` включает source, entries и immutable literal versions. Формат v3 на15 таблиц сравним только с другим v3; default legacy13 предназначен для исторических migration drills и не является полной проверкой этих данных. Неполный набор, ошибочно помеченный v4, отклоняется.

До миграции реальной восстановленной копии сначала сравните её с эталоном её исходной схемы. Затем на изолированной synthetic/testing базе выполните `supabase/tests/structured_profile.sql` и `supabase/tests/structured_versions.sql`, а также owner/session/export/delete UI-приёмку. Workflow `structured-profile.yml` отдельно проверяет свежую/заполненную схему, 20 concurrent profile writers, 20 idempotent version saves, все16 заполненных таблиц в настоящем PostgreSQL17 pg_dump/restore и обнаружение порчи обеих новых сущностей. Для отрицательного теста immutable trigger отключается только администратором disposable базы; это не инструкция менять рабочие версии.

Настоящая копия Supabase, Auth/PostgREST, фактические RPO/RTO и операторская политика хранения всё ещё требуют отдельной приёмки. Сохранённые версии содержат полный прежний источник; reset текущей структуры не удаляет их. Пользовательский архив — четыре отдельных файла с обязательным complete:true в каждом NDJSON, без обещания общего транзакционного момента. Контракт: docs/STRUCTURED_VERSIONS.md.


## Сохранённые задачи (следующий additive этап)
После saved_reminders migration полный --include-structured manifest имеет формат jobmatch-backup-structured-v5 и19 таблиц: добавлены reminder_boards/reminders/reminder_events. v3/15 и v4/16 — исторические форматы; неполный набор нельзя пометить v5. До изменения схемы копии сравнивайте её с эталоном исходной схемы. Новая native suite supabase/tests/saved_reminders.sql проверяет state/history/limits/session/cascade; workflow seed/dump/restore19 и отдельный negative history corruption probe. Это не восстановление реальной копии провайдера. Пользовательский полный архив теперь требует5 файлов; reminder NDJSON complete:true означает отсутствие замеченных изменений board revision на протяжении экспорта, а не общий snapshot с остальными файлами.


## Явные acceptance receipts: текущий v6/21, PR #42
После consent_receipts migration --include-structured создаёт jobmatch-backup-structured-v6 с21 tables: добавлены private.processing_notices и public.processing_consent_receipts. Historical v5/19, v4/16 и v3/15 по-прежнему проверяются в своих форматах; нельзя переименовать неполный manifest в v6. Native full-schema seed/dump/restore заполняет все21 таблицы, проверяет owned receipt после восстановления и обнаруживает отдельные изменения recorded_at receipt и body/hash notice.

Реестр юридических текстов в самой миграции пуст. Seed SYNTHETIC ONLY используется исключительно в disposable CI; он не является операторским одобрением и не предназначен для рабочей базы. Consent event — заявление аккаунта о точном тексте/языке/версии с серверным временем, не цифровая подпись, проверка личности или legal approval. Старые consent_records не backfill и остаются legacy observations.

В пользовательском архиве теперь6 файлов; новый journal JSON скачивается из отдельной панели настроек только после проверки всех страниц до фиксированного номера. Это не общий snapshot остальных файлов. Удаление аккаунта требует существующую сессию и каскадно удаляет собственные receipts из активной базы; backup/download retention остаётся решением оператора. При откате кода сохраните reader/export или подготовьте проверенный операторский путь — старый код о шестом файле не знает.

v6 по-прежнему не включает private.auth_quota_config/auth_quotas/auth_quota_outcomes и остальную схему Supabase/секреты провайдера. Unrestricted dump может содержать signing key; защищённое хранение и rekey до traffic после restore проверяются отдельно. Native PostgreSQL17 fixture имеет минимальную Auth schema, а не настоящую копию Supabase. Реальный provider-copy restore, Auth/PostgREST, SMTP, RPO/RTO и политика размещения/удаления копий не закрыты. Контракт: docs/CONSENT_RECEIPTS.md.

## Английские дословные структурированные версии, PR #43
Новых таблиц нет: текущий structured-v6/21 и шесть файлов user archive сохраняются. Native full-schema seed/dump/restore содержит обе версии шаблона в public.structured_resume_versions; сравниваются все прежние fingerprints. Старые русские строки, функции/grants и native preview отдельно сравниваются до/после миграции без перезаписи. Это synthetic fixture, не реальная копия провайдера. Откат кода обязан сохранить reader/export обеих меток: старый strict Russian-only reader отвергнет mixed history. Нельзя сужать constraint или удалять английские записи ради совместимости. Контракт: docs/STRUCTURED_VERSIONS.md.
