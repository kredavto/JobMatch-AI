# Операционные события API и локальная проверка наблюдений

PR #45 добавляет opt-in наблюдение за возвратом/исключением **зарегистрированных GET/POST handlers**, не систему полной эксплуатационной приёмки. Нового публичного metrics endpoint, базы, SDK, внешнего collector, cron, почты или webhook нет. Схема Supabase, пользовательские архивы и production environment не меняются.

## Включение и объём

`JOBMATCH_OPS_TELEMETRY=off` по умолчанию. Только точное `stdout` включает вывод; unset/unknown/другой регистр/пробелы оставляют его выключенным. Флаг server-only, без NEXT_PUBLIC. До production activation оператор должен согласовать доступ к логам, retention/удаление, допустимость метаданных, бюджет и сбор по всем экземплярам. Лимит ниже не является лимитом стоимости всего deployment.

Все11 existing API route files используют observeRoute. Аргументы, тело/URL/query/headers/cookies, owner/session/user IDs, email, prompt/резюме/вакансия, исключение и его name/message/stack/cause не читаются наблюдателем и не сериализуются. Response возвращается тем же объектом, cookies/headers и поток не клонируются/не потребляются; ошибка повторно выбрасывается тем же объектом. Сбой stdout/часов не меняет бизнес-результат и не вызывает retry. Изменение флага во время ожидания может прекратить вывод, но не отменяет уже отправленную операцию.

Вывод: одна строка `JOBMATCH_OPS_V1 ` + JSON. Наблюдения ограничены60 на UTC minute в одном JS realm; следующая попытка выдаёт один coverage-capped marker, остальные подавляются до новой минуты. Счётчик сохраняется в globalThis этого realm; разные serverless instances/realms имеют отдельные бюджеты, рестарты их сбрасывают. Часы назад не сбрасывают бюджет. Timers/background flush/remote send отсутствуют. Log loss/доставка/покрытие всех экземпляров этим не устанавливаются.

| Поле | Контракт |
| --- | --- |
| format | jobmatch-ops-event-v1 |
| scope | route-handler |
| kind | returned / unhandled; отдельная форма coverage-capped |
| minute | UTC YYYY-MM-DDTHH:mm:00Z, без точного времени запроса |
| route | Только11 статических folder labels existing API |
| handler | Зарегистрированный GET или POST, не произвольный HTTP method |
| status | returned: целое100–599 либо null для неизвестного; unhandled: null |
| duration | lt100ms / lt500ms / lt2s / lt10s / ge10s / unknown |
| limit | Только в coverage-capped, ровно60; нет route/user/process identifier |

Нет исходных milliseconds, request IDs, pseudonyms/hashes пользователя, произвольных labels или сообщений. Это ограничение полей, не юридическое утверждение об анонимности/размещении всех логов: provider/framework logs и потенциальные косвенные связи требуют отдельного review.

## Что измерено

Монотонная длительность начинается перед вызовом handler и заканчивается после разрешения его promise. Module import/cold start до вызова, сеть клиента, body streaming/скачивание, SSR/client errors, platform/WAF denials и неподдерживаемые/автоматические framework responses не покрыты. HEAD может использовать GET handler; автоматически сформированный OPTIONS не является вызовом этого handler. Next-конвенции: [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [route.js](https://nextjs.org/docs/app/api-reference/file-conventions/route).

returned/status200 означает только возвращённый Response. NDJSON complete:false или последующая ошибка stream не превращаются в успешную бизнес-операцию. Наблюдатель намеренно не читает body. Отдельные безопасные application-outcome signals для потоков остаются следующим внутренним блоком. unhandled не приписывает HTTP500 до решения framework. Rate limit мониторинга не ограничивает запросы пользователей и не заменяет WAF/direct Auth protection.

## Файл наблюдений и команды оператора

`scripts/ops_report.py` читает **только переданный файл** с исходными строками этого prefix. Нужен доверенный операторский export/extraction pipeline; произвольные provider envelopes/общие stdout logs автоматически не разбираются. Источник/доставка/полнота/дубликаты не удостоверяются: во всех отчётах collectionCompleteness=not-established и scope=supplied-file/registered-route-handlers-only. Поддельный/повторённый файл не становится доказательством работы production.

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

## Проверка и границы

Unit tests проверяют allowlist/privacy, exact disabled behavior, Response/cookie/stream identity, exception identity без чтения свойств, clock/sink failures, cap/reset/rollback, mid-request disable, unknown status и позднюю ошибку stream после200. Python tests проверяют schemas/bounds/UTC/thresholds/unknown/capped/stale, CLI read-only и отсутствие input/path в ошибках.

Новый synthetic workflow запускает реальный production Next process дважды (off/stdout) с пустой provider configuration. Только loopback; redirects выключены, invalid/unauthenticated inputs и private canaries синтетические. Test preload запрещает non-loopback global fetch и проваливает smoke при попытке provider fetch; это тестовый guard, не production network sandbox. Проверяются все11 route labels, прежние400/401/403/503 guards, отсутствие canary в child output, OPTIONS coverage gap, bounded burst130 запросов и реальный file-only check/alert/inconclusive. Положительный check на401 headers намеренно **не** называется готовностью провайдера/приложения.

После review merge/deployment требуют отдельного разрешения. Нельзя включать режим в production без операторского решения об access/retention/budget/collection; можно откатить код/выключить флаг без удаления пользовательской БД. Старые файлы v1 сохраняются, не backfill в app data. Logs не входят в structured-v6/21-table app manifest и шесть user archive files; их резервирование/удаление — отдельный operator policy. Реальный Supabase restore/RPO/RTO, SMTP/recovery, own-model evaluation, hh.ru permissions, global capacity и финальная эксплуатационная приёмка остаются открытыми.

## Фактическая проверка кандидата
Runtime `d306aabfd9fa684d716b220cb09a85c9c66df695`: [operational smoke](https://github.com/kredavto/JobMatch-AI/actions/runs/41068381892), [application](https://github.com/kredavto/JobMatch-AI/actions/runs/41068382109), [structured/Python/native restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41068381883) SUCCESS; все9 workflow PASS.835 unit/79files,62 Python,213 browser PASS/2 live-account SKIP,76 worker.27 новых TS/15 Python unit и real Next two-process smoke;15 Python дополнительно локально PASS, Node/Next tests existing CI. Первоначальный Proxy-then fixture failure исправлен до полного прогона.18 runtime/test/workflow files immutable re-fetched/byte equality, Vercel preview status SUCCESS. Production config/collector/alerts не менялись. VERIFICATION.md содержит полный журнал и ограничения.
