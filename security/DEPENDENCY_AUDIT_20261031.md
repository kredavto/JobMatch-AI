# Dependency security candidate — 31 October 2026

Candidate PR #52, based on #51. This is a proposed dependency/runtime audit change, not a release or a statement about the currently deployed artifact. Main and the published0.34.0 release are unchanged.

## Concrete dependency changes

| Dependency | Before in #51 lock | Candidate | Reason / scope |
| --- | --- | --- | --- |
| pdfjs-dist |5.7.284 (range ^5.4.624)|6.2.108 exact|First patched version listed for GHSA-hq66-cqwq-w95j. The6.x native canvas subtree changes with it; the application's direct canvas0.1.80 pin is unchanged. |
| yauzl |3.2.0|3.2.1 exact|Minimal patch for malformed NTFS timestamp bounds, GHSA-gmq8-994r-jv83. |
| follow-redirects |1.16.1|1.16.2 lock-only|Compatible existing ^1.15.9 range, through dev-only @sparticuz/chromium; GHSA-mrwp-f3q8-3g9p. |

Next16.4.3, React19.2.4, ESLint9 and application/database/command/template contracts are unchanged. No force audit fix, blanket major override, artifact publication or paid infrastructure was used. Node24 remains the tested runtime; PDF.js6 declares Node>=22.13 or>=24.

The PDF text-only reader explicitly disables worker fetch. Version6 does not accept the old isEvalSupported document-init option; it is not passed or claimed as an active mitigation. The app reads getTextContent and does not instantiate a viewer/scripting manager. Existing file/page/text limits, cleanup and isolated-worker policies remain.

## Real catalog results and scope

The previous two-finding summary was historical. A fresh31 October audit of the immutable #51 lock reports19 affected package records across4 independent advisory IDs. The new minimatch and follow-redirects advisory records were published/updated in the catalog on30 October. Dependent/metavulnerable package rows are not independent CVEs.

| Snapshot | Runtime records | Full records | Full severity | Independent advisory IDs |
| --- | ---: | ---: | --- | ---: |
| #51 lock |2|19|17 moderate /2 high|4|
| Patched lock, live local npm |0|16|16 moderate|1|
| Patched lock, actual GitHub audit job124483142433 |0|16|16 moderate|1|

Before lock SHA256: 0631cf5e23a6c2a07facc35d64383ca7fd9087bc98dfece56513fec40dd28eed.
After/CI lock SHA256: 1efc7bf839516134118a33f0a874946fb02aab2cab1a51d2982acb67c96842a2.
The runtime gate returned0 after the patch. The all-dependencies gate was actually executed locally and returned1, retaining all development findings. Neither result is an independent security review.

Remaining advisory: [GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249). Npm reports installed minimatch3.1.5/10.2.6 and their dev lint dependents,16 package rows. The maintainer description demonstrates10.2.6 with optimizationLevel>=2; the registry's affected range is broader. We do not overrule that feed or claim every legacy version was independently exploited. The listed fix11.0.1 crosses the declared3/10 API ranges. Npm's proposed force downgrades of ESLint/Next config are not applied.

This is not a waiver/allowlist or acceptance of the remaining risk. Compatible lint-stack remediation and independent security acceptance remain open. A runtime-only green job cannot close full security/release acceptance.

## Tests, applicability and limits

- Actual yauzl3.2.0 and follow-redirects1.16.1 npm artifacts were installed in a separate temporary fixture, never in the proposed lock. A malformed5-byte NTFS field throws with the baseline but not3.2.1. A genuine node:vm cross-realm sensitiveHeaders array leaks a SYNTHETIC_ONLY custom header between two controlled loopback servers with1.16.1, but not1.16.2. No third-party endpoint or real credential was tested.
- Committed regressions cover malformed NTFS lengths0–40, a valid timestamp, and same/cross-realm redirect behavior while preserving unrelated headers.
- The app's current ZIP validator does not call getLastModDate. The package regression is not a claim that the old application's upload path was demonstrably crashing.
- The PDF advisory concerns viewer scripting/CSP conditions. The application uses low-level text extraction, not that viewer path. A real PDF with embedded OpenAction still extracts its synthetic text without changing a script canary. This verifies the extraction boundary/compatibility, not an in-app reproduction of the viewer exploit.
- Local checks:996 Vitest/85files,13 Node security, lint/types/build PASS. The worker suite passed72 with4 real isolated OCR cases skipped locally; those skips are not claimed accepted. CI performs its real OCR/ClamAV/container checks separately.
- Frozen application/SQL/export/template schemas and source evidence semantics are not upgraded or reinterpreted. Synthetic PostgreSQL restore does not establish real Supabase provider restore/RPO/RTO.

## Audit CLI and CI semantics

Commands:

    npm run test:dependency-security
    npm run audit:dependencies
    npm run audit:dependencies:all

The CLI queries both full and --omit=dev catalogs using the normal configured npm client. Queries have120-second process bounds,20-second individual fetch limits, no fetch retries and a4MiB output cap. The GitHub job is limited to6minutes, has contents:read only and checkout credentials are not persisted.

Reports require npm schema2, exact coherent severity/package counts, installed lock nodes/versions, known severity labels, safe advisory IDs and consistent runtime/full inventories. Raw network/provider diagnostics, titles and nodes are not copied to output. Lock bytes are read before/after and the SHA256 is included. Invalid/unavailable/incomplete reports exit2 with a fixed error; they are never a successful empty result. Unknown CLI arguments refuse before npm access without echoing their values.

Default gate: any runtime finding exits1. Full development inventory/status is retained explicitly, with independentSecurityAcceptance=not-performed.
All-dependencies gate: any full finding exits1. No advisory is suppressed and no dev exception is silently accepted.
A clean catalog snapshot still does not prove absence of unknown vulnerabilities or satisfy independent review.

The first audit-job attempt passed all13 tests but hit the original45-second child deadline and failed closed with2. The bounded deadline was raised to120seconds; the actual subsequent audit job succeeded with runtime0/full16. No failure was converted to zero, and no raw error was exposed.

## Primary references checked31 October

- [PDF.js maintainer advisory](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j)
- [yauzl advisory and fix reference](https://github.com/advisories/GHSA-gmq8-994r-jv83), pinned npm3.2.1 source and real baseline/patched fixtures
- [follow-redirects maintainer advisory](https://github.com/follow-redirects/follow-redirects/security/advisories/GHSA-mrwp-f3q8-3g9p)
- [minimatch maintainer advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249)

## Complete safe catalog snapshots

Only public package names/versions/advisory IDs/classification/counts follow. These are real npm results, not fixture output. Synthetic fixture tests are separate.

### Before (#51 lock)
```json
{
  "format": "jobmatch-dependency-audit-v1",
  "assessment": "catalog-snapshot-only",
  "independentSecurityAcceptance": "not-performed",
  "status": "runtime-findings",
  "runtime": {
    "packagesAffected": 2,
    "counts": {
      "info": 0,
      "low": 0,
      "moderate": 1,
      "high": 1,
      "critical": 0,
      "total": 2
    },
    "advisoryIds": [
      "GHSA-gmq8-994r-jv83",
      "GHSA-hq66-cqwq-w95j"
    ],
    "findings": [
      {
        "package": "pdfjs-dist",
        "severity": "high",
        "direct": true,
        "versions": [
          "5.7.284"
        ],
        "instances": 1,
        "runtime": true,
        "advisories": [
          "GHSA-hq66-cqwq-w95j"
        ],
        "viaPackages": []
      },
      {
        "package": "yauzl",
        "severity": "moderate",
        "direct": true,
        "versions": [
          "3.2.0"
        ],
        "instances": 1,
        "runtime": true,
        "advisories": [
          "GHSA-gmq8-994r-jv83"
        ],
        "viaPackages": []
      }
    ]
  },
  "full": {
    "packagesAffected": 19,
    "counts": {
      "info": 0,
      "low": 0,
      "moderate": 17,
      "high": 2,
      "critical": 0,
      "total": 19
    },
    "advisoryIds": [
      "GHSA-g3hv-75wg-m249",
      "GHSA-gmq8-994r-jv83",
      "GHSA-hq66-cqwq-w95j",
      "GHSA-mrwp-f3q8-3g9p"
    ],
    "findings": [
      {
        "package": "@eslint-community/eslint-utils",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "4.10.1",
          "4.9.1"
        ],
        "instances": 2,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "eslint"
        ]
      },
      {
        "package": "@eslint/config-array",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "0.21.2"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "minimatch"
        ]
      },
      {
        "package": "@eslint/eslintrc",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "3.3.7"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "minimatch"
        ]
      },
      {
        "package": "@next/eslint-plugin-next",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "16.4.3"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@eslint-community/eslint-utils"
        ]
      },
      {
        "package": "@typescript-eslint/eslint-plugin",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "8.72.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@typescript-eslint/parser",
          "@typescript-eslint/type-utils",
          "@typescript-eslint/utils",
          "eslint"
        ]
      },
      {
        "package": "@typescript-eslint/parser",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "8.72.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@typescript-eslint/typescript-estree",
          "eslint"
        ]
      },
      {
        "package": "@typescript-eslint/type-utils",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "8.72.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@typescript-eslint/typescript-estree",
          "@typescript-eslint/utils",
          "eslint"
        ]
      },
      {
        "package": "@typescript-eslint/typescript-estree",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "8.72.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "minimatch"
        ]
      },
      {
        "package": "@typescript-eslint/utils",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "8.72.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@eslint-community/eslint-utils",
          "@typescript-eslint/typescript-estree",
          "eslint"
        ]
      },
      {
        "package": "eslint",
        "severity": "moderate",
        "direct": true,
        "versions": [
          "9.39.5"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@eslint-community/eslint-utils",
          "@eslint/config-array",
          "@eslint/eslintrc",
          "minimatch"
        ]
      },
      {
        "package": "eslint-config-next",
        "severity": "moderate",
        "direct": true,
        "versions": [
          "16.4.3"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@next/eslint-plugin-next",
          "eslint",
          "eslint-plugin-import",
          "eslint-plugin-jsx-a11y",
          "eslint-plugin-react",
          "typescript-eslint"
        ]
      },
      {
        "package": "eslint-plugin-import",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "2.32.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "minimatch"
        ]
      },
      {
        "package": "eslint-plugin-jsx-a11y",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "6.10.2"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "minimatch"
        ]
      },
      {
        "package": "eslint-plugin-react",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "7.37.5"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "minimatch"
        ]
      },
      {
        "package": "follow-redirects",
        "severity": "high",
        "direct": false,
        "versions": [
          "1.16.1"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [
          "GHSA-mrwp-f3q8-3g9p"
        ],
        "viaPackages": []
      },
      {
        "package": "minimatch",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "10.2.6",
          "3.1.5"
        ],
        "instances": 2,
        "runtime": false,
        "advisories": [
          "GHSA-g3hv-75wg-m249"
        ],
        "viaPackages": []
      },
      {
        "package": "pdfjs-dist",
        "severity": "high",
        "direct": true,
        "versions": [
          "5.7.284"
        ],
        "instances": 1,
        "runtime": true,
        "advisories": [
          "GHSA-hq66-cqwq-w95j"
        ],
        "viaPackages": []
      },
      {
        "package": "typescript-eslint",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "8.72.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@typescript-eslint/eslint-plugin",
          "@typescript-eslint/parser",
          "@typescript-eslint/typescript-estree",
          "@typescript-eslint/utils",
          "eslint"
        ]
      },
      {
        "package": "yauzl",
        "severity": "moderate",
        "direct": true,
        "versions": [
          "3.2.0"
        ],
        "instances": 1,
        "runtime": true,
        "advisories": [
          "GHSA-gmq8-994r-jv83"
        ],
        "viaPackages": []
      }
    ]
  },
  "lockSha256": "0631cf5e23a6c2a07facc35d64383ca7fd9087bc98dfece56513fec40dd28eed",
  "sourceCommit": "41ab569d3627359ae32fb7749f538e7cc634e5fd",
  "checkedOn": "2026-10-31"
}
```

### After (actual CI)
```json
{
  "format": "jobmatch-dependency-audit-v1",
  "assessment": "catalog-snapshot-only",
  "independentSecurityAcceptance": "not-performed",
  "status": "runtime-clear/full-findings-remain",
  "runtime": {
    "packagesAffected": 0,
    "counts": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 0,
      "critical": 0,
      "total": 0
    },
    "advisoryIds": [],
    "findings": []
  },
  "full": {
    "packagesAffected": 16,
    "counts": {
      "info": 0,
      "low": 0,
      "moderate": 16,
      "high": 0,
      "critical": 0,
      "total": 16
    },
    "advisoryIds": [
      "GHSA-g3hv-75wg-m249"
    ],
    "findings": [
      {
        "package": "@eslint-community/eslint-utils",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "4.10.1",
          "4.9.1"
        ],
        "instances": 2,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "eslint"
        ]
      },
      {
        "package": "@eslint/config-array",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "0.21.2"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "minimatch"
        ]
      },
      {
        "package": "@eslint/eslintrc",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "3.3.7"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "minimatch"
        ]
      },
      {
        "package": "@next/eslint-plugin-next",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "16.4.3"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@eslint-community/eslint-utils"
        ]
      },
      {
        "package": "@typescript-eslint/eslint-plugin",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "8.72.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@typescript-eslint/parser",
          "@typescript-eslint/type-utils",
          "@typescript-eslint/utils",
          "eslint"
        ]
      },
      {
        "package": "@typescript-eslint/parser",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "8.72.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@typescript-eslint/typescript-estree",
          "eslint"
        ]
      },
      {
        "package": "@typescript-eslint/type-utils",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "8.72.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@typescript-eslint/typescript-estree",
          "@typescript-eslint/utils",
          "eslint"
        ]
      },
      {
        "package": "@typescript-eslint/typescript-estree",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "8.72.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "minimatch"
        ]
      },
      {
        "package": "@typescript-eslint/utils",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "8.72.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@eslint-community/eslint-utils",
          "@typescript-eslint/typescript-estree",
          "eslint"
        ]
      },
      {
        "package": "eslint",
        "severity": "moderate",
        "direct": true,
        "versions": [
          "9.39.5"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@eslint-community/eslint-utils",
          "@eslint/config-array",
          "@eslint/eslintrc",
          "minimatch"
        ]
      },
      {
        "package": "eslint-config-next",
        "severity": "moderate",
        "direct": true,
        "versions": [
          "16.4.3"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@next/eslint-plugin-next",
          "eslint",
          "eslint-plugin-import",
          "eslint-plugin-jsx-a11y",
          "eslint-plugin-react",
          "typescript-eslint"
        ]
      },
      {
        "package": "eslint-plugin-import",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "2.32.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "minimatch"
        ]
      },
      {
        "package": "eslint-plugin-jsx-a11y",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "6.10.2"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "minimatch"
        ]
      },
      {
        "package": "eslint-plugin-react",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "7.37.5"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "minimatch"
        ]
      },
      {
        "package": "minimatch",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "10.2.6",
          "3.1.5"
        ],
        "instances": 2,
        "runtime": false,
        "advisories": [
          "GHSA-g3hv-75wg-m249"
        ],
        "viaPackages": []
      },
      {
        "package": "typescript-eslint",
        "severity": "moderate",
        "direct": false,
        "versions": [
          "8.72.0"
        ],
        "instances": 1,
        "runtime": false,
        "advisories": [],
        "viaPackages": [
          "@typescript-eslint/eslint-plugin",
          "@typescript-eslint/parser",
          "@typescript-eslint/typescript-estree",
          "@typescript-eslint/utils",
          "eslint"
        ]
      }
    ]
  },
  "observedAt": "2026-10-31T07:58:48.297Z",
  "lockSha256": "1efc7bf839516134118a33f0a874946fb02aab2cab1a51d2982acb67c96842a2",
  "gate": "runtime-dependencies"
}
```


## Executable CI proof

Executable `5dffdb3fbdf597a34b7f934e0267e6ca45b879b6`: все11 workflow SUCCESS — [Runtime dependency audit and full inventory](https://github.com/kredavto/JobMatch-AI/actions/runs/41182679971), [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/41182679981), [English ordinary version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41182679963), [English structured version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41182679967), [Consent receipt protocol (synthetic)](https://github.com/kredavto/JobMatch-AI/actions/runs/41182679957), [AI evaluation harness (synthetic HTTP only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41182679974), [Synthetic PostgreSQL restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41182679972), [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/41182680021), [Isolated document parser](https://github.com/kredavto/JobMatch-AI/actions/runs/41182679980), [Structured profile acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41182679958), [Pinned CPU model diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41182679965). 996 unit/85files (+1 real PDF test),13 новых Node security (+10 audit/CLI,+3 real dependency regressions),28 Node evaluator/CPU,84 Python,245 browser/2 live-account SKIP,76 worker/0 worker skips; lint/types/build, real OCR/ClamAV/container checks, native SQL concurrency/current21-table synthetic restore и legacy synthetic restore PASS. Vercel runtime preview SUCCESS. Live npm CI: runtime0/full16 moderate,1 advisory minimatch, lock SHA2561efc7bf839516134118a33f0a874946fb02aab2cab1a51d2982acb67c96842a2. Strict all-dependency gate локально exit1, runtime gate exit0; независимая security acceptance не выполнена.

Remaining full findings are not a waiver or a completed security review. See COMPLETION_PLAN.md for subsequent work and external acceptance gates.
