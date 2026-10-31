# Actual free-text profile CPU experiments — 31 October 2026, PR #56

Both real runs, including the first overall operational-smoke failure, are retained. Scripted gold/HTTP tests are harness verification, not model evidence. **No positive extraction case passed exact gold in either model/run.** The two passes per model are `ru-profile-neutral` and `en-profile-neutral`, each expecting no records. No model is accepted or enabled in production.

[Contract](../../docs/AI_PROFILE_PREVIEW.md). Known fictional corpus `synthetic-profile-ru-en-v1`,12cases/6 per language, four record kinds plus pipeline-filtered context and neutral text. Exact record sets can reject reasonable alternative field boundaries/choices. Excluded paragraphs are not sent to inference: those cases measure pipeline filtering, not model negation/injection understanding. This is not representative or independent held-out, semantic adjudication, operational capacity or production acceptance.

## First executable run

Runtime `ff13b4d8384ee5255b52d98fe649d2a6337a48a2`, [CPU41196910615/job124524819957](https://github.com/kredavto/JobMatch-AI/actions/runs/41196910615). Both exact downloads/license/SHA checks, one actual image/binary build, all four network-none model containers (linker baseline/candidate, profile baseline/candidate) and owned cleanup actually completed. CPU job SUCCESS; overall CI had an unrelated [operational smoke FAILURE41196910565](https://github.com/kredavto/JobMatch-AI/actions/runs/41196910565): the newly registered POST-only route was probed as GET. It was not a successful complete operational run.

| Profile model | Validated backend responses | Generated tokens | Validation errors | Exact-gold mismatches | Exact-gold passes | Evaluator exit / acceptance |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 0.5B Q8 | 12/12 | 1661 | 10 | 0 | 2 | 2 / not-accepted |
| 1.5B Q8 | 12/12 | 481 | 3 | 7 | 2 | 2 / not-accepted |

The0.5B10errors and1.5B3errors are **generic review-validation** in these original reports. They are not retrospectively relabelled or called semantic falsehoods.1.5B has7 graded mismatches, including missing/extra records; no positive extraction passed. Both models had12stop/0length/0backend failures/0rejected inputs and positive generated-token evidence. `backendComplete=true` concerns backend envelopes, not correct fields or accepted quality.

Within this run both tasks/models used image `sha256:5660bf284fe2378ba9303c939994ff3bce13673d3eef3876e9a8f8240fd659ef`, binary `0c5a9aed0f47d87f2e86fee92934f5d2365ac118f26811c76dd5b8985ca908f9`, Nodev24.22.2/x64/AMD EPYC 9V45 96-Core Processor. Exact official0.5B/1.5B weight pins and source8642541… are in each original report. File/read-only/hash verification before/after plus the owned local process is **not remote loaded-weight attestation**.


### First original profile report: jobmatch-qwen2.5-0.5b-q8-diagnostic

```json
{
  "format": "jobmatch-profile-cpu-diagnostic-v1",
  "runKind": "actual-local-cpu-inference/synthetic-profile-only",
  "pin": {
    "format": "jobmatch-cpu-model-pin-v1",
    "repository": "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
    "revision": "df5bf01389a39c743ab467d734bf501681e041c5",
    "file": "qwen2.5-0.5b-instruct-q8_0.gguf",
    "sha256": "ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e",
    "bytes": 675710816,
    "license": "Apache-2.0",
    "llamaRepository": "ggml-org/llama.cpp",
    "llamaRevision": "8642541b255bfb5dc39cd351a178be09013a55d6",
    "modelAlias": "jobmatch-qwen2.5-0.5b-q8-diagnostic",
    "context": 4096,
    "threads": 4,
    "maxTokens": 2048,
    "seed": 42
  },
  "containerImageId": "sha256:5660bf284fe2378ba9303c939994ff3bce13673d3eef3876e9a8f8240fd659ef",
  "llamaBinarySha256": "0c5a9aed0f47d87f2e86fee92934f5d2365ac118f26811c76dd5b8985ca908f9",
  "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
  "weightsFileVerified": true,
  "executionBinding": "readonly-file-and-owned-local-process",
  "deploymentIdentityVerified": false,
  "modelIdentityVerified": false,
  "acceptance": "not-accepted",
  "semanticAssessment": "not-performed",
  "independentHeldOut": "not-performed",
  "runtime": {
    "node": "v24.22.2",
    "architecture": "x64",
    "cpu": "AMD EPYC 9V45 96-Core Processor"
  },
  "backendComplete": true,
  "bridge": {
    "acceptedRequests": 12,
    "backendResponses": 12,
    "generatedTokens": 1661,
    "stopped": 12,
    "limited": 0,
    "backendFailures": 0,
    "rejectedRequests": 0
  },
  "evaluation": {
    "format": "jobmatch-profile-evaluation-v1",
    "corpusVersion": "synthetic-profile-ru-en-v1",
    "corpusSha256": "fafc0a94ba5f90a1778c0ab0ee7055c9d068a9325c8e7e39f1bd6d0f6cca0f90",
    "promptVersion": "profile-paragraph-quotes-v1",
    "promptSha256": "7a7bb70b35e1437a8ed8152b1966c36521a099653ef03c0b0314153fd85d5701",
    "contractVersion": "paragraph-quotes-v1",
    "startedAt": "2026-10-31T11:33:18.785Z",
    "finishedAt": "2026-10-31T11:33:47.308Z",
    "planned": 12,
    "completed": 12,
    "complete": true,
    "passed": false,
    "errors": 10,
    "exactGoldPasses": 2,
    "mismatches": 0,
    "evaluatorExitCode": 2,
    "failureStageCounts": {
      "configuration": 0,
      "input": 0,
      "transport": 0,
      "http-status-or-type": 0,
      "body-read": 0,
      "envelope-json": 0,
      "envelope-schema": 0,
      "content-json": 0,
      "review-schema": 0,
      "citation": 0,
      "evidence": 0,
      "review-validation": 10,
      "cancelled": 0,
      "timeout": 0,
      "grading-validation": 0,
      "unknown": 0
    },
    "rows": [
      {
        "id": "ru-profile-employment",
        "language": "ru",
        "category": "employment",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 1648
      },
      {
        "id": "ru-profile-education",
        "language": "ru",
        "category": "education",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 1645
      },
      {
        "id": "ru-profile-certification",
        "language": "ru",
        "category": "certification",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 3440
      },
      {
        "id": "ru-profile-achievement",
        "language": "ru",
        "category": "achievement",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 2305
      },
      {
        "id": "ru-profile-filtered-context",
        "language": "ru",
        "category": "pipeline-filtering",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 4451
      },
      {
        "id": "ru-profile-neutral",
        "language": "ru",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 195
      },
      {
        "id": "en-profile-employment",
        "language": "en",
        "category": "employment",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 3156
      },
      {
        "id": "en-profile-education",
        "language": "en",
        "category": "education",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 1512
      },
      {
        "id": "en-profile-certification",
        "language": "en",
        "category": "certification",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 3325
      },
      {
        "id": "en-profile-achievement",
        "language": "en",
        "category": "achievement",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 2995
      },
      {
        "id": "en-profile-filtered-context",
        "language": "en",
        "category": "pipeline-filtering",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 3666
      },
      {
        "id": "en-profile-neutral",
        "language": "en",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 185
      }
    ]
  }
}
```

### First original profile report: jobmatch-qwen2.5-1.5b-q8-diagnostic

```json
{
  "format": "jobmatch-profile-cpu-diagnostic-v1",
  "runKind": "actual-local-cpu-inference/synthetic-profile-only",
  "pin": {
    "format": "jobmatch-cpu-model-pin-v1",
    "repository": "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
    "revision": "91cad51170dc346986eccefdc2dd33a9da36ead9",
    "file": "qwen2.5-1.5b-instruct-q8_0.gguf",
    "sha256": "d7efb072e7724d25048a4fda0a3e10b04bdef5d06b1403a1c93bd9f1240a63c8",
    "bytes": 1894532128,
    "license": "Apache-2.0",
    "llamaRepository": "ggml-org/llama.cpp",
    "llamaRevision": "8642541b255bfb5dc39cd351a178be09013a55d6",
    "modelAlias": "jobmatch-qwen2.5-1.5b-q8-diagnostic",
    "context": 4096,
    "threads": 4,
    "maxTokens": 2048,
    "seed": 42
  },
  "containerImageId": "sha256:5660bf284fe2378ba9303c939994ff3bce13673d3eef3876e9a8f8240fd659ef",
  "llamaBinarySha256": "0c5a9aed0f47d87f2e86fee92934f5d2365ac118f26811c76dd5b8985ca908f9",
  "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
  "weightsFileVerified": true,
  "executionBinding": "readonly-file-and-owned-local-process",
  "deploymentIdentityVerified": false,
  "modelIdentityVerified": false,
  "acceptance": "not-accepted",
  "semanticAssessment": "not-performed",
  "independentHeldOut": "not-performed",
  "runtime": {
    "node": "v24.22.2",
    "architecture": "x64",
    "cpu": "AMD EPYC 9V45 96-Core Processor"
  },
  "backendComplete": true,
  "bridge": {
    "acceptedRequests": 12,
    "backendResponses": 12,
    "generatedTokens": 481,
    "stopped": 12,
    "limited": 0,
    "backendFailures": 0,
    "rejectedRequests": 0
  },
  "evaluation": {
    "format": "jobmatch-profile-evaluation-v1",
    "corpusVersion": "synthetic-profile-ru-en-v1",
    "corpusSha256": "fafc0a94ba5f90a1778c0ab0ee7055c9d068a9325c8e7e39f1bd6d0f6cca0f90",
    "promptVersion": "profile-paragraph-quotes-v1",
    "promptSha256": "7a7bb70b35e1437a8ed8152b1966c36521a099653ef03c0b0314153fd85d5701",
    "contractVersion": "paragraph-quotes-v1",
    "startedAt": "2026-10-31T11:33:51.926Z",
    "finishedAt": "2026-10-31T11:34:19.203Z",
    "planned": 12,
    "completed": 12,
    "complete": true,
    "passed": false,
    "errors": 3,
    "exactGoldPasses": 2,
    "mismatches": 7,
    "evaluatorExitCode": 2,
    "failureStageCounts": {
      "configuration": 0,
      "input": 0,
      "transport": 0,
      "http-status-or-type": 0,
      "body-read": 0,
      "envelope-json": 0,
      "envelope-schema": 0,
      "content-json": 0,
      "review-schema": 0,
      "citation": 0,
      "evidence": 0,
      "review-validation": 3,
      "cancelled": 0,
      "timeout": 0,
      "grading-validation": 0,
      "unknown": 0
    },
    "rows": [
      {
        "id": "ru-profile-employment",
        "language": "ru",
        "category": "employment",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 5400
      },
      {
        "id": "ru-profile-education",
        "language": "ru",
        "category": "education",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 6504
      },
      {
        "id": "ru-profile-certification",
        "language": "ru",
        "category": "certification",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 3665
      },
      {
        "id": "ru-profile-achievement",
        "language": "ru",
        "category": "achievement",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 0,
        "durationMs": 544
      },
      {
        "id": "ru-profile-filtered-context",
        "language": "ru",
        "category": "pipeline-filtering",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 0,
        "durationMs": 560
      },
      {
        "id": "ru-profile-neutral",
        "language": "ru",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 535
      },
      {
        "id": "en-profile-employment",
        "language": "en",
        "category": "employment",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 3478
      },
      {
        "id": "en-profile-education",
        "language": "en",
        "category": "education",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 2403
      },
      {
        "id": "en-profile-certification",
        "language": "en",
        "category": "certification",
        "status": "error",
        "passed": false,
        "failureStage": "review-validation",
        "durationMs": 2669
      },
      {
        "id": "en-profile-achievement",
        "language": "en",
        "category": "achievement",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 0,
        "durationMs": 499
      },
      {
        "id": "en-profile-filtered-context",
        "language": "en",
        "category": "pipeline-filtering",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 0,
        "durationMs": 535
      },
      {
        "id": "en-profile-neutral",
        "language": "en",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 485
      }
    ]
  }
}
```

## Corrected executable run

Runtime `d60bce67c15c9fbedbab67254b4da13dc5526d52`, [CPU41198109437/job124528290443](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109437). The operational probe now uses the actually exported POST method; a new regression compares every registered probe method with the Next route source. Status/privacy/canary/provider-fetch/cap/alert checks were not relaxed. [Real Next operational smoke41198109603/job124528290987](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109603) PASS:12 static route labels, no private canary/provider calls.

Static failure diagnostics were added without changing raw response acceptance, successful result values, model inputs/schema, gold, resource/time limits, sampling, corpus or prompt. All24 production request hashes (12 per alias), corpus hash and prompt hash matched before/after instrumentation. The original generic reports above remain original. A stage describes where validation failed, not the precise native cause or semantic truth.

| Profile model | Validated backend responses | Generated tokens | Validation errors | Exact-gold mismatches | Exact-gold passes | Evaluator exit / acceptance |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 0.5B Q8 | 12/12 | 1661 | 10 | 0 | 2 | 2 / not-accepted |
| 1.5B Q8 | 12/12 | 481 | 3 | 7 | 2 | 2 / not-accepted |

The0.5B10errors now occur at citation binding (eligible paragraph/unique literal occurrence);1.5B has2 citation failures and1 review-schema/domain failure. These labels do not establish whether text was invented, normalized, ambiguous, selected from the wrong block, or which domain condition failed. The seven1.5B graded mismatches are not seven proven real-world semantic falsehoods. All profile requests produced validated positive-token stop envelopes; no full positive extraction case passed gold. Model/deployment/semantic/held-out acceptance remains false/not-performed/not-accepted.

Within this run all four task/model containers use image `sha256:5e8449f7810bddd7e353bf789714e1a0afc07193381cd435a8539876c63872a9`, binary `d4b77b7579ef71381c27608cdbc8a961d62df73da723091fa0ecc49e82b5f64e`, Nodev24.22.2/x64/AMD EPYC 9V74 80-Core Processor. Across the two runs CPU description, binary SHA and image ID differ. Fixed input hashes and repeated aggregate counts do not establish general reproducibility, a randomized comparison or model improvement.

All11 corrected-executable workflows SUCCESS: [Central pre-auth quota (synthetic PostgreSQL)](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109476), [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109603), [English structured version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109479), [Consent receipt protocol (synthetic)](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109493), [English ordinary version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109439), [AI evaluation harness (synthetic HTTP only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109438), [Synthetic PostgreSQL restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109462), [Isolated document parser](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109435), [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109451), [Structured profile acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109440), [Pinned CPU model diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41198109437).1148unit/89files (78new),55Node evaluation (10new),94Python (1new),275browser PASS (20new)/2explicit live-account SKIP,76worker PASS/0skips; lint/types/build, actual Next/consent/quota/RU-EN regressions and native21-table synthetic restore PASS. The latter is **not a Supabase provider-copy restore**. [Executable Vercel preview](https://vercel.com/digagency/jobmatch-ai/F46uRCu9W8o5mtE8yyYgz6c3FLL5) SUCCESS.

Local verified Chromium133.0.6943.0, SHA d3fb6170098bfa1adc58bf2a184b075f74ff079d0af375f326241d560182eccc, is distinct from CI's installed browser. All275local cases/2live SKIP passed;390px RU/EN axe/no-overflow passed and the actual English PNG was viewed. The first32 local attempts could not connect because independently started server/test commands had separate managed network namespaces; they did not verify UI. Running both under the same Playwright-owned webServer command resolved the test setup without weakening checks.


### Corrected original profile report: jobmatch-qwen2.5-0.5b-q8-diagnostic

```json
{
  "format": "jobmatch-profile-cpu-diagnostic-v1",
  "runKind": "actual-local-cpu-inference/synthetic-profile-only",
  "pin": {
    "format": "jobmatch-cpu-model-pin-v1",
    "repository": "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
    "revision": "df5bf01389a39c743ab467d734bf501681e041c5",
    "file": "qwen2.5-0.5b-instruct-q8_0.gguf",
    "sha256": "ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e",
    "bytes": 675710816,
    "license": "Apache-2.0",
    "llamaRepository": "ggml-org/llama.cpp",
    "llamaRevision": "8642541b255bfb5dc39cd351a178be09013a55d6",
    "modelAlias": "jobmatch-qwen2.5-0.5b-q8-diagnostic",
    "context": 4096,
    "threads": 4,
    "maxTokens": 2048,
    "seed": 42
  },
  "containerImageId": "sha256:5e8449f7810bddd7e353bf789714e1a0afc07193381cd435a8539876c63872a9",
  "llamaBinarySha256": "d4b77b7579ef71381c27608cdbc8a961d62df73da723091fa0ecc49e82b5f64e",
  "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
  "weightsFileVerified": true,
  "executionBinding": "readonly-file-and-owned-local-process",
  "deploymentIdentityVerified": false,
  "modelIdentityVerified": false,
  "acceptance": "not-accepted",
  "semanticAssessment": "not-performed",
  "independentHeldOut": "not-performed",
  "runtime": {
    "node": "v24.22.2",
    "architecture": "x64",
    "cpu": "AMD EPYC 9V74 80-Core Processor"
  },
  "backendComplete": true,
  "bridge": {
    "acceptedRequests": 12,
    "backendResponses": 12,
    "generatedTokens": 1661,
    "stopped": 12,
    "limited": 0,
    "backendFailures": 0,
    "rejectedRequests": 0
  },
  "evaluation": {
    "format": "jobmatch-profile-evaluation-v1",
    "corpusVersion": "synthetic-profile-ru-en-v1",
    "corpusSha256": "fafc0a94ba5f90a1778c0ab0ee7055c9d068a9325c8e7e39f1bd6d0f6cca0f90",
    "promptVersion": "profile-paragraph-quotes-v1",
    "promptSha256": "7a7bb70b35e1437a8ed8152b1966c36521a099653ef03c0b0314153fd85d5701",
    "contractVersion": "paragraph-quotes-v1",
    "startedAt": "2026-10-31T11:51:53.425Z",
    "finishedAt": "2026-10-31T11:52:29.309Z",
    "planned": 12,
    "completed": 12,
    "complete": true,
    "passed": false,
    "errors": 10,
    "exactGoldPasses": 2,
    "mismatches": 0,
    "evaluatorExitCode": 2,
    "failureStageCounts": {
      "configuration": 0,
      "input": 0,
      "transport": 0,
      "http-status-or-type": 0,
      "body-read": 0,
      "envelope-json": 0,
      "envelope-schema": 0,
      "content-json": 0,
      "review-schema": 0,
      "citation": 10,
      "evidence": 0,
      "review-validation": 0,
      "cancelled": 0,
      "timeout": 0,
      "grading-validation": 0,
      "unknown": 0
    },
    "rows": [
      {
        "id": "ru-profile-employment",
        "language": "ru",
        "category": "employment",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 2094
      },
      {
        "id": "ru-profile-education",
        "language": "ru",
        "category": "education",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 2040
      },
      {
        "id": "ru-profile-certification",
        "language": "ru",
        "category": "certification",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 4422
      },
      {
        "id": "ru-profile-achievement",
        "language": "ru",
        "category": "achievement",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 2895
      },
      {
        "id": "ru-profile-filtered-context",
        "language": "ru",
        "category": "pipeline-filtering",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 5709
      },
      {
        "id": "ru-profile-neutral",
        "language": "ru",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 243
      },
      {
        "id": "en-profile-employment",
        "language": "en",
        "category": "employment",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 3926
      },
      {
        "id": "en-profile-education",
        "language": "en",
        "category": "education",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 1891
      },
      {
        "id": "en-profile-certification",
        "language": "en",
        "category": "certification",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 4108
      },
      {
        "id": "en-profile-achievement",
        "language": "en",
        "category": "achievement",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 3751
      },
      {
        "id": "en-profile-filtered-context",
        "language": "en",
        "category": "pipeline-filtering",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 4568
      },
      {
        "id": "en-profile-neutral",
        "language": "en",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 237
      }
    ]
  }
}
```

### Corrected original profile report: jobmatch-qwen2.5-1.5b-q8-diagnostic

```json
{
  "format": "jobmatch-profile-cpu-diagnostic-v1",
  "runKind": "actual-local-cpu-inference/synthetic-profile-only",
  "pin": {
    "format": "jobmatch-cpu-model-pin-v1",
    "repository": "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
    "revision": "91cad51170dc346986eccefdc2dd33a9da36ead9",
    "file": "qwen2.5-1.5b-instruct-q8_0.gguf",
    "sha256": "d7efb072e7724d25048a4fda0a3e10b04bdef5d06b1403a1c93bd9f1240a63c8",
    "bytes": 1894532128,
    "license": "Apache-2.0",
    "llamaRepository": "ggml-org/llama.cpp",
    "llamaRevision": "8642541b255bfb5dc39cd351a178be09013a55d6",
    "modelAlias": "jobmatch-qwen2.5-1.5b-q8-diagnostic",
    "context": 4096,
    "threads": 4,
    "maxTokens": 2048,
    "seed": 42
  },
  "containerImageId": "sha256:5e8449f7810bddd7e353bf789714e1a0afc07193381cd435a8539876c63872a9",
  "llamaBinarySha256": "d4b77b7579ef71381c27608cdbc8a961d62df73da723091fa0ecc49e82b5f64e",
  "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
  "weightsFileVerified": true,
  "executionBinding": "readonly-file-and-owned-local-process",
  "deploymentIdentityVerified": false,
  "modelIdentityVerified": false,
  "acceptance": "not-accepted",
  "semanticAssessment": "not-performed",
  "independentHeldOut": "not-performed",
  "runtime": {
    "node": "v24.22.2",
    "architecture": "x64",
    "cpu": "AMD EPYC 9V74 80-Core Processor"
  },
  "backendComplete": true,
  "bridge": {
    "acceptedRequests": 12,
    "backendResponses": 12,
    "generatedTokens": 481,
    "stopped": 12,
    "limited": 0,
    "backendFailures": 0,
    "rejectedRequests": 0
  },
  "evaluation": {
    "format": "jobmatch-profile-evaluation-v1",
    "corpusVersion": "synthetic-profile-ru-en-v1",
    "corpusSha256": "fafc0a94ba5f90a1778c0ab0ee7055c9d068a9325c8e7e39f1bd6d0f6cca0f90",
    "promptVersion": "profile-paragraph-quotes-v1",
    "promptSha256": "7a7bb70b35e1437a8ed8152b1966c36521a099653ef03c0b0314153fd85d5701",
    "contractVersion": "paragraph-quotes-v1",
    "startedAt": "2026-10-31T11:52:34.562Z",
    "finishedAt": "2026-10-31T11:53:07.747Z",
    "planned": 12,
    "completed": 12,
    "complete": true,
    "passed": false,
    "errors": 3,
    "exactGoldPasses": 2,
    "mismatches": 7,
    "evaluatorExitCode": 2,
    "failureStageCounts": {
      "configuration": 0,
      "input": 0,
      "transport": 0,
      "http-status-or-type": 0,
      "body-read": 0,
      "envelope-json": 0,
      "envelope-schema": 0,
      "content-json": 0,
      "review-schema": 1,
      "citation": 2,
      "evidence": 0,
      "review-validation": 0,
      "cancelled": 0,
      "timeout": 0,
      "grading-validation": 0,
      "unknown": 0
    },
    "rows": [
      {
        "id": "ru-profile-employment",
        "language": "ru",
        "category": "employment",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 7071
      },
      {
        "id": "ru-profile-education",
        "language": "ru",
        "category": "education",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 7816
      },
      {
        "id": "ru-profile-certification",
        "language": "ru",
        "category": "certification",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 4263
      },
      {
        "id": "ru-profile-achievement",
        "language": "ru",
        "category": "achievement",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 0,
        "durationMs": 643
      },
      {
        "id": "ru-profile-filtered-context",
        "language": "ru",
        "category": "pipeline-filtering",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 0,
        "durationMs": 663
      },
      {
        "id": "ru-profile-neutral",
        "language": "ru",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 607
      },
      {
        "id": "en-profile-employment",
        "language": "en",
        "category": "employment",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 4137
      },
      {
        "id": "en-profile-education",
        "language": "en",
        "category": "education",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 2916
      },
      {
        "id": "en-profile-certification",
        "language": "en",
        "category": "certification",
        "status": "error",
        "passed": false,
        "failureStage": "review-schema",
        "durationMs": 3201
      },
      {
        "id": "en-profile-achievement",
        "language": "en",
        "category": "achievement",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 0,
        "durationMs": 602
      },
      {
        "id": "en-profile-filtered-context",
        "language": "en",
        "category": "pipeline-filtering",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 0,
        "durationMs": 661
      },
      {
        "id": "en-profile-neutral",
        "language": "en",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 604
      }
    ]
  }
}
```

## Unchanged linker regression: incomplete comparisons remain incomplete

The old28-case linker corpus/prompt/gold and models were unchanged. Each runtime also produced actual old-task reports and a coherent ATTEMPT_V1. In both runs baseline28validated responses/1372tokens/6citation errors/16mismatches/6passes; candidate27validated responses/688tokens/1backend failure/1HTTP-stage error/16mismatches/11passes. The candidate's incomplete backend responses mean **not-comparable / operationalComparisonComplete=false / no deltas / not-accepted**; no full COMPARISON_V1 was emitted. Both complete original safe attempt records are retained below; full original V4 reports remain in their immutable CPU job logs. No favorable run was selected and raw model completions are never archived.

### Original first linker outcome

```json
{
  "format": "jobmatch-cpu-comparison-attempt-v1",
  "runKind": "two-actual-local-cpu-attempts/synthetic-only",
  "comparisonStatus": "not-comparable",
  "reason": "incomplete-backend-responses",
  "operationalComparisonComplete": false,
  "acceptance": "not-accepted",
  "independentHeldOut": "not-performed",
  "deploymentIdentityVerified": false,
  "remoteAttestation": "not-performed",
  "executionBinding": "one-job-workflow-and-equal-reported-image-binary-runtime",
  "control": {
    "containerImageId": "sha256:5660bf284fe2378ba9303c939994ff3bce13673d3eef3876e9a8f8240fd659ef",
    "llamaBinarySha256": "0c5a9aed0f47d87f2e86fee92934f5d2365ac118f26811c76dd5b8985ca908f9",
    "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
    "node": "v24.22.2",
    "architecture": "x64",
    "cpuDescriptionSha256": "a5bece87c28e84bff040ab1f3620af777141bbcdb093964bff59287becbefbc7",
    "corpusVersion": "synthetic-ru-en-v1",
    "corpusSha256": "c699b0155b7834713b3ac93e72856f87c19ae7817b200aeeaf5795d99fe31d63",
    "promptVersion": "requirements-source-lines-v1",
    "promptSha256": "a24a586900299e6a384d35f10dc4006deda09fa8ed8b5fd839484c638e9a0693",
    "quoteContractVersion": "source-lines-v1",
    "linkAuditVersion": "literal-quantities-v1",
    "context": 4096,
    "threads": 4,
    "temperature": 0,
    "maxTokens": 2048,
    "seed": 42
  },
  "baseline": {
    "slot": "baseline",
    "pin": {
      "format": "jobmatch-cpu-model-pin-v1",
      "repository": "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
      "revision": "df5bf01389a39c743ab467d734bf501681e041c5",
      "file": "qwen2.5-0.5b-instruct-q8_0.gguf",
      "sha256": "ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e",
      "bytes": 675710816,
      "license": "Apache-2.0",
      "llamaRepository": "ggml-org/llama.cpp",
      "llamaRevision": "8642541b255bfb5dc39cd351a178be09013a55d6",
      "modelAlias": "jobmatch-qwen2.5-0.5b-q8-diagnostic",
      "context": 4096,
      "threads": 4,
      "maxTokens": 2048,
      "seed": 42
    },
    "startedAt": "2026-10-31T11:31:41.998Z",
    "finishedAt": "2026-10-31T11:32:09.709Z",
    "counts": {
      "cases": 28,
      "passed": 6,
      "errors": 6,
      "mismatches": 16
    },
    "byLanguage": {
      "ru": {
        "cases": 14,
        "passed": 3,
        "errors": 3,
        "mismatches": 8
      },
      "en": {
        "cases": 14,
        "passed": 3,
        "errors": 3,
        "mismatches": 8
      }
    },
    "bridge": {
      "acceptedRequests": 28,
      "backendResponses": 28,
      "generatedTokens": 1372,
      "stopped": 28,
      "limited": 0,
      "transportFailures": 0,
      "rejectedRequests": 0
    },
    "evaluatorExitCode": 2,
    "diagnosticQuality": "synthetic-provider-or-contract-errors",
    "failureStageCounts": {
      "configuration": 0,
      "input": 0,
      "transport": 0,
      "http-status-or-type": 0,
      "body-read": 0,
      "envelope-json": 0,
      "envelope-schema": 0,
      "content-json": 0,
      "review-schema": 0,
      "citation": 6,
      "evidence": 0,
      "review-validation": 0,
      "cancelled": 0,
      "timeout": 0,
      "grading-validation": 0,
      "unknown": 0
    },
    "cases": [
      {
        "id": "ru-exact",
        "language": "ru",
        "category": "exact",
        "durationMs": 1341,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-no-evidence",
        "language": "ru",
        "category": "no-evidence",
        "durationMs": 838,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-unverified",
        "language": "ru",
        "category": "unverified",
        "durationMs": 840,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-negation",
        "language": "ru",
        "category": "negation",
        "durationMs": 1318,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-intention",
        "language": "ru",
        "category": "intention",
        "durationMs": 836,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-duration-insufficient",
        "language": "ru",
        "category": "duration-insufficient",
        "durationMs": 951,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-duration-supported",
        "language": "ru",
        "category": "duration-supported",
        "durationMs": 870,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-level-insufficient",
        "language": "ru",
        "category": "level-insufficient",
        "durationMs": 1191,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "ru-numbers-insufficient",
        "language": "ru",
        "category": "numbers-insufficient",
        "durationMs": 696,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-compound-complete",
        "language": "ru",
        "category": "compound-complete",
        "durationMs": 879,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-compound-incomplete",
        "language": "ru",
        "category": "compound-incomplete",
        "durationMs": 789,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-contradiction",
        "language": "ru",
        "category": "contradiction",
        "durationMs": 1565,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "ru-fact-injection",
        "language": "ru",
        "category": "fact-injection",
        "durationMs": 781,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-vacancy-injection",
        "language": "ru",
        "category": "vacancy-injection",
        "durationMs": 1263,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "en-exact",
        "language": "en",
        "category": "exact",
        "durationMs": 766,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-no-evidence",
        "language": "en",
        "category": "no-evidence",
        "durationMs": 815,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-unverified",
        "language": "en",
        "category": "unverified",
        "durationMs": 801,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-negation",
        "language": "en",
        "category": "negation",
        "durationMs": 850,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-intention",
        "language": "en",
        "category": "intention",
        "durationMs": 734,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-duration-insufficient",
        "language": "en",
        "category": "duration-insufficient",
        "durationMs": 564,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-duration-supported",
        "language": "en",
        "category": "duration-supported",
        "durationMs": 843,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-level-insufficient",
        "language": "en",
        "category": "level-insufficient",
        "durationMs": 1354,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "en-numbers-insufficient",
        "language": "en",
        "category": "numbers-insufficient",
        "durationMs": 620,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-compound-complete",
        "language": "en",
        "category": "compound-complete",
        "durationMs": 870,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-compound-incomplete",
        "language": "en",
        "category": "compound-incomplete",
        "durationMs": 797,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-contradiction",
        "language": "en",
        "category": "contradiction",
        "durationMs": 1776,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "en-fact-injection",
        "language": "en",
        "category": "fact-injection",
        "durationMs": 868,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-vacancy-injection",
        "language": "en",
        "category": "vacancy-injection",
        "durationMs": 1273,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      }
    ]
  },
  "candidate": {
    "slot": "candidate",
    "pin": {
      "format": "jobmatch-cpu-model-pin-v1",
      "repository": "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
      "revision": "91cad51170dc346986eccefdc2dd33a9da36ead9",
      "file": "qwen2.5-1.5b-instruct-q8_0.gguf",
      "sha256": "d7efb072e7724d25048a4fda0a3e10b04bdef5d06b1403a1c93bd9f1240a63c8",
      "bytes": 1894532128,
      "license": "Apache-2.0",
      "llamaRepository": "ggml-org/llama.cpp",
      "llamaRevision": "8642541b255bfb5dc39cd351a178be09013a55d6",
      "modelAlias": "jobmatch-qwen2.5-1.5b-q8-diagnostic",
      "context": 4096,
      "threads": 4,
      "maxTokens": 2048,
      "seed": 42
    },
    "startedAt": "2026-10-31T11:32:13.985Z",
    "finishedAt": "2026-10-31T11:33:15.795Z",
    "counts": {
      "cases": 28,
      "passed": 11,
      "errors": 1,
      "mismatches": 16
    },
    "byLanguage": {
      "ru": {
        "cases": 14,
        "passed": 6,
        "errors": 0,
        "mismatches": 8
      },
      "en": {
        "cases": 14,
        "passed": 5,
        "errors": 1,
        "mismatches": 8
      }
    },
    "bridge": {
      "acceptedRequests": 28,
      "backendResponses": 27,
      "generatedTokens": 688,
      "stopped": 27,
      "limited": 0,
      "transportFailures": 1,
      "rejectedRequests": 0
    },
    "evaluatorExitCode": 2,
    "diagnosticQuality": "synthetic-provider-or-contract-errors",
    "failureStageCounts": {
      "configuration": 0,
      "input": 0,
      "transport": 0,
      "http-status-or-type": 1,
      "body-read": 0,
      "envelope-json": 0,
      "envelope-schema": 0,
      "content-json": 0,
      "review-schema": 0,
      "citation": 0,
      "evidence": 0,
      "review-validation": 0,
      "cancelled": 0,
      "timeout": 0,
      "grading-validation": 0,
      "unknown": 0
    },
    "cases": [
      {
        "id": "ru-exact",
        "language": "ru",
        "category": "exact",
        "durationMs": 3350,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-no-evidence",
        "language": "ru",
        "category": "no-evidence",
        "durationMs": 991,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-unverified",
        "language": "ru",
        "category": "unverified",
        "durationMs": 954,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-negation",
        "language": "ru",
        "category": "negation",
        "durationMs": 1667,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-intention",
        "language": "ru",
        "category": "intention",
        "durationMs": 1445,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-duration-insufficient",
        "language": "ru",
        "category": "duration-insufficient",
        "durationMs": 1444,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-duration-supported",
        "language": "ru",
        "category": "duration-supported",
        "durationMs": 1255,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-level-insufficient",
        "language": "ru",
        "category": "level-insufficient",
        "durationMs": 1453,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-numbers-insufficient",
        "language": "ru",
        "category": "numbers-insufficient",
        "durationMs": 1537,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-compound-complete",
        "language": "ru",
        "category": "compound-complete",
        "durationMs": 1994,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-compound-incomplete",
        "language": "ru",
        "category": "compound-incomplete",
        "durationMs": 1618,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-contradiction",
        "language": "ru",
        "category": "contradiction",
        "durationMs": 2042,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 2
      },
      {
        "id": "ru-fact-injection",
        "language": "ru",
        "category": "fact-injection",
        "durationMs": 904,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-vacancy-injection",
        "language": "ru",
        "category": "vacancy-injection",
        "durationMs": 1171,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 1,
        "unsupportedLinks": 0
      },
      {
        "id": "en-exact",
        "language": "en",
        "category": "exact",
        "durationMs": 1655,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-no-evidence",
        "language": "en",
        "category": "no-evidence",
        "durationMs": 1627,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-unverified",
        "language": "en",
        "category": "unverified",
        "durationMs": 886,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-negation",
        "language": "en",
        "category": "negation",
        "durationMs": 1632,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-intention",
        "language": "en",
        "category": "intention",
        "durationMs": 1438,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-duration-insufficient",
        "language": "en",
        "category": "duration-insufficient",
        "durationMs": 1359,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-duration-supported",
        "language": "en",
        "category": "duration-supported",
        "durationMs": 1157,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-level-insufficient",
        "language": "en",
        "category": "level-insufficient",
        "durationMs": 1127,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-numbers-insufficient",
        "language": "en",
        "category": "numbers-insufficient",
        "durationMs": 1371,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-compound-complete",
        "language": "en",
        "category": "compound-complete",
        "durationMs": 1934,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-compound-incomplete",
        "language": "en",
        "category": "compound-incomplete",
        "durationMs": 1583,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-contradiction",
        "language": "en",
        "category": "contradiction",
        "durationMs": 1810,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-fact-injection",
        "language": "en",
        "category": "fact-injection",
        "durationMs": 863,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-vacancy-injection",
        "language": "en",
        "category": "vacancy-injection",
        "durationMs": 19506,
        "status": "error",
        "passed": false,
        "failureStage": "http-status-or-type"
      }
    ]
  },
  "limitations": [
    "incomplete-backend-responses",
    "no-quality-delta",
    "known-synthetic-gold",
    "one-sequential-run-per-model",
    "no-semantic-adjudication",
    "no-representative-held-out",
    "no-production-deployment-acceptance"
  ],
  "workflow": {
    "repository": "kredavto/JobMatch-AI",
    "runId": "41196910615"
  }
}
```

### Original corrected linker outcome

```json
{
  "format": "jobmatch-cpu-comparison-attempt-v1",
  "runKind": "two-actual-local-cpu-attempts/synthetic-only",
  "comparisonStatus": "not-comparable",
  "reason": "incomplete-backend-responses",
  "operationalComparisonComplete": false,
  "acceptance": "not-accepted",
  "independentHeldOut": "not-performed",
  "deploymentIdentityVerified": false,
  "remoteAttestation": "not-performed",
  "executionBinding": "one-job-workflow-and-equal-reported-image-binary-runtime",
  "control": {
    "containerImageId": "sha256:5e8449f7810bddd7e353bf789714e1a0afc07193381cd435a8539876c63872a9",
    "llamaBinarySha256": "d4b77b7579ef71381c27608cdbc8a961d62df73da723091fa0ecc49e82b5f64e",
    "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
    "node": "v24.22.2",
    "architecture": "x64",
    "cpuDescriptionSha256": "5cc632cfbd586b370ed6bd1f9691e98349fe6966de460b27f59c7a9140aa06a3",
    "corpusVersion": "synthetic-ru-en-v1",
    "corpusSha256": "c699b0155b7834713b3ac93e72856f87c19ae7817b200aeeaf5795d99fe31d63",
    "promptVersion": "requirements-source-lines-v1",
    "promptSha256": "a24a586900299e6a384d35f10dc4006deda09fa8ed8b5fd839484c638e9a0693",
    "quoteContractVersion": "source-lines-v1",
    "linkAuditVersion": "literal-quantities-v1",
    "context": 4096,
    "threads": 4,
    "temperature": 0,
    "maxTokens": 2048,
    "seed": 42
  },
  "baseline": {
    "slot": "baseline",
    "pin": {
      "format": "jobmatch-cpu-model-pin-v1",
      "repository": "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
      "revision": "df5bf01389a39c743ab467d734bf501681e041c5",
      "file": "qwen2.5-0.5b-instruct-q8_0.gguf",
      "sha256": "ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e",
      "bytes": 675710816,
      "license": "Apache-2.0",
      "llamaRepository": "ggml-org/llama.cpp",
      "llamaRevision": "8642541b255bfb5dc39cd351a178be09013a55d6",
      "modelAlias": "jobmatch-qwen2.5-0.5b-q8-diagnostic",
      "context": 4096,
      "threads": 4,
      "maxTokens": 2048,
      "seed": 42
    },
    "startedAt": "2026-10-31T11:50:02.094Z",
    "finishedAt": "2026-10-31T11:50:34.115Z",
    "counts": {
      "cases": 28,
      "passed": 6,
      "errors": 6,
      "mismatches": 16
    },
    "byLanguage": {
      "ru": {
        "cases": 14,
        "passed": 3,
        "errors": 3,
        "mismatches": 8
      },
      "en": {
        "cases": 14,
        "passed": 3,
        "errors": 3,
        "mismatches": 8
      }
    },
    "bridge": {
      "acceptedRequests": 28,
      "backendResponses": 28,
      "generatedTokens": 1372,
      "stopped": 28,
      "limited": 0,
      "transportFailures": 0,
      "rejectedRequests": 0
    },
    "evaluatorExitCode": 2,
    "diagnosticQuality": "synthetic-provider-or-contract-errors",
    "failureStageCounts": {
      "configuration": 0,
      "input": 0,
      "transport": 0,
      "http-status-or-type": 0,
      "body-read": 0,
      "envelope-json": 0,
      "envelope-schema": 0,
      "content-json": 0,
      "review-schema": 0,
      "citation": 6,
      "evidence": 0,
      "review-validation": 0,
      "cancelled": 0,
      "timeout": 0,
      "grading-validation": 0,
      "unknown": 0
    },
    "cases": [
      {
        "id": "ru-exact",
        "language": "ru",
        "category": "exact",
        "durationMs": 1690,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-no-evidence",
        "language": "ru",
        "category": "no-evidence",
        "durationMs": 970,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-unverified",
        "language": "ru",
        "category": "unverified",
        "durationMs": 968,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-negation",
        "language": "ru",
        "category": "negation",
        "durationMs": 920,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-intention",
        "language": "ru",
        "category": "intention",
        "durationMs": 862,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-duration-insufficient",
        "language": "ru",
        "category": "duration-insufficient",
        "durationMs": 1096,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-duration-supported",
        "language": "ru",
        "category": "duration-supported",
        "durationMs": 1527,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-level-insufficient",
        "language": "ru",
        "category": "level-insufficient",
        "durationMs": 1449,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "ru-numbers-insufficient",
        "language": "ru",
        "category": "numbers-insufficient",
        "durationMs": 793,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-compound-complete",
        "language": "ru",
        "category": "compound-complete",
        "durationMs": 1026,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-compound-incomplete",
        "language": "ru",
        "category": "compound-incomplete",
        "durationMs": 892,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-contradiction",
        "language": "ru",
        "category": "contradiction",
        "durationMs": 1881,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "ru-fact-injection",
        "language": "ru",
        "category": "fact-injection",
        "durationMs": 934,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-vacancy-injection",
        "language": "ru",
        "category": "vacancy-injection",
        "durationMs": 1514,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "en-exact",
        "language": "en",
        "category": "exact",
        "durationMs": 901,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-no-evidence",
        "language": "en",
        "category": "no-evidence",
        "durationMs": 948,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-unverified",
        "language": "en",
        "category": "unverified",
        "durationMs": 938,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-negation",
        "language": "en",
        "category": "negation",
        "durationMs": 932,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-intention",
        "language": "en",
        "category": "intention",
        "durationMs": 857,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-duration-insufficient",
        "language": "en",
        "category": "duration-insufficient",
        "durationMs": 659,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-duration-supported",
        "language": "en",
        "category": "duration-supported",
        "durationMs": 978,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-level-insufficient",
        "language": "en",
        "category": "level-insufficient",
        "durationMs": 1600,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "en-numbers-insufficient",
        "language": "en",
        "category": "numbers-insufficient",
        "durationMs": 731,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-compound-complete",
        "language": "en",
        "category": "compound-complete",
        "durationMs": 1004,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-compound-incomplete",
        "language": "en",
        "category": "compound-incomplete",
        "durationMs": 898,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-contradiction",
        "language": "en",
        "category": "contradiction",
        "durationMs": 1988,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "en-fact-injection",
        "language": "en",
        "category": "fact-injection",
        "durationMs": 947,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-vacancy-injection",
        "language": "en",
        "category": "vacancy-injection",
        "durationMs": 1394,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      }
    ]
  },
  "candidate": {
    "slot": "candidate",
    "pin": {
      "format": "jobmatch-cpu-model-pin-v1",
      "repository": "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
      "revision": "91cad51170dc346986eccefdc2dd33a9da36ead9",
      "file": "qwen2.5-1.5b-instruct-q8_0.gguf",
      "sha256": "d7efb072e7724d25048a4fda0a3e10b04bdef5d06b1403a1c93bd9f1240a63c8",
      "bytes": 1894532128,
      "license": "Apache-2.0",
      "llamaRepository": "ggml-org/llama.cpp",
      "llamaRevision": "8642541b255bfb5dc39cd351a178be09013a55d6",
      "modelAlias": "jobmatch-qwen2.5-1.5b-q8-diagnostic",
      "context": 4096,
      "threads": 4,
      "maxTokens": 2048,
      "seed": 42
    },
    "startedAt": "2026-10-31T11:50:38.604Z",
    "finishedAt": "2026-10-31T11:51:50.289Z",
    "counts": {
      "cases": 28,
      "passed": 11,
      "errors": 1,
      "mismatches": 16
    },
    "byLanguage": {
      "ru": {
        "cases": 14,
        "passed": 6,
        "errors": 0,
        "mismatches": 8
      },
      "en": {
        "cases": 14,
        "passed": 5,
        "errors": 1,
        "mismatches": 8
      }
    },
    "bridge": {
      "acceptedRequests": 28,
      "backendResponses": 27,
      "generatedTokens": 688,
      "stopped": 27,
      "limited": 0,
      "transportFailures": 1,
      "rejectedRequests": 0
    },
    "evaluatorExitCode": 2,
    "diagnosticQuality": "synthetic-provider-or-contract-errors",
    "failureStageCounts": {
      "configuration": 0,
      "input": 0,
      "transport": 0,
      "http-status-or-type": 1,
      "body-read": 0,
      "envelope-json": 0,
      "envelope-schema": 0,
      "content-json": 0,
      "review-schema": 0,
      "citation": 0,
      "evidence": 0,
      "review-validation": 0,
      "cancelled": 0,
      "timeout": 0,
      "grading-validation": 0,
      "unknown": 0
    },
    "cases": [
      {
        "id": "ru-exact",
        "language": "ru",
        "category": "exact",
        "durationMs": 6263,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-no-evidence",
        "language": "ru",
        "category": "no-evidence",
        "durationMs": 1165,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-unverified",
        "language": "ru",
        "category": "unverified",
        "durationMs": 1125,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-negation",
        "language": "ru",
        "category": "negation",
        "durationMs": 1892,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-intention",
        "language": "ru",
        "category": "intention",
        "durationMs": 1658,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-duration-insufficient",
        "language": "ru",
        "category": "duration-insufficient",
        "durationMs": 1757,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-duration-supported",
        "language": "ru",
        "category": "duration-supported",
        "durationMs": 1458,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-level-insufficient",
        "language": "ru",
        "category": "level-insufficient",
        "durationMs": 1744,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-numbers-insufficient",
        "language": "ru",
        "category": "numbers-insufficient",
        "durationMs": 1861,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-compound-complete",
        "language": "ru",
        "category": "compound-complete",
        "durationMs": 2323,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-compound-incomplete",
        "language": "ru",
        "category": "compound-incomplete",
        "durationMs": 1833,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "ru-contradiction",
        "language": "ru",
        "category": "contradiction",
        "durationMs": 2568,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 2
      },
      {
        "id": "ru-fact-injection",
        "language": "ru",
        "category": "fact-injection",
        "durationMs": 1080,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "ru-vacancy-injection",
        "language": "ru",
        "category": "vacancy-injection",
        "durationMs": 1444,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 1,
        "unsupportedLinks": 0
      },
      {
        "id": "en-exact",
        "language": "en",
        "category": "exact",
        "durationMs": 1881,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-no-evidence",
        "language": "en",
        "category": "no-evidence",
        "durationMs": 1969,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-unverified",
        "language": "en",
        "category": "unverified",
        "durationMs": 1028,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-negation",
        "language": "en",
        "category": "negation",
        "durationMs": 1915,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-intention",
        "language": "en",
        "category": "intention",
        "durationMs": 1669,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-duration-insufficient",
        "language": "en",
        "category": "duration-insufficient",
        "durationMs": 1604,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-duration-supported",
        "language": "en",
        "category": "duration-supported",
        "durationMs": 1351,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-level-insufficient",
        "language": "en",
        "category": "level-insufficient",
        "durationMs": 1327,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-numbers-insufficient",
        "language": "en",
        "category": "numbers-insufficient",
        "durationMs": 1650,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-compound-complete",
        "language": "en",
        "category": "compound-complete",
        "durationMs": 2352,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-compound-incomplete",
        "language": "en",
        "category": "compound-incomplete",
        "durationMs": 1861,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-contradiction",
        "language": "en",
        "category": "contradiction",
        "durationMs": 2218,
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1
      },
      {
        "id": "en-fact-injection",
        "language": "en",
        "category": "fact-injection",
        "durationMs": 1036,
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0
      },
      {
        "id": "en-vacancy-injection",
        "language": "en",
        "category": "vacancy-injection",
        "durationMs": 19504,
        "status": "error",
        "passed": false,
        "failureStage": "http-status-or-type"
      }
    ]
  },
  "limitations": [
    "incomplete-backend-responses",
    "no-quality-delta",
    "known-synthetic-gold",
    "one-sequential-run-per-model",
    "no-semantic-adjudication",
    "no-representative-held-out",
    "no-production-deployment-acceptance"
  ],
  "workflow": {
    "repository": "kredavto/JobMatch-AI",
    "runId": "41198109437"
  }
}
```

## Fixed production-request digest snapshot (before and after instrumentation)

These are local compiled-production-body checks, not another model run or remote attestation. Inputs and schema reach the whitelist/bridge unchanged. The pinned llama.cpp source contract was also checked: [server README](https://github.com/ggml-org/llama.cpp/blob/8642541b255bfb5dc39cd351a178be09013a55d6/tools/server/README.md) and [response-format handling](https://github.com/ggml-org/llama.cpp/blob/8642541b255bfb5dc39cd351a178be09013a55d6/tools/server/server-common.cpp) support the existing json_object/schema request; no transport-format change was made to improve scores.

```json
{
  "corpus": "fafc0a94ba5f90a1778c0ab0ee7055c9d068a9325c8e7e39f1bd6d0f6cca0f90",
  "prompt": "7a7bb70b35e1437a8ed8152b1966c36521a099653ef03c0b0314153fd85d5701",
  "baseline": [
    "2db7324216125ee83c339c2037eda8ff7776abd9b12c3323719c0d16eccce65c",
    "7ba4c149d8fe9e5203f36ef4e211dd634611945f7e1d587ab2da86a920d03192",
    "1a3df135b4a012121533016570c85de816b5d86eb0dcb7a83b54ee39d7ac6f4c",
    "a7c8c758ccb90fca574396a5aed966254339fd107e16d1558a482c1aca410d1d",
    "101bba74ec4eaf52bc112e5dfd4b731259a0d428cd15953da8cf9d589f86b150",
    "51e129c7ca5351f92f2721454bc51e8098720d59fee4ac89b6e55016c749d7f0",
    "c126badc56589b3273b730cba868e0d79ea5c61cc6a61ac36b7a8f7edba53e69",
    "801df8f8b5f98c0e0aad2b2c909fce1bd4274bd3e264f2ea1d93a687e4e644f6",
    "ccb889f96f3311290cbaed9285457929c2c0529b72fcf2eb0f23578e38dd3509",
    "66b09aef3cba8080f2a4f5d876531a4e16fc905f369a48733b2ff5a6df67c370",
    "c828d1697a0151f1148ab81b06335758fc5eb30162a5effb262670a99c755fed",
    "2c7db9595e257ff4d573eefe09495c2927440d6f52e9d16a89ceea176a0bee33"
  ],
  "candidate": [
    "0f6c9723cd6c205b991a42e5c55d8a9601de2b12b5eccba33a4e549b5822ef32",
    "afdd5015c887635dd27ab184e22f13f6eb7b88eca0bae9837bc74559629640e7",
    "68ab6d2f2623ffb229e53d9c97daf92e474b947c2e90473d886e84268243139b",
    "c0b9492dbdcc891b38bbfb78e3b77374d02055c417b0acbd60d6cee15db7869e",
    "94fada9ff919952e10da4b23e1f884b4164d16c7b2b31963beead05347e4affa",
    "06c814d21ad602cf162d595c5e1f9dafcdd28792a8b54c9342d4b0a1c256a8e8",
    "bdc9eda07b490022add0b45554914ccd4efeac81836867c7784b311cde150008",
    "fdee6f2f50003594c74cb1b2d4187a9ed42a16c37a926eec42f9cf052f0ca7cb",
    "31ec4884bc90f4190248f8efe4ea8d6437c45a8207a49ecbecfb9e61ca01635b",
    "27baacce28f7d5f4df36c9b90dbb3268a37ec46d8fa6c07e9c576df959572533",
    "f54f93f3c004aa55a451354a5be960fad8c411a308a45c646b8caaf7206606f5",
    "46e10345fc109452778a130a988a5e0f3cba7a453b05d9c165555a5f16f99ff8"
  ]
}
```

## Remaining gates

Preview is separately disabled by default; the per-process diagnostic flag does not enable production or establish operator authorization. No accepted record/fact/version is written by the preview, and the editable JSON snapshot is not durable accepted-AI provenance. Accepted deployment/model, stronger suitable model assessment, independent held-out/real documents, operator data placement/retention/withdrawal and cost, immutable accepted-change provenance, semantic rewriting/letters, SMTP/recovery, provider Supabase restore/RPO/RTO, HH scopes/operations, WAF/collector/alerts/capacity and final live/manual/physical acceptance remain open. No merge/release/production migration/Supabase CLI/mail/HH write/paid provisioning/third-party LLM user-data transfer.

Final Markdown-only scope must explicitly skip both downloads/build, both linker runs, linker assessment and both profile runs. A skipped final run is not fresh model evidence; the executable commit/job links above are the evidence.
