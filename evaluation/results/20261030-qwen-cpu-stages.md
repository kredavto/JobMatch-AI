# CPU failure-stage diagnostic — 30 октября 2026

Модель **не принята**. Runtime `eb9a270a6eef7bdb40cb2f9807abff971bec7307`, [Actions run](https://github.com/kredavto/JobMatch-AI/actions/runs/41083923716), [job](https://github.com/kredavto/JobMatch-AI/actions/runs/41083923716/job/124159961864), [PR #48](https://github.com/kredavto/JobMatch-AI/pull/48). Это повторная actual local CPU inference, не scripted HTTP fixture.

| Наблюдение | #47 V1 | #48 V2 |
| --- | --- | --- |
| Responses / tokens / stop | 28 /1411 /28 | 28 /1413 /28 |
| Transport failures | 0 | 0 |
| Complete / passed / exit | 28/28 /false /2 | 28/28 /false /2 |
| Exact-gold passes | 2 | 2 |
| Graded mismatches | 7 | 8 |
| Errors | 19 generic | 18 citation; unknown0 |
| RU passes/errors | 0 /11 | 0 /10 |
| EN passes/errors | 2 /8 | 2 /8 |
| CPU model label | AMD EPYC 7763 64-Core Processor | AMD EPYC 9V45 96-Core Processor |

Model/source/parameter pins и prompt/corpus SHA256 совпадают. Native binary hashes различаются, CPU branding/toolchain/build environment не bit-reproducible. Эти названия CPU не означают выделение96 ядер: Docker ограничен4CPU, стандартный public runner. Изменился только статус ru-level-insufficient: error→graded,passed=false. Прежние19 ошибок остаются неклассифицированными в [V1 archive](20261030-qwen-cpu.md); нельзя ретроспективно назвать их citation или приписать разницу19/18 изменению observer/качеству модели. Запрос с/без observer byte-identical в unit contract test; причинное сравнение между разными CPU/builds не установлено.

Все18 **этого запуска** отвергнуты прежним citation guard: exact/trim/duplicate/evidenceIssue. Какая именно часть guard сработала, этот stage label не различает. Это не18 доказанных семантических ошибок. JSON/schema/content/envelope/evidence/transport/timeouts не дали ошибок в данном файле, не глобальная гарантия их отсутствия.8 graded mismatches по-прежнему не смешаны с protocol/provenance errors. Corpus малый, synthetic, частично повторённый между локалями; pipeline filtering и точные gold boundaries ограничивают интерпретацию.

Следующий доступный технический блок — отдельно версионированный bounded source-backed quote-candidate contract, независимые Unicode/multiline/cap проверки и actual CPU evaluation. Не менять архивный prompt/gold, не выдавать schema-constrained provenance за semantic/model acceptance. Representative held-out judgments, собственный deployment, reproducibility/операционные лимиты/ручная приёмка открыты.

Ниже JSON из JOBMATCH_CPU_DIAGNOSTIC_V2 Actions log, переоформленный с отступами без изменения значений. [Контракт стадий](../FAILURE_STAGES.md), [CPU boundaries](../cpu/README.md). Raw outputs/prompts/facts/provider diagnostics не сохранялись.

```json
{
  "format": "jobmatch-cpu-diagnostic-v2",
  "runKind": "actual-local-cpu-inference/synthetic-only",
  "startedAt": "2026-10-30T15:51:26.255Z",
  "finishedAt": "2026-10-30T15:51:53.756Z",
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
  "weightsFileVerified": true,
  "executionBinding": "readonly-file-and-owned-local-process",
  "deploymentIdentityVerified": false,
  "acceptance": "not-accepted",
  "containerImageId": "sha256:894de6dd6ee274a580e313fb7c0f72b573f532821ebdbbf49322a8874b0baa8b",
  "llamaBinarySha256": "0c5a9aed0f47d87f2e86fee92934f5d2365ac118f26811c76dd5b8985ca908f9",
  "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
  "runtime": {
    "node": "v24.22.2",
    "architecture": "x64",
    "cpu": "AMD EPYC 9V45 96-Core Processor"
  },
  "bridge": {
    "acceptedRequests": 28,
    "backendResponses": 28,
    "generatedTokens": 1413,
    "stopped": 28,
    "limited": 0,
    "transportFailures": 0,
    "rejectedRequests": 0
  },
  "diagnosticQuality": "synthetic-provider-or-contract-errors",
  "evaluatorExitCode": 2,
  "evaluation": {
    "schemaVersion": 2,
    "diagnosticFormat": "ai-failure-stages-v1",
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
      "citation": 18,
      "evidence": 0,
      "review-validation": 0,
      "cancelled": 0,
      "timeout": 0,
      "grading-validation": 0,
      "unknown": 0
    },
    "runKind": "operator-configured-endpoint",
    "startedAt": "2026-10-30T15:51:26.316Z",
    "finishedAt": "2026-10-30T15:51:53.136Z",
    "corpusVersion": "synthetic-ru-en-v1",
    "corpusSha256": "c699b0155b7834713b3ac93e72856f87c19ae7817b200aeeaf5795d99fe31d63",
    "promptVersion": "requirements-evidence-v2",
    "promptSha256": "5e072f08e4ee26903793cf4e6d083836d893ecdace7780da1ca9461d9ade61eb",
    "model": "jobmatch-qwen2.5-0.5b-q8-diagnostic",
    "operatorDeclaredModelDigest": "sha256:ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e",
    "modelIdentityVerified": false,
    "semanticAcceptance": "synthetic-exact-gold-only",
    "complete": true,
    "passed": false,
    "planned": 28,
    "completed": 28,
    "errors": 18,
    "rows": [
      {
        "id": "ru-exact",
        "language": "ru",
        "category": "exact",
        "status": "error",
        "passed": false,
        "durationMs": 1280,
        "failureStage": "citation"
      },
      {
        "id": "ru-no-evidence",
        "language": "ru",
        "category": "no-evidence",
        "status": "error",
        "passed": false,
        "durationMs": 822,
        "failureStage": "citation"
      },
      {
        "id": "ru-unverified",
        "language": "ru",
        "category": "unverified",
        "status": "error",
        "passed": false,
        "durationMs": 859,
        "failureStage": "citation"
      },
      {
        "id": "ru-negation",
        "language": "ru",
        "category": "negation",
        "status": "error",
        "passed": false,
        "durationMs": 1414,
        "failureStage": "citation"
      },
      {
        "id": "ru-intention",
        "language": "ru",
        "category": "intention",
        "status": "error",
        "passed": false,
        "durationMs": 838,
        "failureStage": "citation"
      },
      {
        "id": "ru-duration-insufficient",
        "language": "ru",
        "category": "duration-insufficient",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 901
      },
      {
        "id": "ru-duration-supported",
        "language": "ru",
        "category": "duration-supported",
        "status": "error",
        "passed": false,
        "durationMs": 845,
        "failureStage": "citation"
      },
      {
        "id": "ru-level-insufficient",
        "language": "ru",
        "category": "level-insufficient",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 916
      },
      {
        "id": "ru-numbers-insufficient",
        "language": "ru",
        "category": "numbers-insufficient",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 648
      },
      {
        "id": "ru-compound-complete",
        "language": "ru",
        "category": "compound-complete",
        "status": "error",
        "passed": false,
        "durationMs": 905,
        "failureStage": "citation"
      },
      {
        "id": "ru-compound-incomplete",
        "language": "ru",
        "category": "compound-incomplete",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 760
      },
      {
        "id": "ru-contradiction",
        "language": "ru",
        "category": "contradiction",
        "status": "error",
        "passed": false,
        "durationMs": 1738,
        "failureStage": "citation"
      },
      {
        "id": "ru-fact-injection",
        "language": "ru",
        "category": "fact-injection",
        "status": "error",
        "passed": false,
        "durationMs": 835,
        "failureStage": "citation"
      },
      {
        "id": "ru-vacancy-injection",
        "language": "ru",
        "category": "vacancy-injection",
        "status": "error",
        "passed": false,
        "durationMs": 1234,
        "failureStage": "citation"
      },
      {
        "id": "en-exact",
        "language": "en",
        "category": "exact",
        "status": "error",
        "passed": false,
        "durationMs": 892,
        "failureStage": "citation"
      },
      {
        "id": "en-no-evidence",
        "language": "en",
        "category": "no-evidence",
        "status": "error",
        "passed": false,
        "durationMs": 761,
        "failureStage": "citation"
      },
      {
        "id": "en-unverified",
        "language": "en",
        "category": "unverified",
        "status": "error",
        "passed": false,
        "durationMs": 760,
        "failureStage": "citation"
      },
      {
        "id": "en-negation",
        "language": "en",
        "category": "negation",
        "status": "error",
        "passed": false,
        "durationMs": 898,
        "failureStage": "citation"
      },
      {
        "id": "en-intention",
        "language": "en",
        "category": "intention",
        "status": "error",
        "passed": false,
        "durationMs": 826,
        "failureStage": "citation"
      },
      {
        "id": "en-duration-insufficient",
        "language": "en",
        "category": "duration-insufficient",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 909
      },
      {
        "id": "en-duration-supported",
        "language": "en",
        "category": "duration-supported",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 944
      },
      {
        "id": "en-level-insufficient",
        "language": "en",
        "category": "level-insufficient",
        "status": "error",
        "passed": false,
        "durationMs": 823,
        "failureStage": "citation"
      },
      {
        "id": "en-numbers-insufficient",
        "language": "en",
        "category": "numbers-insufficient",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 638
      },
      {
        "id": "en-compound-complete",
        "language": "en",
        "category": "compound-complete",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 846
      },
      {
        "id": "en-compound-incomplete",
        "language": "en",
        "category": "compound-incomplete",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 800
      },
      {
        "id": "en-contradiction",
        "language": "en",
        "category": "contradiction",
        "status": "error",
        "passed": false,
        "durationMs": 1686,
        "failureStage": "citation"
      },
      {
        "id": "en-fact-injection",
        "language": "en",
        "category": "fact-injection",
        "status": "error",
        "passed": false,
        "durationMs": 791,
        "failureStage": "citation"
      },
      {
        "id": "en-vacancy-injection",
        "language": "en",
        "category": "vacancy-injection",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 1,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 1243
      }
    ]
  }
}
```
