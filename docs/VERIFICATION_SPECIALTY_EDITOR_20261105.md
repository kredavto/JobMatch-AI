# Specialty editor verification — 5 November 2026

Source commit `46591e053ba042629e718978cefdcaa85f4a9f1c`, tree `77189e218c487f2c89eb9687ac8e5b320141bbb5`.
[PR #116](https://github.com/kredavto/JobMatch-AI/pull/116) is stacked on unmerged
[#115](https://github.com/kredavto/JobMatch-AI/pull/115), exact base
`468bbb3957a1d517ab7ebafdcfd9e44f8030e998`.
Fresh main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, four main plans and all 105 open PRs were read before implementation.
Historical baseline 0.34.0/`b05c45d0b77fd1b25916892611ccc622d4b4b128`
and the owner's scoped permission to merge #1/#2 remain recorded; no later merge or release is authorized by that history.

## Implemented and verified behavior

Explicit RU/EN tracker label editing uses existing #115 compact application commands.
Opening, typing, preparing a clear and cancelling are local only. A save submits
the captured label with saved status/note, owner and revision. Exact acknowledgement
checks admit only the intended row change, preserving unrelated source, events,
links and legacy metadata. Creation acknowledgements reject an unrequested specialty.
No inference, trimming or normalization occurs.

Owner-scoped drafts preserve exact property absence, empty values and unknown legacy JSON.
New typing survives late ACK; cancelled drafts stay cancelled; edit epochs handle ABA.
External label changes require explicit compare/rebase. Unsaved note drafts remain
independent. Shared request guard prevents double submit. Invalid/lost responses pause
writes for manual reload, never automatic replay. Own-property checks/Map counters
support reserved IDs. Locale, filters and tab navigation preserve editing state.
Analytics copy now points to the editor.

## Exact source evidence

- [Application checks run41990276011/job127120594782](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276011/job/127120594782):
  lint PASS (six existing unused-variable warnings), typecheck PASS, production build PASS;
  **1441 unit tests / 98 files PASS**, **439 browser tests PASS / 2 live-account SKIP**.
  All 14 new editor browser scenarios and 11 existing note scenarios PASS.
  Adds 33 unit cases and 14 browser cases relative to #115.
  Browser tests exercise the current Root with owned loopback UI and synthetic HTTP responses,
  not live Supabase/Auth/mail/employer actions. Mobile automated axe/overflow and keyboard focus
  checks PASS; no independent physical-device, visual or screen-reader acceptance is claimed.
- [Application PostgreSQL run41990276029/job127120594922](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276029/job/127120594922):
  **107 Python tests PASS**; actual TS command wire + PG17 full/populated upgrade,
  specialty Unicode/omission/clear/drop/owner/session boundaries, 20 application writers
  and 20 specialty writers each 1 commit/19 conflicts, transactional late-fault
  rollback/forward migration, row-preserving reapply, source-profile/saved-letter preservation
  and 17 populated native dump/restore/corruption checks PASS.
  Disposable synthetic Auth/transport/native restore is not actual Supabase provider-copy restore.
- [Isolated parser run41990276094](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276094):
  parser job127120595131 PASS and antivirus job127120595392 PASS.
  Loaded ClamAV1.4.6 database **28174**, timestamp **2026-11-05T06:26:24.000Z**,
  observed **2026-11-05T07:54:00.676Z**; age **5,256,676 ms**, within unchanged 24h policy.
  Real refreshed database, signed observer, blocked test string/archives/limits/encryption before parser,
  live reload, clean extraction and unavailable-observer/scanner refusal PASS.
  Actual parser image `sha256:cded454ed3b77009579414f624e2973384a5f727770e2e062318d73c798fd9c5`;
  scanner image `sha256:61b4701b6e86fd5bf8e517955904f456de93bed02580ec33259efd73ab0ed24a`.
  Worker/workflows/policy inputs were not edited by this PR. No threshold/timeout/resource relaxation
  or blind rerun. #115's earlier stale28173 failure remains a historical failure, not retroactively green.
- [CPU diagnostic run41990275986/job127120595100](https://github.com/kredavto/JobMatch-AI/actions/runs/41990275986/job/127120595100):
  exact authored source, actual pinned local CPU on synthetic inputs, 16 responses/1074 tokens,
  **0/16 gold passes; NOT ACCEPTED**. 14 provenance failures/2 gold mismatches.
  Semantic/independent held-out assessment not performed; model/deployment identity qualification OPEN.
  A green diagnostic workflow is not model acceptance.

All **17 source workflow conclusions SUCCESS**. Complete workflow IDs:
- Operational telemetry (synthetic Next): [41990276024](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276024)
- Synthetic source-profile PostgreSQL protocol: [41990276064](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276064)
- Synthetic saved-letter PostgreSQL protocol: [41990276075](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276075)
- Mirror rollback compatibility — Current canonical reads PostgreSQL protocol: [41990275959](https://github.com/kredavto/JobMatch-AI/actions/runs/41990275959)
- Mirror rollback compatibility — Current explicit writes PostgreSQL protocol: [41990276106](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276106)
- Current version commands PostgreSQL protocol: [41990276076](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276076)
- Central pre-auth quota (synthetic PostgreSQL): [41990275950](https://github.com/kredavto/JobMatch-AI/actions/runs/41990275950)
- Current application commands PostgreSQL protocol: [41990276029](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276029)
- Mirror rollback compatibility — Current logical backup PostgreSQL protocol: [41990276048](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276048)
- Current literal source versions PostgreSQL protocol: [41990276013](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276013)
- Current compact storage PostgreSQL protocol: [41990276103](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276103)
- Mirror rollback compatibility — Current projection parity PostgreSQL preflight: [41990275995](https://github.com/kredavto/JobMatch-AI/actions/runs/41990275995)
- Parser TLS API compact PostgreSQL integration: [41990276019](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276019)
- Isolated document parser: [41990276094](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276094)
- Current profile commands PostgreSQL protocol: [41990276023](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276023)
- Exact-main adaptation CPU diagnostic (synthetic only): [41990275986](https://github.com/kredavto/JobMatch-AI/actions/runs/41990275986)
- Application checks: [41990276011](https://github.com/kredavto/JobMatch-AI/actions/runs/41990276011)

Application/native/scanner logs identify synthetic PR checkout
`3784994bc07fd5da0ff7fd2be3ed5a4e7c3b7681`; its Git commit tree exactly matches authored source tree
`77189e218c487f2c89eb9687ac8e5b320141bbb5`. This checkout is a CI test merge, not an owner-approved main merge.
CPU diagnostic instead binds the exact authored head.

## Local execution and integrity

A fresh public clone confirmed main and base. The recovered unpublished reconstruction
was reviewed against this base, extended and verified again; archived checks/reviewer
claims are not reused. Fresh local 1441 unit/98files, lint, typecheck, production build
and 20 security tests PASS. Initial local browser execution was blocked by missing Chromium;
official install failed with a truncated/non-ZIP archive. That is not a local browser pass.
GitHub's installed Chromium completed the functional suite above.

Git CLI push lacked credentials, so publication used the connected GitHub API.
Published source tree exactly equals local checked tree. All 18 source files were
read back in full at immutable source SHA and matched expected content/tree metadata.
Whole-tree non-directory mode/type/SHA comparison: 605 prior files unchanged, no deletions.
SQL, server API, old migrations, worker, workflows, package/lock and dependencies unchanged.
Final evidence changes are Markdown only; final immutable readback and complete code/test
tree parity are recorded in PR metadata. Documentation-triggered CI is tracked separately.

## Remaining work

Next available internal block: persistent owner-scoped reminder commands/lifecycle,
explicit manual writes and default-off notification permission. Local ICS export
does not create/deliver a reminder. Full project remains incomplete: qualified model
and held-out semantics; approved actual SMTP/password recovery recipient/run;
actual Supabase provider-copy restore with isolated target/RPO/RTO/cost; operator PD
location/retention/deletion/backup policy; HH app/scopes/write permission; final independent
security/capacity/manual/PWA/live operational acceptance. No mail, real-user external LLM,
HH write, paid infrastructure, live migration/config, main merge, release or deployment.
