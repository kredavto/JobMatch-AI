# Persisted reminder server protocol verification — 5 November 2026

Source `cf5fdcfa0238a4493054bb3764115ca768c77579`, tree `54afb35b9b4ee16f45b9fad439d0877e218956f0`.
[PR #117](https://github.com/kredavto/JobMatch-AI/pull/117) is stacked on ready/unmerged
#116 `97f174ee42739102896752bef444dcb034dc01d4`, whose final17workflows passed.
Fresh main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, four main plans and106openPRs
were read before this block. Baseline0.34.0/b05c45d0 and owner's scoped#1/#2merge
permission remain recorded; no new merge/release permission is inferred.

## Delivered scope

Separate normalized owner reminder records and a monotonic counter; strict API for
explicit create/reschedule/complete/cancel/delete; workspace/reminder revisions;
current-session/RLS/ACL/quota boundaries; exact full-effect ACK;100record cap;
Unicode scalar limits; explicit named-zone/offset/UTC occurrence. Stored accepted
occurrence stays readable after timezone-rule changes; only explicit new/rescheduled
writes validate current rules. Description remains literal. Existing workspace and
source/letter provenance are untouched.

Both API and DB write gates default OFF. Read/export remains available after a
data-preserving close-write rollback. Direct DML/counter access is revoked.
Counter survives record deletion, preventing revision ABA; account deletion cascades
both new tables. delivery:none; no scheduler/mail/push/calendar-provider operation.
Existing ICS bytes/UI stay unchanged. Saved-reminder UI and its draft/reload guards,
personal-data export integration and explicit delivery/permission remain unfinished.

## Exact-source verification

- [Application run41995350359/job127137063234](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350359/job/127137063234):
  lint PASS (six existing warnings), types PASS, production build PASS,
  **1496unit/101files PASS;439browser PASS/2live-account SKIP**.
  Adds55unit cases relative to #116. Route tests use synthetic Auth/transport;
  pure ACK/time/schema tests and production DB wrapper counterfactuals cover
  stale/wrong-owner/wrong-effect/lost responses with no automatic replay.
  Existing browser behavior is regression-tested; no new saved-reminder UI is claimed.
- [New native PG17 run41995350450/job127137064661](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350450/job/127137064661):
  **112Python tests PASS** (5new).
  Actual consolidated empty install and frozen populated predecessor upgrade PASS.
  Default-off refusal, actual production TS command wire/exact ACK against native SQL,
  owner/foreign/revoked session, direct authenticated/anon DML and private-counter
  refusal, invalid/ambiguous/gap/zone/offset/Unicode/time boundaries and100record cap PASS.
  Complete/reschedule/cancel/delete/recreate preserve global revision and source workspace.
 20 concurrent writers yield1commit/19conflicts.
  Late-fault rollback and forward reapply leave definitions/ACLs/rows unchanged;
  successful rollback retains read/export data and closes write grants; reapply
  preserves rows and keeps operator gate off.
  New20table logical manifest includes both new tables with data; native pg_dump/pg_restore
  preserves ACLs/rows, restored owner read/RLS suite PASS, counter corruption detected,
  account-delete cascade PASS. This is disposable synthetic Auth/SQL/transport/native
  restore, **not actual Supabase provider-copy restore/PostgREST/SMTP/RPO/RTO**.
- [Isolated parser run41995350362](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350362):
  parser127137062761 and antivirus127137063158 PASS.
  ClamAV1.4.6 loaded signed28174, timestamp2026-11-05T06:26:24.000Z,
  observed2026-11-05T08:34:41.450Z; age7,697,450ms within unchanged24h.
  Real refreshed database, signed observer, blocked test string/archives/limits/encryption,
  live reload, clean extraction and unavailable scanner/observer refusal PASS.
  No worker/policy/time/resource relaxation or blind rerun.
- [CPU diagnostic run41995350505/job127137063405](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350505/job/127137063405):
  exact authored head, actual pinned synthetic16responses/1074tokens,
  **0/16gold; NOT ACCEPTED** (14provenance/2gold mismatches).
  Semantic/independent held-out assessment not performed; model/deployment qualification OPEN.
  Green workflow is not model acceptance.

All **19 source workflows concluded SUCCESS**, including every existing command,
canonical/compact/parity/logical/native restore, profile/source-version/saved-letter,
telemetry/quota/parser integration regression:
- [Operational telemetry (synthetic Next): 41995350289](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350289)
- [Mirror rollback compatibility — Synthetic PostgreSQL restore: 41995350383](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350383)
- [Current persisted reminder PostgreSQL protocol: 41995350450](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350450)
- [Current profile commands PostgreSQL protocol: 41995350325](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350325)
- [Mirror rollback compatibility — Current logical backup PostgreSQL protocol: 41995350484](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350484)
- [Mirror rollback compatibility — Current explicit writes PostgreSQL protocol: 41995350270](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350270)
- [Central pre-auth quota (synthetic PostgreSQL): 41995350240](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350240)
- [Current version commands PostgreSQL protocol: 41995350438](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350438)
- [Mirror rollback compatibility — Current canonical reads PostgreSQL protocol: 41995350298](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350298)
- [Synthetic saved-letter PostgreSQL protocol: 41995350248](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350248)
- [Current application commands PostgreSQL protocol: 41995350487](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350487)
- [Current compact storage PostgreSQL protocol: 41995350382](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350382)
- [Mirror rollback compatibility — Current projection parity PostgreSQL preflight: 41995350360](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350360)
- [Synthetic source-profile PostgreSQL protocol: 41995350261](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350261)
- [Current literal source versions PostgreSQL protocol: 41995350285](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350285)
- [Parser TLS API compact PostgreSQL integration: 41995350316](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350316)
- [Isolated document parser: 41995350362](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350362)
- [Exact-main adaptation CPU diagnostic (synthetic only): 41995350505](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350505)
- [Application checks: 41995350359](https://github.com/kredavto/JobMatch-AI/actions/runs/41995350359)

Application/native/scanner logs identify synthetic checkout
`e78c0f96088c1e980cd0bc7d9d3af7ba4e23f3d7`; its Git commit tree equals authored tree
`54afb35b9b4ee16f45b9fad439d0877e218956f0`. CI checkout is a test merge, not a main merge.
CPU binds exact authored head instead. Final evidence update is Markdown only;
no fresh inference is claimed for that documentation commit.

## Integrity and execution boundaries

All35sourcefiles were read back in full at immutable source SHA with matching
Git blob/type/mode metadata. Whole-tree comparison:603priorblobs unchanged/no deletions.
Published tree exactly matches fresh locally checked full Git tree. Prior migrations
and SHA pins remain frozen; all known addon suffixes are explicit and negative guards pass.
Backup v4 explicitly extends prior18table scope to20; old formats remain unchanged.
Fresh local1496unit/101files,112Python,lint/types/build PASS. Local PG/Docker unavailable;
native evidence comes from hosted disposable PG17. No local browser or manual/device
acceptance is claimed for this block.

The initial Supabase CLI invocation generated an empty migration file, then automatic
approval review rejected further session use over possible PostHog telemetry. No repeat
or indirect CLI bypass was attempted. Source editing and hosted isolated native tests
completed the database code verification. No CLI advisor/migration-list/live-query or
provider setting change is claimed. Current changelog, RLS/session/grant documentation
were consulted; no extension encryption/operator/index behavior is changed.

Final complete immutable readback and full executable/test tree parity with green source
are recorded in PR metadata. Final documentation-triggered CI is tracked separately.

## Remaining project gates

Next internal block: current saved-reminder tracker UI with owner-scoped drafts, exact ACK,
pending/cancellation/manual reload guards, RU/EN and complete separate personal-data export
integration. Notification delivery stays default-off and requires explicit permission.
Full qualified model/held-out semantics, approved real SMTP/recovery recipient/run,
actual Supabase provider-copy restore/isolatedtarget/cost/RPO/RTO, operator PD location/
retention/deletion/backup policy, HH permissions and final independent security/capacity/
manual/PWA/live operational acceptance remain OPEN.
No live DB/schema/config/flags/mail/real-user externalLLM/HHwrite/paidinfra/mainmerge/release/deploy.
Full project is not complete; internal work remains.
