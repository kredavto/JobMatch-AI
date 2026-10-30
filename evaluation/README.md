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
