# Saved-reminder tracker verification — 5 November 2026

[PR #118](https://github.com/kredavto/JobMatch-AI/pull/118) is stacked on ready/unmerged
#117 `007bf89a12b2b61335299e4ec4ee48fcef870052`, whose final19workflows completed successfully.
Fresh main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, four main plans and107openPRs
were checked before this UI block. Baseline0.34.0/b05c45d0 and the owner's scoped
#1/#2merge permission remain recorded; no later merge/release authorization is inferred.

Accepted source `0c8b6d6049976f8a1ec1f3e931a1bf84f8f99813`, tree `5f8f23e6f4d3780fe111c5800a81daa83ecb4b37`.
Application/native/scanner logs identify synthetic CI checkout
`ac48de6b3dec6e9094b7df5e08b16c3b3838a77c`; its commit tree exactly equals authored source tree.
This checkout is a CI test merge, not an owner-approved main merge.

## Implemented behavior

Current Root integrates explicit owner-bound reads, a consented RU/EN form, named timezone,
explicit fold choice and visible saved/proposed UTC, manual lifecycle commands and
confirmed deletion. Owner-keyed RAM drafts survive section/locale changes, late typing,
withdrawn consent and ABA; cancelled/replaced sessions are not revived. An exact full-effect
owner/revision ACK is required before adoption. Shared Root busy coordination prevents
duplicate sends and keeps independent tracker notes unchanged. Conflicts/unknown results
require a combined explicit workspace/reminder read and a separate comparison/rebase.
Lost committed creation is discovered without automatic replay or another create.

Unknown/foreign owners cannot display records or create unbound downloads. Errors use fixed
localized copy. Loaded snapshot download validates owner/schema and cleans Blob URLs on
success/failure. Settings exposes the sixth current-data file with owner binding, an explicit
filename and accurate nontransactional-archive/deletion caveats. No resume or tracker notes
are added to reminder commands. Existing local ICS composer remains unchanged.

API/SQL/worker/workflows/dependencies are unchanged in this UI PR. API+DB write gates remain
defaultOFF and delivery:none; storage consent is not notification permission. No mail/push/
background delivery or external calendar event is created. These remain separate work.

## Initial failed source and correction

Initial source `1ae4e8097bb5a7e6c974a3722961ed7a9b1f2059`, tree `beb1657915181092cad9c01b13e73c6ea1ad5c47`,
[App42001446936/job127157398524](https://github.com/kredavto/JobMatch-AI/actions/runs/42001446936/job/127157398524)
passed1511unit and452browser, with2liveSKIP/3FAIL. Fifteen of16newbrowser scenarios passed.
Failures were: reminder anchor download named reminders.txt in an incomplete HTTP fixture;
prior settings expected3rather than4links; prior personal-archive assertions expected5rather
than6files. They are retained as evidence and are not attributed to a proven flake.

The correction sets an explicit reminder filename, adds a real owned loopback HTTP download
response with owner/query/method checks and schema-valid populated scheduled/cancelled data,
and asserts all four link contents and six-file disclosure. Blob downloads remain independently
tested. No mutation/owner/time/ACK guard, timeout or assertion was weakened. New normal
source CI, rather than a blind rerun, supplied the following results.

## Accepted exact-source results

- [Application42004125635/job127166469285](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125635/job/127166469285):
  lint PASS (six existing warnings), types/build PASS,
  **1511unit/102files PASS;455browser PASS/2live-account SKIP**.
  All16newactual-Root reminder scenarios and11existing settings scenarios PASS.
  Adds15unit cases and16browser cases relative to #117.
  Cases cover explicit read/storage consent, fold/gap/field refusal, exact captured request,
  newer typing/independent notes/locale/navigation, ABA/cancel/focus, mismatched ACK redaction,
  manual conflict comparison, lost committed write/no replay, complete/reschedule/cancel/delete,
  manual429retry, unknown/foreign owner refusal, sign-out clearing, populated server JSON
  downloads and failed Blob click cleanup/manual retry. Mobile automated axe/overflow/caret
  checks PASS. No independent manual visual/screen-reader/physical-device acceptance is claimed.
- [Reminder native42004125503/job127166469090](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125503/job/127166469090):
  112Python PASS; actual production TS wire/exact ACK and full/populated PG17 protocol,
  default-off/session/RLS/directDML/time/cap/lifecycle/recreation,20writers1commit/19conflicts,
  transactional late-fault rollback/forward and row-preserving reapply,
  20table native synthetic restore/ACL/fingerprint/corruption/account-cascade PASS.
  Disposable synthetic Auth/transport/native restore is not real Supabase-copy restore,
  live PostgREST/SMTP or operational RPO/RTO.
- [Isolated parser42004125569/job127166469410](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125569/job/127166469410):
  real ClamAV1.4.6 signed28174 timestamp2026-11-05T06:26:24.000Z,
  observed2026-11-05T09:41:06.937Z, within unchanged24h. Signed observer, blocking/limits/
  encryption/nesting/reload/clean extraction/unavailable scanner or observer refusal PASS.
  Parser job also PASS. No policy/resource/timeout relaxation or blind rerun.
- [CPU42004125531/job127166468864](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125531/job/127166468864):
  exact authored source, actual pinned synthetic16responses/1074tokens,
  **0/16gold; NOT ACCEPTED**.14provenance failures/2gold mismatches.
  Independent semantic/held-out assessment not performed; model/deployment qualification OPEN.
  A green diagnostic workflow is not model acceptance.

All **17 relevant source workflows concluded SUCCESS**:
- [Current compact storage PostgreSQL protocol: 42004125755](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125755)
- [Current application commands PostgreSQL protocol: 42004125698](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125698)
- [Mirror rollback compatibility — Current projection parity PostgreSQL preflight: 42004125597](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125597)
- [Parser TLS API compact PostgreSQL integration: 42004125676](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125676)
- [Mirror rollback compatibility — Current explicit writes PostgreSQL protocol: 42004125554](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125554)
- [Synthetic saved-letter PostgreSQL protocol: 42004125538](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125538)
- [Mirror rollback compatibility — Current canonical reads PostgreSQL protocol: 42004125616](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125616)
- [Current version commands PostgreSQL protocol: 42004125544](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125544)
- [Current profile commands PostgreSQL protocol: 42004125661](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125661)
- [Current literal source versions PostgreSQL protocol: 42004125609](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125609)
- [Current persisted reminder PostgreSQL protocol: 42004125503](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125503)
- [Synthetic source-profile PostgreSQL protocol: 42004125495](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125495)
- [Operational telemetry (synthetic Next): 42004125509](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125509)
- [Mirror rollback compatibility — Current logical backup PostgreSQL protocol: 42004125682](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125682)
- [Isolated document parser: 42004125569](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125569)
- [Exact-main adaptation CPU diagnostic (synthetic only): 42004125531](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125531)
- [Application checks: 42004125635](https://github.com/kredavto/JobMatch-AI/actions/runs/42004125635)

## Local checks and integrity

Fresh local1511unit/102files,lint/types/productionbuild and20security PASS.
The owned HTTP export fixture separately passed the actual RemindersStateSchema.
Browser discovery/typecheck found27focused cases (16newreminders/11settings).
Local browser was unavailable: the earlier official install was truncated; packaged
Chromium extraction failed EINVAL/chown. Functional browser evidence is hosted CI,
not a local/manual or real-device pass.

Published source tree exactly equals locally saved Git tree. All20changedsourcefiles
were read back in full at immutable source SHA with matching Git blob/type/mode metadata.
Whole-tree comparison:627priorblobs unchanged/no deletions. Final evidence commit is
Markdown only; final complete readback and all executable/test tree parity with green
source are recorded in PR metadata. Documentation-triggered CI is tracked separately.

A separate read-only strict dependency catalog audit completed with runtime0/full0 findings,
lock SHA256 `0809c0548ca1de5e5f20c4a8f20ace913995c094a1ea1eab4586448fe91a1ef5`.
This is catalog-snapshot-only, not independent security acceptance or proof of supported
toolchain lifetime; no package/lock was changed in this block.

## Remaining work and permissions

Next internal block: explicit notification permission and delivery/cancellation lifecycle,
with accurate foreground/background limits and no default activation. English immutable
resume codecs, actual generative/semantic/model qualification and supported tooling require
separate acceptance; this UI does not close them.

Approved actual SMTP/password-recovery address/run, actual Supabase provider-copy restore
target/cost/RPO/RTO, operator PD placement/retention/deletion/backup policy, qualified
self-hosted endpoint/held-out human evaluation, HH permissions and final independent
security/capacity/manual/PWA/live operational acceptance remain OPEN.
No live DB/config/flags/mail/real-user externalLLM/HHwrite/paidinfra/mainmerge/release/deploy.
Full project is not complete; internal work remains and automation continues.
