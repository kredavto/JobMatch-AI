# Current source English verification — 5 November 2026

Accepted authored source: `43fcbd22fe466bde344af63eab7708ba9e3ad145`, tree `c6b7d4ad924c2d59a3bdf9510d2561ec34b0b57b`.
Clean local commit `3d5ee1754f6c5de524930ec579a807a978161b75` has that same tree.
Hosted application/native checkout `8edbab358c2593e4802d3f59850cd1319a4a023d` was fetched by its
immutable SHA; its Git tree equals the authored source tree. The CPU job separately
checked out the authored head. **All 19 source workflows completed SUCCESS.**

## Results

| Check | Actual result |
|---|---|
| Application | [42033729348/job127266366929](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729348/job/127266366929): 1,615 unit tests / 108 files; 487 browser passes, 2 explicitly skipped live scenarios; all eight new current-controller cases passed. Types/lint/build passed. |
| Source versions / PostgreSQL 17 | [42033729382/job127266367030](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729382/job/127266367030): 118 Python tests, existing Russian protocol and the complete English extension passed. |
| Real scanner | [42033729334/job127266367277](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729334/job/127266367277): ClamAV 1.4.6, loaded signed database28174 dated 2026-11-05T06:26:24.000Z, observed 2026-11-05T13:15:25.534Z; unchanged 24-hour freshness and isolation gates passed. |
| CPU model diagnostic | [42033729408/job127266366984](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729408/job/127266366984): actual16 synthetic responses,1,074 tokens, **0/16 gold; NOT ACCEPTED**,14 provenance failures/2 gold mismatches. Weights-file check passed; model/deployment identity unverified; semantic and independent held-out assessment not performed. Frozen corpus, source-hash map and model pin values equal the prior accepted diagnostic inputs; no retuning. |
| Local | Same1,615 unit/108 files,118Python,types/lint(six pre-existing warnings)/build/20 security tests passed. Initial generated Turbopack cache failure was preserved and a clean-cache build passed. Test-only type widening and Playwright discovery errors were fixed before source publication. No local browser or PostgreSQL execution is claimed. |

## Native evidence and limits

Both populated predecessor upgrade and consolidated full schema were executed in
owned disposable loopback databases, with synthetic Auth tables/sessions. The
existing Russian routines and stored Russian record stayed unchanged. Late DDL
failure rolled back data/catalog changes. Full/upgrade catalogs matched.

Actual production TS API and codecs ran through an owned HTTP bridge into native
SQL, including authenticated readiness, preview, save, stored detail and initial-list
NDJSON export. Known-template text/hash/ranges matched JS/SQL for all four entry
kinds with Unicode/ZWJ, CRLF, literal Russian words in quotes, numbers and reversed
dates. The bounded risk grammar was unchanged and refused its known risks; it does
not verify dates, meaning, source authenticity or every language.

Twelve writers at the same reviewed preview produced one immutable row and one
audit. The shared mixed-language20cap was exercised in a rollback-only owned
transaction. Audit-insertion fault rolled back the new version. Actual committed
saves followed by an altered reply or destroyed response were rejected, manually
read back, and were not replayed. Both English save and shared cleanup were
observed waiting on the owner lock; session revocation refused them, while an
independent owner progressed.

Closing the English permission retained mixed list/detail/export and explicit
cleanup. Reapplying the migration retained exact rows, function definitions and
normalized ACLs, while keeping construction closed. Actual pg_dump/pg_restore of
the20-table synthetic scope retained hashes, definitions, grants, owner reads,
foreign-owner RLS and the closed readiness default. Not every scoped table is
claimed populated by the English extension. Unknown-template corruption changed
the archive fingerprint and was refused by the current API. Owned databases were
removed; cleanup failures would fail the drill.

These are actual native SQL and browser results on **synthetic fixtures**, not
Supabase provider-copy restore, real Auth/recovery, delivered mail, model quality,
manual accessibility, physical device or final live workflow acceptance.

## Earlier failures retained

| Source | Observed failure and correction |
|---|---|
| `0988bb21f04a95198e46012d89dfbfdc9b06135a` / tree`4c26d63cbe92cb3b6a73aac3a49f5a08301f26cc` | Four workflows succeeded,15 failed. [42032725841](https://github.com/kredavto/JobMatch-AI/actions/runs/42032725841) refused the migration because it looked for public.reminder_state; the table is private.reminder_state. English extension skipped. App [42032725755](https://github.com/kredavto/JobMatch-AI/actions/runs/42032725755) already passed1,615unit/487browser/2live skips, including all8new cases; that did not establish native acceptance. |
| `b2654b92f9a160d75789ac413f60e11d7ef44156` / tree`0cb2fff260e2acab6d02fbc601b38ca77f71523e` | Corrected the table schema reference without removing the predecessor guard. Stock-PG [restore42033160661](https://github.com/kredavto/JobMatch-AI/actions/runs/42033160661) and quota failed because optional service_role was absent. New [native42033160666](https://github.com/kredavto/JobMatch-AI/actions/runs/42033160666) passed the old RU protocol but failed before the response-loss probe: the fixture requested a duplicate source entry, correctly refused by INVALID_WRITE. Separate [CPU42033160553](https://github.com/kredavto/JobMatch-AI/actions/runs/42033160553) ended ADAPTATION_DIAGNOSTIC_REFUSED_OR_INCOMPLETE/exit2; no completion or quality pass is inferred. At final source acceptance,14success/4failure/1older App still running; this source is not accepted. |
| `b08e4ac1d258863396eb5c6ba5d903fd1306beb5` / tree`e3877406e8ddeab0fc3df17b7418ff517d7942fe` | Explicit service-role revocation became conditional on role existence, retaining closure when present.18workflows succeeded; [native42033420462](https://github.com/kredavto/JobMatch-AI/actions/runs/42033420462) still failed on the same correctly rejected duplicate fixture entry. |
| Accepted `43fcbd22fe466bde344af63eab7708ba9e3ad145` | The fixture uses distinct education/certification entries for fresh commits. Duplicate guards remain. No production TS or SQL behavior changed for that fixture correction. All19sourceworkflows succeeded. |

Earlier migration files and pinned predecessor digests were not modified. Current
ordered fixtures remove exactly the new terminal addon before checking prior pins,
then install addons explicitly in order. The prior Supabase CLI telemetry-related
automatic-review refusal was respected: no CLI retry, migration-list, advisor or
live Supabase operation is claimed.

## Complete accepted workflow set

| Workflow | Run | Conclusion |
|---|---|---|
| Current persisted reminder PostgreSQL protocol | [42033729600](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729600) | SUCCESS |
| Mirror rollback compatibility — Current projection parity PostgreSQL preflight | [42033729453](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729453) | SUCCESS |
| Mirror rollback compatibility — Synthetic PostgreSQL restore | [42033729471](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729471) | SUCCESS |
| Current profile commands PostgreSQL protocol | [42033729489](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729489) | SUCCESS |
| Current compact storage PostgreSQL protocol | [42033729478](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729478) | SUCCESS |
| Mirror rollback compatibility — Current logical backup PostgreSQL protocol | [42033729325](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729325) | SUCCESS |
| Parser TLS API compact PostgreSQL integration | [42033729306](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729306) | SUCCESS |
| Mirror rollback compatibility — Current explicit writes PostgreSQL protocol | [42033729374](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729374) | SUCCESS |
| Central pre-auth quota (synthetic PostgreSQL) | [42033729315](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729315) | SUCCESS |
| Synthetic saved-letter PostgreSQL protocol | [42033729322](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729322) | SUCCESS |
| Current application commands PostgreSQL protocol | [42033729363](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729363) | SUCCESS |
| Exact-main adaptation CPU diagnostic (synthetic only) | [42033729408](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729408) | SUCCESS |
| Mirror rollback compatibility — Current canonical reads PostgreSQL protocol | [42033729364](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729364) | SUCCESS |
| Synthetic source-profile PostgreSQL protocol | [42033729401](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729401) | SUCCESS |
| Current version commands PostgreSQL protocol | [42033729461](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729461) | SUCCESS |
| Operational telemetry (synthetic Next) | [42033729406](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729406) | SUCCESS |
| Current literal source versions PostgreSQL protocol | [42033729382](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729382) | SUCCESS |
| Isolated document parser | [42033729334](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729334) | SUCCESS |
| Application checks | [42033729348](https://github.com/kredavto/JobMatch-AI/actions/runs/42033729348) | SUCCESS |

## Publication and remaining acceptance

All37changed source files were fetched at the immutable accepted SHA and matched
complete contents and Git blob IDs. The complete untruncated recursive tree
matched the clean local tree;646priorblobs were untouched, with no deletion.
The final evidence commit is Markdown-only; its exact readback, source-code parity
and separately triggered docs-commit CI are tracked in PR#121.

English construction remains default OFF. No new archive table, dependency or
release version was added. Application rollback must retain mixed-language
readers. This deterministic literal framing does not claim translation, semantic
verification or generative rewriting.

Full project acceptance remains open: qualified self-hosted model and independent
held-out assessment, agreed recipient and permission for real SMTP/password
recovery, actual provider-copy restore, operator personal-data location/retention/
backup-deletion decision, permitted HH operations, independent security and
capacity review, manual/screen-reader/physicalPWA/device and final live workflow.
Supported tooling remains an internal follow-up. Historical0.34.0/b05c45d0 and
explicitly merged#1/#2permission remain recorded/scoped. No production data/config/
flags/mail/real-user external LLM/HH write/paid infrastructure/merge/release/deploy.
