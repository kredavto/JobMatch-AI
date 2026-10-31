# Scoped lint dependency migration — 31 October 2026

[PR #53](https://github.com/kredavto/JobMatch-AI/pull/53), executable commit `37d125543fdbc0e6b9ec0915eebcc4f03eb84b3c`, base #52 `fb8e862629e2565df2dd81636f91fcd1163c04a8`.

## Change and compatibility boundary

The version-qualified npm override applies **only** to `@typescript-eslint/typescript-estree@8.72.0 > minimatch`: 10.2.6 → **11.0.3**. The only other lock node added is dev-only `@isaacs/nonrecursive-glob-match@1.0.3`. Existing brace-expansion 5.0.12 already satisfies the new range. No runtime package, ESLint, Next, React or TypeScript version changed. This is a reviewed major override of one consumer, not a claim that v11 is generally compatible with v3/v10. A future parent-version change requires a new review; the resolution regression fails if it silently loses the reviewed override.

Installed parent source `dist/useProgramFromProjectService.js:244` has the sole executable minimatch call in that package:
```js
allowDefaultProject?.some(pattern => minimatch(filePath, pattern, { dot: true }))
```
It uses the named function and supported options, not removed RegExp/AST APIs. Its shipped CJS source was searched before editing. The actual parser project-service tests traverse this call and check both positive and negative allowlists with a real TypeScript program.

Minimatch 11 changes its matching engine, removes callable default/namespace compatibility, makeRe, matchOne and RegExp/AST surface, and changes some edge-case matching semantics. It is **not** a drop-in replacement for the legacy lint ecosystem. React/import/accessibility plugins still call the minimatch module as a function. Legacy 3.1.5 remains a separate installed dependency and is explicitly present in npm findings. There is no shim, patched metadata, local fork, deleted rule, disabled lint check, registry publication, ignored advisory or declaration of accepted risk.

11.0.1 contains the advisory preprocessing fix; 11.0.2/11.0.3 update the nonrecursive matcher and caching/performance. The inspected upstream compare is linked below. The chosen exact 11.0.3 has the same advisory fix and was tested as actually installed. Node 24 satisfies its engine constraint (18 || 20 || >=22).

## Actual tests

Seven new tests in `security/tests/lint-dependencies.test.mjs`:

1. Resolve the real module from the reviewed consumer, check v11 named API and separate legacy callable API. Removed makeRe is not fabricated.
2. Real project service accepts root .js and dotfiles with `*.js`, rejects nested paths and unlisted .cjs, and returns a TypeScript type checker.
3. Real project service accepts explicit `tools/*.{js,cjs}`, rejects other directories, deeper nesting and .mjs.
4. Configured source still returns a program; overlap with allowDefaultProject and disallowed broad ** patterns still reject.
5. A real v11 constructor with optimizationLevel 2 and braceExpandMax 64 stops a 30-part amplification pattern at 64 rows, in an owned child with a 128 MiB V8 heap, 10-second timeout and 4 KiB output bound. This is not an OS-level sandbox or total-memory bound.
6. Actual current Next config reports no-explicit-any, jsx-a11y/alt-text and @next/next/no-img-element violations in a synthetic TSX file.
7. Current source directories remain linted and generated outputs remain ignored.

All 20 security tests (13 previous + 7 new), 996 unit tests / 85 files, lint, types, production build and clean npm ci --ignore-scripts --no-audit --no-fund passed locally. One initial new assertion expected the wrong word order in the parser error; the parser correctly rejected the overlap. The assertion was corrected before publication. The full gate still returned 1; this is not a test failure being suppressed.

Separately installed genuine old npm artifact minimatch **10.2.6**, outside the candidate tree, was compared with the installed candidate **11.0.3**. With the same eight-part `**/../a/b` pattern and options `{optimizationLevel:2,braceExpandMax:64}`, old yielded **256 rows**, patched **64 rows**. This bounded structural reproducer does not run a large denial-of-service workload or prove that projectService is exploitable. The reviewed caller uses default optimization level 1, not the advisory's level >=2 branch. The 30-part regression checks the fixed branch directly.

## Real npm snapshots

These are normalized results of actual full and --omit=dev npm queries, not mocked audit responses. Old manifest/lock were copied by git show from immutable #52 to a new temporary directory; new queries used the candidate lock. Both strict --require-all invocations returned **exit 1**. Runtime remains 0 and full findings decrease from 16 to 15. Fifteen dependent package records represent **one** root advisory, not fifteen independent CVEs. Remaining minimatch version is 3.1.5. The broad registry range is retained; the narrower maintainer description is not used to dismiss it. Registry catalog findings are not independent security acceptance.

### Before
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
  "observedAt": "2026-10-31T08:27:08.256Z",
  "lockSha256": "1efc7bf839516134118a33f0a874946fb02aab2cab1a51d2982acb67c96842a2",
  "gate": "all-dependencies"
}
```

### After
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
    "packagesAffected": 15,
    "counts": {
      "info": 0,
      "low": 0,
      "moderate": 15,
      "high": 0,
      "critical": 0,
      "total": 15
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
          "@typescript-eslint/utils",
          "eslint"
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
          "3.1.5"
        ],
        "instances": 1,
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
          "@typescript-eslint/utils",
          "eslint"
        ]
      }
    ]
  },
  "observedAt": "2026-10-31T08:27:09.084Z",
  "lockSha256": "a5a4cca026d442807b858e5825af71e0f5cff891f66a18edb375f690435f6b6d",
  "gate": "all-dependencies"
}
```

## Upstream sources and remaining work

- [Maintainer advisory GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249).
- [Actual breaking changes v10.2.6 → v11.0.1](https://github.com/isaacs/minimatch/compare/v10.2.6...v11.0.1), including removed APIs and patch 77a0f5c4b80bdc641c3c930a1d9edf5ad2db57f8.
- [v11.0.1 → v11.0.3](https://github.com/isaacs/minimatch/compare/v11.0.1...v11.0.3), including matcher update/cache changes.
- [Reviewed typescript-estree source](https://github.com/typescript-eslint/typescript-eslint/blob/v8.72.0/packages/typescript-estree/src/useProgramFromProjectService.ts).

Fresh configured npm view also found no patched legacy 3.x or 10.x release (latest 3.1.5 and 10.2.6); latest ESLint 10.14.0 and typescript-estree 8.72.1 still declare minimatch 10.x. This is a timestamped observation, not a permanent assertion that upstream cannot fix it. Current plugin peer ranges also exclude ESLint 10: react 7.37.5 supports through ^9.7; import 2.32.0 and jsx-a11y 6.10.2 support through ^9. ESLint 9.39.5 now emits an end-of-support notice. A supported ESLint migration and the remaining callable plugin dependencies need compatibility work/upstream releases; do not use npm audit fix --force or replace major APIs merely to produce zero findings. Inspect installed versions/peer ranges and actual consumers again before the next change.

The remaining full gate and independent review stay open. This PR does not accept a model, run SMTP/recovery, restore a Supabase provider backup, decide personal-data placement, authorize hh.ru writes, merge branches or publish a release. See COMPLETION_PLAN.md and VERIFICATION.md for the whole-project status.

## Immutable CI proof

Executable `37d125543fdbc0e6b9ec0915eebcc4f03eb84b3c`: all seven actually triggered workflows succeeded: [Runtime dependency audit and full inventory](https://github.com/kredavto/JobMatch-AI/actions/runs/41184634811), [AI evaluation harness (synthetic HTTP only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41184634844), [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/41184634832), [Isolated document parser](https://github.com/kredavto/JobMatch-AI/actions/runs/41184634804), [Structured profile acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41184634791), [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/41184634829), [Pinned CPU model diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41184634833). Counts:996 unit,20 security Node,28 evaluator/CPU Node,84 Python,245 browser PASS/2 live-account SKIP,76 worker PASS/0SKIP; lint/types/build passed. Native21-table restore is synthetic. Actual CPU28/28 completed with6citation errors/16mismatches/6passes,1342tokens,exit2/not-accepted, not model acceptance. CI audit confirms runtime0/full15; full gate and independent security acceptance remain open. Vercel runtime preview succeeded. Documentation-only head checks are recorded separately in the PR; a docs-only CPU skip is not fresh inference.
