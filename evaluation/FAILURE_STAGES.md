# Безопасные категории отказов AI evaluation — кандидат PR #48

Цель — локализовать generic errors реального CPU-эксперимента #47 без сохранения prompts/facts/raw completions/exception diagnostics и без подмены semantic acceptance. В #47 получены28 backend stop responses,19 неклассифицированных errors,7 graded mismatches и2 exact-gold passes; [исторический отчёт](results/20261030-qwen-cpu.md) не переписывается.

## Что меняется

aiReview и validateAiReview принимают необязательный callback, получающий **только один static stage label при отказе**. Обычные API handlers не передают его. Нет console/file/network sink, БД, нового endpoint/флага приложения или дополнительного API response field. Observer принимает allowlist, неизвестное превращает в unknown; exception/request/model data в callback не передаются. Падающий callback подавляется, без retry/изменения результата. До provider access config/input ошибки выбрасываются прежним объектом; публичные AI_DISABLED/AI_INPUT_REQUIRED/AI_INPUT_TOO_LARGE/AI_RESPONSE_INVALID/AI_TIMEOUT, сообщения и статусы не изменены. Классификация user-cancel vs owned timeout остаётся только в opt-in evaluator report.

JSON/schema/provenance проверки выполняются в прежнем порядке, без repair/нормализации/ослабления. AiReviewSchema остаётся strict. Точные quote/source/evidence/fact eligibility guards сохранены. Byte equality request body с/без observer проверяется тестом. Успешный вызов не выдаёт failure stage; graded gold mismatch не считается protocol error.

| Stage | Место отказа, не вывод о семантике |
| --- | --- |
| configuration / input | Настройка или обязательные/bounded входы до fetch |
| transport | Ожидание fetch до Response |
| http-status-or-type | Неподходящий HTTP status или Content-Type |
| body-read | Чтение/bounds/deadline тела; точная причина не утверждается |
| envelope-json | UTF-8 decode или JSON parse внешнего envelope |
| envelope-schema | Schema done/message/stop внешнего envelope |
| content-json | JSON parse message.content |
| review-schema | Строгая schema requirements/quote/evidence_ids |
| citation | Цитата не проходит прежний exact/trim/duplicate/evidenceIssue guard |
| evidence | Повтор/неуникальный/недопустимый ID в прежнем eligible set |
| review-validation | Другой отказ внутри review validation, без догадки по exception |
| cancelled / timeout | AbortSignal caller / owned20s controller; не анализ cancel reason |
| grading-validation | Invoke завершён, но локальное gradeReview не принимает результат |
| unknown | Отсутствующий/неверный/падающий diagnostic source; не успешный нулевой результат |

Labels описывают ветвь выполнения. citation/evidence не доказывают ложность/истинность навыка; body-read не различает сетевой обрыв/размер/внутренний deadline. Нельзя объявить19 прежних generic errors конкретными семантическими ошибками по новым названиям без нового прогона.

## Versioned CLI contract

Без JOBMATCH_AI_EVAL_DIAGNOSTICS либо с unset/empty/off сохраняется **schemaVersion1**, без failureStage/diagnosticFormat/failureStageCounts. Явный JOBMATCH_AI_EVAL_DIAGNOSTICS=stages-v1 даёт schemaVersion2/diagnosticFormat=ai-failure-stages-v1. Неизвестное значение отвергается до endpoint access с generic stderr/exit2, без вывода значения.

```sh
JOBMATCH_AI_EVAL_DIAGNOSTICS=stages-v1 npm run evaluate:ai --silent
```

Это только дополнительный режим ранее разрешённого own-endpoint synthetic evaluation; approval/digest/ownership/cost/PII ограничения из [README](README.md) остаются обязательны. Флаг не включает app AI, не разрешает third-party LLM или неизвестный endpoint и не удостоверяет operator approval.

В v2 только error rows содержат failureStage; все16 fixed categories явно представлены в failureStageCounts с целыми counters. Значения суммируются до errors, не до всех кейсов. Успешные и graded-mismatch rows не имеют stage, их missing/unsupported links и requirements counters остаются отдельно. Observer отсутствует/падает/возвращает неизвестный label — unknown/error сохраняется, не empty pass. SIGINT/SIGTERM прекращает дальнейшие calls и оставляет incomplete/exit2. Как и раньше: exit0 только все exact synthetic gold passed; exit1 complete gold mismatches; exit2 refused/error/incomplete. Ни один код не является product/model acceptance.

## CPU report v2

CPU launcher явно включает stages-v1; stdout framing JOBMATCH_CPU_DIAGNOSTIC_V2 и format=jobmatch-cpu-diagnostic-v2 отличают его от архива V1. Перед report проверяются schema2/format, exact16 stage keys/bounded integer counts,28 rows, обязательный stage только error rows и равенство по каждой категории/общему errors. Несогласованный/старый report отвергается, не исправляется.

Weights/source revision/context/threads/seed/temperature/JSON grammar, корпус/gold и prompt не меняются. Network-none/readonly/non-root/resource limits и generic public errors также сохраняются. Реальный model run записывается отдельно от scripted HTTP tests; docs-only head не запускает повторную inference и не называется новым модельным доказательством. Прежний report V1 остаётся читаемым архивом; новые readers должны явно поддерживать v2.

ModelIdentityVerified/deploymentIdentityVerified=false и acceptance=not-accepted сохраняются. Source/file/process binding не заменяет remote loaded-weight attestation. Сравнение двух малых synthetic runs не является независимым held-out исследованием, representative RU/EN качеством, cross-CPU reproducibility или разрешением production/PII. Изменения результатов нельзя приписать только instrumented code без учёта CPU/toolchain; точные hashes/runtime metadata сохраняются.

## Проверки

23 новых Vitest cases: все failure branches, proxy exception с запрещёнными getters, before-fetch config/input, caller cancel/owned timeout, sink failure/unknown stage, byte-identical request/valid result и отсутствие metadata в default evaluation.4 новых Node cases:7-path real loopback fixture v2 + v1 off compatibility, invalid mode before access, cancellation/incomplete, строгая coherence CPU counters/rows. Это **scripted transport fixtures**, не модель.

Три изменённых/новых JS test files прошли local node --check; compiled/unit/browser/реальная inference проверяются existing CI. 10 runtime/test files re-fetched по immutable SHA, equality; production SQL/config, почта, hh.ru, paid infrastructure, deployment/merge/release не меняются.

## Фактический кандидат
Actual CPU runtime `eb9a270a6eef7bdb40cb2f9807abff971bec7307`: [run41083923716/job124159961864](https://github.com/kredavto/JobMatch-AI/actions/runs/41083923716), все download/build/start/evaluate/report phases реально выполнены.28 backend stop responses/1413 generated tokens,0 transport failures; evaluator schema2 complete28/28, **passed=false/exit2**,18 errors все citation,0 unknown/прочих stage errors,8 graded mismatches,2 exact-gold passes (RU0/14,EN2/14). [Полный V2/сравнение](https://github.com/kredavto/JobMatch-AI/blob/feat/ai-evaluation-failure-stages-20261030/evaluation/results/20261030-qwen-cpu-stages.md). Prompt/corpus hashes и все model/source/settings pins совпадают с #47; old19 generic errors не переименовываются ретроспективно. Только ru-level-insufficient изменился error→graded-failed; число passes осталось2. CPU AMD EPYC7763→EPYC9V45, binary hash различается:18 vs19 не объявляется причинным улучшением. Все counts/rows coherent; identity verified=false и not-accepted сохранены.
Runtime `eb9a270a6eef7bdb40cb2f9807abff971bec7307`: [English structured version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41083923947), [English ordinary version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41083923868), [Isolated document parser](https://github.com/kredavto/JobMatch-AI/actions/runs/41083923723), [AI evaluation harness (synthetic HTTP only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41083923505), [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/41083923621), [Consent receipt protocol (synthetic)](https://github.com/kredavto/JobMatch-AI/actions/runs/41083923707), [Pinned CPU model diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41083923716), [Structured profile acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41083923506), [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/41083923625) SUCCESS; все9 workflow PASS.870 unit/81files (+23),21 Node evaluator/CPU harness (+4),84 Python,lint/types/build PASS;213 browser PASS/2 live-account SKIP;76 worker PASS. Existing real Next loopback guard/telemetry smoke и structured PostgreSQL/21-table synthetic restore regressions PASS; отдельный legacy restore workflow не затрагивался/не запускался.10 runtime files immutable re-fetched/equality; local node --check трёх JS files PASS, local compiled/unit/browser/model не заявляются.

## Source-mode schema3 compatibility — #49
Source-lines-v1 adds a separately versioned prompt/quote constraint and report3/quoteContractVersion. Stage format/categories remain the same; a quote outside its exact allowed whole-line pool maps to citation after the existing validation checks. Input/pool/framed-byte refusals remain input failures before provider access. CPU validates report schema against the explicitly selected contract; legacy schema2 and archived generic failures are not relabelled. See SOURCE_QUOTES.md. A different prompt/schema/CPU experiment cannot establish causal model-quality improvement.

## Audit schema4 compatibility — #50
Opt-in link audit adds schema4 while retaining the same static stage format and original error/grade semantics. Only validated reviews can be audited; provider/source/evidence failures have unavailable audit coverage with null notes/counts and no-validated-review reason, not zero successful warnings. CPU validates complete stage counts and a separate strict audit summary. Audit failure does not rewrite model output or the original grading. See LINK_AUDIT.md; source quote mode and stage observers remain independently configured.
