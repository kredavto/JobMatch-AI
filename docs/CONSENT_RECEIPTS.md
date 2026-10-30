# Explicit text acceptance receipts (candidate)

PR #42 is a technical record of an authenticated account's explicit statement. It is not a digital signature, verified identity, proof that a person read or understood text, legal approval, or a universal authorization gate for all personal-data processing. Operator policy, placement, retention, withdrawal handling and live acceptance remain open.

## Published text and legacy observations

The migration creates an **empty** private.processing_notices catalog. It never seeds invented legal text or promotes old data. An operator must review the exact public-facing text, languages, version identifiers and publication reference before inserting/activating a row. Drafts stay inactive; only one active row per locale is allowed. Body/version/locale/hash/publication metadata cannot be updated: publish a new version. Active status may change; retired text referenced by receipts is retained.

The existing consent_records row is exposed only as legacy-workspace-observation with observedAt. It can be an earlier application/client observation; it does not establish the language, exact text or time of explicit acceptance. Signup user_metadata remains user-editable and supplies no authority. Neither loading, signing in, signing up nor a workspace write creates a new receipt.

JOBMATCH_CONSENT_ACCEPTANCE_ENABLED defaults to false and controls the **web acceptance route**, not history reads/exports. Direct authenticated RPCs are gated by an active catalog row and the account/session checks below; the web flag is not a database kill switch. Do not activate draft notices for staging. No notice has been published or flag enabled on a real project by this branch.

## Stored assertion and trust boundary

private.processing_notices stores version, ru/en locale, exact body, its SHA-256, protected operator reference, active status and creation time. The reference is not exposed in the app and is not independent evidence of legal approval. Text has up to16000 Unicode code points/64000 UTF-8 bytes; NUL, invalid Unicode and ASCII controls other than TAB/CR/LF are refused. Text is not normalized or translated.

public.processing_consent_receipts stores server UUID, user UUID, contiguous per-account sequence, caller command UUID, notice version/locale/text/hash snapshot and server clock reading. The digest format is utf8-sha256-v1 and hashes only the exact UTF-8 text, including CRLF/trailing spaces. It is a content check, not a signature of the receipt. The JSON assurance is not-a-signature-or-legal-approval and provenance is authenticated-user-report. There are no email/IP/user-agent/password columns.

Clients have owner-and-present-session SELECT only; INSERT/UPDATE/DELETE/TRUNCATE are revoked. Receipt updates fail through a trigger. DB administrators remain powerful and can disable triggers or alter data: this is not tamper-proof storage against administrators. Account deletion cascades user receipts; it does not erase downloaded files or provider backups. The global operator notice catalog remains. The private catalog has deny-all RLS/no client table privileges; definer helpers are private, public wrappers are invokers, all search_paths are empty and PUBLIC/anon EXECUTE is revoked.

## Explicit command and concurrency

POST /api/consent-receipts?expectedOwnerId=UUID uses same-origin, authenticated owner, bounded strict body and quota guards. Only expectedSequence, commandId, noticeVersion, noticeLocale, noticeSha256 and acknowledged:true are accepted. Owner, exact body and recorded time are never caller parameters.

The private writer derives auth.uid(), locks that account's auth.sessions row FOR SHARE, takes a per-account advisory lock, validates contiguous history/current sequence, and locks the active notice row. Wrong/stale version/locale/hash, stale sequence or a changed replay is a conflict. There is at most one acceptance per account/version/locale and200 receipts per account. These bounds require operator workload/retention acceptance; they are not measured production capacity.

An exact command UUID/payload replay returns the original immutable receipt, even if its notice has since retired. It does not create another time/event. Different payload with the same command UUID is rejected. Existing published text cannot be silently replaced underneath a receipt. Account deletion now also locks/requires the current session; a revoked token cannot use that function to delete the owner.

The web client has a synchronous pending guard and never automatically repeats a write. After a lost response, it requires a manual journal read. A further explicit action reuses the command UUID when the request is unchanged, handling a commit whose response was lost. A validated saved acknowledgement remains visible if only the following refresh failed. An unmount or account change cancels reads/ignores late UI results; it does not undo an already submitted write.

## Language, reading and archive

The settings panel's text-language choice is separate from the UI locale. A UI-language switch preserves the displayed version/body/hash, checkbox and pending request; a deliberate text-language change clears acceptance. The full exact body is plain text in a keyboard-focusable scroll region; script/HTML-like input is inert. No reading-completion/identity claim is inferred from the checkbox.

GET returns a strict20-row page with fixed through sequence, latest receipt, receipt for the active notice and the separately typed legacy observation. Client and server validate owner, contiguous sequence, hashes, cursor, duplicate IDs/commands/notice pairs and snapshot consistency.

The complete journal JSON is created locally only after every page through the captured high-water mark validates. The200-row/32MiB bounds and validation precede Blob/download; an interrupted, changed, foreign or malformed later page creates no partial file. Later appends are excluded by the recorded sequence. Exported source language/text/time remain exact. Account/logout lifecycle prevents a late old-account download.

This is the sixth file of the complete user archive, alongside the main JSON, fact history, saved tasks, structured profile and immutable literal versions. These files are not one transactional database snapshot. Main personal JSON retains its legacy consent shape, adds consent_observation_kind and points to settings-consent-panel for the new journal. A complete empty journal does not invent any acceptance from legacy dates.

## Installation and rollback

The CLI-created migration filename is 20261030104216_consent_receipts.sql. Bootstrap used pinned CLI2.122.0 --help/init/migration new on a disposable CI filesystem before SQL was written. The prerequisite guard requires the reviewed baseline and pgcrypto in extensions. Review all preceding stack migrations and a provider-compatible copy before a separately authorized production rollout.

Migrate before enabling the web route. Publish only operator-approved exact text with stable identifiers/reference in an explicit reviewed transaction. Keep drafts inactive. Do not infer permission from a migration or from historical PR #1/#2 approval. No production SQL, publication, SMTP, new paid project or external inference is performed here.

Disabling the web flag preserves reads/exports. Deactivating catalog rows stops new direct-RPC acceptances; exact old command replay remains an acknowledgement of an existing event. Additive data stays during code rollback. A rollback must preserve a usable receipt reader/export, or provide a separately reviewed operator export path; old application code does not know the sixth file. Never drop receipts/catalog to make a rollback convenient.

## Backup scope and evidence

Structured manifest v6 contains21 tables, adding the private notice catalog and public receipts to historical v5/19. v3/v4/v5 remain distinct compatible historical formats; missing notice/receipt tables cannot be relabeled v6. Quota signing configuration/counters/outcomes and other provider objects are intentionally outside this application-data manifest. Neither this manifest nor a synthetic restore verifies a real provider copy, signing-key backups or RPO/RTO.

Native checks use stock PostgreSQL17 with minimal synthetic Auth tables, not hosted Supabase Auth. Empty/upgraded/fresh schemas, RLS/grants, no-backfill, immutable bodies, Unicode/controls, server clock, stale/mismatched requests, idempotency, limits, pagination, revoked sessions and active account cascade are covered.20 real connections give one receipt/nineteen conflicts;20 exact retries return the same record. A held session deletion is observed as a lock wait before AUTH, without another receipt. PostgreSQL/Python UTF-8 SHA256 agrees.

The dedicated local CLI job applies the actual migration once and checks machine-readable local/applied history, then compares advisors before/after. It targets one fixed synthetic loopback database; sslmode=disable is only for that stock local fixture. No hosted TLS configuration or linked project is involved. The initial harness failures (fixture TLS and styled migration-list parsing) were corrected using that fixed target and JSON output.

Primary references reviewed:
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/local-development/database-migrations
- https://supabase.com/docs/reference/cli/supabase-migration-new
- https://github.com/supabase/cli/tree/v2.122.0/apps/cli/src/commands/db/advisors
- https://supabase.com/changelog

Observed runtime `4cb7154740bbdba74337bb1c16bd7461b13e80de`: consent/CLI41049996735, app41049996879, structured41049996813, restore41049996679, quota41049996747 and parser41049996651 SUCCESS.760 unit,47 Python,205 browser passed/2 live-account skipped,76 worker; lint/types/build PASS. Local advisors10→12 INFO,0 new WARN/ERROR (new private RLS/no-policy and unused FK index INFO). English390 axe/no overflow and emitted JPEG viewed. Real provider/legal/SMTP/model/production acceptance remains open.
