# AI rewrite review — verification, 6 November 2026



## 6 November 2026 — explicit user-declared AI rewrite review receipts (disabled)

Continued ready/unmerged PR#125 at3f4e2ab2. Its source and final three workflows are all SUCCESS; the archived actual6responses/282tokens/all7claims-refused result remains unchanged and NOT ACCEPTED. Fresh main a3a9ef0c/four main plans/open PRs were read at this run's start; no future merge/release permission inferred from historical PR#1/#2 approval.

PR#126 adds a separately default-off review-only endpoint, strict per-fact keep-source/accept-proposal/manual-edit decisions, canonical full-text/source/proposal/configuration-bound review SHA and exact acknowledgement set, source/manual/model origins and bounded source/proposal numeric/negation/manual-edit findings. A refused model claim has no proposal text: manual edits after refusal compare only against source. New HMAC review domain binds the verified original preview, current owner/revision/source/config/key and user declaration, inheriting the original expiry without refresh. Reauthentication/reread/late-disable/cancel/expiry discard stale results. No inference, profile/fact/score/history mutation, immutable save or UI; one analysis quota only. Review UUIDs are not database write/idempotency keys; manual re-requests can issue different UUIDs under the same original deadline. Separate consent-to-store and DB guards remain required.

Accepted source `cfc36a76d2f3014a81804d6d110538541841a79a`, tree `7aef8caa00a7548ed92b688eeb363219df2ab665`, local32e304789d35302d8c60e52d05f8727dd35c9d84. **All21source workflows SUCCESS**:
- [Application42190834832/job127802152565](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834832/job/127802152565):1745unit/111files, including61new pure/real-HMAC/production-route tests;487browser PASS/2live SKIP; graph/lint/types/build PASS. Auth/DB are stubbed in new route tests, no live accounts/provider acceptance. Local69existing rewrite/27observer tests and27Python report checks PASS; initial short-token rotation fixture was corrected to a valid rotated token, no configuration guard weakened.
- [Ops42190835012/job127802153340](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835012/job/127802153340):41observer/27Python tests and actual Next process,15static labels/20GET-POSThandlers; guard/privacy/alert/cap PASS. Content/IDs never added to telemetry.
- [Native42190835058/job127802153112](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835058/job/127802153112):119Python and existing mixed source-version/nativePG17 lifecycle,12writer single-row/audit, false/lost committed replies/manual reconciliation/no replay, exact rollback/reapply/ACL/data and20table synthetic restore/RLS regressions PASS. New AI-review storage does not exist; these are compatibility regressions, not its acceptance or provider-copy restore.
- [Scanner42190835021/job127802153740](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835021/job/127802153740):actual refreshed Clam1.4.6 database28175 dated06:24:43Z observed08:54:11.671Z, unchanged24h freshness gate/observer/archive/reload/refusal tests PASS. Parser/OCR job also SUCCESS.
- [Rewrite CPU42190834959/job127802152732](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834959/job/127802152732):6actual completed responses/251tokens, all7selected claims refused,0changed claims; NOT ACCEPTED. Formatting/token totals vary from the immutable PR#125run; do not replace its282token record or call this useful rewriting. [Old literal-selection CPU42190835165/job127802153390](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835165/job/127802153390):16responses/1074tokens/0gold, NOT ACCEPTED. No output-driven prompt/corpus retuning or semantic/held-out acceptance.

Initial source74caa87a/treefeae8548 also passed all21workflows; an explicit code review then removed the misleading proposal comparison when the model refused, with renewed61tests and the accepted21workflow run above. Final evidence updates four plans/two docs and clarifies one route comment about retries; no executable statement/test/workflow changed from accepted source. Final CI is recorded separately; no unobserved final success claimed. Full contract and inventory: docs/CURRENT_AI_REWRITE_REVIEW.md and docs/VERIFICATION_AI_REWRITE_REVIEW_20261106.md.

Next available block: normalized immutable reviewed-version storage with explicit storage consent, current MAC/source/config/expiry checks under owner lock, trusted-metadata legacy-forgery preflight, exact ACK/manual reconciliation/no automatic replay, mixed immutable history/export/restore and real native lifecycle; then UI. Browser consistency/digest decoding is not MAC verification, a user declaration is not semantic proof, and current-context verification is not the historical restore policy. No new persisted format is trusted yet.

Baseline0.34.0/b05c45d0 and scoped PR#1/#2 historical merges retained. No merge/release/deploy/liveDB/production flag/key/mail/HHwrite/paid resource. Useful qualified model/independent semantic evaluation, agreed SMTP/recovery, actual Supabase provider-copy restore, personal-data hosting/retention decision and final live/security/device acceptance remain OPEN. Full project incomplete; internal technical work remains.

## Complete accepted-source CI inventory

- [Current application commands PostgreSQL protocol — 42190834969](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834969): SUCCESS
- [Synthetic saved-letter PostgreSQL protocol — 42190835096](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835096): SUCCESS
- [Operational telemetry (synthetic Next) — 42190835012](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835012): SUCCESS
- [Current persisted reminder PostgreSQL protocol — 42190834935](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834935): SUCCESS
- [Central pre-auth quota (synthetic PostgreSQL) — 42190835094](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835094): SUCCESS
- [Mirror rollback compatibility — Synthetic PostgreSQL restore — 42190834821](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834821): SUCCESS
- [Current profile commands PostgreSQL protocol — 42190834928](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834928): SUCCESS
- [Mirror rollback compatibility — Current explicit writes PostgreSQL protocol — 42190834998](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834998): SUCCESS
- [Synthetic source-profile PostgreSQL protocol — 42190834947](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834947): SUCCESS
- [Current compact storage PostgreSQL protocol — 42190835092](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835092): SUCCESS
- [Rewrite diagnostic harness — 42190835082](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835082): SUCCESS
- [Mirror rollback compatibility — Current canonical reads PostgreSQL protocol — 42190835071](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835071): SUCCESS
- [Mirror rollback compatibility — Current projection parity PostgreSQL preflight — 42190834937](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834937): SUCCESS
- [Current version commands PostgreSQL protocol — 42190834815](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834815): SUCCESS
- [Isolated document parser — 42190835021](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835021): SUCCESS
- [Parser TLS API compact PostgreSQL integration — 42190834862](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834862): SUCCESS
- [Mirror rollback compatibility — Current logical backup PostgreSQL protocol — 42190834999](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834999): SUCCESS
- [Current literal source versions PostgreSQL protocol — 42190835058](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835058): SUCCESS
- [Exact-main adaptation CPU diagnostic (synthetic only) — 42190835165](https://github.com/kredavto/JobMatch-AI/actions/runs/42190835165): SUCCESS
- [Application checks — 42190834832](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834832): SUCCESS
- [Owned rewrite CPU diagnostic (synthetic only) — 42190834959](https://github.com/kredavto/JobMatch-AI/actions/runs/42190834959): SUCCESS

All21completed run conclusions were independently read. Source code files fully reread from immutable GitHub commit and local tree matched. Native storage runs cover existing protocols only; no new AI-review save is present. The two source model diagnostics are actual owned CPU regressions on synthetic data, not model qualification or live provider identity evidence. Prior failures/results remain linked above and in the immutable PR#125report.
