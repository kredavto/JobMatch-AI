# Дословные версии текущего source profile

Кандидат поверх #89. Это неизменяемые снимки выбранных вручную подтверждённых полей, не генеративное переписывание, модель или независимая проверка смысла/дат/истинности. Метаданные `literal-template`, `model_version:null`, `source_status:at-save-only`; исходные диапазоны Unicode code points и raw CRLF/emoji не нормализуются. Шаблон `source-literal-ru-v1` и grammar `ascii-cyrillic-line-v1` фиксируют подписи/порядок/проверку; для изменения нужна новая версия, старые записи не переписываются.

## Явный workflow

1. Прочитать историю и текущую структуру, выбрать подтверждённые записи. Это не подтверждает legacy master facts.
2. Получить отдельный preview. SQL заново читает текущий workspace/profile под общей owner/workspace блокировкой, проверяет обе ревизии, source_original+fact IDs, selected IDs/confirmation/ranges и ограниченную grammar. Записи/дополнительного audit при preview нет; HTTP quota отдельно.
3. Посмотреть точный текст, весь сохраняемый исходник и диапазоны; отдельно разрешить хранение именно этой версии. Клиент не отправляет text/snapshot; только IDs, counters, hash, marker и consent. SQL заново строит snapshot/text/hash и сравнивает.
4. Сохранение с тем же hash при том же текущем источнике идемпотентно: одна строка/один audit, один ID. Максимум20различных снимков на владельца. Другой источник/ревизия не переиспользует старую версию.
5. История/read/TXT/JSON/NDJSON — отдельные явные действия. Исторический snapshot описывает источник **на момент сохранения**, не текущее состояние. Новая версия не меняет master, подтверждения legacy facts, обычные versions/applications или Match Score.

Source profile confirmation не является legacy verify; SQL и UI сохраняют это разделение. Проверяемый SHA256/NUL framing — консистентность данных, не секретная подпись, не доказательство личности/чтения/истинности. Скачанный файл редактируем; приложение не принимает такие файлы как серверную authority.

## Границы grammar

Поиск известных ASCII-English/Russian слов в строках выбранных полей; ASCII/Cyrillic folding явно одинаков в JS/SQL. Отрицание в другой строке, другом языке/написании или иная смысловая зависимость может не распознаться. Например, `Not skilled in:\nSQL` может пройти: это намеренно не семантическая проверка. Даты не интерпретируются; буквальные2025–2024 не исправляются. Человек обязан проверить полный preview/source. Никогда не выдавать этот gate за квалифицированную модель или true rewriting.

## Хранение и удаление

Миграция `20261101171000_source_versions.sql` добавляет `public.source_profile_versions` и закрытые helpers/public owner RPC. Direct DML закрыт; SELECT с RLS owner+active session, UPDATE immutable trigger. Сохранение defaultOFF: нужны точные server flags `JOBMATCH_SOURCE_PROFILE_ENABLED=true` и `JOBMATCH_SOURCE_VERSIONS_ENABLED=true`, а также **обе** отдельно согласованные SQL capabilities source_profile_storage_permission/source_version_storage_permission. Новая capability не выдана authenticated миграцией. Никакого service key/нового signing key нет. Production flags/GRANT не менялись.

History/read/clear доступны владельцу при отключённом создании. Публичный clear требует отдельный marker и hash **прочитанного полного immutable списка** под общей owner advisory lock. Новое добавление или удаление/пересоздание того же preview с новым ID делает старый clear stale; SQL отказывает без удаления. Авторизация перепроверяется после ожидания lock и после DML. Профиль/legacy histories не изменяются. Новая копия после очистки — только новое явное сохранение.

Очистка текущего source profile не удаляет независимые сохранённые версии. Для них есть отдельное действие с отдельным согласием; интерфейс об этом сообщает. Очистка history удаляет её активные серверные строки и связанные локальные preview/cache этой панели; master/текущая структура/скачанные файлы/копии провайдера не стираются. Account deletion каскадирует через workspace. Operator retention/backup deletion/ПД decision ещё не приняты.

Неопределённый/непроверенный write ack блокирует новую запись до явного чтения истории. Нет autoretry. Owner/source/revision/disabled boundaries сбрасывают preview/consent и отменяют поздние ответы; UI cleanup синхронный на unmount. Чтение history не удостоверяет исход прежней попытки.

## Экспорт и fingerprints

Personal JSON остаётся `scope:workspace-audit-consent` и содержит отдельную literal-ссылку source_versions_export. Для полного пользовательского набора нужны5отдельных файлов: JSON,3NDJSON histories и JSON source profile; это не атомарный снимок. Каждому NDJSON нужен complete:true footer; HTTP200 его не заменяет. Sources-version export фиксирует начальный immutable list, проверяет каждую запись/summary/hash перед выдачей, читает по pull, отменяет дальнейшие чтения и выдаёт incomplete footer при пропаже/повреждении/лимите. Budget64MiB record bytes плюс bounded framing. Новое событие terminal source-versions наблюдает server enqueue/cancel, не client delivery.

Старые manifest scopes13/15/17 остаются прежними **и не покрывают новую таблицу**. Новые explicit scopes18:

```sh
python3 scripts/backup_manifest.py snapshot source18.json --include-letters --include-source-profile --include-source-versions
python3 scripts/backup_manifest.py snapshot logical18.json --include-letters --include-source-profile --include-source-versions --logical-workspaces
python3 scripts/backup_manifest.py compare source18.json restored18.json
```

Formats `jobmatch-backup-manifest-letters-source-versions-v3` и `jobmatch-backup-logical-letters-source-versions-v3` не взаимозаменяемы и не сравниваются со scopes v1/v2.18 — закрытый перечень приложения с private letter-config fingerprint;3private central Auth-quota tables/key по-прежнему вне этого manifest scope. Настоящий pg_dump в native drill включает всю synthetic DB; manifest — выбранная проверка, не утверждение о всех provider data. Нет raw rows/keys в manifest, файл0600/atomic/no overwrite.

## Миграция и регрессии

Полный schema содержит точный additive suffix после core SHA256 `6d363eccef5bb136c43bd372f0725398ea97924429e719a43a6835932437c7e1`. Старые predecessor SHA pins и SQL bytes не меняются; tails перечислены явно, без сортировки исторических filenames. Новое хранилище использует abstract workspace API и совместимо с mirror/compact фазой native compatibility fixtures. Это не указание менять порядок production migration history. Early/late DDL failure должен оставлять прежние данные/objects/grants нетронутыми. Откат приложения/выключение capability не удаляет новые данные; destructive table rollback не предлагается.

Native scenario: clean/current populated17→18 upgrade, SQL caps/idempotence/audit fault/retraction/reimport/cleanup/RLS/cascade; actual production codec/route bridge to native authenticated SQL; JS/SQL raw Unicode/range/render/hash/guard parity; actual observed save/clear revoked-session waiters and independent owner; current rules/source/old-new signed letters; populated18physical/logical pg_dump/restore/catalog/codecs; corruption -> incomplete-after200 stream -> real operator file-only alert. Auth/HTTP bridge синтетический, не GoTrue/PostgREST/provider-copy/RPO/RTO/semantic/client-delivery acceptance. [Native PG17 protocol PASS](https://github.com/kredavto/JobMatch-AI/actions/runs/41337615502/job/124940657292) на executable `4ee2f1b3c0931ea84bc3867bca18889e2dc5dbf3`, tree `5cd6eca105d1444cf5787842b9009516061cb865`. Полный локальный browser186PASS/2liveSKIP;1093unit/API,105Python,20security,lint/types/build PASS. [PR #90](https://github.com/kredavto/JobMatch-AI/pull/90) сохраняет изменение отдельно; production activation/merge/release не выполнялись.

React review: без условных hooks, static imports/pure browser codecs, explicit events/no background writes, bounded response+20s deadline/fixed URL/redirect:error, label/status/error access, context-scoped cleanup and consent invalidation. Новых dependencies нет. HH persistent-policy/real permissions, qualified model/semantic/held-out, SMTP/recovery, provider restore/ПД/security/capacity/final ops остаются OPEN.
