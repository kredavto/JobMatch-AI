# Source-backed structured profile (opt-in, not model acceptance)

This change is based on the unmerged letter UI in PR #73 and explicitly integrates the dependency fixes in PR #74. Neither prerequisite nor this change grants permission to merge, release, migrate production or activate storage. The historic owner approval for #1/#2 applies only to those PRs.

The manual panel on **Мой профиль** records employment, education, certification and achievement fields selected literally from the saved master resume. It does not infer dates, continuous tenure, ownership of achievements or credential validity. The existing facts, score, resume versions, letters and hh.ru operations are unchanged by these profile commands. No model or remote AI is called.

## Data and review

Each field contains only `{quote,start,end}`. Offsets count Unicode code points in the raw source. Browser textarea CRLF/CR normalisation is mapped back before creating a field; emoji/surrogate boundaries are checked. SQL independently compares each quote and raw source range. A matching range is not proof of semantic correctness or truth.

An add contains only action, kind and fields. ID, timestamp, owner, revision and initial `confirmed:false` come from the server. Confirmation is a separate user action after viewing every field. Up to 50 records are allowed; exact duplicate kind/fields are rejected under the owner lock. There is no derived total experience, model version or ATS guarantee.

The source identity is the exact master text plus ordered fact IDs. Goal, vacancy or verification-only changes do not rebind the source; every write still requires the current workspace revision and current profile revision. Same-text reimport with new fact IDs invalidates old source matches. A reset explicitly deletes every entry and captures the current source without transferring confirmation.

## Default OFF and deletion

Creation, reset and confirmation require all of:

- `JOBMATCH_SOURCE_PROFILE_ENABLED=true` in the API, default false;
- an explicit operator grant of the native storage capability (revoked in a fresh schema);
- a user consent checkbox for the additional source copy, with `consentToStore:true` on the request.

The native RPC independently checks the authenticated role's capability ACL. The HTTP flag gates API writes, while revoking the native capability also blocks direct RPC creation/confirmation. Neither switch is activated by this PR. Operator approval for personal-data placement, retention and withdrawal remains outstanding; capability readiness is a technical setting, not evidence of that approval.

Reading is explicit and creates no profile row or additional source copy. Until the first approved write, the response shows a virtual view of the existing master resume. A captured header stores the full original resume plus ordered fact IDs, not just the selected fragments. The panel discloses this separately from fact/letter storage.

Retraction of confirmation, deletion and Clear remain owner-authorized when creation is disabled. Delete removes one entry but retains the captured source. Clear removes all entries and sets the cached source, fact IDs and source revision to NULL. A non-sensitive owner/revision tombstone remains to prevent revision-zero replay. The read response after Clear contains the virtual current master source with `source_captured:false`; it does not mean a new copy was saved. Account deletion cascades both profile tables. The master resume, audit events, previous backups and user-downloaded files have their own lifetime; Clear does not erase them.

## Protocol and failure behavior

Public RPC functions are invoker wrappers; guarded private functions check the active session, use an empty search path and lock in the existing advisory-owner → workspace-row → profile-row order. Authenticated clients have owner/session-filtered SELECT only, with no direct DML. Application calls use the user's JWT, never a service key. Unknown keys, wrong markers, oversized JSON, wrong owners, stale revisions and mismatching ranges refuse.

`GET /api/source-profile` returns `{profile,storageAvailable}` with no-store headers. `POST` accepts the expected owner, both revisions, one strict command and the appropriate consent boolean. Authentication and conflicting owner hints are checked before body consumption. The request body is bounded to 40 KB and requires well-formed UTF8. Cleanup uses `consentToStore:false`, never an implied storage consent.

The client and API validate the exact atomic acknowledgement before committing state or clearing the field draft. Requests are never retried automatically. A lost or malformed acknowledgement blocks new writes until an explicit read; reading shows current state but does not prove that a previous request failed or uniquely identify its eventual result. Exact duplicate prevention is additional protection, not a durable request receipt. Owner changes/unmount abort and discard late UI results; unsaved master text is not replaced.

## Export and verification limits

The panel explicitly downloads validated source-profile JSON, which can contain the complete saved source. A personal archive now requires four separate files: the existing workspace JSON, fact-history NDJSON, saved-letter NDJSON, and source-profile JSON. They are not one transactional snapshot. No profile data is stored in browser persistence or offline cache by this panel.

`backup_manifest.py snapshot OUTPUT --include-source-profile --include-letters` fingerprints the explicit 17-table combined scope. The legacy 13-table, letters-only 15-table and source-only 15-table scopes remain separately versioned and cannot be compared interchangeably. Smaller scopes do not demonstrate completeness after additional modules are activated. Manifest files contain counts/hashes, not row data; dump files are sensitive and are created only inside the disposable fixture directory.

`source_profile_drill.py` refuses hosted/service overrides and requires an explicit loopback fixture opt-in. The workflow uses PostgreSQL 17 and synthetic Auth tables. It exercises full schema and a populated 15→17 incremental migration, real production codecs against SQL responses, default OFF/grants/RLS/session checks, clear/replay, same-text reimport, rollback, 20 concurrent writers, the 50-record cap, cascade, and populated combined dump/restore plus intentional corruption. Execution results are recorded in VERIFICATION.md after the runs; configuration alone is not proof.

This is not Supabase provider restore, SMTP/password-recovery acceptance, independent security/privacy acceptance, production load testing, a checked model or a verified semantic rewrite. Those gates remain open. Supabase CLI generation/advisors were not run; no production database or flags were changed.
