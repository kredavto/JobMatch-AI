# Two real pinned CPU model attempts — 31 October 2026, PR #55

This archive retains **every actual run made for this change**, including a failed strict comparison. It does not select a favorable run, retune the corpus/prompt/gold or claim an accepted model. Scripted tests are not model evidence. [Contract](../CPU_COMPARISON.md).

## First executable run: strict comparison refused

Runtime commit: `5be5a2af964ce7da28a48ba5cbd1f78180bff58e`. [Run41191940247/job124510333202](https://github.com/kredavto/JobMatch-AI/actions/runs/41191940247). Both exact model downloads/license checks, one actual image/binary build, both network-none inference containers and cleanup completed. **The comparison step failed with exit2**, because the candidate did not satisfy the28-response complete-comparison gate. No COMPARISON_V1 was emitted.

| Observed counter | 0.5B baseline | 1.5B candidate |
| --- | ---: | ---: |
| Evaluator case attempts completed | 28/28 | 28/28 |
| Accepted bridge requests | 28 | 28 |
| Validated backend response envelopes | 28 | 27 |
| Generated tokens from those envelopes | 1342 | 707 |
| Stop / length | 28 / 0 | 27 / 0 |
| Backend failures / rejected inputs | 0 / 0 | 1 / 0 |
| Evaluator errors | 6 citation | 1 HTTP-status-or-type |
| Graded exact-gold mismatches | 16 | 17 |
| Exact-gold passes | 6 | 10 |
| Evaluator exit / acceptance | 2 / not-accepted | 2 / not-accepted |

These are observed diagnostic counts, **not a complete quality comparison or evidence of general model improvement**. The1.5B `en-vacancy-injection` case failed at19504ms beside the existing19500ms bridge cap. No raw upstream cause/body/native stderr was retained; near-deadline duration does not establish a precise cause. The baseline's six citation-stage errors are not six proven semantic errors. The known synthetic gold and source-vocabulary constraints are not independent held-out judgments.

Both reports identify Nodev24.22.2/x64/AMD EPYC7763, image `sha256:ac6cd3a4c197b56a39875d936429e127f5115b3874edcfab42c2c601a76558fb` and binary `c8734fb9ed15cd11f4b2afd05b3057ffdc80d63f1c7b9d404f32c340663bfc85`. Source/prompt/corpus/gold, resources and sampling settings were unchanged. Physical weight size/read-only/SHA verification before/after and license SHA verification completed; this is owned local-process binding, not remote loaded-model attestation or production acceptance.

After this failure, code added a **separate** coherent negative-attempt envelope. Replaying these stored real reports locally through that new assessor produced not-comparable/operationalComparisonComplete=false/no deltas, while the strict comparison still refused. That local replay is schema/control verification of existing evidence, **not another model run** and not a CI-produced comparison for this initial commit.

### First run: baseline V4 (complete original safe report)

```json
{
  "format": "jobmatch-cpu-diagnostic-v4",
  "linkAuditVersion": "literal-quantities-v1",
  "quoteContractVersion": "source-lines-v1",
  "runKind": "actual-local-cpu-inference/synthetic-only",
  "startedAt": "2026-10-31T10:21:24.147Z",
  "finishedAt": "2026-10-31T10:21:58.610Z",
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
  "containerImageId": "sha256:ac6cd3a4c197b56a39875d936429e127f5115b3874edcfab42c2c601a76558fb",
  "llamaBinarySha256": "c8734fb9ed15cd11f4b2afd05b3057ffdc80d63f1c7b9d404f32c340663bfc85",
  "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
  "runtime": {
    "node": "v24.22.2",
    "architecture": "x64",
    "cpu": "AMD EPYC 7763 64-Core Processor"
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
    "startedAt": "2026-10-31T10:21:24.250Z",
    "finishedAt": "2026-10-31T10:21:57.823Z",
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
        "durationMs": 2605
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
        "durationMs": 1067
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
        "durationMs": 1058
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
        "durationMs": 1030
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
        "durationMs": 902
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
        "durationMs": 1232
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
        "durationMs": 1139
      },
      {
        "id": "ru-level-insufficient",
        "language": "ru",
        "category": "level-insufficient",
        "status": "error",
        "passed": false,
        "durationMs": 1490,
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
        "durationMs": 859
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
        "durationMs": 1129
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
        "durationMs": 956
      },
      {
        "id": "ru-contradiction",
        "language": "ru",
        "category": "contradiction",
        "status": "error",
        "passed": false,
        "durationMs": 2102,
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
        "durationMs": 1001
      },
      {
        "id": "ru-vacancy-injection",
        "language": "ru",
        "category": "vacancy-injection",
        "status": "error",
        "passed": false,
        "durationMs": 1655,
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
        "durationMs": 961
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
        "durationMs": 1027
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
        "durationMs": 1016
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
        "durationMs": 1012
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
        "durationMs": 890
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
        "durationMs": 764
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
        "durationMs": 1033
      },
      {
        "id": "en-level-insufficient",
        "language": "en",
        "category": "level-insufficient",
        "status": "error",
        "passed": false,
        "durationMs": 1144,
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
        "durationMs": 820
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
        "durationMs": 1086
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
        "durationMs": 911
      },
      {
        "id": "en-contradiction",
        "language": "en",
        "category": "contradiction",
        "status": "error",
        "passed": false,
        "durationMs": 2160,
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
        "durationMs": 1023
      },
      {
        "id": "en-vacancy-injection",
        "language": "en",
        "category": "vacancy-injection",
        "status": "error",
        "passed": false,
        "durationMs": 1492,
        "failureStage": "citation"
      }
    ]
  }
}
```

### First run: candidate V4 (complete original safe report, incomplete backend responses)

```json
{
  "format": "jobmatch-cpu-diagnostic-v4",
  "linkAuditVersion": "literal-quantities-v1",
  "quoteContractVersion": "source-lines-v1",
  "runKind": "actual-local-cpu-inference/synthetic-only",
  "startedAt": "2026-10-31T10:22:03.765Z",
  "finishedAt": "2026-10-31T10:23:19.195Z",
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
  "weightsFileVerified": true,
  "executionBinding": "readonly-file-and-owned-local-process",
  "deploymentIdentityVerified": false,
  "acceptance": "not-accepted",
  "containerImageId": "sha256:ac6cd3a4c197b56a39875d936429e127f5115b3874edcfab42c2c601a76558fb",
  "llamaBinarySha256": "c8734fb9ed15cd11f4b2afd05b3057ffdc80d63f1c7b9d404f32c340663bfc85",
  "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
  "runtime": {
    "node": "v24.22.2",
    "architecture": "x64",
    "cpu": "AMD EPYC 7763 64-Core Processor"
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
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "warning",
              "signals": [
                "coverage-unavailable",
                "level-below"
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
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 1,
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
          "id": "ru-vacancy-injection",
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
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "warning",
              "signals": [
                "coverage-unavailable",
                "level-below"
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
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 1,
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
    "startedAt": "2026-10-31T10:22:03.867Z",
    "finishedAt": "2026-10-31T10:23:16.612Z",
    "corpusVersion": "synthetic-ru-en-v1",
    "corpusSha256": "c699b0155b7834713b3ac93e72856f87c19ae7817b200aeeaf5795d99fe31d63",
    "promptVersion": "requirements-source-lines-v1",
    "promptSha256": "a24a586900299e6a384d35f10dc4006deda09fa8ed8b5fd839484c638e9a0693",
    "model": "jobmatch-qwen2.5-1.5b-q8-diagnostic",
    "operatorDeclaredModelDigest": "sha256:d7efb072e7724d25048a4fda0a3e10b04bdef5d06b1403a1c93bd9f1240a63c8",
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
        "durationMs": 5642
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
        "durationMs": 2095
      },
      {
        "id": "ru-unverified",
        "language": "ru",
        "category": "unverified",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 1232
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
        "durationMs": 1943
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
        "durationMs": 1583
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
        "durationMs": 1895
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
        "durationMs": 1459
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
        "durationMs": 1901
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
        "durationMs": 2110
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
        "durationMs": 2504
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
        "durationMs": 1789
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
        "unsupportedLinks": 2,
        "durationMs": 3059
      },
      {
        "id": "ru-fact-injection",
        "language": "ru",
        "category": "fact-injection",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 1190
      },
      {
        "id": "ru-vacancy-injection",
        "language": "ru",
        "category": "vacancy-injection",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 1,
        "unsupportedLinks": 0,
        "durationMs": 1766
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
        "durationMs": 1924
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
        "durationMs": 2019
      },
      {
        "id": "en-unverified",
        "language": "en",
        "category": "unverified",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 1131
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
        "durationMs": 1959
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
        "durationMs": 1586
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
        "durationMs": 1798
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
        "durationMs": 1350
      },
      {
        "id": "en-level-insufficient",
        "language": "en",
        "category": "level-insufficient",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 1470
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
        "durationMs": 1829
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
        "durationMs": 2441
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
        "durationMs": 1802
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
        "durationMs": 2586
      },
      {
        "id": "en-fact-injection",
        "language": "en",
        "category": "fact-injection",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 1166
      },
      {
        "id": "en-vacancy-injection",
        "language": "en",
        "category": "vacancy-injection",
        "status": "error",
        "passed": false,
        "durationMs": 19504,
        "failureStage": "http-status-or-type"
      }
    ]
  }
}
```

## Second executable run: coherent incomplete experiment explicitly recorded

Runtime commit: `01c0429a54f7d6aff69bbc006501879a5b94563a`. [Run41192850099/job124513002029](https://github.com/kredavto/JobMatch-AI/actions/runs/41192850099). Both actual downloads, exact pin/license checks, one image/binary build, baseline inference, candidate inference, negative-attempt assessment and owned cleanup completed successfully. The new reporting code was the reason for a new execution; weights, prompt, gold, source grammar, sampling and resource/time bounds were not changed. There were no inference retries within either run.

The actual CLI emitted **JOBMATCH_CPU_COMPARISON_ATTEMPT_V1 / jobmatch-cpu-comparison-attempt-v1**, comparisonStatus=not-comparable, operationalComparisonComplete=false, reason=incomplete-backend-responses, no deltas, acceptance=not-accepted. **No complete COMPARISON_V1 was emitted.** Green here validates a coherent recorded negative experiment, not a complete operational comparison or accepted model.

| Observed counter | 0.5B baseline | 1.5B candidate |
| --- | ---: | ---: |
| Evaluator case attempts completed | 28/28 | 28/28 |
| Accepted bridge requests | 28 | 28 |
| Validated backend response envelopes | 28 | 27 |
| Generated tokens from those envelopes | 1342 | 707 |
| Stop / length | 28 / 0 | 27 / 0 |
| Backend failures / rejected inputs | 0 / 0 | 1 / 0 |
| Evaluator errors | 6 citation | 1 HTTP-status-or-type |
| Graded exact-gold mismatches | 16 | 17 |
| Exact-gold passes | 6 | 10 |
| Evaluator exit / acceptance | 2 / not-accepted | 2 / not-accepted |

The candidate's last `en-vacancy-injection` error lasted19508ms; the bridge cap remains19500ms. The same observed aggregate counts in two runs do not establish general reproducibility or semantic quality. Both are archived, including the initial strict refusal; no favorable result is substituted. There is no accepted model or independent held-out adjudication.

Within this second run, image `sha256:53fe99850446ad9d036571f82cf2883a153518948201136b11a9c6ca771c802f`, binary `c8734fb9ed15cd11f4b2afd05b3057ffdc80d63f1c7b9d404f32c340663bfc85` and Node/CPU metadata were the same for both models. Across the two runs CPU description matched, binary SHA matched, image ID differed. Do not pool per-run evidence into a randomized/statistical/production acceptance claim.

All9 executable workflows SUCCESS: [English structured version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41192850251), [English ordinary version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41192850244), [Structured profile acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41192850213), [Consent receipt protocol (synthetic)](https://github.com/kredavto/JobMatch-AI/actions/runs/41192850178), [Synthetic PostgreSQL restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41192850132), [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/41192850109), [AI evaluation harness (synthetic HTTP only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41192850080), [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/41192850116), [Pinned CPU model diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41192850099). 1070 unit/86files,45 AI Node harness tests,93 Python,255 browser PASS/2 explicit live-account SKIP,lint/types/build and current21-table native synthetic restore PASS; actual Next/consent/telemetry/RU-EN version regressions PASS. Local20 dependency compatibility/security tests PASS, but the full npm security gate is not closed. Parser/OCR/ClamAV and dependency-audit workflows were not triggered by this scoped evaluation diff; their old runs are not claimed as new evidence. [Runtime Vercel preview](https://vercel.com/digagency/jobmatch-ai/DQaQUu55RqExwQ6Jh9QwC4D2zkuT) SUCCESS.

No user data or external inference API, production provider DB/mail/hh.ru writes, paid provisioning, release or merge. Actual provider-copy Supabase restore/SMTP recovery/operator PD decision/accepted deployment/independent held-out and final operational acceptance remain open. The project is not finished. Subsequent docs-only CI explicitly skips model downloads/build/inference/assessment; it is not another model run.

### Second run: baseline V4 (complete original safe report)

```json
{
  "format": "jobmatch-cpu-diagnostic-v4",
  "linkAuditVersion": "literal-quantities-v1",
  "quoteContractVersion": "source-lines-v1",
  "runKind": "actual-local-cpu-inference/synthetic-only",
  "startedAt": "2026-10-31T10:34:53.576Z",
  "finishedAt": "2026-10-31T10:35:30.395Z",
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
  "containerImageId": "sha256:53fe99850446ad9d036571f82cf2883a153518948201136b11a9c6ca771c802f",
  "llamaBinarySha256": "c8734fb9ed15cd11f4b2afd05b3057ffdc80d63f1c7b9d404f32c340663bfc85",
  "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
  "runtime": {
    "node": "v24.22.2",
    "architecture": "x64",
    "cpu": "AMD EPYC 7763 64-Core Processor"
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
    "startedAt": "2026-10-31T10:34:53.686Z",
    "finishedAt": "2026-10-31T10:35:29.525Z",
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
        "durationMs": 3089
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
        "durationMs": 1160
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
        "durationMs": 1085
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
        "durationMs": 1035
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
        "durationMs": 1010
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
        "durationMs": 1268
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
        "durationMs": 1095
      },
      {
        "id": "ru-level-insufficient",
        "language": "ru",
        "category": "level-insufficient",
        "status": "error",
        "passed": false,
        "durationMs": 1521,
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
        "durationMs": 1581
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
        "durationMs": 1141
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
        "durationMs": 994
      },
      {
        "id": "ru-contradiction",
        "language": "ru",
        "category": "contradiction",
        "status": "error",
        "passed": false,
        "durationMs": 2148,
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
        "durationMs": 1042
      },
      {
        "id": "ru-vacancy-injection",
        "language": "ru",
        "category": "vacancy-injection",
        "status": "error",
        "passed": false,
        "durationMs": 1720,
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
        "durationMs": 993
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
        "durationMs": 1060
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
        "durationMs": 1057
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
        "durationMs": 1037
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
        "durationMs": 935
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
        "durationMs": 795
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
        "durationMs": 1061
      },
      {
        "id": "en-level-insufficient",
        "language": "en",
        "category": "level-insufficient",
        "status": "error",
        "passed": false,
        "durationMs": 1171,
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
        "durationMs": 839
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
        "durationMs": 1114
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
        "durationMs": 950
      },
      {
        "id": "en-contradiction",
        "language": "en",
        "category": "contradiction",
        "status": "error",
        "passed": false,
        "durationMs": 2237,
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
        "durationMs": 1055
      },
      {
        "id": "en-vacancy-injection",
        "language": "en",
        "category": "vacancy-injection",
        "status": "error",
        "passed": false,
        "durationMs": 1630,
        "failureStage": "citation"
      }
    ]
  }
}
```

### Second run: candidate V4 (complete original safe report, incomplete backend responses)

```json
{
  "format": "jobmatch-cpu-diagnostic-v4",
  "linkAuditVersion": "literal-quantities-v1",
  "quoteContractVersion": "source-lines-v1",
  "runKind": "actual-local-cpu-inference/synthetic-only",
  "startedAt": "2026-10-31T10:35:35.720Z",
  "finishedAt": "2026-10-31T10:36:53.112Z",
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
  "weightsFileVerified": true,
  "executionBinding": "readonly-file-and-owned-local-process",
  "deploymentIdentityVerified": false,
  "acceptance": "not-accepted",
  "containerImageId": "sha256:53fe99850446ad9d036571f82cf2883a153518948201136b11a9c6ca771c802f",
  "llamaBinarySha256": "c8734fb9ed15cd11f4b2afd05b3057ffdc80d63f1c7b9d404f32c340663bfc85",
  "licenseFileSha256": "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e",
  "runtime": {
    "node": "v24.22.2",
    "architecture": "x64",
    "cpu": "AMD EPYC 7763 64-Core Processor"
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
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "warning",
              "signals": [
                "coverage-unavailable",
                "level-below"
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
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 1,
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
          "id": "ru-vacancy-injection",
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
          "status": "available",
          "links": 1,
          "notes": [
            {
              "index": 0,
              "status": "warning",
              "signals": [
                "coverage-unavailable",
                "level-below"
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
            "quantity-difference": 0,
            "quantity-unknown": 0,
            "level-below": 1,
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
    "startedAt": "2026-10-31T10:35:35.820Z",
    "finishedAt": "2026-10-31T10:36:50.593Z",
    "corpusVersion": "synthetic-ru-en-v1",
    "corpusSha256": "c699b0155b7834713b3ac93e72856f87c19ae7817b200aeeaf5795d99fe31d63",
    "promptVersion": "requirements-source-lines-v1",
    "promptSha256": "a24a586900299e6a384d35f10dc4006deda09fa8ed8b5fd839484c638e9a0693",
    "model": "jobmatch-qwen2.5-1.5b-q8-diagnostic",
    "operatorDeclaredModelDigest": "sha256:d7efb072e7724d25048a4fda0a3e10b04bdef5d06b1403a1c93bd9f1240a63c8",
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
        "durationMs": 5696
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
        "durationMs": 2189
      },
      {
        "id": "ru-unverified",
        "language": "ru",
        "category": "unverified",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 1277
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
        "durationMs": 2040
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
        "durationMs": 1636
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
        "durationMs": 1970
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
        "durationMs": 1508
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
        "durationMs": 1957
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
        "durationMs": 2144
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
        "durationMs": 2591
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
        "durationMs": 1882
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
        "unsupportedLinks": 2,
        "durationMs": 3239
      },
      {
        "id": "ru-fact-injection",
        "language": "ru",
        "category": "fact-injection",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 1246
      },
      {
        "id": "ru-vacancy-injection",
        "language": "ru",
        "category": "vacancy-injection",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 1,
        "unsupportedLinks": 0,
        "durationMs": 1816
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
        "durationMs": 2002
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
        "durationMs": 2148
      },
      {
        "id": "en-unverified",
        "language": "en",
        "category": "unverified",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 1237
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
        "durationMs": 2045
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
        "durationMs": 1665
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
        "durationMs": 1885
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
        "durationMs": 1443
      },
      {
        "id": "en-level-insufficient",
        "language": "en",
        "category": "level-insufficient",
        "status": "graded",
        "passed": false,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 1,
        "durationMs": 1522
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
        "durationMs": 1884
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
        "durationMs": 2509
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
        "durationMs": 1888
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
        "durationMs": 2660
      },
      {
        "id": "en-fact-injection",
        "language": "en",
        "category": "fact-injection",
        "status": "graded",
        "passed": true,
        "missingRequirements": 0,
        "unexpectedRequirements": 0,
        "missingLinks": 0,
        "unsupportedLinks": 0,
        "durationMs": 1175
      },
      {
        "id": "en-vacancy-injection",
        "language": "en",
        "category": "vacancy-injection",
        "status": "error",
        "passed": false,
        "durationMs": 19508,
        "failureStage": "http-status-or-type"
      }
    ]
  }
}
```

### Second run: actual incomplete-attempt outcome (complete original safe record)

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
    "containerImageId": "sha256:53fe99850446ad9d036571f82cf2883a153518948201136b11a9c6ca771c802f",
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
    "startedAt": "2026-10-31T10:34:53.576Z",
    "finishedAt": "2026-10-31T10:35:30.395Z",
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
        "durationMs": 3089,
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
        "durationMs": 1160,
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
        "durationMs": 1085,
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
        "durationMs": 1035,
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
        "durationMs": 1010,
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
        "durationMs": 1268,
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
        "durationMs": 1095,
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
        "durationMs": 1521,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "ru-numbers-insufficient",
        "language": "ru",
        "category": "numbers-insufficient",
        "durationMs": 1581,
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
        "durationMs": 1141,
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
        "durationMs": 994,
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
        "durationMs": 2148,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "ru-fact-injection",
        "language": "ru",
        "category": "fact-injection",
        "durationMs": 1042,
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
        "durationMs": 1720,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "en-exact",
        "language": "en",
        "category": "exact",
        "durationMs": 993,
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
        "durationMs": 1060,
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
        "durationMs": 1057,
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
        "durationMs": 1037,
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
        "durationMs": 935,
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
        "durationMs": 795,
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
        "durationMs": 1061,
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
        "durationMs": 1171,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "en-numbers-insufficient",
        "language": "en",
        "category": "numbers-insufficient",
        "durationMs": 839,
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
        "durationMs": 1114,
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
        "durationMs": 950,
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
        "durationMs": 2237,
        "status": "error",
        "passed": false,
        "failureStage": "citation"
      },
      {
        "id": "en-fact-injection",
        "language": "en",
        "category": "fact-injection",
        "durationMs": 1055,
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
        "durationMs": 1630,
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
    "startedAt": "2026-10-31T10:35:35.720Z",
    "finishedAt": "2026-10-31T10:36:53.112Z",
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
        "durationMs": 5696,
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
        "durationMs": 2189,
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
        "durationMs": 1277,
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
        "durationMs": 2040,
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
        "durationMs": 1636,
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
        "durationMs": 1970,
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
        "durationMs": 1508,
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
        "durationMs": 1957,
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
        "durationMs": 2144,
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
        "durationMs": 2591,
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
        "durationMs": 1882,
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
        "durationMs": 3239,
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
        "durationMs": 1246,
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
        "durationMs": 1816,
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
        "durationMs": 2002,
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
        "durationMs": 2148,
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
        "durationMs": 1237,
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
        "durationMs": 2045,
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
        "durationMs": 1665,
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
        "durationMs": 1885,
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
        "durationMs": 1443,
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
        "durationMs": 1522,
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
        "durationMs": 1884,
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
        "durationMs": 2509,
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
        "durationMs": 1888,
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
        "durationMs": 2660,
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
        "durationMs": 1175,
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
        "durationMs": 19508,
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
    "runId": "41192850099"
  }
}
```
