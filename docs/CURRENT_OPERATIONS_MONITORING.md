# Операционные наблюдения текущего core

Кандидат поверх #88, без объединения main/PR, новой БД, SDK, collector, cron, SMTP/webhook или включения production. Подготовка #45/#46 адаптирована к текущим API/source profile/server letters/parser; старые результаты не являются проверкой этого дерева.

## Контракт и включение

`JOBMATCH_OPS_TELEMETRY=off` по умолчанию; только точное `stdout` включает server-only вывод. До production оператор согласует допустимость метаданных, доступ/retention/удаление журналов, сбор со всех экземпляров и бюджет. Наблюдения ограничены60 на UTC минуту в одном JS realm плюс один coverage-capped marker. Это не глобальная квота стоимости/serverless deployment; перезапуски/отдельные realms имеют отдельные бюджеты. Часы назад не сбрасывают лимит.

Одна строка `JOBMATCH_OPS_V1 ` + strict JSON. `jobmatch-ops-event-v1`/`route-handler`: фиксированные route/GET-or-POST-handler, returned/status100–599-or-null либо unhandled/null, UTC minute и duration bucket lt100ms/lt500ms/lt2s/lt10s/ge10s/unknown.11 текущих API/14handlers: ai-review,ai-resume-adaptation,auth-email,fact-history,hh-vacancy,import,letter-versions,recovery,resume-export,service,source-profile. Route labels не вычисляются из URL. HEAD может вызвать GET-handler; автоматические framework OPTIONS не наблюдаются.

Аргументы/URL/query/headers/cookies/body, user/owner/session IDs или их hashes, email, резюме, вакансия, файл/его имя, токены/ключи, ошибка/name/message/stack/cause не читаются наблюдателем и не сериализуются. Response/cookies/headers/stream сохраняют identity; observer не читает и не клонирует body. Исходное исключение перебрасывается тем же объектом. Сбой clock/sink не меняет результат и не вызывает повтор операции. Выключенный режим не читает clocks/данные. Нет фоновых timers/flush/сети. Это ограничение полей, а не юридическое утверждение об анонимности всех платформенных журналов.

Длительность handler заканчивается при возвращении Response, без cold start до вызова, клиентской сети/скачивания, SSR/client ошибок, WAF/platform refusals или незарегистрированных методов. HTTP200 не подтверждает последующую полноту файла.

## Потоковые исходы

`jobmatch-ops-stream-v1`/`server-stream`: только fact-history и letter-versions/GET, UTC minute/duration, один terminal: completion-enqueued, incomplete-enqueued или cancelled. Coverage marker без route/outcome делит общий60-event budget с headers. Нет bytes/IDs/cursors/hashes/причин/содержимого/корреляции запросов. Точки наблюдения — прежние enqueue footer+close или cancel source; для писем также явно наблюдённый req.signal.aborted до/после чтения. Cancel reason не читается. Поздний resolve/reject после cancel не даёт второго terminal.

completion-enqueued означает постановку полного footer в серверную очередь, **не получение/сохранение клиентом**. incomplete-enqueued — прежний complete:false footer после ошибки/лимита/несовпадения. cancelled не классифицируется как ошибка сети или намерение пользователя. Убитый процесс/непотреблённый stream/потерянный log могут не дать terminal; отсутствие события не считается успехом. Порядок header/terminal и полнота сбора не установлены. Source profile/client JSON и buffered DOCX имеют только handler scope, не искусственный stream terminal.

## Операторский файл и CLI

`scripts/ops_report.py` читает только явно переданный **обычный** файл до16MiB, line≤1024B, strict UTF8/newline/unique keys/exact schema. Nonblocking open+fstat отвергают FIFO/каталог/слишком большой файл; рост также ограничен при чтении. Нет сети/записи input, echo содержимого/путей или silent truncation. Нужен доверенный pipeline извлечения исходных prefix-строк из журналов; произвольные provider envelopes не разбираются. Подделка/дубликаты/потери не удостоверяются. Старые route labels из неподключённых предложений не считаются текущим покрытием; несовместимые строки отклоняются, не пропускаются.

```sh
python3 scripts/ops_report.py report events.log --window-minutes 15
python3 scripts/ops_report.py check events.log --window-minutes 15 --route service --min-responses 100 --max-5xx-fraction 0.01 --max-ge2s-fraction 0.05 --max-unhandled 0 --max-age-seconds 120
python3 scripts/ops_report.py stream-report events.log --window-minutes 15
python3 scripts/ops_report.py stream-check events.log --window-minutes 15 --route letter-versions --min-streams 100 --max-incomplete-fraction 0.01 --max-cancelled-fraction 0.05 --max-age-seconds 120
```

Пороги — примеры синтаксиса, не принятые SLO. Оператор задаёт thresholds явно. Check0=observed-within-thresholds только для переданного scope;1=observed-alert;2=inconclusive/refused для недостатка/давности/будущего/unknown/cap/невалидного input. Collection completeness и clientDelivery всегда not-established. Возраст — верхняя граница по началу minute bucket; --now явный UTC replay, не аттестация времени. Нет точногоp95/global availability.401 guard не доказывает живой пользовательский workflow.

Header check при наличии stream terminals не выдаёт положительный verdict без отдельного stream-check; scopes не подменяют друг друга. Stream fractions относятся только к наблюдённым terminals, не всем попыткам экспорта. Markers обеих семей сохраняют неполноту даже с --route. Known breaches сохраняются при inconclusive. Вывод observed-alert — только локальный результат, не доставка оповещения оператору.

## Проверка и ограничения

Unit: closed schema/privacy/identity/cap/clocks/sink/late errors, настоящие Node streams обеих текущих helpers, complete/empty/incomplete/limits/cancel/held resolve+reject/request abort и byte equality. Реальный incomplete-after200 stream передаёт события реальному Python CLI и даёт observed-alert, не client delivery.

Настоящий Next дважды off/stdout: пустая provider configuration, фиксированный loopback, запрет nonloopback fetch тестовым preload; все14handlers, private query/cookie/body/password canaries, прежние guards, framework OPTIONS gap, bounded130-request burst, CLI sample/alert/capped-inconclusive. Это не real Auth/SMTP/Supabase live workflow.

Parser-core native workflow дополнительно включает telemetry только в own UUID fixture. Actual production import/service routes на Docker→TLS→compact PG17 дают по одному closed event со статусами200/400/409/503, без identifiers; actual captured metadata передаются CLI и outage даёт scoped observed-alert. Текущие domain/fingerprints/source/letters/native17table restore assertions сохранены. Auth/DB HTTP bridge синтетический; stdout OS-level отдельно проверяет Next smoke.

Production activation, полноценный collector/alerts delivery/SLO/capacity/on-call/retention и независимый security review открыты. Logs не включены в17table app backup/user exports; это отдельная operator policy. Реальные SMTP/recovery/provider-copy restore/ПД/model/HH grants/final acceptance остаются OPEN. Durable HH storage зависит от согласованной политики transformation/retention/archive/recipients/historical exports; этот PR её не назначает. Внутренние работы остаются: интеграция структурированных версий, локализации, напоминаний и прочих возможностей.

Фактические current-tree CI SHA/ссылки будут внесены после выполнения.
