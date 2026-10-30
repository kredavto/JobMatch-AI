# Безопасность и эксплуатационные ограничения

## Реализованные границы
- Вход Supabase Auth; пароли hh.ru никогда не собираются.
- HttpOnly SameSite=Strict cookies, Secure при HTTPS, серверная проверка токена.
- Политики RLS по auth.uid, owner фильтры на сервере; user_id не берется из тела запроса.
- CSRF: проверка Origin для POST. XSS: React экранирование, нет dangerouslySetInnerHTML; CSP, nosniff, frame DENY.
- SSRF: URL вакансии только https://hh.ru/vacancy/<digits>; сеть по пользовательскому URL не вызывается.
- Вакансия — текст для чистых правил, не программа и не инструкции модели.
- Evidence gate принимает только дословное совпадение с подтвержденным фактом. Непроверенные строки не повышают score.
- Optimistic concurrency, транзакционные изменения и снимки версий.
- Импорт: расширения/сигнатуры, лимиты размера/страниц/текста, исходные файлы не сохраняются.
- Экспорт CSV экранирует формулы; удаление аккаунта и данных, журнал без резюме.
- Publishable key не является секретом и безопасен только вместе с RLS; service_role отсутствует.

## До публичного коммерческого запуска
Провести юридическую оценку размещения персональных данных: текущая инфраструктура Vercel + Supabase Германия НЕ подтверждает выполнение требований локализации для граждан РФ. Не считать checkbox заменой правового основания, договора и политики оператора.
Настроить собственный SMTP, Site URL, email verification, recovery, политики паролей и anti-abuse. Для авторизованных endpoint приложения действуют PostgreSQL-квоты. In-memory limiter остается дополнительной защитой; для неавторизованных запросов нужны WAF/централизованный anti-abuse, помимо лимитов Supabase Auth. Квоты приложения не заменяют лимиты самого PostgREST: прямой владелец сохраняет доступ к своим строкам через RLS.
Изолировать парсеры документов в ограниченном worker, провести fuzzing и malware scanning. Шифрование резервных копий, retention, уничтожение, мониторинг, восстановление и incident response требуют настройки провайдера.
CSP допускает inline scripts для Next; перейти на nonce-based CSP при hardening. Добавить идемпотентные ключи, MFA и penetration test. Не обещать полное WCAG AA без независимого аудита.

## Правило подключения AI/HH
Никакой передачи hh.ru данных внешнему LLM по умолчанию. Будущий self-hosted inference требует отдельного развертывания, оценки модели и тестов prompt injection/галлюцинаций. HH write остается недоступным до новой проверки официального контракта.

## Hardening 0.2
Входящий поток читается с лимитом байтов (включая chunked); multipart ограничен 4,1 МБ, файл 4 МБ. DOCX: максимум 1000 записей, 20 МБ общей распаковки, 8 МБ на запись, проверка фактически распакованных байтов и структуры, запрет макросов/шифрования/traversal. Это защита формата, а не антивирус и не изолированная песочница. PDF ограничен 30 страницами, 100000 символами; таймер 15с кооперативный, не гарантирует прерывание синхронного CPU-кода. Ограничение Vercel функции остается 30с.

Квоты хранятся в private.request_quotas, без прямых grants и без RLS policies: deny-all намеренно. Узкая private SECURITY DEFINER функция проверяет auth.uid и активную сессию; принимает только имя фиксированного bucket, не принимает owner/limit/reset. Публичный wrapper — invoker. Информационный advisor `RLS Enabled No Policy` на этой закрытой таблице ожидаем и не требует открытия доступа. Счетчики удаляются каскадно с аккаунтом.


## История фактов (0.3)
`public.fact_history` хранит id, user_id (FK auth.users, ON DELETE CASCADE), workspace_revision, kind (baseline/change), facts JSONB, captured_at. Это независимая таблица снимков; текущая модель workspace пока не полностью нормализована. AFTER-триггер в private использует узкое SECURITY DEFINER для append-only записи, проверяет auth.uid и активную сессию. История создается атомарно при изменении массива facts; неизмененные факты не дают лишнего снимка. RLS позволяет только SELECT владельцу с активной сессией; клиентские INSERT/UPDATE/DELETE запрещены grants. Администратор БД по-прежнему обладает привилегиями — это не криптографический журнал.

Начальные записи baseline означают дату фиксации состояния, не время подтверждения. `/api/fact-history` читает по 20 снимков с курсором id; `?export=1` передает NDJSON по страницам. Последняя запись `{"complete":true}` подтверждает полное завершение; при прерывании/таймауте файл нужно скачать повторно. JSON-экспорт профиля содержит ссылку на отдельный экспорт истории. Для полного архива нужны оба файла. История хранится до удаления аккаунта; автоматического сокращения срока хранения пока нет. На время экспорта новые снимки после начала не включаются.


## Реляционный слой (0.4)
RLS и SELECT grants действуют на всех четырех новых таблицах; проверяются auth.uid и активная auth.session. INSERT/UPDATE/DELETE и внутренний project_workspace для authenticated/anon запрещены. FK user_id+resume_version_id исключает связь отклика с версией другого владельца. Триггер проверяет владельца и сессию перед повышением привилегий; search_path пустой. Проверены FK rollback вместе с историей, отсутствие доступа после отзыва сессии и каскадное удаление. Полномочия администратора БД сохраняются. Старый direct workspace API пока существует как совместимый путь записи и не заменяет прикладную проверку фактов; полное закрытие этого пути запланировано для contract-этапа.


## Усиление записи (0.5)
Прямые клиентские INSERT/UPDATE/DELETE workspace, audit_log и consent_records закрыты; старые политики сами по себе не дают DML grants. SELECT проверяет активную сессию. RPC использует только auth.uid, не принимает чужой user_id. Неподходящее действие/изменение возвращает безопасную ошибку INVALID_WRITE без текста SQL. Импорт допускает только unverified; verify не может поменять текст/источник; сохраненные версии не переписываются. Для новой версии проверяются verified evidence_ids, точный snapshot текущих фактов, profile_revision и текст перестановки (включая CRLF и JS whitespace). Restore обязан совпадать с исходной версией. История событий отклика дополняется без редактирования старых событий.

Граница защищает целостность пользовательских утверждений, не доказывает их истинность. Match Score и семантическая релевантность вычисляются серверным engine и не пересчитываются SQL-валидатором. Владелец может вызвать разрешенный RPC напрямую с собственной сессией; прикладные квоты не заменяют ограничения Data API. Удаление аккаунта остается отдельным owner-only RPC. Требуется дальнейшая защита от злоупотреблений публичным Auth/Data API.

Advisor также сообщает Leaked Password Protection Disabled: настройка пока не включена; https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . INFO private.request_quotas без RLS-политик остается намеренным deny-all.


## PWA и офлайн (0.6)
Service worker имеет фиксированный allowlist: /offline.html, /icon.svg, /icon-192.png, /icon-512.png. Install получает их с credentials: omit. Успешные navigation responses не записываются в Cache Storage и запрашиваются с cache: no-store. Навигация только на / при сетевой ошибке получает generic offline HTML; /api/**, POST, чужие origin, Next.js chunks и URL статических файлов с query не перехватываются. Нет Cache.put для динамических данных, IndexedDB/localStorage, background sync или очереди mutations. API сохраняет Cache-Control: no-store.

Cache очистка ограничена префиксом jobmatch-public-. При изменении публичных офлайн-ресурсов обновляйте версию кеша в sw.js. Worker обновляется без HTTP-кеширования, не перезагружает открытую страницу и не отправляет формы. При удаленном/недоступном Cache Storage навигация получает минимальный текстовый 503. Это не гарантия отсутствия данных в скачанных пользователем файлах, памяти открытой вкладки, расширениях или системных снимках экрана.

## Защита от смены аккаунта при чтении (0.16)
История и импорт принимают optional `x-jobmatch-owner`; загрузка NDJSON использует `expectedOwnerId` в URL (UUID, не секрет и не credential). Все переданные значения должны совпадать с identity текущей сессии. Несовпадение — 409 до чтения истории/тела файла; malformed UUID — 400. Проверяются и повторные query-параметры. Отсутствие hint сохраняет совместимость, но не отменяет auth/RLS. Уже начатый ответ относится к проверенной сессии запроса; глобальная отмена при смене cookies не реализована.

## Проверка evidence (0.19)
`evidenceIssue` — общий консервативный фильтр целой строки: возможные инструкции, русские/английские отрицания и планы обучения. Подтвержденная, но исключенная строка с термином требования блокирует положительное сопоставление этого требования (unknown, confidence 0, без evidence_ids), в том числе при конфликте с другой положительной строкой. Несвязанные навыки не блокируются. Предложения и gate используют тот же фильтр, письма получают факты через propose/gate. Отрицания в требованиях проверяются до точного сопоставления. Это не полная семантическая проверка и не защита от всех prompt injection: модели и выполнение инструкций из текста отсутствуют. Широкие английские отрицания и проверка целой строки могут исключать допустимые формулировки; интерфейс предлагает уточнить/разделить утверждения. Правила уточнены в рамках протокола rules-v1; исторические версии и сохраненные баллы неизменны, повторный анализ использует текущие правила.

## Календарный экспорт (0.22)
ICS формируется в браузере по RFC 5545 (https://www.rfc-editor.org/rfc/rfc5545), разделы 3.1, 3.3.11, 3.6.1, 3.6.6. UTC DTSTART/DTEND/DTSTAMP, UUID UID, CRLF, folding до 75 UTF-8 октетов без разрыва символа, escaping TEXT и удаление управляющих символов. Только VEVENT и optional DISPLAY VALARM; нет ATTENDEE, ORGANIZER, METHOD, email или загрузки внешних ресурсов. CLASS:PRIVATE — пометка календаря, не шифрование. Файл содержит название выбранной вакансии и ручное описание; пользователь сам решает, куда импортировать. UID стабилен при повторном скачивании неизмененного черновика; после изменения создается новый, календарь может создавать дубликаты. Местное время проверяется обратным сравнением компонентов (включая DST-пропуски); повторяющееся осеннее время разрешается Date браузера, UTC явно показан до скачивания. Реальные календарные клиенты и доставки уведомлений отдельно не проверены.

## Ошибки refresh (0.23)
Коды `session_expired`, `session_not_found` для Auth и `refresh_token_not_found`, `refresh_token_already_used` только для refresh grant при 400/422 означают AUTH. Проверены по https://supabase.com/docs/guides/auth/debugging/error-codes и https://supabase.com/docs/guides/auth/sessions. Тексты провайдера не анализируются и не раскрываются. 5xx имеют приоритет над телом и возвращаются как 503; 429 — RATE. При ручной загрузке с черновиком refresh включает expectedOwnerId, сервер проверяет новую identity до установки cookies. При несоответствии — повторный вход; очистка/отзыв чужой сессии не выполняется. Неизвестные коды остаются безопасной общей ошибкой. Механизм не решает все гонки refresh между вкладками и не заменяет живые межустройственные тесты.

### DOCX import envelope (0.27)
ZIP validation rejects ambiguous normalized names, file/directory collisions, symlinks, encoded traversal-like segments, controls, and conventional embedded-object/ActiveX/VBA paths before Mammoth. Case folding and Unicode NFC intentionally reject some otherwise distinct ZIP entries. Backslash names are rejected with yauzl strictFileNames. This is defense in depth, not malware detection or a sandbox: content types/relationships are not exhaustively classified, and relocated/disguised parts are not claimed detected. Existing byte/count/inflation bounds remain; parser isolation and hard CPU limits remain roadmap items. Ordinary image parts remain accepted. No upload is automatically saved or confirmed as a fact.

### Request body deadline (0.28)
Both JSON actions and multipart upload use a 15-second total read deadline. Abort and timeout discard partial data and cancel the reader without awaiting a potentially stalled cancel hook. Cancel rejections are handled, read failures are redacted, and timers/listeners/reader locks are cleaned up. Tests cover abort racing with an already queued chunk. This application-level cooperative deadline begins after preceding handler work; upstream buffering, event-loop blocking, parser execution and ingress anti-abuse remain separate concerns.

### PDF lifecycle (0.29)
An explicit 15-second cooperative deadline covers loading-task and asynchronous text extraction, followed by at most one second waiting for destroy. Cleanup is requested exactly once and its rejections are handled without overwriting the extraction result. Continuations check expiration between page operations. This does not forcibly terminate CPU work or guarantee resource reclamation if PDF.js destroy hangs; module import/native initialization is outside the deadline. This describes the historical in-process path. Isolated parser/OCR/scanner candidates in PR #11–#14 add hard process/container limits; deployment/capacity/live acceptance and operator activation remain separate (docs/ANTIVIRUS_OPERATIONS.md).

## Candidate operational telemetry (PR #45)
Default-off JOBMATCH_OPS_TELEMETRY=stdout observes only registered route-handler returns/throws using a fixed route/method/status/duration-bucket schema. It reads no request/error payloads, IDs, headers/cookies or bodies and never consumes response streams. One realm has at most60 observation lines plus one explicit coverage-capped marker per UTC minute; scaling/restarts do not create a global budget or establish coverage. Logging/clock failures preserve the original response/error. This is not rate limiting, signed delivery, full availability, stream completion or legal anonymity. File reports always say collectionCompleteness=not-established; stale/unknown/capped/insufficient data cannot pass explicit checks. Framework/provider logs still need independent privacy review. Access/retention/budget/collector activation, trusted export provenance and external alert delivery remain operator gates. See docs/OPERATIONS_MONITORING.md; no production activation occurs here.


### Server-stream terminal observations (candidate PR #46)
The same default-off flag and shared realm60+marker budget now cover three existing NDJSON source helpers. A separate strict jobmatch-ops-stream-v1 schema contains only static route/GET, UTC minute, coarse duration and completion-enqueued/incomplete-enqueued/cancelled. No body, identifiers, counts, error or cancel reason reaches the observer. Completion describes enqueue+close of the source, never client delivery; process death, non-consumption and log loss remain unmeasured. One terminal callback cannot retry or duplicate after cap/sink failure. Mixed-file header checks refuse unassessed stream outcomes; explicit stream checks remain file/terminal-scope only, with clientDelivery and collectionCompleteness not-established. Upgrade the reader before activation; old readers fail closed on the new format. Existing operator activation/access/retention/budget/collector gates remain. No production activation, external alert or Supabase schema change occurs.


### CI-only real CPU model diagnostic (candidate PR #47)
The optional diagnostic downloads a single fixed public GGUF revision after exact pointer/size/SHA256/license checks, builds pinned llama.cpp source and executes only the bundled synthetic corpus. Inference runs in a read-only, network-none, non-root, capability-free Docker container with explicit CPU/memory/PID/time limits; no production credentials, user files, registry publication or external inference API. The loopback transport bridge authorizes exact bundled inputs/schema/options, has finite case multiplicity and passes raw model content without repair/gold fallback/retry. Safe reports retain counters/hashes/grades, not prompts/facts/raw completions/provider diagnostics. A completed diagnostic is not quality acceptance: acceptance=not-accepted, modelIdentityVerified/deploymentIdentityVerified=false. File hash + owned-process configuration is not remote loaded-weight attestation. The standard runner is free only under the verified public-repository conditions; private/fork scope refuses the job, no model cache/artifact upload is introduced. Source/weights are pinned; base image/toolchain and cross-CPU determinism are not claimed reproducible. CI scope errors fail closed, and a docs-only skip must never be reported as a fresh model run. See evaluation/cpu/README.md.


### Opt-in static evaluation failure locations (candidate PR #48)
AI provider/review validators expose an optional failure callback containing only one allowlisted static location, never exception/request/content/IDs. Production handlers do not install it. Callback errors are ignored without retries or weakened validation; original public codes/status/messages and request bytes remain. Explicit CLI stages-v1 emits a separately versioned error-only report and finite stage counters; v1 remains default. Labels describe locations, not semantic truth or precise root cause. No model output, prompt, fact, exception property or diagnostic credential reaches a sink/report. CPU v2 rejects inconsistent stage/row/count metadata and preserves not-accepted/identity-not-attested status; docs-only skips are not new inference. No app telemetry/SQL/production configuration or external processing is enabled. See evaluation/FAILURE_STAGES.md.
