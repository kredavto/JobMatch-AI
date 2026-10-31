# Explicitly reviewed AI profile fields — PR #59

This is a default-off persistence candidate stacked on unmerged #58. It does not accept a model, certify semantics or authorize deployment. The published baseline remains 0.34.0; historical #1/#2 merge permission is not future publication permission.

## User flow

The existing explicit per-request consent controls free-text inference. With acceptance disabled, preview works unchanged without signing configuration. With it enabled, native key readiness is checked before inference, and the server authenticates/re-reads the saved source afterwards before signing the preview. Operator-declared model identity remains unverified; semanticAssessment=not-performed and modelAcceptance=not-accepted.

Users review each record's kind, literal fields and full paragraph, select individual records and explicitly save a batch. The native transaction invokes the existing structured-profile add command for each selection: all records are **unconfirmed**. There is no model call on save, automatic confirmation, master-fact/workspace rewrite or Match Score change. Manual drafts survive. Confirmation is a separate action; a recorded selection does not attest physical identity, semantic truth or current confirmation state.

The UI prevents duplicate in-flight writes, preserves locale changes without replay, and cancels/discards stale owner/source replies. Cancelling a save means stop waiting, not database rollback. Lost, cancelled or invalid write responses block further writes until explicit authenticated refresh; there is no automatic retry. Fixed RU/EN errors do not reflect provider diagnostics.

## Receipt and transaction

The opaque JSON payload in jobmatch-ai-profile-receipt-v1 is HMAC-SHA256 signed over the exact UTF-8 bytes of the domain `jobmatch-ai-profile-receipt-v1\n` followed by the payload. A separate 32-byte secret never appears in the receipt; a SHA256 key fingerprint does. The payload includes a random nonce, owner, workspace/profile/source revisions, exact saved source, ordered fact IDs, frozen v2 preview and a 600-second lifetime (maximum future clock skew five seconds). Payload size is bounded to 128000 UTF-8 bytes.

Native PostgreSQL verifies the MAC before parsing the signed JSON. Owner, active session, exact source/fact IDs, revisions, expiry, nonce and selected indices are checked again under locks. Workspace then profile lock order matches existing commands; a shared key-row lock serializes rotation. Selections are 1–10 strictly increasing, unique zero-based indices. A stale, invalid, replayed or partly invalid batch rolls back all additions. Caps are 50 profile entries and 50 journal batches per owner.

The checksum is an ordinary constrained column populated by the RPC: PostgreSQL17 convert_to is STABLE, so this does not use an invalid generated expression or a misleading IMMUTABLE wrapper. Successful responses are validated against the exact receipt, selection, source, revision increase, entry IDs, fields and unconfirmed status.

Receipt-v1 imports a frozen paragraph-quotes-v2 decoder rather than the current producer facade. Shared field, evidence-filter and date-warning dependencies must also remain backward compatible or be explicitly versioned. Unknown future code is not tested here. All 36 current compiled production model requests are byte-identical to #58; prompts, grammar, corpus and gold are unchanged.

## Journal, export and personal data

public.ai_profile_acceptances preserves the raw signed payload, signature, checksum, selected indices, created entry IDs and acceptance time. Authenticated clients have SELECT only with owner plus active-session RLS; there are no direct insert/update/delete grants. RPC privileges are explicit and search paths empty. Normal commands cannot edit the journal; an UPDATE trigger refuses changes. Entry deletion/reset retains history, while account/workspace deletion cascades to it. Administrators can change database rows, keys or triggers: this is not an external tamper-proof ledger.

GET /api/ai-profile lists bounded owner metadata; ?id=<UUID> reads an owner's full snapshot with private/no-store attachment semantics. Historical reads work after source changes, expiry, key rotation or disabling acceptance without inference or the current key. The frozen contract, ranges, owner, accepted time window and checksum are checked; historical reads do not independently re-verify old MACs with a new key. Downloaded JSON is an editable copy, not offline attestation without a trusted issuer key and verification process.

The full-journal download validates each record against the initial bounded metadata list (identity, checksum, count, source revisions and model declaration). It includes exactly that list, not later additions, and is not a global transactional snapshot. Any error/cancellation prevents a complete file and further reads; no retry. The existing main personal-export JSON links to this panel; guidance now lists seven files, including this journal. Empty journals have an explicit complete empty export.

**The full saved source, including paragraphs excluded from the model prompt, is retained in receipts, journal downloads and backups.** Placement, retention, withdrawal/deletion policy, access and protection require an operator decision; the 50-batch cap does not make that decision. Downloaded copies remain on the user's device. No production data or secret was generated, provisioned or migrated here.

## Configuration and rollback — not applied here

JOBMATCH_AI_PROFILE_ACCEPTANCE_ENABLED defaults false. Enabling requires a separately generated, securely provisioned 32-byte key as 64 lowercase hex characters in server-only JOBMATCH_AI_PROFILE_SIGNING_SECRET and matching bytes in the private singleton private.ai_profile_signing_config row. It is separate from existing Auth/quota keys. The private table starts empty with RLS and no client grants/policies. Missing/mismatched configuration refuses signed previews and saves. Existing self-hosted AI flags, permitted endpoint/network configuration and consent still govern inference.

Never deploy the public ab/cd test keys or synthetic seed scripts. Production migration, key provisioning/rotation and flag changes require the existing operator authorization process. Server/database rotation invalidates pending old receipts; history stays readable. Disabling the HTTP flag stops application saves; clearing/rotating the database key also revokes pending direct authenticated RPC receipts. The key holder is trusted to issue receipts. Rollback must preserve historical readers/export and data rather than delete the new tables.

Protected backups include full source and the private signing key. --include-structured now uses jobmatch-backup-structured-v7/23 tables, adding both new tables; only fingerprints/counts leave the manifest process. Historical v3–v6 keep their original table sets and cannot be compared as if new tables were absent. Existing private Auth-quota tables and the wider Supabase schema remain outside this app manifest. Equality is not proof of a complete provider backup, encryption/access policy or RPO/RTO.

## Evidence and remaining gates

VERIFICATION.md and evaluation/results/20261031-profile-acceptance-native.md record immutable commits, actual counts and CI links, including failed attempts and corrections. Unit/browser HTTP fixtures are synthetic and do not demonstrate a model or real Supabase Auth. The native job uses actual PostgreSQL17, exclusively synthetic sources and minimal synthetic Auth/session claims. It verifies Node-issued Unicode/CRLF receipts, native MAC/add/rollback/replay/owner/key-rotation/history behavior and twenty asynchronous actual writer processes on fresh and populated-upgrade schemas (no synchronized-start or general capacity claim).

It also dumps/restores its own 23 populated fixture tables and performs read-only historical source/MAC/key checks, plus intentional signature/key tamper detection. This is an actual native fixture restore, **not a Supabase provider-copy restore**. Real SMTP/password recovery, provider backup/RPO/RTO, operator personal-data decisions, accepted deployment/independent held-out/manual/live and final operational acceptance remain open.

Supabase CLI was not used. An earlier invocation was automatically rejected because outgoing PostHog telemetry could expose environment/project metadata with unverifiable payloads; it was not retried, disabled, redirected or bypassed. Ordinary reviewable SQL source edits plus isolated native PostgreSQL are the materially safer alternative used here. CLI-only generation and provider advisors are not claimed. Current official grant/RLS and pgcrypto documentation/changelog were reviewed; legacy PGP cipher removal does not affect HMAC/SHA256.

Next internal block: independently testable rewriting/letter proposals with numeric, negation and contradiction checks, literal evidence, explicit preview/cancel and immutable accepted versions. Source ranges alone do not establish semantic equivalence. No merge, release, production SQL/config/key, paid provisioning, email, HH write or third-party LLM/user-data transfer is authorized by this candidate.
