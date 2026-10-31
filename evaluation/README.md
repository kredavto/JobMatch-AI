# RU/EN evaluation of the optional self-hosted requirement linker

The original PR #16 adds a runnable evaluation harness, **not a verified model**: its fixture job calls a scripted loopback HTTP server only. PR #47 adds a separately guarded actual local CPU diagnostic on pinned public weights and the same synthetic corpus; see [cpu/README.md](cpu/README.md) and the immutable execution report. Scripted fixture success and actual model quality remain separate. Neither job receives production inference credentials or personal data. SMTP, Supabase and hh.ru are not called.

## What is measured

`synthetic-ru-en-v1` has 28 hand-authored synthetic cases, 14 per language: supported/irrelevant evidence, unverified facts, negation, intention, sufficient/insufficient duration, levels, numbers, complete/incomplete compound claims, contradictions, fact and vacancy injection. There are no real names, resumes or account IDs. Production `eligibleAiFacts` filtering still applies: cases with excluded facts measure the complete pipeline, not the model's ability to recognize facts it never received.

The production prompt `requirements-evidence-v2` asks for IDs that substantiate the **whole** quotation; shared keywords cannot establish duration, level, quantity or every component. This strengthens instructions only. The existing exact quote/ID validator still proves provenance, **not** semantic truth. The result remains a manually reviewed suggestion and cannot write workspace/score/resume data.

Every expected requirement must be returned with its exact gold quote and unordered exact set of IDs. Empty output fails recall; extra quotes, missing requirements, missing links and unsupported links are counted independently. Invalid/provenance/provider responses are errors, never successful empty results. Overall pass requires every case, no errors and no interruption. This intentionally strict smoke set can reject reasonable alternative quote boundaries. It is small, synthetic, not representative, independent or sufficient for deployment acceptance. Do not tune against it and present its pass rate as a real-world metric. Extend and review held-out representative RU/EN judgments with the operator before acceptance.

## Tests without a model

```
npm run test:ai-evaluation
npm test
```

The first compiles the CLI and uses a real local HTTP server that returns scripted gold, empty or error responses. It verifies success/quality/operational exit codes and safe reports. These are **harness tests**, not live inference or semantic evaluation results.

## Operator-configured deployment run (separate from CI diagnostic)

Use the approved **own** inference endpoint and model under the same configuration as the application. Do not point this command at a hosted third-party LLM. Agree cost/resources, hosting, logging and processing boundaries first. No infrastructure is created and no environment variables are changed by the CLI. The flags do not establish endpoint ownership or authorization; those remain operator assertions.

Set `JOBMATCH_AI_ENABLED=true`, `JOBMATCH_AI_SELF_HOSTED=true`, `JOBMATCH_AI_ENDPOINT`, `JOBMATCH_AI_MODEL` and the gateway token using the operator's secret environment. Existing `aiConfig` requires HTTPS/token in production; HTTP loopback is allowed only outside production. Redirects, response/byte/deadline limits, structured JSON and filtering are identical to the application.

Additionally require `JOBMATCH_AI_EVAL_APPROVED=true` and `JOBMATCH_AI_EVAL_MODEL_REVISION=sha256:<64 lowercase hex characters>` from the locally deployed model manifest. Then:

```
npm run evaluate:ai --silent
```

Only bundled synthetic corpus data is sent, sequentially once per case with no retries. Up to 28 calls, 20 seconds per request, 10-minute run cap. SIGINT/SIGTERM cancel the current request and prevent subsequent calls. No user-supplied corpus/file/URL is accepted. Configuration failure exits 2 before requests. Do not automatically enable application AI based on this command.

The single JSON stdout report contains corpus/prompt versions and SHA-256, configured model and **operator-declared** digest, timestamps, per-case counters/errors and durations. `modelIdentityVerified:false` is deliberate: `/api/chat` does not authenticate the actual loaded weight digest. Endpoint/token/prompts/facts/raw outputs/provider diagnostics are omitted. Run in a controlled clean checkout and retain commit/image digest alongside the report; prompt/corpus hashes alone do not identify all provider/harness code or prove reproducibility. Two runs with the same model name are not necessarily the same model. Do not put credentials in model names.

Exit codes: 0 = all exact synthetic judgments passed; 1 = complete execution with quality mismatches; 2 = refused/configuration/provider/contract/interrupted run. Even exit 0 does not satisfy real model acceptance. Deployment identity, independent held-out evaluation, reproducibility, operational limits, manual review and representative documents remain open.

## Optional safe failure-stage report v2 — candidate PR #48
The default report stays schemaVersion1. Explicit JOBMATCH_AI_EVAL_DIAGNOSTICS=stages-v1 requests schemaVersion2 with static error-only failureStage/failureStageCounts; unknown modes refuse before endpoint access. Generic public errors, actual request bytes, provenance validation, approval/digest and exit semantics stay unchanged. See [FAILURE_STAGES.md](FAILURE_STAGES.md). The CPU launcher opts in and emits JOBMATCH_CPU_DIAGNOSTIC_V2/jobmatch-cpu-diagnostic-v2, with strict count/row coherence checks. V1 archived measurements are retained. A stage describes failure location, not semantic correctness or model acceptance.

## Optional bounded source quotes — candidate PR #49
JOBMATCH_AI_QUOTE_CONTRACT=source-lines-v1 explicitly selects a distinct source-line prompt/grammar and report schema3 with quoteContractVersion and the selected prompt hash. Legacy v1/v2/default/prompt exports remain intact. Source membership is enforced after response even when a backend ignores grammar; evidence/semantic completeness are not established by finite quote choices. See [SOURCE_QUOTES.md](SOURCE_QUOTES.md). CPU uses a separately labelled V3 actual experiment; a higher fixed-corpus pass count cannot be called model improvement or independent held-out acceptance. Production mode is not enabled.

## Optional conservative link audit — candidate PR #50
Explicit JOBMATCH_AI_EVAL_LINK_AUDIT=literal-quantities-v1 adds report schema4 with safe per-link indices/codes and observed/unavailable coverage. Default/off preserves prior schemas. Audit runs after validation and never changes requests, review content, gold or exit/grading semantics. Unavailable counts are null; no-rule-warning is not semantic support. See [LINK_AUDIT.md](LINK_AUDIT.md). CPU opts in separately with JOBMATCH_AI_CPU_LINK_AUDIT and a V4 label, retaining source-lines-v1. Archived real CPU measurements remain separate from HTTP fixture tests and independent model acceptance.

## Controlled real CPU comparison — candidate PR #55
Two exact reviewed model slots preserve the baseline default and add Qwen2.5-1.5B Q8. One standard public CI job builds a single image/binary and executes baseline then candidate with unchanged source-lines-v1 corpus/prompt/gold/settings in network-none containers. The new strict comparison requires full physical-response and report consistency, equal reported runtime/image/binary and sequential execution; it does not attest a remote deployment. Scripted harness tests remain separate. Both models and even an all-passing comparison remain not-accepted. See [CPU_COMPARISON.md](CPU_COMPARISON.md) and the [immutable execution evidence](results/20261031-qwen-controlled-comparison.md). Model/provider acceptance, independent held-out judgments and general free-text/semantic rewriting remain open.

## Separate free-text profile task — candidate PR #56

A distinct known12-case/6RU+6EN synthetic profile corpus tests exact kind/paragraph/literal-field record sets. The existing28-case linker inputs/gold/prompt are unchanged. Profile filtering cases measure the pipeline, not detection of text excluded before inference. Empty replies fail positive recall and extra neutral records fail gold; alternative reasonable field choices can fail this strict smoke. Native scripted HTTP/gold tests are harness checks, not model results.

The same pinned public CPU image now runs both existing models on this separate task in two additional network-none containers, with identical resources/sampling and a distinct PROFILE_CPU_DIAGNOSTIC_V1 report. File hashes/owned process binding are not remote attestation. Both actual model runs completed12/12 but passed only2neutral cases each; no positive extraction case passed. Failures/mismatches remain visible, acceptance=not-accepted. No production profile feature is enabled. [Contract](../docs/AI_PROFILE_PREVIEW.md), [all original actual reports and unchanged request hashes](results/20261031-profile-extraction-cpu.md). Docs-only final scope skips all four inference steps, not a fresh evaluation. Durable accepted-AI provenance/semantic rewriting/independent held-out remain open.


Separate candidate PR #57 adds a third immutable official7B Q3_K_M with an8GiB public-standard-runner budget and target-filesystem preflight. Both actual runs remain backend-incomplete and not-accepted: linker27/28responses/13passes; profile11/12responses/4passes (only2positive EN). Existing two-model strict comparer remains unchanged/not-comparable. [Contract](LARGER_CPU_DIAGNOSTIC.md), [full original7B evidence](results/20261031-qwen-7b-cpu.md). No independent semantic/deployment acceptance, paid infrastructure or production activation.
