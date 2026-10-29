# Source-backed structured profile (manual candidate)

This implementation adds persisted, manually assembled employment/education/certification/achievement records. It does not run a model, infer seniority/durations/qualifications, normalize ambiguous dates, or change Match Score/ordinary resume versions. Selected confirmed entries can now create separate literal versions; see STRUCTURED_VERSIONS.md. Automated extraction and semantic verification remain separate work.

## User flow and provenance

Open “Структурированный профиль” in the profile tab. The source is the **saved** master resume, not the unsaved import textarea. Select a source fragment, choose its field and capture it. Employment/education/certification require title; achievement requires description. Optional organization/start/end/description fields and certification-only credential number are literal source quotations, not free invented replacements. Add creates an **unconfirmed** entry. A separate checkbox explicitly confirms the meaning and accuracy of all its fields. This is the user's assertion, not independent fact verification. To correct a record, delete it and create an unconfirmed replacement.

Each field stores exact quote and half-open [start,end) Unicode code-point offsets; DOM UTF-16 selections are explicitly converted and split surrogate boundaries rejected. Up to 500 code points/field, six known fields, 50 entries. Overlapping/repeated quotations are allowed because offsets disambiguate location. No hidden date parsing, units conversion or number inference occurs. A valid range proves origin only; a user can still misclassify a phrase or interpret it incorrectly.

The source snapshot also stores the workspace revision and ordered fact IDs. Checking a flat fact or changing a goal/vacancy does not invalidate it; a new import, even with identical text, receives different fact IDs and makes the profile stale. Adding a fact also changes the source. Existing entries/source/confirmations remain visible with a stale warning, but adding or confirming true is blocked. Retracting confirmation/deleting remains possible. No stale record is used by scoring or AI.

An explicit reset requires a separate visible deletion acknowledgment. It deletes **all** structure entries and replaces its source with the current saved master resume/fact IDs. Download the structure/source first if needed. The master resume, flat facts, immutable saved versions and tracker are not modified. This is user-directed removal, not automatic reimport cleanup. Accepted literal versions retain their own immutable selected-entry/source snapshots; reset does not delete them. There is no full edit-event structure history; downloaded files/backups have their own retention. Draft fields are memory-only and lost when leaving the profile tab. Failed writes retain the draft and block retries until explicit reload; writes are never automatically repeated.

## Storage and authorization

Additive `structured_profiles` (one captured source per existing workspace) and `structured_profile_entries` (separate records) reference owner/workspace with cascade deletion. User-owned SELECT requires a live session; PUBLIC/anon/client direct writes are revoked. Only `read_structured_profile` and `command_structured_profile` are authenticated RPCs with explicit uid/live-session checks and empty search_path. There is no caller-supplied owner, source, record ID, timestamp or confirmation on add.

Commands use both expected workspace revision and independent profile revision. The existing `private.locked_workspace` takes the same owner advisory lock as legacy/entity writers before profile row locks. Exact ranges are checked against locked source; profile/source/fact-ID revision conflicts reject atomically. Profile writes do not increment the workspace revision, affect workspace entity arrays, confirm flat facts or modify resume history. Separate static audit actions (`structured_add/confirm/delete/reset`) are in the same transaction. Audit failure rolls back entries/source/revision too. Session and owner boundaries remain authoritative, not expectedOwner hints. Source text is duplicated intentionally once as evidence, not an additional writable workspace mirror.

API `/api/structured-profile`: owner-only GET/export, same-origin POST with strict command/owner/revisions, service quota, 40KB body limit/no-store/safe errors, no retries. Responses validate format, ownership, source bounds, field schema and independent revision before UI use. Source quotations are rendered as text, never HTML. Read/export returns only the current structure plus its captured source; it may be an older source after reimport and is clearly marked stale.

The JSON personal-data export remains scoped workspace/audit/consent and now includes a `structured_profile_export` pointer. Settings require four separate downloads (that JSON, fact history, structured profile/source and literal versions); they are **not** one transactional snapshot. Account deletion cascades both new tables from the active DB; downloaded copies and provider backups do not vanish automatically.

## Install, verification and rollback

Migration `20261029084434_structured_profile.sql` follows the reviewed normalized workspace chain through PR #16. No working schema, provider accounts or migration history is changed by this branch. `schema.sql` contains the fresh equivalent. This branch does not merge the independent mail/quota operations chain #15/#17/#18; integration/release needs review and separate authorization.

Schema/route/unit/native tests cover code-point offsets including emoji, exact-source checks, unknown fields/untrusted metadata, explicit confirmation, owner/session/grants, revision conflicts, same-text reimport invalidation, reset/retraction, cap and audit failure rollback. Native concurrent callers must produce exactly one commit and nineteen conflicts. Browser tests use synthetic HTTP fixtures; they do not establish live Supabase acceptance.

Full application-data backup verification must now include all structure/version tables:

```
python3 scripts/backup_manifest.py snapshot structured-manifest.json --include-structured
```

This emits `jobmatch-backup-structured-v4` with all 16 table fingerprints in the same read-only repeatable-read snapshot. Missing table/privilege/marker fails; comparisons cannot mix old 13-table formats or logical-workspace mode. The default legacy mode remains for historical cutover/rollback drills and **excludes structure**; do not use it as a complete archive after activating this feature. The new native drill seeds all 16 tables, performs real pg_dump/pg_restore, compares full fingerprints and detects changed structure/version content. Synthetic fixtures do not replace real Supabase Auth/backup/RLS/RPO/RTO acceptance.

Rolling application code back can leave additive tables/RPCs in place: older workspace APIs ignore them. SQL removal would lose structure data; export/backup and a reviewed rollback decision are required, and must not be performed implicitly. Before real user data, verify the provider copy, migration history/grants/advisors, user export/delete behavior and final multi-account browser flow on the actual domain. Source provenance alone does not prove semantic accuracy or readiness of AI rewriting.


### After saved task migration
The current --include-structured snapshot is now v5/19 tables, including reminder_boards/reminders/reminder_events; v3/v4 references above describe historical feature acceptance. Full user export now requires five downloads, including task/history NDJSON. See SAVED_REMINDERS.md; older manifest formats cannot stand in for the new complete backup.
