# Actual pinned CPU experiment with conservative link annotations — 30 October 2026

Runtime commit: `b90ede5d49dd1f62d61896851a0bce9eca4e1e81`, candidate [PR #50](https://github.com/kredavto/JobMatch-AI/pull/50), stacked on #49.
Actual [run41099467960/job124213740843](https://github.com/kredavto/JobMatch-AI/actions/runs/41099467960). The log contains download/build/server-ready/evaluation-returned/report and cleanup, not an HTTP mock or a transport-only probe.

**Not accepted.** Complete28/28, evaluator exit2,6 citation errors,16 graded mismatches and6 exact-gold passes (RU3/14, EN3/14). Each mismatched row has one unsupported link against this synthetic gold; this is not an independent semantic judgment of real documents.28 real backend responses,1372 generated tokens,28 stop,0 token-limit stops/transport failures. Model identity/deployment acceptance are not established by a file digest or this process binding.

## Audit observation

| Observation | Cases / links |
| --- | ---: |
| Planned corpus cases |28|
| Validated reviews available for audit |22|
| Unavailable (citation failures; null notes/counts) |6|
| Observed linked requirements |22|
| Warning |16|
| Unknown |4|
| No rule warning |2|

Signals: literal-gap12, quantity-difference4, coverage-unavailable10; other signal counts0. Signals overlap; they are not additive case totals. In particular, both insufficient-level cases failed citation before audit, so level-below0 does not establish that level links are safe. Independent unit/browser cases exercise those labels separately. Every available case has semanticAssessment=not-performed; no-rule-warning is not a verified link.

The16 warning cases coincide here with the16 synthetic gold-mismatch cases. **Do not generalize this to precision/recall, completeness or model acceptance:** there are only28 synthetic cases, paired RU/EN examples, a small rule vocabulary and6 excluded invalid reviews. Four gold-passing duration/compound cases remain unknown. No independent representative held-out judgments or accepted production endpoint were obtained.

## Comparison with archived V3

Pinned weights/source revision/options, source-lines-v1 prompt/version/hash, corpus hash and bridge counters match #49. Grading rows also match after excluding timing fields:6 errors/16 mismatches/6 passes. The audit does not repair model content, filter gold failures, replace quotes, retry or change grading. A separate HTTP process test compares the28 serialized requests with audit off/on, without claiming real model inference.

This run used `INTEL(R) XEON(R) PLATINUM 8573C` / `v24.22.2`; #49 used `AMD EPYC 9V45 96-Core Processor`. Native compilation yielded a different llama binary digest/image; the pinned source remains identical. Toolchain/base image/CPU are not bit-reproducible. Equal outcomes are one observation, not a causal improvement claim or loaded-weight attestation. Historical V1/V2/V3 reports remain unchanged.

The public standard runner,4CPU/4GiB limit, non-root/read-only/no-capabilities/no-new-privileges/deadlines and network-none inference remain in force. Public weights were downloaded and exact revision-pointer/size/SHA/license checked, then read-only file SHA checked before and after inference; backend was an owned local process. No external inference API, user document, mail, hh.ru write, paid infrastructure, registry publication, model upload/cache or production activation was used.

## Complete safe report

Only allowlisted counters/stages/public corpus IDs/hashes/model/runtime metadata and audit code/index notes follow. There are no input quotes, facts, evidence IDs, endpoint credentials or raw model/provider output.

```json
{
  "format": "jobmatch-cpu-diagnostic-v4",
  "linkAuditVersion": "literal-quantities-v1",
  "quoteContractVersion": "source-lines-v1",
  "runKind": "actual-local-cpu-inference/synthetic-only",
  "startedAt": "2026-10-30T17:36:34.853Z",
  "finishedAt": "2026-10-30T17:37:20.019Z",
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
  "containerImageId": "sha256:f5edcefe6c347d69337e77d5f0388c88dca2054db9acd7ed54e96a28262df30c",
  "llamaBinarySha256": "6817f71ab1fb44e0e23fdf5c3e5d028f76f0dcbf82224cf762c82d23b1fd708d",
  "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
  "runtime": {
    "node": "v24.22.2",
    "architecture": "x64",
    "cpu": "INTEL(R) XEON(R) PLATINUM 8573C"
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
    "schemaVersion": 4,
    "linkAudit": {
      "version": "literal-quantities-v1",
      "semanticAssessment": "not-performed",
      "scope": "validated-review-diagnostics-only",
      "plannedCases": 28,
      "observedCases": 22,
      "unavailableCases": 6,
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
          "id": "ru-intention",
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
          "id": "ru-duration-insufficient",
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
          "status": "unavailable",
          "links": null,
          "notes": null,
          "warningLinks": null,
          "unknownLinks": null,
          "noRuleWarningLinks": null,
          "signalCounts": null,
          "availabilityReason": "no-validated-review"
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
          "status": "unavailable",
          "links": null,
          "notes": null,
          "warningLinks": null,
          "unknownLinks": null,
          "noRuleWarningLinks": null,
          "signalCounts": null,
          "availabilityReason": "no-validated-review"
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
          "status": "unavailable",
          "links": null,
          "notes": null,
          "warningLinks": null,
          "unknownLinks": null,
          "noRuleWarningLinks": null,
          "signalCounts": null,
          "availabilityReason": "no-validated-review"
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
          "id": "en-intention",
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
          "status": "unavailable",
          "links": null,
          "notes": null,
          "warningLinks": null,
          "unknownLinks": null,
          "noRuleWarningLinks": null,
          "signalCounts": null,
          "availabilityReason": "no-validated-review"
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
          "status": "unavailable",
          "links": null,
          "notes": null,
          "warningLinks": null,
          "unknownLinks": null,
          "noRuleWarningLinks": null,
          "signalCounts": null,
          "availabilityReason": "no-validated-review"
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
    "startedAt": "2026-10-30T17:36:34.948Z",
    "finishedAt": "2026-10-30T17:37:19.230Z",
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
        "durationMs": 2796
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
        "durationMs": 1404
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
        "durationMs": 1395
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
        "durationMs": 1364
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
        "durationMs": 1296
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
        "durationMs": 1567
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
        "durationMs": 1427
      },
      {
        "id": "ru-level-insufficient",
        "language": "ru",
        "category": "level-insufficient",
        "status": "error",
        "passed": false,
        "durationMs": 1935,
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
        "durationMs": 1058
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
        "durationMs": 1467
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
        "durationMs": 1303
      },
      {
        "id": "ru-contradiction",
        "language": "ru",
        "category": "contradiction",
        "status": "error",
        "passed": false,
        "durationMs": 2712,
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
        "durationMs": 1383
      },
      {
        "id": "ru-vacancy-injection",
        "language": "ru",
        "category": "vacancy-injection",
        "status": "error",
        "passed": false,
        "durationMs": 2173,
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
        "durationMs": 1263
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
        "durationMs": 1335
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
        "durationMs": 1367
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
        "durationMs": 1373
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
        "durationMs": 1262
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
        "durationMs": 936
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
        "durationMs": 1388
      },
      {
        "id": "en-level-insufficient",
        "language": "en",
        "category": "level-insufficient",
        "status": "error",
        "passed": false,
        "durationMs": 2207,
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
        "durationMs": 1075
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
        "durationMs": 1450
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
        "durationMs": 1266
      },
      {
        "id": "en-contradiction",
        "language": "en",
        "category": "contradiction",
        "status": "error",
        "passed": false,
        "durationMs": 2845,
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
        "durationMs": 1295
      },
      {
        "id": "en-vacancy-injection",
        "language": "en",
        "category": "vacancy-injection",
        "status": "error",
        "passed": false,
        "durationMs": 1932,
        "failureStage": "citation"
      }
    ]
  }
}
```
