# Bounded source-backed quote contract — кандидат PR #49

Опциональный source-lines-v1 ограничивает **происхождение цитат**, не доказывает понимание/квалификацию/истинность связи. Он не является принятой моделью, semantic verifier или разрешением production/PII. Дословные строки могут быть заголовками, не требованиями; допустимость цитаты не доказывает полноту извлечения или соответствие факта.

## Конфигурация и совместимость

JOBMATCH_AI_QUOTE_CONTRACT unset/empty/legacy сохраняет прежние requirements-evidence-v2 prompt и generic AiReviewSchema. Значение source-lines-v1 явно выбирает новый requirements-source-lines-v1 prompt и finite source quote grammar. Неизвестное значение даёт AI_NOT_CONFIGURED503 до provider access. AI_ENABLED/SELF_HOSTED/own endpoint/token/consent/auth/owner/revision/quotas по-прежнему обязательны. .env.example остаётся legacy и отдельно выключенным AI; production environment не меняется.

Старые AI_SYSTEM_PROMPT/AI_PROMPT_VERSION не переписаны, frozen SHA проверяется тестом по baseline #47. Corpus/gold остаются synthetic-ru-en-v1. Новый prompt дополняет инструкции полного подтверждения фактами и требует целые разрешённые строки, а не меняет старый режим. Public success envelope/API command/Ui consent не меняются; AI review остаётся несохранённой рекомендацией и не изменяет workspace/Score/резюме.

## Источник и границы

| Граница | Контракт |
| --- | --- |
| Исходник | Не более48000 UTF-8 bytes; длина проверяется до сканирования; invalid UTF16/C0 controls (кроме tab/line separators) отвергаются |
| Строки | CRLF, CR, LF, U+2028/U+2029; no joining |
| Кандидат | Вся trimmed непустая строка, prefix bullet сохраняется, внутренние пробелы/символы/Unicode normalization не меняются |
| Количество | До100 nonempty lines, включая отклонённые risky и повторённые |
| Размер цитаты | До2000 UTF16 units, согласовано с прежним AiReviewSchema; это не число graphemes |
| Output | Прежний max50 requirements, strict unknown-field/evidence bounds |
| Full provider request | До64000 UTF-8 bytes после включения schema/source quotes;48KB input profile/vacancy limit остаётся отдельно |

Overflow отвергает весь запрос; silent truncation/sample/fallback не делаются. Empty/whitespace/только risky source не становится успешным пустым model output. Неподходящие строки отсеиваются **тем же evidenceIssue**, что уже отвергал такие цитаты при validation: инструкции/отрицание/намерение требуют ручного review. Это conservative screening с возможными false positives; не семантическая оценка вакансии. Число исключённых строк сохраняется в локальном pool metadata, без отправки model/API нового персонального поля.

Каждая quote — точная непрерывная подстрока raw source. start/end — Unicode codepoint offsets, exclusive end. Trim только сдвигает границы вокруг внешнего whitespace, не переписывает текст. Одинаковые строки объединены в один quote enum value, **все** occurrences/spans сохранены. Не выдумывается уникальная позиция/«наиболее подходящий» occurrence. Visually equivalent NFC/NFD остаются различными; непросмотренные bidi/formatting/реальные документы и юридическая истинность не объявляются безопасными/подтверждёнными.

Factory строит JSON Schema из прежних strict requirement/evidence shapes, заменяя quote на конечный набор. Ни schema, ни pool не читают evaluation expected/gold. Model получает прежний vacancy/facts input (только eligible IDs/text), выбранный prompt и schema; spans/source labels не отправляются как дополнительные поля. Цитата из enum — не сертификат компетенции и не semantic match.

После model response прежние JSON/schema/provenance/evidence/duplicate guards выполняются в прежнем порядке; дополнительно каждая quote должна входить в exact source pool. Backend, игнорирующий grammar, не может вернуть произвольную in-source substring вместо всей allowed line. Отказ получает прежний generic AI_RESPONSE_INVALID502 и opt-in static citation stage. Никаких repair/подстановки quote/gold/добавления evidence/retry. Пустой ответ остаётся пустым и проваливает recall в evaluation. Links/compound/numbers/contradictions не считаются верными из-за source membership.

## Отказы и интерфейс

AI_SOURCE_QUOTES_LIMIT413: сократить количество/длину строк либо профиль для framed request.
AI_SOURCE_QUOTES_UNAVAILABLE422: проверить исходные требования, нет допустимых отдельных строк/некорректный source.

Коды имеют фиксированные RU/EN каталожные сообщения, без input/exception diagnostics. AI panel хранит semantic status key и показывает статическую source/large copy по422/413, не доверяет provider message, не сбрасывает consent и не повторяет request автоматически. Large copy теперь охватывает input и source framing limits; полный48KB threshold остаётся в API/catalog. Ключи locale/owner/revision/inflight не меняются. Новые source-refusals появляются только в явно выбранном сервером source-mode; общая413 copy подходит обоим режимам. Новая внешняя отправка/канал не включается.

## Versioned evaluation/CPU report

В legacy сохранены report schema1 (без diagnostics) и schema2 (stages-v1). Source-mode явно даёт schema3 + quoteContractVersion=source-lines-v1 и hash/version **фактически выбранного** prompt. Optional failure-stage contract остаётся ai-failure-stages-v1/16 bounded categories. Старый corpus/gold SHA не меняется.

CPU launcher выбирает source-mode только exact JOBMATCH_AI_CPU_QUOTE_CONTRACT=source-lines-v1; legacy/unset оставляет прежний путь. Workflow явно задаёт source-mode для нового диагностического run. Bridge whitelist по bundled inputs проверяет соответствующие каждому source request prompt/schema/options, не читает expected/gold и передаёт completion без исправления. Native guard tests не выдаются за модель.

Source-mode stdout prefix JOBMATCH_CPU_DIAGNOSTIC_V3 / format jobmatch-cpu-diagnostic-v3. Strict CPU validation требует schema3/source contract marker/согласованные stage counters/rows; v2 или неизвестный contract не становится V3 доказательством. Legacy V2/archive V1 сохранены. Identity-not-attested/not-accepted остаются независимо от улучшения protocol validity.

Run по тому же малому single-line-heavy synthetic gold **не измеряет чистую способность модели дословно цитировать**: valid quote vocabulary ограничен по построению. Сравнение с V1/V2 меняет prompt/schema и может менять CPU/binary; нельзя приписывать изменения числа passes модели или считать такой pass независимой held-out приёмкой. Нужны representative multi-line documents, independent judgments, semantic/operational evaluation и разрешённый собственный deployment.

## Проверки

Независимые source edge fixtures: Unicode codepoint offsets/emoji/CRLF и Unicode separators, repeated occurrences, NFC/NFD, BOM/NBSP, bullets/prototype-like text, risk lines, exact caps/overflow/ill-formed UTF16/C0/no silent truncation, full-request bound/no provider call. Native fixtures проверяют CLI schema3/new prompt hash/source grammar, gold vs empty vs ignored grammar, dynamic source bridge and stale V2 rejection.4 RU/EN mobile browser cases проверяют422/413 semantic copy/privacy/consent/no replay/no overflow. Это contract fixtures, не representative model-quality gold.

Локальная среда недоступна: local lint/build/tests/browser/model не заявляются. Реальные проверки и actual network-none CPU run выполняются existing GitHub Actions. Первый CI остановился до weights на ошибке скобок в schema construction; выражение разделено, повторный candidate проверяется отдельно. Никаких production SQL/config, персональных данных/SMTP/hh.ru/third-party inference, paid resources, merge/release.

## Фактический эксперимент
Actual source-mode V3 `ccdf1befb7efb393f65eaf2d2d73deaee0667a7d`: [run41089559296/job124179569037](https://github.com/kredavto/JobMatch-AI/actions/runs/41089559296), полный download/build/server-ready/evaluation/report действительно выполнен.28 backend stop responses/1372 generated tokens,0 transport failures. Schema3/source-lines-v1/requirements-source-lines-v1, complete28/28, **passed=false/exit2/not-accepted**,6 citation errors/16 graded mismatches/6 exact-gold passes (RU3/14,EN3/14). Все16 mismatches — по1 unsupported link против synthetic gold (не16 доказанных реальных семантических ошибок); missing/unexpected requirements/missing links у graded rows0. [Полный V3](https://github.com/kredavto/JobMatch-AI/blob/feat/source-bounded-ai-quotes-20261030/evaluation/results/20261030-qwen-source-quotes.md). Weights/source/settings/corpus прежние, CPU/binary совпали с V2, но prompt/schema изменились: рост passes не является самостоятельным улучшением модели или independent held-out acceptance. Quote vocabulary ограничен по построению,6 citation label не различают exact/trim/duplicate/risk/member guard.
Runtime `ccdf1befb7efb393f65eaf2d2d73deaee0667a7d`: [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/41089559310), [English ordinary version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41089559227), [Consent receipt protocol (synthetic)](https://github.com/kredavto/JobMatch-AI/actions/runs/41089559138), [AI evaluation harness (synthetic HTTP only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41089559268), [English structured version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41089559142), [Isolated document parser](https://github.com/kredavto/JobMatch-AI/actions/runs/41089559358), [Structured profile acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41089559198), [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/41089559223), [Pinned CPU model diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41089559296) SUCCESS; все9 workflow PASS.888 unit/82files (+18),25 Node evaluator/CPU (+4),84 Python,lint/types/build PASS;217 browser (+4)/2 live-account SKIP;76 worker PASS.4 mobile RU/EN source422/413/no-private-message/consent/no-replay/no-overflow cases реально PASS. Existing actual Next smoke и structured PostgreSQL/21-table synthetic restore regressions PASS; legacy restore workflow не запускался. Vercel runtime preview SUCCESS.14 runtime/test/workflow files immutable re-fetched/byte equality. Локальная среда недоступна, local tests/build/model/browser не заявляются.
