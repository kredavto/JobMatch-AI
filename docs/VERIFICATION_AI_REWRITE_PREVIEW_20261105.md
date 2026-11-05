# AI rewrite preview verification — 5 November 2026

Fresh main is `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`. Four current main plans and
112 open PRs were read; PR #122 final
`fde762281bbe72da01e09d9d61188cd54c88ef18` is ready, unmerged, all nineteen final
workflows green. This candidate is based on that immutable tree
`15227dbe19db7101410abbe321803ad8ec3208d4`, in a separate branch. No merge,
release, deployment, live database/configuration, mail, real-user inference, HH
write or paid resource was authorized or performed. Historical 0.34.0/b05c45d0
and explicitly merged PR #1/#2 permission remain scoped as previously recorded.

[Contract and limitations](CURRENT_AI_REWRITE_PREVIEW.md).

## Local checks

- 29 pure rewrite/signer tests: exact unique source lines, Unicode/CRLF ranges,
  refusal fallback, number/negation findings, complete claim set, tampered source,
  review, metadata and unselected text, issuer/source binding, owner/key/time/MAC.
- 40 route/provider tests use an actual owned loopback HTTP server: production
  route→provider→renderer→signer, selected-only request payload and full retained
  output, independent closed flags/key, consent/origin/owner/quota/stale source,
  invalid UTF-8/limits, late source/session/account/configuration/flag changes,
  foreign storage replies, redirect/status/MIME/invalid/oversize/incomplete output,
  cancellation without retry, key/config rotation and structural-vs-MAC boundary.
  Auth, workspace reads and quota are explicit stubs. The server authors synthetic
  model replies; no model identity, quality or semantic result is claimed.
- Full local run: **1,684 unit tests / 110 files PASS**, including all 69 new
  cases; **118 Python tests PASS**, **29 security tests PASS**, TypeScript PASS,
  ESLint PASS with the same six existing warnings, Next16.4.5 production build
  PASS (including the new dynamic route). No local browser/native PostgreSQL
  pass is asserted. Hosted exact-source checks are pending.

No old AI evaluation source/prompt/corpus/pin, database migration, table,
dependency, application version or existing acceptance verdict changes. The old
CPU experiment's 0/16 result remains NOT ACCEPTED. This new prompt has no actual
model or independent semantic/held-out acceptance. Saving and UI remain open.

## First hosted attempt — retained failure

Source `28cbcacd1638efed8be87084b4a8aba82f70b205`, tree
`2338f124294a33ba85a908d75282e7303b830c72`, all17changed files fully read back
by immutable content/blob;684prior blobs unchanged, complete tree/no deletion.
[Operational run42052678632/job127332646721](https://github.com/kredavto/JobMatch-AI/actions/runs/42052678632/job/127332646721)
passed41observer tests/26Python tests/build, then failed at `routes`: the smoke
POST-only set lacked the newly monitored `ai-rewrites`, so it sent GET and saw
the correct405. The fixture now exercises POST with the same unauthenticated
guard expectations and prints actual exercised route counts. No application
guard or event/privacy check was weakened. Full replacement CI is pending.

While repairing the shared route inventory, the existing `reminders` observer
label was also found missing from the operator report's allowlist. It is now
accepted, filtered and alerted on like the other static labels. A new Python
test exercises503 alerts for both rewrite/reminder events; the real Next smoke
now includes all14registered labels and19GET/POST handlers. These remain guard
checks, not actual reminder delivery. Local Python total becomes119PASS.


## Accepted source and exact hosted checks

Accepted source `360010c7ce9f915386b6aba3bcb7145d275fb61c`, tree `3b1919827f7e1e7d0027b8784ab7b6c12e0ef3b0`;
local `2c041d920775e50b33f88dcfd2f0990111245072` has the identical tree. Hosted checkout
`0a20c16fcf8857d6292468fa25635e61586a2eaf` was independently resolved to that exact tree.
**All nineteen triggered source workflows completed SUCCESS.**

| Evidence | Observed result |
| --- | --- |
| [Application42053458246/job127335399206](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458246/job/127335399206) | 1,684 unit / 110 files, including all69new tests; types/lint/build PASS;487browser PASS /2live SKIP. These existing browser regressions do not test a new rewrite UI, which does not exist yet. Installed graph1083nodes/122empty/0optional artifacts/0signals valid. |
| [Operations42053458492/job127335400311](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458492/job/127335400311) | 41observer tests,27Python report tests, production Next build and actual loopback process;14static labels/19GET-POST handlers, unchanged unauthenticated guards, private-canary refusal, alert and capped/inconclusive operator verdicts PASS. No provider request or delivery. |
| [Source protocol42053458640/job127335400837](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458640/job/127335400837) |119Python tests; existing RU/EN source SQL/API/codec/export lifecycle, default-off gates, concurrent writers, unknown committed replies/manual reconciliation, revoked sessions, rollback/reapply,20table synthetic native PG17 restore/RLS/default/corruption PASS. This does not establish AI-rewrite storage, which is absent, liveAuth or provider-copy restore. |
| [Scanner42053458502/job127335400912](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458502/job/127335400912) | Clam1.4.6 with refreshed signed28174 dated06:26:24Z, observed15:18:56.643Z inside unchanged24h gate; archive boundaries/reload/refusal and parser regressions PASS. |
| [CPU42053458407/job127335399607](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458407/job/127335399607) | Unchanged older literal-selection experiment:16actual synthetic responses,1,074tokens,0gold;14provenance failures/2mismatches,NOT ACCEPTED. Model/deployment identity, semantic and held-out assessment unverified/not performed. The new rewrite prompt was not executed. |

Complete triggered source run inventory:

- [Current application commands PostgreSQL protocol — 42053458348](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458348): SUCCESS.
- [Mirror rollback compatibility — Current logical backup PostgreSQL protocol — 42053458215](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458215): SUCCESS.
- [Mirror rollback compatibility — Current canonical reads PostgreSQL protocol — 42053458234](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458234): SUCCESS.
- [Mirror rollback compatibility — Current explicit writes PostgreSQL protocol — 42053458117](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458117): SUCCESS.
- [Current persisted reminder PostgreSQL protocol — 42053458061](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458061): SUCCESS.
- [Mirror rollback compatibility — Current projection parity PostgreSQL preflight — 42053458377](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458377): SUCCESS.
- [Synthetic source-profile PostgreSQL protocol — 42053458384](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458384): SUCCESS.
- [Operational telemetry (synthetic Next) — 42053458492](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458492): SUCCESS.
- [Current profile commands PostgreSQL protocol — 42053458331](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458331): SUCCESS.
- [Mirror rollback compatibility — Synthetic PostgreSQL restore — 42053458893](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458893): SUCCESS.
- [Current compact storage PostgreSQL protocol — 42053458319](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458319): SUCCESS.
- [Synthetic saved-letter PostgreSQL protocol — 42053458389](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458389): SUCCESS.
- [Current literal source versions PostgreSQL protocol — 42053458640](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458640): SUCCESS.
- [Parser TLS API compact PostgreSQL integration — 42053458722](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458722): SUCCESS.
- [Central pre-auth quota (synthetic PostgreSQL) — 42053458675](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458675): SUCCESS.
- [Current version commands PostgreSQL protocol — 42053458460](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458460): SUCCESS.
- [Isolated document parser — 42053458502](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458502): SUCCESS.
- [Exact-main adaptation CPU diagnostic (synthetic only) — 42053458407](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458407): SUCCESS.
- [Application checks — 42053458246](https://github.com/kredavto/JobMatch-AI/actions/runs/42053458246): SUCCESS.

All19changed source files were fully reread at the immutable commit and matched
local content/blob IDs. The full untruncated tree confirms682prior blobs unchanged,
no unrelated path and no deletion. Old AI prompt/provider/corpus/model pin,
SQL migrations, dependencies and version remain unchanged. The subsequent evidence
commit changes six Markdown files only; its immutable readback/code parity and
own CI status are tracked in PR#123. Accepted executable evidence is the exact
source above, not an inference from a documentation-only check.

PR#123 stays unmerged; no release/deployment or production operation. Next is
human review/edit decisions plus normalized immutable storage and database
forgery defenses with native lifecycle tests, then UI. Model qualification,
agreed mail/recovery, provider-copy restore, personal-data location/retention,
HH permissions and final live/security/device gates remain open. Internal work
remains and the existing automation continues; the full project is incomplete.
