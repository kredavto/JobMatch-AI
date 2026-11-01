# Saved letters: backend protocol candidate

This change is based only on main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`.
It adds a separately reviewable backend/storage/export block. The cover-letter
panel still produces local files; connecting server preview, explicit acceptance,
history and failure recovery to that panel is the next implementation step.
No migration, key provision, production setting, merge or release is performed.

## What is recorded

A version keeps exact receipt bytes, selected confirmed fact IDs/text/source,
vacancy, template/style, generated and approved text, lexical review findings and
reported acknowledgements, owner and workspace/letter revisions, original UTF-8
SHA256, receipt ID, issue/expiry times, key fingerprint and accepted timestamp.
The full original resume and unselected facts are not copied into a letter.
Selected sources and the vacancy can contain personal data. This is additional
retention in the active database; account deletion cascades to its versions.
An original hash is a consistency check, not anonymisation or proof of truth.

`semanticAssessment: not-performed`, `modelVersion: null`, and
`contentReview: reported-user-review` are deliberate. A signature authenticates
a server key holder's validation of this packet. It does not prove a human read
it, establish factual truth, or make the bounded lexical review a semantic gate.
The rejected model experiments in PRs #66–#69 are neither repeated nor promoted.

## Default off; operator work still requires separate authorization

`JOBMATCH_SAVED_LETTERS_ENABLED` defaults to `false`;
`JOBMATCH_LETTER_SIGNING_SECRET` is absent. The independent secret must be 32
cryptographically random bytes, encoded as 64 lowercase hex characters, and
match the single private database config row. No value is seeded by schema or
migration. Never reuse Auth/JWT/provider keys or the public synthetic fixture
key in deployment. Keep keys out of API responses, logs and git. New writes fail
closed if application configuration is disabled, unavailable or mismatched.

Incremental migration `20261101073223_saved_letter_versions.sql` adds pgcrypto
in `extensions`, an empty private key table and an owner-scoped version table.
If pgcrypto is already installed elsewhere it fails; it never relocates an
operator extension. Existing deployments must review/test this prerequisite and
the incremental migration separately. The consolidated schema is for empty DBs.

The Supabase CLI was not invoked: an earlier automatic approval review rejected
its outbound PostHog environment/project metadata telemetry. This change uses
ordinary SQL source edits and an isolated PostgreSQL test instead. CLI-generated
migration history, Supabase advisors, provider application and production schema
verification have **not** been performed. No workaround disables or redirects
CLI telemetry. No production SQL is executed by the workflow.

## API contract

All responses are `no-store`. Every operation authenticates the user and active
session and checks supplied `x-jobmatch-owner`/`expectedOwnerId` hints. Reads
remain available without the signing key or enabled write flag. Native RPCs
repeat owner/session checks; no service-role credential is used by the app.

POST `/api/letter-versions`, same-origin JSON, bounded to 2,100,000 bytes:

- `action: preview`, `expectedOwnerId`, `workspaceRevision`, `letterRevision`,
  `consentToStore: true`, `snapshotJson`: validate the existing local v1 snapshot,
  recompose against the **full current** fact set, compare selected facts and
  vacancy, check key readiness and reread source/state. Return a receipt only;
  preview does not insert a version. Its lifetime is exactly 600 seconds.
- `action: accept`, same context and consent, the returned `receipt`, and
  `accept: SAVE_REVIEWED_LETTER_VERSION`: verify HMAC/owner/lifetime in Node,
  then call one atomic native RPC. Database checks raw-byte MAC, key fingerprint,
  owner/session, TTL, both revisions, exact selected facts, vacancy and original
  checksum under the common workspace lock. Database trusts the authenticated
  issuer's JS template/lexical validation; SQL does not duplicate that algorithm.

The private guarded definer performs the write; public wrappers are invokers.
Explicit table/function grants, SELECT RLS with active session, no client direct
DML, an UPDATE rejection trigger and unique owner/version constraints protect
normal app operations. At most 50 versions per account are accepted. Workspace
revision, facts, score, resume versions and applications do not change. A static
audit action is inserted atomically. Failed transactions leave neither record.
Privileged database administrators can alter/delete records and keys; this is
not an externally notarised or administrator-proof archive.

The database serialises key rotation with acceptance. Rotation invalidates
pending receipts. Historical reads use the frozen v1 shape decoder and stored
checksum/acceptance metadata; they neither re-run a future template nor require
an unexpired receipt or old/current signing key. They do not re-verify an old
HMAC. Loss of a write reply or malformed acknowledgement returns an explicit
unknown-result error; clients must read history first, never retry automatically.

GET without parameters returns at most 50 metadata rows in descending contiguous
version order. `?id=<uuid>` downloads one strict version JSON.
`?export=1` streams NDJSON for the **initial version list**, not a global database
snapshot. Add `expectedOwnerId=<uuid>` to downloads. Each record is checked
against its initial metadata; session revocation, error or cancellation cannot
produce a successful terminal footer. A complete stream ends with
`{"complete":true,"count":N,"through":R}`. An error footer has `complete:false`;
a missing footer also means incomplete. No automatic read or write retries.

Personal-data JSON now advertises `saved_letters_export` in addition to
`fact_history_export`. It still contains workspace/audit/consent only: download
both separate NDJSON histories for a full app archive after this migration is
activated. Settings includes an owner-bound history download link and the three-file archive
instructions. The letter preview/accept/history UX remains follow-up work.
A downloaded JSON is editable. Its checksum is not offline signature proof and
the file must not be represented as independently authenticated evidence.

## Verification and backup scope

Unit/route tests exercise source changes, expiry, tampering, owner/session errors,
key rotation, malformed acknowledgements, no retry, export completeness and
cancellation. Current local snapshot golden bytes and all four templates remain
unchanged after extracting the stable v1 schema. Treat that v1 codec and its
literals as frozen: a new template needs a new codec/version and explicit
historical-reader dispatch, never rewriting the archived v1 identifier.

`scripts/saved_letter_drill.py` only runs with explicit `JOBMATCH_LOCAL_LETTERS=1`
and disposable loopback PostgreSQL, refusing hosted/socket/service overrides.
It creates and finally drops only its randomly named owned fixture databases.
It compares pinned-main populated data before/after the incremental migration,
tests full installation, actual Node-issued receipts/native HMAC/RLS/RPCs,
optimistic concurrency, rollback, version bound and deletion. Its public `ab`
key is fixture-only. Twenty calls are a race regression, not capacity evidence.

`backup_manifest.py snapshot --include-letters` uses distinct format
`jobmatch-backup-manifest-letters-v1` and fingerprints all **15** tables, including
private key bytes and raw receipts. The default legacy format remains exactly
13 tables and cannot be compared to the new scope. Manifests contain hashes and
counts, not rows or keys. Dumps contain personal data **and signing key bytes**:
protect/encrypt them separately, restrict access and decide retention before
operator use. The native drill compares 15 populated tables, actual archived
receipt bytes/MAC using the known fixture key, and detects intentional key or
receipt corruption. This proves a synthetic stock PostgreSQL round trip only.
It does not prove a real Supabase backup, Auth mail delivery, RPO/RTO, key recovery
under provider policies or an operator decision about personal-data placement.
See VERIFICATION.md for actual executed results; a configured workflow alone is
not evidence of a successful run.
