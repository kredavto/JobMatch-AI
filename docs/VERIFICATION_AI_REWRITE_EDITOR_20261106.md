# AI rewrite editor verification — 2026-11-06


## 2026-11-06 — PR #127: browser editor for explicit per-fact rewrite review

Fresh main remains `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`; all four current-main plans and open PRs were read at this launch. This change is stacked on unmerged PR #126, final `e8be94961501a99fb26f51687be7a77b21f303e8`. All 21 final-head workflows of #126 were observed SUCCESS; its production flags remain default-off. PR #127: https://github.com/kredavto/JobMatch-AI/pull/127, branch `feat/rewrite-review-editor-20261106`. Accepted executable source `8a297b013bc73bbd3f0b57cb21029fbc4eb165a0`, tree `2178feb3d09602698b9bfc7dd70b9d2de58e9757`.

Implemented RU/EN current-workspace editor: verified unique whole-line fact selection; separate inference and review consents; explicit keep-source/accept-proposal/manual choice and per-fact review; complete chosen document and source/model/manual origins; every bounded lexical issue acknowledged against the exact review digest; signed review request through the existing production route. Edits, exact undo and risk-ACK changes revoke obsolete consent/confirmation. Shared request mutex, bounded response decoding, exact HTTP200/MIME, timeout, cancellation, owner/revision/source/config checks and stale-result disposal prevent automatic replay. Drafts survive navigation/locale changes within the current mounted owner, become read-only on expiry/source changes and retain one previous local manual draft on explicit replacement. Prefixed owner React key prevents sibling-panel identity collision. No new browser persistence; logout/reload removes local drafts. No version/profile/score/history write, automatic application, HH operation or export path added. Review confirmation is not consent to store; browser decoding is consistency checking, never server MAC authentication or semantic proof.

Local 23 new unit tests plus 130 existing rewrite tests PASS (153/4 files); 26 new browser cases PASS in owned Chromium133, real current React root, authored/stubbed Auth/API/model/DB responses. Mobile English axe0/no horizontal overflow and screenshot inspected; not physical-device/manual WCAG acceptance. Initial local browser run exposed a real sibling key collision; fixed and rerun 17/17, then expanded 26/26. DOM textarea CRLF-to-LF expectations were corrected without normalizing signed source bytes. Local types/focused lint PASS. Reused local Next16.4.3 dependencies are not a claimed Next16.4.5 production build.

All 19 workflows on the accepted source were observed SUCCESS. Canonical Application checks https://github.com/kredavto/JobMatch-AI/actions/runs/42198967922 (job127829222267): clean dependency install, graph/lint/types, 1768 unit tests/112 files, pinned Next16.4.5 build, 513 browser PASS / 2 live-only SKIP. Operational telemetry https://github.com/kredavto/JobMatch-AI/actions/runs/42198967693:41 TS +27 Python tests and existing 15labels/20handlers guards. Current source-version PG17 https://github.com/kredavto/JobMatch-AI/actions/runs/42198967686:119 Python tests, existing native lifecycle/concurrency/lost-ACK/manual-reconcile/rollback/reapply and 20table synthetic restore/RLS/unknown-tag corruption PASS. These regressions do not establish new rewrite storage or a real Supabase provider-copy restore. Parser/scanner https://github.com/kredavto/JobMatch-AI/actions/runs/42198967636 PASS: loaded ClamAV1.4.6/database28175 dated06Nov06:24:43Z, observed09:59:14.658Z inside unchanged24h freshness gate; archive/limit/reload/refusal policies passed.

Actual owned CPU rewrite https://github.com/kredavto/JobMatch-AI/actions/runs/42198967578 on the same source completed6 positive-token responses/251tokens, six contract-valid results, all seven selected claims refused, zero changed claims; MODEL NOT ACCEPTED. Frozen prompt/corpus/runtime gates unchanged. Older adaptation diagnostic https://github.com/kredavto/JobMatch-AI/actions/runs/42198967816 completed16 responses/1074tokens,0gold passes; NOT ACCEPTED. Human semantics and independent held-out assessment NOT PERFORMED. Authored UI fixtures and valid fixture HMACs are not model evidence.

Final evidence commit for #127 changes only six Markdown files; executable source, tests and workflows remain byte-identical to accepted source. Final-head checks must be observed separately, not inferred from source success. Contract and full workflow inventory: docs/CURRENT_AI_REWRITE_EDITOR.md and docs/VERIFICATION_AI_REWRITE_EDITOR_20261106.md.

Next available technical block: normalized immutable reviewed-version storage, explicit storage consent, current receipt MAC/source/config/deadline validation under owner lock, trusted-metadata legacy-forgery preflight, exact ACK/manual reconciliation without automatic replay, mixed historical read/export/restore policy and native concurrency/rollback/reapply tests; then integrate explicit save into this editor. No new persisted rewrite format trusted yet. This UI completes the browser review block, not the full project.

Baseline0.34.0/main b05c45d0b77fd1b25916892611ccc622d4b4b128 retained. Historical PR #1/#2 were merged with explicit owner permission; that authorization does not authorize another merge/release. No merge/release/deploy/liveDB/production flag/key/mail/HHwrite/paid resource. Useful qualified model, independent semantic assessment, agreed real SMTP/password-recovery exercise, actual Supabase provider-copy restore, operator personal-data hosting/retention decision and final live/security/device acceptance remain OPEN. Internal technical work remains, so automation must not be paused as external-only.


## Accepted-source workflow inventory

Every row below was independently fetched as a completed workflow on exact head `8a297b013bc73bbd3f0b57cb21029fbc4eb165a0`. There are19 triggered workflows, not21; workflow path filters differ from #126. No untriggered workflow is counted as a pass.

| Workflow/run | Observed conclusion |
| --- | --- |
| [Isolated document parser](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967636) | SUCCESS |
| [Current literal source versions PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967686) | SUCCESS |
| [Mirror rollback compatibility — Current explicit writes PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967638) | SUCCESS |
| [Mirror rollback compatibility — Current logical backup PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42198968077) | SUCCESS |
| [Rewrite diagnostic harness](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967756) | SUCCESS |
| [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967693) | SUCCESS |
| [Current application commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967683) | SUCCESS |
| [Current persisted reminder PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967634) | SUCCESS |
| [Mirror rollback compatibility — Current canonical reads PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967562) | SUCCESS |
| [Current compact storage PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967928) | SUCCESS |
| [Current profile commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967903) | SUCCESS |
| [Synthetic source-profile PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967582) | SUCCESS |
| [Mirror rollback compatibility — Current projection parity PostgreSQL preflight](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967882) | SUCCESS |
| [Current version commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967743) | SUCCESS |
| [Synthetic saved-letter PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967643) | SUCCESS |
| [Parser TLS API compact PostgreSQL integration](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967771) | SUCCESS |
| [Owned rewrite CPU diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967578) | SUCCESS |
| [Exact-main adaptation CPU diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967816) | SUCCESS |
| [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/42198967922) | SUCCESS |

## Local verification and corrections

Local source tree exactly matches canonical Git tree `2178feb3d09602698b9bfc7dd70b9d2de58e9757`; all eight executable/test files were read back at immutable source SHA. The isolated checkout was reconstructed from canonical Git blobs and preserved the earlier dirty checkout. Reused dependency cache reports Next16.4.3; only hosted canonical npm-ci/Next16.4.5 build is production-build evidence.

Commands executed on the final source include focused Vitest (153 tests across4 files), TypeScript and focused ESLint, then `playwright test --config tests/current-rewrite-editor.config.ts --workers=1 --max-failures=2` with owned Chromium133.0.6943.0. The container's installed browser extraction hit an EINVAL chown restriction; pinned installed package Brotli/tar assets were unpacked into a new task-owned directory without changing shared temporary files. No remote service/login was used for browser execution.

Initial17 browser cases produced10PASS/7FAIL and exposed a sibling React-key collision with the letter panel. Prefixing the owner key fixed the actual retained/duplicate component identity. Assertions for textareas now account for native DOM CRLF-to-LF presentation; signed/rendered source bytes remain exact in unit and server fixtures. The rerun passed17/17, then nine additional races/bounds/security cases passed in the final26/26 run. No test guard or production receipt verification was weakened.

New unit coverage (23): unique supported whole-line selection; duplicate/ambiguous/unverified exclusions; strict owner/revision/source/vacancy/facts/selected IDs/output-language response binding; unknown fields; nested preview equality; confirmation choices/ACK/digest/full rendering/expiry/key; explicit browser-MAC/server-MAC distinction.

New browser coverage (26): separate consents and per-fact choices; refusal/manual origins; exact undo revocation; risk/global ACK revocation; navigation/locale draft retention; dirty and revised source pause; one-backup replacement; status400/401/409/413/429/503/504 fixed errors/no replay; foreign-owner response discard; late cancelled preview preserves manual work; held confirmation double click/forced edit bound to captured body; mobile axe0/no overflow; invalid201/MIME/UTF8/oversize;25s timeout;600s expiry; captured requested language; tampered confirmation; logout/no persistent storage. These use authored fixture API responses, not measured model output.

## Actual model evidence remains a refusal

Rewrite CPU run42198967578/job127829220635 ran10:03:48.508Z–10:03:57.180Z on accepted source. Six requests all produced positive token counts (31,52,43,43,43,39; total251), stop/contract-valid replies. All seven selected claims were refused; changedClaims0/lexicalFindings0 does not demonstrate safe useful rewriting. MODEL NOT ACCEPTED; semanticAssessment and independentHeldOut NOT PERFORMED. Original #125 report6/282 is preserved unchanged; this later source run does not overwrite or relabel it.

Old adaptation run42198967816/job127829221975 ran10:03:49.793Z–10:04:18.426Z:16 actual responses/1074 tokens/0gold passes. NOT ACCEPTED. Both runs use only frozen public synthetic corpora and bounded owned no-network CPU containers. Their envelope adapter is explicit, and model/deployment identity is not promoted to verified production identity. UI authored fixtures, real fixture signatures and application CI success are not live-model qualification.

## Remaining acceptance

No live SMTP/password-recovery message, production Auth exercise, Supabase provider-copy restore, live personal-data placement decision, HH write, external user-data LLM, paid infrastructure, merge/release/deploy, production flag or key change occurred. A populated native20table restore is synthetic owned PostgreSQL evidence only. Baseline and historical scoped #1/#2 permission remain retained. Project incomplete; next internal block is normalized immutable reviewed-version storage, then explicit Save integration.
