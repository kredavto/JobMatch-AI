# Source quote experiment V3 — 30 октября 2026

Модель **не принята**. Runtime `ccdf1befb7efb393f65eaf2d2d73deaee0667a7d`, [Actions run](https://github.com/kredavto/JobMatch-AI/actions/runs/41089559296), [job](https://github.com/kredavto/JobMatch-AI/actions/runs/41089559296/job/124179569037), [PR #49](https://github.com/kredavto/JobMatch-AI/pull/49). Настоящая локальная inference проверенных GGUF weights/source в network-none container; не scripted response fixture.

| Наблюдение | V2 / #48 | Source V3 / #49 |
| --- | --- | --- |
| Responses / stop / transport failure | 28 /28 /0 | 28 /28 /0 |
| Generated tokens | 1413 | 1372 |
| Exact-gold passes | 2 | 6 |
| Errors | 18 citation | 6 citation |
| Graded mismatches | 8 | 16 |
| RU passes/errors | 0 /10 | 3 /3 |
| EN passes/errors | 2 /8 | 3 /3 |
| Evaluator | complete28/28,exit2,passed=false | complete28/28,exit2,passed=false |
| Quote contract / prompt | legacy / requirements-evidence-v2 | source-lines-v1 / requirements-source-lines-v1 |

Weights/source/parameters/corpus unchanged. CPU model string и native binary hash совпали с V2; selected prompt hash и JSON grammar изменились. Это сравнение **разных generation contracts**, не оценка улучшения весов/чистой способности копировать/семантики. Corpus малый/single-line-heavy/частично повторённый между языками; exact quote vocabulary теперь ограничен по построению. V1/V2 archives не переписываются: [V2](20261030-qwen-cpu-stages.md), [V1](20261030-qwen-cpu.md).

В22 graded rows missingRequirements/unexpectedRequirements/missingLinks=0.16 graded mismatches содержат по1 unsupportedLink относительно авторских synthetic gold IDs. Это повод для отдельного audit смысловых связей, а не16 доказанных ошибок на representative/реальных документах.6 citation errors остаются generic по ветви exact/trim/duplicate/risk/source membership; сырой ответ не сохранён, конкретная подпричина не утверждается. Неизвестных/transport/schema errors в этом файле0, не гарантия глобального отсутствия.

Новый путь не подставляет правильный gold/цитаты/evidence после модели. Backend content передаётся без repair; пустые результаты проваливают recall, source-membership/evidence/duplicate failures отвергаются. Scripted fixture pass из unit/native tests — отдельное доказательство контракта, не этот модельный результат. Независимые held-out RU/EN judgments, representative multi-line документы, semantic/operational/manual acceptance и собственный разрешённый deployment открыты. Identity-not-attested/not-accepted сохраняются.

Ниже JSON из единственной JOBMATCH_CPU_DIAGNOSTIC_V3 строки Actions log, отформатированный без изменения значений. [Контракт](../SOURCE_QUOTES.md).

```json
{
  "format": "jobmatch-cpu-diagnostic-v3",
  "quoteContractVersion": "source-lines-v1",
  "runKind": "actual-local-cpu-inference/synthetic-only",
  "startedAt": "2026-10-30T16:28:16.619Z",
  "finishedAt": "2026-10-30T16:28:44.947Z",
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
  "containerImageId": "sha256:89486ae2fd1edc923f253b4ec7c5cd29f3b7d3d84e50af541b501b6bdd18bf53",
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
    "generatedTokens": 1372,
    "stopped": 28,
    "limited": 0,
    "transportFailures": 0,
    "rejectedRequests": 0
  },
  "diagnosticQuality": "synthetic-provider-or-contract-errors",
  "evaluatorExitCode": 2,
  "evaluation": {
    "schemaVersion": 3,
    "quoteContractVersion": "source-lines-v1",
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
      "citation": 6,
      "evidence": 0,
      "review-validation": 0,
      "cancelled": 0,
      "timeout": 0,
      "grading-validation": 0,
      "unknown": 0
    },
    "runKind": "operator-configured-endpoint",
    "startedAt": "2026-10-30T16:28:16.705Z",
    "finishedAt": "2026-10-30T16:28:44.427Z",
    "corpusVersion": "synthetic-ru-en-v1",
    "corpusSha256": "c699b0155b7834713b3ac93e72856f87c19ae7817b200aeeaf5795d99fe31d63",
    "promptVersion": "requirements-source-lines-v1",
    "promptSha256": "a24a586900299e6a384d35f10dc4006deda09fa8ed8b5fd839484c638e9a0693",
    "model": "jobmatch-qwen2.5-0.5b-q8-diagnostic",
    "operatorDeclaredModelDigest": "sha256:ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e",
    "modelIdentityVerified": false,
    "semanticAcceptance": "synthetic-exact-gold-only",
    "complete": true,
    "passed": false,
    "planned": 28,
    "completed": 28,
    "errors": 6,
    "rows": [
      {
        "id": "ru-exact",
        "language": "ru",
        "category": "exact",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 1385
      },
      {
        "id": "ru-no-evidence",
        "language": "ru",
        "category": "no-evidence",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 1382
      },
      {
        "id": "ru-unverified",
        "language": "ru",
        "category": "unverified",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 846
      },
      {
        "id": "ru-negation",
        "language": "ru",
        "category": "negation",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 956
      },
      {
        "id": "ru-intention",
        "language": "ru",
        "category": "intention",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 795
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
        "durationMs": 998
      },
      {
        "id": "ru-duration-supported",
        "language": "ru",
        "category": "duration-supported",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 922
      },
      {
        "id": "ru-level-insufficient",
        "language": "ru",
        "category": "level-insufficient",
        "status": "error",
        "passed": false,
        "durationMs": 1283,
        "failureStage": "citation"
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
        "durationMs": 670
      },
      {
        "id": "ru-compound-complete",
        "language": "ru",
        "category": "compound-complete",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 903
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
        "durationMs": 827
      },
      {
        "id": "ru-contradiction",
        "language": "ru",
        "category": "contradiction",
        "status": "error",
        "passed": false,
        "durationMs": 1632,
        "failureStage": "citation"
      },
      {
        "id": "ru-fact-injection",
        "language": "ru",
        "category": "fact-injection",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 853
      },
      {
        "id": "ru-vacancy-injection",
        "language": "ru",
        "category": "vacancy-injection",
        "status": "error",
        "passed": false,
        "durationMs": 1395,
        "failureStage": "citation"
      },
      {
        "id": "en-exact",
        "language": "en",
        "category": "exact",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 796
      },
      {
        "id": "en-no-evidence",
        "language": "en",
        "category": "no-evidence",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 841
      },
      {
        "id": "en-unverified",
        "language": "en",
        "category": "unverified",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 827
      },
      {
        "id": "en-negation",
        "language": "en",
        "category": "negation",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 821
      },
      {
        "id": "en-intention",
        "language": "en",
        "category": "intention",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 759
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
        "durationMs": 572
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
        "durationMs": 859
      },
      {
        "id": "en-level-insufficient",
        "language": "en",
        "category": "level-insufficient",
        "status": "error",
        "passed": false,
        "durationMs": 1380,
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
        "durationMs": 619
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
        "durationMs": 859
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
        "durationMs": 764
      },
      {
        "id": "en-contradiction",
        "language": "en",
        "category": "contradiction",
        "status": "error",
        "passed": false,
        "durationMs": 1698,
        "failureStage": "citation"
      },
      {
        "id": "en-fact-injection",
        "language": "en",
        "category": "fact-injection",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 820
      },
      {
        "id": "en-vacancy-injection",
        "language": "en",
        "category": "vacancy-injection",
        "status": "error",
        "passed": false,
        "durationMs": 1249,
        "failureStage": "citation"
      }
    ]
  }
}
```

Следующий внутренний блок — консервативные пользовательские пояснения к AI-связям: literal coverage и явные numeric/level contradictions, unknown вне поддерживаемых конструкций, без Score/fact writes и без утверждения semantic proof. Сам source enum не решает16 unsupported links.
