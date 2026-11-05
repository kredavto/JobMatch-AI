# Current structured-source English framing

This candidate extends the current `jobmatch-source-version-v1` archive, not the
older structured-profile branch in PR #43. The new frozen template identifier is
`source-literal-en-v1`; existing `source-literal-ru-v1` rendering, hash framing,
`ascii-cyrillic-line-v1` context guard and at-save-only provenance remain unchanged.
The English labels reuse the reviewed wording from #43, without reusing its schema,
grammar, runtime receipts or acceptance claims.

Only the heading, entry-kind labels and field labels change. Quotes, CRLF, Unicode,
numbers, dates, source IDs, selected ranges, confirmation declarations and full
original source remain literal. Known lexical risks still refuse a preview. This
does not establish semantic correctness, date consistency, source authenticity,
translation, model quality or generative rewriting.

## Intent and immutable history

The heading choice is independent of UI locale. Russian is the default and retains
the original wire shape; explicit Russian also calls the unchanged Russian RPC.
English requests include `templateVersion: source-literal-en-v1`. Both preview and
save validators bind the exact requested template, owner, revisions and selected
IDs; saves additionally bind the reviewed preview hash. Template changes discard
preview and consent. A pending request locks this selector; owner/source/dirty/
paused boundaries discard its late reply. No fallback or automatic replay occurs.

Mixed list/detail/TXT/JSON/initial-list NDJSON readers validate the recorded template
and hashes. Export uses the immutable record, independent of future choices or new
construction permissions. Unknown tags and inconsistent text/hash/summary refuse;
they are never relabelled from their text. History remains a separate full-source
copy with separate hash-bound deletion and a shared 20-record cap. Master facts are
never implicitly confirmed.

## Deployment and rollback

`JOBMATCH_SOURCE_ENGLISH_ENABLED=false` and the private database permission both
default closed. Saving also requires the existing profile/version environment
flags and storage grants. The API checks authenticated, session-bound readiness;
the new SQL writer retains the existing owner/workspace lock, selected snapshot,
idempotence, cap, audit transaction and session checks. Preview is read-only.

The additive migration checks the exact current Russian function bodies and table
constraint, expands the existing table's template constraint, and installs separate
English RPCs. It does not replace Russian routines or add a table/archive scope.
Reapplying refuses drift in already-installed English renderer/writer bodies and
closes construction. The rollback closes only English construction and retains
mixed immutable rows, readers, exports and explicit cleanup. Application rollback
must retain English-aware readers; an older Russian-only app is not compatible with
already-saved English history. Production migration/activation requires its own
operator decision and the still-open personal-data placement decision.

## Candidate verification status

Local: 1,615 unit tests / 108 files, 118 Python tests, typecheck, lint (six existing
warnings), build and 20 security tests passed. An initial build failed opening old
Turbopack persistence; its generated cache was preserved outside the new build and
the new build passed. Initial test-only TypeScript widening and Playwright `each`
usage were corrected before publication. Eight new browser cases are discovered;
hosted execution and the new native PostgreSQL protocol are **pending**.

Authored native checks use disposable loopback PostgreSQL 17 and actual current
TS routes/codecs → owned transport → SQL. They cover populated and full-schema
paths, atomic late migration failure, mixed history, JS/SQL Unicode and hash parity,
default-off permissions, actual false/lost replies after commit, idempotent writers,
shared cap, audit rollback, observed session-revoked waiters, closed rollback/reapply,
20-table synthetic native restore, RLS and unknown-template corruption. These are
test cases awaiting execution, not claimed passes. No provider-copy restore, real
Auth/mail, CLI/advisor, physical-device/manual or model acceptance is claimed.

No production configuration, data, flags, external model traffic, HH writes, mail,
paid infrastructure, merge, release or deployment was changed. Supabase CLI was not
retried after its earlier telemetry-related automatic-review refusal.
