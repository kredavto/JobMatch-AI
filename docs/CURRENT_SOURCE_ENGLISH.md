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

## Verified source and remaining limits

Accepted source `43fcbd22fe466bde344af63eab7708ba9e3ad145`, tree
`c6b7d4ad924c2d59a3bdf9510d2561ec34b0b57b`; all19sourceworkflows SUCCESS.
Hosted application/native checkout tree was verified against the authored tree.
[Complete evidence and retained failures](VERIFICATION_SOURCE_ENGLISH_20261105.md).

Application:1,615unit/108files,487browserPASS/2liveSKIP; all8new cases passed.
Native PG17:118Python, populated/full/atomic additive migration, actual production
route/codec→owned transport→SQL, mixed hashes/Unicode/ranges, fresh committed false/
lost responses and explicit reconciliation without replay,12writers/one row/audit,
mixed20cap, audit rollback, observed revoked waiters/independent owner progress,
closed rollback/mixed reads/export/cleanup/reapply exact definitions/ACL/data,20-table
synthetic native restore/RLS/closed-default/unknown-tag corruption passed. Not every
scoped table was populated by this extension; this is not provider-copy restore.

Signed fresh ClamAV database28174 and unchanged24hgate passed. Actual CPU inference
completed16syntheticresponses/1,074tokens but0/16gold,NOT ACCEPTED; source/corpus/model
pin values unchanged, model/deployment identity and semantic/held-out acceptance
unverified. Initial migration guard/schema-reference, optional-role and duplicate
fixture failures are retained in the journal. No Supabase CLI/advisor, local browser/
native, real Auth/mail, physical-device/manual, provider or model acceptance claimed.

No production configuration, data, flags, external model traffic, HH writes, mail,
paid infrastructure, merge, release or deployment was changed. Supabase CLI was not
retried after its earlier telemetry-related automatic-review refusal.
