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
