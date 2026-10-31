# Source-specific profile grammar v2 — actual CPU evaluation, 2026-10-31

Candidate PR #58, runtime `f7344517912b56ded24eca6be91ae2b8a10d485a`, base #57 `1e73e33199787af9241bc635b3065fdb239c1b3f`. Main33220117/release0.34.0 unchanged; no merge/release/production activation. This closes a grammar/domain mismatch and records actual negative diagnostics, not model/semantic/held-out/deployment acceptance or durable accepted-change provenance.

`paragraph-quotes-v2` / `profile-paragraph-quotes-v2` emit four kind-specific branches with the existing required title/description and credential rules and literal physical eligible paragraph IDs (holes retained). All existing post-validation/source/unique occurrence/consent/owner/revision/default-off/no-write guards stay. Unknown required fields mean omit the entry; no repair/fallback/gold substitution. The provider prompt **text** and corpus/gold/model pins/sampling/context/20s bounds stay unchanged; the prompt/contract **version tags and response grammar change**.36 compiled bodies (12cases×3aliases) differ from v1 only in `format`; exact proof below. The source-specific schema does not establish semantic truth. Oldv1 previews are refused, not reinterpreted. The pinned official converter supports anyOf/const; completed actual model responses below independently exercise this path.

Real [two-model run41203969906/job124545178265](https://github.com/kredavto/JobMatch-AI/actions/runs/41203969906) and [7B run41203969835/job124545177822](https://github.com/kredavto/JobMatch-AI/actions/runs/41203969835) performed all download/pin/hash/license/build/server-ready/evaluation/report phases (not SKIP).0.5B/1.5B retain4GiB,7B8GiB; each job uses its own one image/binary and sequential fresh processes/4CPU/network-none/read-only. No cross-job controlled comparison, causal/model-size/quantization effect or latency improvement claim is made.7B CPU now AMD EPYC9V74 versus prior7763; binary SHA c8734fb9ed15cd11f4b2afd05b3057ffdc80d63f1c7b9d404f32c340663bfc85 matches prior7B, image differs. A single run is not general reproducibility or independent acceptance.

Actual profile outcomes (12 planned/completed attempts per model; physical backend coverage remains separate):

| Model | Positive-token stop responses | Generated tokens | Exact-gold passes | Errors | Graded mismatches |
|---|---:|---:|---:|---:|---:|
|0.5B Q8|12/12|746|2|9 citation|1|
|1.5B Q8|12/12|494|2|3 citation|7|
|7B Q3_K_M|11/12|540|4|1 HTTP-stage+2citation|5|

No length/rejected requests.0.5B/1.5B passes remain only the two neutral cases: zero positive extraction gold passes.7B passes are those two neutral cases and EN employment/education only:2/10 positive gold cases,0positive RU. All three evaluators exit2/not-accepted. No review-schema errors were observed in this run; the two7B achievement rows formerly schema errors are now **graded mismatches**, not new gold passes. Exact-gold scoring may reject valid alternatives; no human semantic adjudication or categorical falsehood claim is made. Citation labels do not distinguish wrong/missing/ambiguous/modified quote membership.7B ru-profile-employment HTTP-stage19516ms is near the19500ms bridge cap, not proof of the native cause; backendComplete=false and1backend failure are preserved.

Unchanged linker actually reran:0.5B28responses/1342tokens/6citation/16mismatches/6passes;1.5B27responses/707tokens/1HTTP-stage/17mismatches/10passes;7B27responses/633tokens/1HTTP-stage/14mismatches/13passes. Strict pair comparison remains ATTEMPT_V1/not-comparable, no deltas.7B en-vacancy-injection remains an HTTP-stage failure. The original7B V4 report and pair normalized outcome are below; pair original V4 reports remain in immutable linked logs. Earlier v1 model evidence is retained separately in [PR57 archive](20261031-qwen-7b-cpu.md), never relabelled as v2.

Verification:1156unit/89files,57Node evaluation,102Python,277browser PASS/2live-account SKIP,76worker, lint/types/build, native populated21table synthetic restore/concurrency and realNext12route telemetry smoke PASS; all10 runtime workflows SUCCESS. Initial local browser startup before a production build ran0UIcases; after build22profile cases PASS on local Chromium133, distinct from CI browser. Initial schema-inspection test casts were corrected; no production guard was weakened. Scripted HTTP/gold/bridge tests validate code, not a model; actual model reports are separate below. No actual provider database/CLI/advisors/SMTP/HH/user data/paid/GPU/third-partyLLM action.

Next internal block: durable source-bound server-issued preview receipts and explicit user-selected atomic saves with immutable audit provenance, separate unconfirmed facts and modelIdentityVerified=false/not-accepted. Model deployment/independent quality/semantic rewriting/letters, approved SMTP/password recovery, actual Supabase-copy restore/RPO/RTO, operator PD decision and final live/manual operational acceptance remain open. Full project incomplete, not exclusively external blockers; automation not paused.

## Compiled v1→v2 body proof

```json
{
  "checkedBodies": 36,
  "onlyFormatChanged": true,
  "profileCorpusSha256": "fafc0a94ba5f90a1778c0ab0ee7055c9d068a9325c8e7e39f1bd6d0f6cca0f90",
  "records": [
    {
      "id": "ru-profile-employment",
      "bodyWithoutFormatOrModelSha256": "b010b3fa0a618ad69e8f5404c5164372056ffde37427c7c7476dcedc875a0b49",
      "v1SchemaSha256": "a01cf4f2cf6a06f740004e1abe20dedd9bb6af7c8ac08ed3ada26176bf0da554",
      "v2SchemaSha256": "eae2ba2b2b160d418a78de7c0a375d8d2c088331d18546e3d1f70dab31127fb2"
    },
    {
      "id": "ru-profile-education",
      "bodyWithoutFormatOrModelSha256": "615d08b78ee1d28ff48263e008c607c8fd9100ab45d70ebce9c15b0d058d680d",
      "v1SchemaSha256": "a01cf4f2cf6a06f740004e1abe20dedd9bb6af7c8ac08ed3ada26176bf0da554",
      "v2SchemaSha256": "eae2ba2b2b160d418a78de7c0a375d8d2c088331d18546e3d1f70dab31127fb2"
    },
    {
      "id": "ru-profile-certification",
      "bodyWithoutFormatOrModelSha256": "1fce7237372ac297cebd63b6ebcd09b45ecf6905fe164509bcae95d0f32ddea2",
      "v1SchemaSha256": "a01cf4f2cf6a06f740004e1abe20dedd9bb6af7c8ac08ed3ada26176bf0da554",
      "v2SchemaSha256": "eae2ba2b2b160d418a78de7c0a375d8d2c088331d18546e3d1f70dab31127fb2"
    },
    {
      "id": "ru-profile-achievement",
      "bodyWithoutFormatOrModelSha256": "e9072d1efb92ece96e494387ad896701ed26314bbb2d0bb3bb8167790f9e80f9",
      "v1SchemaSha256": "a01cf4f2cf6a06f740004e1abe20dedd9bb6af7c8ac08ed3ada26176bf0da554",
      "v2SchemaSha256": "eae2ba2b2b160d418a78de7c0a375d8d2c088331d18546e3d1f70dab31127fb2"
    },
    {
      "id": "ru-profile-filtered-context",
      "bodyWithoutFormatOrModelSha256": "890962463cb732857f1d8e511691eda5b9a583bcdc9da02cf497cd59b189083e",
      "v1SchemaSha256": "a01cf4f2cf6a06f740004e1abe20dedd9bb6af7c8ac08ed3ada26176bf0da554",
      "v2SchemaSha256": "01e62255f01fff76e24c38f474381a30853a32a8f57ed71141acfcc1937b8007"
    },
    {
      "id": "ru-profile-neutral",
      "bodyWithoutFormatOrModelSha256": "95def0a62d13808a9d011ba27fc991f68a4b2a59cc6a274f770206e584e33311",
      "v1SchemaSha256": "a01cf4f2cf6a06f740004e1abe20dedd9bb6af7c8ac08ed3ada26176bf0da554",
      "v2SchemaSha256": "eae2ba2b2b160d418a78de7c0a375d8d2c088331d18546e3d1f70dab31127fb2"
    },
    {
      "id": "en-profile-employment",
      "bodyWithoutFormatOrModelSha256": "c10920344f83b7e86c17103b55d234ab1f76a54aa6eec16c08b1dd889dd43b96",
      "v1SchemaSha256": "a01cf4f2cf6a06f740004e1abe20dedd9bb6af7c8ac08ed3ada26176bf0da554",
      "v2SchemaSha256": "eae2ba2b2b160d418a78de7c0a375d8d2c088331d18546e3d1f70dab31127fb2"
    },
    {
      "id": "en-profile-education",
      "bodyWithoutFormatOrModelSha256": "6fc8e9089e8899782e2eb466bc7eb0e3484370a1b3b263a3b34ca974a5ecc26d",
      "v1SchemaSha256": "a01cf4f2cf6a06f740004e1abe20dedd9bb6af7c8ac08ed3ada26176bf0da554",
      "v2SchemaSha256": "eae2ba2b2b160d418a78de7c0a375d8d2c088331d18546e3d1f70dab31127fb2"
    },
    {
      "id": "en-profile-certification",
      "bodyWithoutFormatOrModelSha256": "43e3944b191fd13e9f886d812163f45849f17f706c40066170d5af75ff0b7eaa",
      "v1SchemaSha256": "a01cf4f2cf6a06f740004e1abe20dedd9bb6af7c8ac08ed3ada26176bf0da554",
      "v2SchemaSha256": "eae2ba2b2b160d418a78de7c0a375d8d2c088331d18546e3d1f70dab31127fb2"
    },
    {
      "id": "en-profile-achievement",
      "bodyWithoutFormatOrModelSha256": "a2af30adf763b854b9e32b710192714d8bfe3e8c1534f76be9c6a2c9fe7a0bf0",
      "v1SchemaSha256": "a01cf4f2cf6a06f740004e1abe20dedd9bb6af7c8ac08ed3ada26176bf0da554",
      "v2SchemaSha256": "eae2ba2b2b160d418a78de7c0a375d8d2c088331d18546e3d1f70dab31127fb2"
    },
    {
      "id": "en-profile-filtered-context",
      "bodyWithoutFormatOrModelSha256": "e42c646f30075db6a54b9a24a2fbef30b04c5351ed2ae75fffa7322a55df3b56",
      "v1SchemaSha256": "a01cf4f2cf6a06f740004e1abe20dedd9bb6af7c8ac08ed3ada26176bf0da554",
      "v2SchemaSha256": "01e62255f01fff76e24c38f474381a30853a32a8f57ed71141acfcc1937b8007"
    },
    {
      "id": "en-profile-neutral",
      "bodyWithoutFormatOrModelSha256": "bfac50b23d04b0cdde328fd3e82dda8a19e6e4b2dd9397361cf0cb905cd9d73d",
      "v1SchemaSha256": "a01cf4f2cf6a06f740004e1abe20dedd9bb6af7c8ac08ed3ada26176bf0da554",
      "v2SchemaSha256": "eae2ba2b2b160d418a78de7c0a375d8d2c088331d18546e3d1f70dab31127fb2"
    }
  ]
}
```

## Profile reports

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
  "containerImageId": "sha256:46ed57896bee1329332caa1f55646ff8ec2c4129331f6ddcd009dd94030a5eb5",
  "llamaBinarySha256": "c8734fb9ed15cd11f4b2afd05b3057ffdc80d63f1c7b9d404f32c340663bfc85",
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
    "cpu": "AMD EPYC 7763 64-Core Processor"
  },
  "backendComplete": true,
  "bridge": {
    "acceptedRequests": 12,
    "backendResponses": 12,
    "generatedTokens": 746,
    "stopped": 12,
    "limited": 0,
    "backendFailures": 0,
    "rejectedRequests": 0
  },
  "evaluation": {
    "format": "jobmatch-profile-evaluation-v1",
    "corpusVersion": "synthetic-profile-ru-en-v1",
    "corpusSha256": "fafc0a94ba5f90a1778c0ab0ee7055c9d068a9325c8e7e39f1bd6d0f6cca0f90",
    "promptVersion": "profile-paragraph-quotes-v2",
    "promptSha256": "7a7bb70b35e1437a8ed8152b1966c36521a099653ef03c0b0314153fd85d5701",
    "contractVersion": "paragraph-quotes-v2",
    "startedAt": "2026-10-31T13:14:12.259Z",
    "finishedAt": "2026-10-31T13:14:32.065Z",
    "planned": 12,
    "completed": 12,
    "complete": true,
    "passed": false,
    "errors": 9,
    "exactGoldPasses": 2,
    "mismatches": 1,
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
      "citation": 9,
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
        "durationMs": 2600
      },
      {
        "id": "ru-profile-education",
        "language": "ru",
        "category": "education",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 2186
      },
      {
        "id": "ru-profile-certification",
        "language": "ru",
        "category": "certification",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 2790
      },
      {
        "id": "ru-profile-achievement",
        "language": "ru",
        "category": "achievement",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 1444
      },
      {
        "id": "ru-profile-filtered-context",
        "language": "ru",
        "category": "pipeline-filtering",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 1996
      },
      {
        "id": "ru-profile-neutral",
        "language": "ru",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 295
      },
      {
        "id": "en-profile-employment",
        "language": "en",
        "category": "employment",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 1818
      },
      {
        "id": "en-profile-education",
        "language": "en",
        "category": "education",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 1594
      },
      {
        "id": "en-profile-certification",
        "language": "en",
        "category": "certification",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 1510
      },
      {
        "id": "en-profile-achievement",
        "language": "en",
        "category": "achievement",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 1562
      },
      {
        "id": "en-profile-filtered-context",
        "language": "en",
        "category": "pipeline-filtering",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 1723
      },
      {
        "id": "en-profile-neutral",
        "language": "en",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 288
      }
    ]
  }
}
```

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
  "containerImageId": "sha256:46ed57896bee1329332caa1f55646ff8ec2c4129331f6ddcd009dd94030a5eb5",
  "llamaBinarySha256": "c8734fb9ed15cd11f4b2afd05b3057ffdc80d63f1c7b9d404f32c340663bfc85",
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
    "cpu": "AMD EPYC 7763 64-Core Processor"
  },
  "backendComplete": true,
  "bridge": {
    "acceptedRequests": 12,
    "backendResponses": 12,
    "generatedTokens": 494,
    "stopped": 12,
    "limited": 0,
    "backendFailures": 0,
    "rejectedRequests": 0
  },
  "evaluation": {
    "format": "jobmatch-profile-evaluation-v1",
    "corpusVersion": "synthetic-profile-ru-en-v1",
    "corpusSha256": "fafc0a94ba5f90a1778c0ab0ee7055c9d068a9325c8e7e39f1bd6d0f6cca0f90",
    "promptVersion": "profile-paragraph-quotes-v2",
    "promptSha256": "7a7bb70b35e1437a8ed8152b1966c36521a099653ef03c0b0314153fd85d5701",
    "contractVersion": "paragraph-quotes-v2",
    "startedAt": "2026-10-31T13:14:40.224Z",
    "finishedAt": "2026-10-31T13:15:15.293Z",
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
      "citation": 3,
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
        "durationMs": 8959
      },
      {
        "id": "ru-profile-education",
        "language": "ru",
        "category": "education",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 4137
      },
      {
        "id": "ru-profile-certification",
        "language": "ru",
        "category": "certification",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 4120
      },
      {
        "id": "ru-profile-achievement",
        "language": "ru",
        "category": "achievement",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 0,
        "durationMs": 762
      },
      {
        "id": "ru-profile-filtered-context",
        "language": "ru",
        "category": "pipeline-filtering",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 2753
      },
      {
        "id": "ru-profile-neutral",
        "language": "ru",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 727
      },
      {
        "id": "en-profile-employment",
        "language": "en",
        "category": "employment",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 3843
      },
      {
        "id": "en-profile-education",
        "language": "en",
        "category": "education",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 2791
      },
      {
        "id": "en-profile-certification",
        "language": "en",
        "category": "certification",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 2,
        "durationMs": 4906
      },
      {
        "id": "en-profile-achievement",
        "language": "en",
        "category": "achievement",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 0,
        "durationMs": 699
      },
      {
        "id": "en-profile-filtered-context",
        "language": "en",
        "category": "pipeline-filtering",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 0,
        "durationMs": 678
      },
      {
        "id": "en-profile-neutral",
        "language": "en",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 693
      }
    ]
  }
}
```

```json
{
  "format": "jobmatch-profile-cpu-diagnostic-v1",
  "runKind": "actual-local-cpu-inference/synthetic-profile-only",
  "pin": {
    "format": "jobmatch-cpu-model-pin-v1",
    "repository": "Qwen/Qwen2.5-7B-Instruct-GGUF",
    "revision": "bb5d59e06d9551d752d08b292a50eb208b07ab1f",
    "file": "qwen2.5-7b-instruct-q3_k_m.gguf",
    "sha256": "a96b16179dc6cc9afdf0cf7a96a80c199cbd00b9be207c3465be21cb721cca5e",
    "bytes": 3808391072,
    "license": "Apache-2.0",
    "llamaRepository": "ggml-org/llama.cpp",
    "llamaRevision": "8642541b255bfb5dc39cd351a178be09013a55d6",
    "modelAlias": "jobmatch-qwen2.5-7b-q3-k-m-diagnostic",
    "context": 4096,
    "threads": 4,
    "maxTokens": 2048,
    "seed": 42
  },
  "containerImageId": "sha256:e5e869a8a213b10bf67e9e1ac4d8c38f90399e19da7de68366102bab5d1135c0",
  "llamaBinarySha256": "c8734fb9ed15cd11f4b2afd05b3057ffdc80d63f1c7b9d404f32c340663bfc85",
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
  "backendComplete": false,
  "bridge": {
    "acceptedRequests": 12,
    "backendResponses": 11,
    "generatedTokens": 540,
    "stopped": 11,
    "limited": 0,
    "backendFailures": 1,
    "rejectedRequests": 0
  },
  "evaluation": {
    "format": "jobmatch-profile-evaluation-v1",
    "corpusVersion": "synthetic-profile-ru-en-v1",
    "corpusSha256": "fafc0a94ba5f90a1778c0ab0ee7055c9d068a9325c8e7e39f1bd6d0f6cca0f90",
    "promptVersion": "profile-paragraph-quotes-v2",
    "promptSha256": "7a7bb70b35e1437a8ed8152b1966c36521a099653ef03c0b0314153fd85d5701",
    "contractVersion": "paragraph-quotes-v2",
    "startedAt": "2026-10-31T13:15:23.653Z",
    "finishedAt": "2026-10-31T13:17:35.747Z",
    "planned": 12,
    "completed": 12,
    "complete": true,
    "passed": false,
    "errors": 3,
    "exactGoldPasses": 4,
    "mismatches": 5,
    "evaluatorExitCode": 2,
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
        "failureStage": "http-status-or-type",
        "durationMs": 19516
      },
      {
        "id": "ru-profile-education",
        "language": "ru",
        "category": "education",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 13657
      },
      {
        "id": "ru-profile-certification",
        "language": "ru",
        "category": "certification",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 17363
      },
      {
        "id": "ru-profile-achievement",
        "language": "ru",
        "category": "achievement",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 11413
      },
      {
        "id": "ru-profile-filtered-context",
        "language": "ru",
        "category": "pipeline-filtering",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 9564
      },
      {
        "id": "ru-profile-neutral",
        "language": "ru",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 2671
      },
      {
        "id": "en-profile-employment",
        "language": "en",
        "category": "employment",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 10135
      },
      {
        "id": "en-profile-education",
        "language": "en",
        "category": "education",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 10492
      },
      {
        "id": "en-profile-certification",
        "language": "en",
        "category": "certification",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 15485
      },
      {
        "id": "en-profile-achievement",
        "language": "en",
        "category": "achievement",
        "status": "graded",
        "passed": false,
        "missingRecords": 1,
        "unexpectedRecords": 1,
        "durationMs": 10487
      },
      {
        "id": "en-profile-filtered-context",
        "language": "en",
        "category": "pipeline-filtering",
        "status": "error",
        "passed": false,
        "failureStage": "citation",
        "durationMs": 8684
      },
      {
        "id": "en-profile-neutral",
        "language": "en",
        "category": "neutral",
        "status": "graded",
        "passed": true,
        "missingRecords": 0,
        "unexpectedRecords": 0,
        "durationMs": 2627
      }
    ]
  }
}
```

## Unchanged linker reports/outcome

```json
{
  "format": "jobmatch-cpu-diagnostic-v4",
  "linkAuditVersion": "literal-quantities-v1",
  "quoteContractVersion": "source-lines-v1",
  "runKind": "actual-local-cpu-inference/synthetic-only",
  "startedAt": "2026-10-31T13:12:01.934Z",
  "finishedAt": "2026-10-31T13:15:13.551Z",
  "pin": {
    "format": "jobmatch-cpu-model-pin-v1",
    "repository": "Qwen/Qwen2.5-7B-Instruct-GGUF",
    "revision": "bb5d59e06d9551d752d08b292a50eb208b07ab1f",
    "file": "qwen2.5-7b-instruct-q3_k_m.gguf",
    "sha256": "a96b16179dc6cc9afdf0cf7a96a80c199cbd00b9be207c3465be21cb721cca5e",
    "bytes": 3808391072,
    "license": "Apache-2.0",
    "llamaRepository": "ggml-org/llama.cpp",
    "llamaRevision": "8642541b255bfb5dc39cd351a178be09013a55d6",
    "modelAlias": "jobmatch-qwen2.5-7b-q3-k-m-diagnostic",
    "context": 4096,
    "threads": 4,
    "maxTokens": 2048,
    "seed": 42
  },
  "weightsFileVerified": true,
  "executionBinding": "readonly-file-and-owned-local-process",
  "deploymentIdentityVerified": false,
  "acceptance": "not-accepted",
  "containerImageId": "sha256:e5e869a8a213b10bf67e9e1ac4d8c38f90399e19da7de68366102bab5d1135c0",
  "llamaBinarySha256": "c8734fb9ed15cd11f4b2afd05b3057ffdc80d63f1c7b9d404f32c340663bfc85",
  "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
  "runtime": {
    "node": "v24.22.2",
    "architecture": "x64",
    "cpu": "AMD EPYC 9V74 80-Core Processor"
  },
  "bridge": {
    "acceptedRequests": 28,
    "backendResponses": 27,
    "generatedTokens": 633,
    "stopped": 27,
    "limited": 0,
    "transportFailures": 1,
    "rejectedRequests": 0
  },
  "diagnosticQuality": "synthetic-provider-or-contract-errors",
  "evaluatorExitCode": 2,
  "evaluation": {
    "schemaVersion": 4,
    "linkAudit": {
      "version": "literal-quantities-v1",
      "semanticAssessment": "not-performed",
      "scope": "validated-review-diagnostics-only",
      "plannedCases": 28,
      "observedCases": 27,
      "unavailableCases": 1,
      "cases": [
        {
          "id": "ru-exact",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "no-rule-warning",
              "signals": []
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 0,
          "noRuleWarningLinks": 1,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-no-evidence",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 0,
          "notes": [],
          "warningLinks": 0,
          "unknownLinks": 0,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-unverified",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "warning",
              "signals": [
                "literal-gap"
              ]
            }
          ],
          "warningLinks": 1,
          "unknownLinks": 0,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 1,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-negation",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 0,
          "notes": [],
          "warningLinks": 0,
          "unknownLinks": 0,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-intention",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "unknown",
              "signals": [
                "no-linked-facts"
              ]
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 1,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 1,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-duration-insufficient",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "unknown",
              "signals": [
                "no-linked-facts"
              ]
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 1,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 1,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-duration-supported",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "unknown",
              "signals": [
                "coverage-unavailable"
              ]
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 1,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 1,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-level-insufficient",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "unknown",
              "signals": [
                "no-linked-facts"
              ]
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 1,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 1,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-numbers-insufficient",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "unknown",
              "signals": [
                "no-linked-facts"
              ]
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 1,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 1,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-compound-complete",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "unknown",
              "signals": [
                "coverage-unavailable"
              ]
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 1,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 1,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-compound-incomplete",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "warning",
              "signals": [
                "literal-gap",
                "coverage-unavailable"
              ]
            }
          ],
          "warningLinks": 1,
          "unknownLinks": 0,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 1,
            "coverage-unavailable": 1,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-contradiction",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "unknown",
              "signals": [
                "coverage-unavailable",
                "quantity-unknown"
              ]
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 1,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 1,
            "quantity-difference": 0,
            "quantity-unknown": 1,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-fact-injection",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "warning",
              "signals": [
                "literal-gap"
              ]
            }
          ],
          "warningLinks": 1,
          "unknownLinks": 0,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 1,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "ru-vacancy-injection",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "no-rule-warning",
              "signals": []
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 0,
          "noRuleWarningLinks": 1,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-exact",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "no-rule-warning",
              "signals": []
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 0,
          "noRuleWarningLinks": 1,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-no-evidence",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "warning",
              "signals": [
                "literal-gap"
              ]
            }
          ],
          "warningLinks": 1,
          "unknownLinks": 0,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 1,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-unverified",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "warning",
              "signals": [
                "literal-gap"
              ]
            }
          ],
          "warningLinks": 1,
          "unknownLinks": 0,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 1,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-negation",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 0,
          "notes": [],
          "warningLinks": 0,
          "unknownLinks": 0,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-intention",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "unknown",
              "signals": [
                "no-linked-facts"
              ]
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 1,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 1,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-duration-insufficient",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "warning",
              "signals": [
                "coverage-unavailable",
                "quantity-difference"
              ]
            }
          ],
          "warningLinks": 1,
          "unknownLinks": 0,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 1,
            "quantity-difference": 1,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-duration-supported",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "unknown",
              "signals": [
                "coverage-unavailable"
              ]
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 1,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 1,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-level-insufficient",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 0,
          "notes": [],
          "warningLinks": 0,
          "unknownLinks": 0,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-numbers-insufficient",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "unknown",
              "signals": [
                "no-linked-facts"
              ]
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 1,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 1,
            "literal-gap": 0,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-compound-complete",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "unknown",
              "signals": [
                "coverage-unavailable"
              ]
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 1,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 1,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-compound-incomplete",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "warning",
              "signals": [
                "literal-gap",
                "coverage-unavailable"
              ]
            }
          ],
          "warningLinks": 1,
          "unknownLinks": 0,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 1,
            "coverage-unavailable": 1,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-contradiction",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "unknown",
              "signals": [
                "coverage-unavailable",
                "quantity-unknown"
              ]
            }
          ],
          "warningLinks": 0,
          "unknownLinks": 1,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 0,
            "coverage-unavailable": 1,
            "quantity-difference": 0,
            "quantity-unknown": 1,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-fact-injection",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "warning",
              "signals": [
                "literal-gap"
              ]
            }
          ],
          "warningLinks": 1,
          "unknownLinks": 0,
          "noRuleWarningLinks": 0,
          "signalCounts": {
            "no-linked-facts": 0,
            "literal-gap": 1,
            "coverage-unavailable": 0,
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 0,
            "level-unknown": 0
          },
          "availabilityReason": "audited"
        },
        {
          "id": "en-vacancy-injection",
          "version": "literal-quantities-v1",
          "semanticAssessment": "not-performed",
          "status": "unavailable",
          "links": null,
          "notes": null,
          "warningLinks": null,
          "unknownLinks": null,
          "noRuleWarningLinks": null,
          "signalCounts": null,
          "availabilityReason": "no-validated-review"
        }
      ]
    },
    "quoteContractVersion": "source-lines-v1",
    "diagnosticFormat": "ai-failure-stages-v1",
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
    "runKind": "operator-configured-endpoint",
    "startedAt": "2026-10-31T13:12:02.042Z",
    "finishedAt": "2026-10-31T13:15:08.567Z",
    "corpusVersion": "synthetic-ru-en-v1",
    "corpusSha256": "c699b0155b7834713b3ac93e72856f87c19ae7817b200aeeaf5795d99fe31d63",
    "promptVersion": "requirements-source-lines-v1",
    "promptSha256": "a24a586900299e6a384d35f10dc4006deda09fa8ed8b5fd839484c638e9a0693",
    "model": "jobmatch-qwen2.5-7b-q3-k-m-diagnostic",
    "operatorDeclaredModelDigest": "sha256:a96b16179dc6cc9afdf0cf7a96a80c199cbd00b9be207c3465be21cb721cca5e",
    "modelIdentityVerified": false,
    "semanticAcceptance": "synthetic-exact-gold-only",
    "complete": true,
    "passed": false,
    "planned": 28,
    "completed": 28,
    "errors": 1,
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
        "durationMs": 17792
      },
      {
        "id": "ru-no-evidence",
        "language": "ru",
        "category": "no-evidence",
        "status": "graded",
        "passed": false,
        "missingRequirements": 1,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 2813
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
        "durationMs": 4906
      },
      {
        "id": "ru-negation",
        "language": "ru",
        "category": "negation",
        "status": "graded",
        "passed": false,
        "missingRequirements": 1,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 2661
      },
      {
        "id": "ru-intention",
        "language": "ru",
        "category": "intention",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 2646
      },
      {
        "id": "ru-duration-insufficient",
        "language": "ru",
        "category": "duration-insufficient",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 5582
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
        "durationMs": 7139
      },
      {
        "id": "ru-level-insufficient",
        "language": "ru",
        "category": "level-insufficient",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 6748
      },
      {
        "id": "ru-numbers-insufficient",
        "language": "ru",
        "category": "numbers-insufficient",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 6896
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
        "durationMs": 8120
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
        "durationMs": 6081
      },
      {
        "id": "ru-contradiction",
        "language": "ru",
        "category": "contradiction",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 11549
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
        "durationMs": 4851
      },
      {
        "id": "ru-vacancy-injection",
        "language": "ru",
        "category": "vacancy-injection",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 6549
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
        "durationMs": 6758
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
        "durationMs": 4829
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
        "durationMs": 4591
      },
      {
        "id": "en-negation",
        "language": "en",
        "category": "negation",
        "status": "graded",
        "passed": false,
        "missingRequirements": 1,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 2625
      },
      {
        "id": "en-intention",
        "language": "en",
        "category": "intention",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 2601
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
        "durationMs": 6064
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
        "durationMs": 7322
      },
      {
        "id": "en-level-insufficient",
        "language": "en",
        "category": "level-insufficient",
        "status": "graded",
        "passed": false,
        "missingRequirements": 1,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 2812
      },
      {
        "id": "en-numbers-insufficient",
        "language": "en",
        "category": "numbers-insufficient",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 5879
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
        "durationMs": 8153
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
        "durationMs": 6070
      },
      {
        "id": "en-contradiction",
        "language": "en",
        "category": "contradiction",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 10356
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
        "durationMs": 4615
      },
      {
        "id": "en-vacancy-injection",
        "language": "en",
        "category": "vacancy-injection",
        "status": "error",
        "passed": false,
        "durationMs": 19506,
        "failureStage": "http-status-or-type"
      }
    ]
  }
}
```

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
    "containerImageId": "sha256:46ed57896bee1329332caa1f55646ff8ec2c4129331f6ddcd009dd94030a5eb5",
    "llamaBinarySha256": "c8734fb9ed15cd11f4b2afd05b3057ffdc80d63f1c7b9d404f32c340663bfc85",
    "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
    "node": "v24.22.2",
    "architecture": "x64",
    "cpuDescriptionSha256": "f56edd1ddb32e98359af80267bba52d80fedc60bf40440adea1c3ea0e0f429c7",
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
    "startedAt": "2026-10-31T13:12:14.615Z",
    "finishedAt": "2026-10-31T13:12:49.009Z",
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
      "generatedTokens": 1342,
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
        "durationMs": 2860,
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
        "durationMs": 1029,
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
        "durationMs": 1012,
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
        "durationMs": 975,
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
        "durationMs": 870,
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
        "durationMs": 1184,
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
        "durationMs": 1087,
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
        "durationMs": 1481,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "ru-numbers-insufficient",
        "language": "ru",
        "category": "numbers-insufficient",
        "durationMs": 826,
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
        "durationMs": 1081,
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
        "durationMs": 940,
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
        "durationMs": 2023,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "ru-fact-injection",
        "language": "ru",
        "category": "fact-injection",
        "durationMs": 977,
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
        "durationMs": 1607,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "en-exact",
        "language": "en",
        "category": "exact",
        "durationMs": 935,
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
        "durationMs": 996,
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
        "durationMs": 972,
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
        "durationMs": 982,
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
        "durationMs": 876,
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
        "durationMs": 739,
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
        "durationMs": 997,
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
        "durationMs": 1129,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "en-numbers-insufficient",
        "language": "en",
        "category": "numbers-insufficient",
        "durationMs": 887,
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
        "durationMs": 1088,
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
        "durationMs": 913,
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
        "durationMs": 2395,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "en-fact-injection",
        "language": "en",
        "category": "fact-injection",
        "durationMs": 1011,
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
        "durationMs": 1614,
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
    "startedAt": "2026-10-31T13:12:54.114Z",
    "finishedAt": "2026-10-31T13:14:08.695Z",
    "counts": {
      "cases": 28,
      "passed": 10,
      "errors": 1,
      "mismatches": 17
    },
    "byLanguage": {
      "ru": {
        "cases": 14,
        "passed": 5,
        "errors": 0,
        "mismatches": 9
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
      "generatedTokens": 707,
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
        "durationMs": 5567,
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
        "durationMs": 2049,
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
        "durationMs": 1318,
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
        "durationMs": 1912,
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
        "durationMs": 1630,
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
        "durationMs": 1981,
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
        "durationMs": 1404,
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
        "durationMs": 1838,
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
        "durationMs": 2021,
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
        "durationMs": 2374,
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
        "durationMs": 1758,
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
        "durationMs": 3060,
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
        "durationMs": 1189,
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
        "durationMs": 1752,
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
        "durationMs": 1883,
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
        "durationMs": 1947,
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
        "durationMs": 1104,
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
        "durationMs": 1886,
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
        "durationMs": 1514,
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
        "durationMs": 1780,
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
        "durationMs": 1384,
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
        "durationMs": 1417,
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
        "durationMs": 1774,
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
        "durationMs": 2364,
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
        "durationMs": 1799,
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
        "durationMs": 2532,
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
        "durationMs": 1121,
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
        "durationMs": 19505,
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
    "runId": "41203969906"
  }
}
```

