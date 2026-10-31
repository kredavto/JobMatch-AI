# Операционные события API и локальная проверка наблюдений

PR #45 добавляет opt-in наблюдение за возвратом/исключением **зарегистрированных GET/POST handlers**, не систему полной эксплуатационной приёмки. Нового публичного metrics endpoint, базы, SDK, внешнего collector, cron, почты или webhook нет. Схема Supabase, пользовательские архивы и production environment не меняются.

## Включение и объём

`JOBMATCH_OPS_TELEMETRY=off` по умолчанию. Только точное `stdout` включает вывод; unset/unknown/другой регистр/пробелы оставляют его выключенным. Флаг server-only, без NEXT_PUBLIC. До production activation оператор должен согласовать доступ к логам, retention/удаление, допустимость метаданных, бюджет и сбор по всем экземплярам. Лимит ниже не является лимитом стоимости всего deployment.

Все12 текущих API route files используют observeRoute (включая отдельный POST ai-profile из кандидата #56). Аргументы, тело/URL/query/headers/cookies, owner/session/user IDs, email, prompt/резюме/вакансия, исключение и его name/message/stack/cause не читаются наблюдателем и не сериализуются. Response возвращается тем же объектом, cookies/headers и поток не клонируются/не потребляются; ошибка повторно выбрасывается тем же объектом. Сбой stdout/часов не меняет бизнес-результат и не вызывает retry. Изменение флага во время ожидания может прекратить вывод, но не отменяет уже отправленную операцию.

Вывод: одна строка `JOBMATCH_OPS_V1 ` + JSON. Наблюдения ограничены60 на UTC minute в одном JS realm; следующая попытка выдаёт один coverage-capped marker, остальные подавляются до новой минуты. Счётчик сохраняется в globalThis этого realm; разные serverless instances/realms имеют отдельные бюджеты, рестарты их сбрасывают. Часы назад не сбрасывают бюджет. Timers/background flush/remote send отсутствуют. Log loss/доставка/покрытие всех экземпляров этим не устанавливаются.

| Поле | Контракт |
| --- | --- |
| format | jobmatch-ops-event-v1 |
| scope | route-handler |
| kind | returned / unhandled; отдельная форма coverage-capped |
| minute | UTC YYYY-MM-DDTHH:mm:00Z, без точного времени запроса |
| route | Только12 статических folder labels текущих API |
| handler | Зарегистрированный GET или POST, не произвольный HTTP method |
| status | returned: целое100–599 либо null для неизвестного; unhandled: null |
| duration | lt100ms / lt500ms / lt2s / lt10s / ge10s / unknown |
| limit | Только в coverage-capped, ровно60; нет route/user/process identifier |

Нет исходных milliseconds, request IDs, pseudonyms/hashes пользователя, произвольных labels или сообщений. Это ограничение полей, не юридическое утверждение об анонимности/размещении всех логов: provider/framework logs и потенциальные косвенные связи требуют отдельного review.

## Что измерено

Монотонная длительность начинается перед вызовом handler и заканчивается после разрешения его promise. Module import/cold start до вызова, сеть клиента, body streaming/скачивание, SSR/client errors, platform/WAF denials и неподдерживаемые/автоматические framework responses не покрыты. HEAD может использовать GET handler; автоматически сформированный OPTIONS не является вызовом этого handler. Next-конвенции: [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [route.js](https://nextjs.org/docs/app/api-reference/file-conventions/route).

returned/status200 означает только возвращённый Response. NDJSON complete:false или последующая ошибка stream не превращаются в успешную бизнес-операцию. Наблюдатель намеренно не читает body. В PR #46 три существующих источника NDJSON отдельно сообщают server-side terminal outcomes ниже; header scope по-прежнему не включает их. unhandled не приписывает HTTP500 до решения framework. Rate limit мониторинга не ограничивает запросы пользователей и не заменяет WAF/direct Auth protection.

## Файл наблюдений и команды оператора

`scripts/ops_report.py` читает **только переданный файл** с исходными строками этого prefix. Нужен доверенный операторский export/extraction pipeline; произвольные provider envelopes/общие stdout logs автоматически не разбираются. Источник/доставка/полнота/дубликаты не удостоверяются: во всех отчётах collectionCompleteness=not-established; header scope=supplied-file/registered-route-handlers-only, stream scope=supplied-file/server-stream-terminals-only. Поддельный/повторённый файл не становится доказательством работы production.

Parser потоковый, без сети и изменения input. Максимум16MiB файла/1024B строки; strict UTF-8, завершающий newline, exact schema/enum, duplicate/unknown keys, неверные даты/типы/format отвергаются с кодом2 без вывода contents/path. Нет silent truncation или преобразования повреждённого input в нули. Opaque пользовательские архивы это не затрагивает.

Команды (events.log — отдельный операторский файл, не raw GitHub Actions log с timestamp prefix):

```sh
python3 scripts/ops_report.py report events.log --window-minutes 15
python3 scripts/ops_report.py check events.log --window-minutes 15 --route service --min-responses 100 --max-5xx-fraction 0.01 --max-ge2s-fraction 0.05 --max-unhandled 0 --max-age-seconds 120
```

Числа во второй команде — пример синтаксиса, **не принятые SLO JobMatch**. Оператор явно задаёт все thresholds. Report без check выдаёт not-checked. Check:
- 0 observed-within-thresholds — только наблюдённый файл/выбранный scope, не READY/финальная приёмка;
- 1 observed-alert — нарушены заданные условия в наблюдениях;
- 2 inconclusive/refused — недостаточно/пусто/старо, capped, future/unknown measurements, некорректный input/parameters.

Known breaches сохраняются в отчёте также при inconclusive. Freshness — верхняя граница возраста по началу minute bucket, не точная дата последнего запроса. Минимальный max-age60s учитывает эту точность. Последние1..1440 minute buckets выбираются без зависимости от device zone. --now с явным UTC second clock предназначен для воспроизводимого replay и отмечается evaluationClock=explicit; это не независимая аттестация времени.

Отдельно показываются status/duration counts и unhandled; fractions относятся только к returned responses. 4xx, в частности401 unauthenticated guard, не доказывают работоспособность пользовательского workflow. Есть только диапазоны, точный p95/полная availability не вычисляются. Route service объединяет разные операции; действия/контент не разбираются ради детализации.

## Исходы серверных потоков — кандидат PR #46

historyStream, structuredVersionStream и reminderExportStream добавляют фиксированный terminal сигнал непосредственно после существующих enqueue footer + close либо в cancel underlying source. Содержимое/формат/порядок/лимиты/проверки owner/revision/hash, чтение по pull и прекращение последующих чтений не меняются. Observer не оборачивает и не читает stream. Ни callback read, ни причина отмены/исключение ему не передаются.

| Поле | Новый контракт |
| --- | --- |
| format / scope | jobmatch-ops-stream-v1 / server-stream |
| kind | terminal; отдельная форма coverage-capped |
| route / handler | fact-history / structured-versions / reminders; только GET |
| outcome | completion-enqueued / incomplete-enqueued / cancelled |
| minute / duration | Те же UTC minute и coarse buckets; длительность с создания stream helper до terminal branch |
| marker | Только format/scope/kind/minute/limit60, без route/outcome |

Framing prefix остаётся JOBMATCH_OPS_V1. Старый jobmatch-ops-event-v1 сохраняет прежний контракт. Новая schema strict, без status, bytes/counts/owner/IDs/cursors/hash, произвольных ошибок или cancel reason. Terminal callback одноразовый даже при cap/ошибке sink. Если flag выключен при создании stream, не читаются clocks и позднее включение его не активирует; выключение до terminal подавляет вывод без отмены экспорта. Все header и stream observations делят прежний realm budget60+один marker, а не получают независимые бюджеты.

completion-enqueued означает только успешное выполнение enqueue полного завершающего маркера и close источника. Это **не получение/сохранение файла клиентом**, не проверка всей сети/диска и не подтверждение user acknowledgement. incomplete-enqueued означает постановку прежнего complete:false footer после ошибки/лимита/несогласованного снимка; причины/текст не логируются. cancelled означает вызов cancel underlying source; причина не читается и не классифицируется как network error либо действие пользователя. Прекращение процесса, никогда не потреблённый поток или потерянный log могут оставить terminal без наблюдения; отсутствие события не считается успешным экспортом. Порядок header/terminal не гарантируется, корреляции по request/owner IDs намеренно нет. Сколько header200 соответствует какому terminal и сколько событий потеряно, вычислить нельзя. Поток после enqueue полного footer может ещё содержать непрочитанные клиентом chunks.

[Node Web Streams](https://nodejs.org/api/webstreams.html) описывает enqueue как добавление chunk в очередь источника и отдельный cancel callback; именно серверные ветви, а не доставка, служат точками наблюдения.

Новый reader принимает строго обе версии. Старый reader #45 отвергнет новый format с кодом2, не пропустит его молча: обновите operator reader **до включения** stream-capable кода. Отключение флага останавливает новые события; собранные новые файлы сохраняйте с совместимым reader. Они не мигрируют в app DB/архивы.

```sh
python3 scripts/ops_report.py stream-report events.log --window-minutes 15
python3 scripts/ops_report.py stream-check events.log --window-minutes 15 --route fact-history --min-streams 100 --max-incomplete-fraction 0.01 --max-cancelled-fraction 0.05 --max-age-seconds 120
```

Пороги — только пример, не согласованные SLO. stream-check оценивает terminals в переданном окне/route: отдельные fractions incomplete и cancelled; denominator — только наблюдённые terminals, **не все попытки экспорта**. clientDelivery=not-established всегда. Header events показываются как headerRecordsNotEvaluated, их health не оценивается этим scope. Любой coverage marker обеих семей учитывается даже с --route, так как budget общий. Неизвестная длительность/будущее/недостаток/давность/cap дают2; известные нарушения сохраняются. Код0 не означает full/production readiness.

Обычный check оценивает только HTTP-handler scope. Если в выбранном окне/route присутствуют stream terminals, выдаёт2/stream-outcomes-not-checked вместо положительного sample verdict; нужен отдельный stream-check. Для отдельной оценки headers оператор может передать доверенно выделенный header-only файл, сохранив markers обеих семей и исходную provenance; автоматической фильтрации общих provider logs нет. stream-check не проверяет все HTTP5xx, а check — все исходы потоков. Отсутствие terminal records нельзя исправить header200.

В unit CI используются настоящие Node ReadableStream/Response и существующие fixtures трёх helpers: полные/пустые архивы, bounds, ошибка/detail mismatch/final revision, отмена до pull и при удержанном read/recheck с поздним resolve/reject, точное равенство bytes при выключенном mode и падающем sink. Native failed-after-200 события передаются реальному Python CLI через временный файл и дают observed-alert. Это synthetic callback data, **не реальное чтение Supabase или доставка клиенту**. Existing actual Next loopback smoke по-прежнему проверяет только unauthenticated guards/headers, не authenticated stream provider workflow.

## Проверка и границы

Unit tests проверяют allowlist/privacy, exact disabled behavior, Response/cookie/stream identity, exception identity без чтения свойств, clock/sink failures, cap/reset/rollback, mid-request disable, unknown status и позднюю ошибку stream после200. Python tests проверяют schemas/bounds/UTC/thresholds/unknown/capped/stale, CLI read-only и отсутствие input/path в ошибках.

Новый synthetic workflow запускает реальный production Next process дважды (off/stdout) с пустой provider configuration. Только loopback; redirects выключены, invalid/unauthenticated inputs и private canaries синтетические. Test preload запрещает non-loopback global fetch и проваливает smoke при попытке provider fetch; это тестовый guard, не production network sandbox. Проверяются все12 route labels, прежние400/401/403/503 guards, отсутствие canary в child output, OPTIONS coverage gap, bounded burst130 запросов и реальный file-only check/alert/inconclusive. Положительный check на401 headers намеренно **не** называется готовностью провайдера/приложения.

После review merge/deployment требуют отдельного разрешения. Нельзя включать режим в production без операторского решения об access/retention/budget/collection; можно откатить код/выключить флаг без удаления пользовательской БД. Старые файлы v1 сохраняются, не backfill в app data. Logs не входят в structured-v6/21-table app manifest и шесть user archive files; их резервирование/удаление — отдельный operator policy. Реальный Supabase restore/RPO/RTO, SMTP/recovery, own-model evaluation, hh.ru permissions, global capacity и финальная эксплуатационная приёмка остаются открытыми.

## Фактическая проверка кандидата
Runtime `d306aabfd9fa684d716b220cb09a85c9c66df695`: [operational smoke](https://github.com/kredavto/JobMatch-AI/actions/runs/41068381892), [application](https://github.com/kredavto/JobMatch-AI/actions/runs/41068382109), [structured/Python/native restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41068381883) SUCCESS; все9 workflow PASS.835 unit/79files,62 Python,213 browser PASS/2 live-account SKIP,76 worker.27 новых TS/15 Python unit и real Next two-process smoke;15 Python дополнительно локально PASS, Node/Next tests existing CI. Первоначальный Proxy-then fixture failure исправлен до полного прогона.18 runtime/test/workflow files immutable re-fetched/byte equality, Vercel preview status SUCCESS. Production config/collector/alerts не менялись. VERIFICATION.md содержит полный журнал и ограничения.

## Фактическая проверка stream-кандидата #46
Runtime `d31b48e824b602678243f9c182d3eca13cb5b71a`: [Consent receipt protocol (synthetic)](https://github.com/kredavto/JobMatch-AI/actions/runs/41074612988), [Synthetic PostgreSQL restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41074612982), [English structured version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41074612985), [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/41074612913), [English ordinary version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41074612976), [Isolated document parser](https://github.com/kredavto/JobMatch-AI/actions/runs/41074612981), [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/41074612975), [Structured profile acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41074613012) SUCCESS; все8 workflow PASS.847 unit/80files,72 Python,lint/types/build PASS;213 browser PASS/2 live-account SKIP;76 worker cases PASS. Отдельный operational workflow:39 TS (27 прежних+12 новых),25 Python (15 прежних+10 новых), actual Next two-process guard/privacy/cap smoke PASS. Native stream→Python observed HTTP200+incomplete case PASS. Vercel runtime preview SUCCESS. Это CI с synthetic fixtures; реальные provider/модель/SMTP/restore не объявляются проверенными.
Восемь runtime/test/workflow files re-fetched по immutable runtime SHA и сравнены byte-for-byte. Новый UI/SQL/зависимости/production config отсутствуют. 25 ops Python дополнительно локально PASS. Источники fixtures и ограничения server enqueue vs delivery указаны выше; отдельный authenticated live workflow остаётся открытым.


## Кандидат #56: новый POST-only profile preview

ai-profile добавлен как фиксированная allowlisted route label без owner/source/model/digest properties; default telemetry off сохранён. Первый real Next smoke41196910565 правильно отказал на phase=routes: smoke выбрал GET для нового POST-only endpoint и получил framework405 вне handler. Исправлен POST_ONLY, допустимые guard statuses/приватность/thresholds не ослаблялись. Новый Python test сверяет выбранный метод probe с фактическими GET/POST exports всех route files. Локальный и corrected CI41198109603/job124528290987 real Next smoke PASS для12labels, canaries/off/on/alert/OPTIONS/cap/inconclusive/owned cleanup; это не global collector/delivery/model/provider acceptance.
