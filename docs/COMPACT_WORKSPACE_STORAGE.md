> Current integration note (1 November2026): use docs/CURRENT_COMPACT_STORAGE.md and the current dependency chain through PR #86. Historical PR #4–#10 identifiers below describe source provenance, not an instruction to merge duplicate historical branches. No provider migration/history repair or production rollback was executed. Current acceptance remains pending until the new native runs are recorded.

# Хранение workspace без дублирующих массивов

Этап подготовлен поверх PR #9. Приложение продолжает читать полный workspace через `read_workspace`, а команды и legacy `save_workspace` сохраняют прежние входы, ответы и ревизии. В `workspaces.payload` после перехода остаются скаляры и неизвестные поля верхнего уровня; facts, versions и applications собираются из таблиц. Прямое чтение payload больше не даёт полный профиль: поддерживаемый контракт — RPC.

## Файлы и порядок

| Артефакт | Назначение |
| --- | --- |
| `20261028120140_workspace_entity_snapshot.sql` | Добавляет закрытый STABLE SECURITY INVOKER helper `private.workspace_entities(uuid)` для административной сборки трёх массивов; EXECUTE public/anon/authenticated отозван атомарно |
| `20261028120214_compact_workspace_storage.sql` | Атомарный переход с полного mirror на нормализованное хранение |
| `supabase/rollback/20261028120214_compact_workspace_storage.sql` | Явный откат хранения с сохранением актуальных нормализованных данных |

Нужны все миграции зависимых PR #4–#9. Сначала применяется helper, затем compact migration. Консолидированная schema.sql предназначена только для новой пустой БД. Скрипт rollback находится вне каталога forward migrations и автоматически не выполняется.

## Прямой переход

Один DO-блок с lock_timeout=10s берёт ACCESS EXCLUSIVE на workspace, четырёх таблицах сущностей и fact_history до preflight. Блокируются также читатели; требуется согласованное окно остановки запросов. Пока блокировка не получена, никакие данные/функции переходом не меняются. Gate исключает запись между проверкой и сменой формата.

Preflight требует именно mirror-отчёт v1 с ok=true. Отсутствующий helper или неожиданные non-internal триггеры workspace останавливают оба перехода до изменения данных. Неожиданное поле payload.revision отклоняется отдельно: его значение не удаляется молча. Ошибки значений/порядка/extra/links в прежнем mirror должны быть разобраны до перехода; автоматического repair нет.

Затем заменяются locked_workspace/commit и административный отчёт. Из payload удаляются только три дублирующих массива, без изменения revision/updated_at, нормализованных строк, истории, аудита или согласия. CHECK workspace_compact_payload требует объект без facts/versions/applications/revision и запрещает их повторное появление. Прежний полный workspace budget `< 15000000` байт JSONB-текста теперь явно проверяется в commit до записи: сокращение stored payload не должно разрешать неограниченную сумму версий/неизвестных полей.

Проверенный полный новый аргумент по-прежнему передаётся projector/истории явно. В конце commit сравнивает реконструированное состояние с аргументом, проверяет структуру/формат и активную сессию. Клиентские права, Score/evidence gates, owner lock и ревизии не расширяются. Массивы ещё строятся в памяти; частичные DML или ускорение этим этапом не заявляются. Физическое освобождение места зависит от MVCC/TOAST/VACUUM и резервных копий, а не только от удаления JSON-ключей.

## Новый checker

`check_projection_parity.py` строго поддерживает два разных формата и позволяет потребовать конкретный режим:

```sh
PGSERVICE=jobmatch_restored python3 scripts/check_projection_parity.py --expect-format mirror
PGSERVICE=jobmatch_restored python3 scripts/check_projection_parity.py --expect-format compact
```

| Формат | Проверка |
| --- | --- |
| jobmatch-projection-parity-v1 | Полное равенство mirror и нормализованных данных плюс структурные проверки |
| jobmatch-workspace-storage-v2 | Отсутствие запрещённых JSON-ключей, наличие валидированного CHECK, плотность позиций, тип/зарезервированные extra, собственные связи и отсутствие orphan rows |

В v2 нет счётчиков facts/versions/applications: второй копии значений больше нет. Обычное изменение текста в авторитетной таблице может дать ok=true; это не проверка равенства прежнему профилю или истинности фактов. Counter guard_rows равен 1 при отсутствующем/невалидированном CHECK, остальные пять counters описывают строки данных. CLI не подменяет один формат другим при --expect-format. Коды 0/1/2 и read-only repeatable-read/полный административный SELECT/RLS scope/COMMIT-marker остаются прежними. Вывод содержит только фиксированные счётчики.

Для проверки сохранности значений добавлен явный логический режим manifest:

```sh
PGSERVICE=jobmatch_restored python3 scripts/backup_manifest.py snapshot before.json --logical-workspaces --include-letters --include-source-profile
PGSERVICE=jobmatch_restored python3 scripts/backup_manifest.py snapshot after.json --logical-workspaces --include-letters --include-source-profile
python3 scripts/backup_manifest.py compare before.json after.json
```

Он заменяет только представление workspace.payload на скаляры + сборку трёх массивов через закрытый helper. UUID, revision, updated_at и остальные16таблиц участвуют в fingerprint без изменений. Файлы содержат только количества/хеши, создаются с правами 0600 после полного чтения/COMMIT и не перезаписываются. Формат jobmatch-backup-logical-letters-source-v2 нельзя сравнивать с обычным raw manifest v1. Default raw snapshot/dump-restore проверки сохраняются. Helper должен быть установлен до логического baseline.

## Откат

Rollback требует compact v2 с ok=true под тем же ACCESS EXCLUSIVE gate. Он снимает CHECK, восстанавливает три массива из текущих таблиц и возвращает точные mirror-определения locked_workspace, commit и отчёта из PR #9. Ревизии, даты, история, согласия и аудит не откатываются во времени. Новые версии/свидетельства/отклики и изменения после cutover сохраняются. Закрытый read-only helper остаётся установленным, поэтому логические manifest работают и после отката.

```sh
PGSERVICE=jobmatch_restored psql -X -w -v ON_ERROR_STOP=1 -f supabase/rollback/20261028120214_compact_workspace_storage.sql
PGSERVICE=jobmatch_restored python3 scripts/check_projection_parity.py --expect-format mirror
```

При неверном режиме, структурном расхождении либо любой поздней ошибке блок целиком откатывается. Повторное применение forward SQL выполняется только из mirror-режима и после новых проверок. Прямое редактирование только payload/одной таблицы не является исправлением.

Этот SQL не меняет Supabase migration history. После успешного rollback и проверки правильного linked project оператору нужно отдельно согласовать историю, прежде чем запускать штатное повторное применение. Исторический синтаксис Supabase CLI здесь не выдаётся за текущую проверку: provider CLI/history/repair в этом прогоне не запускались; оператор отдельно проверяет актуальную официальную документацию и целевой проект после согласования окна. Helper migration не отмечается reverted. Provider history/repair и реальный выпуск должны быть проверены на отдельной копии Supabase, а не на рабочем проекте.

## Матрица проверок

| Режим | SQL-наборы |
| --- | --- |
| Mirror до cutover и после rollback | Все десять прежних suite, включая старый snapshot parity и payload fixtures |
| Compact после clean install, upgrade, restore и reapply | Шесть прежних API/security suite + compact_workspace + compact_write_failures |

Новые suite сохраняют все девять команд/legacy, неизвестные поля, порядок и null/absence связей, точную историю, RLS/session/grants, отказы четырёх стадий записи и финальную проверку скаляров. Проверяются запрет массивов/второй ревизии, общий byte budget и отсутствие CHECK. Прежние mirror-тесты не удалены: выполняются там, где их контракт применим.

Исторический PGlite-прогон #10 проверял13таблиц; он не является текущим доказательством. Новый протокол с17таблицами должен отдельно подтвердить прямой переход/точный raw rollback без новых записей, все девять команд и legacy после cutover, сохранение их логического состояния при rollback/reapply, ранние/поздние отказы обоих направлений и совпадение функций/grants/constraints между clean/incremental путями. Синтетические исправления повреждений явные и откатываемые. Native PostgreSQL 17 drill подготовлен для той же цепочки, pg_dump/pg_restore, raw/logical fingerprint и реальных concurrent probes в обоих режимах. Фактические результаты указаны в VERIFICATION.md.

Это ещё не production-приёмка: нужны копия реального провайдера с его Auth/migration history, окно остановки запросов, живой multi-account сценарий, подтверждённый rollback/repair и отдельное разрешение на объединение/выпуск зависимой цепочки.
