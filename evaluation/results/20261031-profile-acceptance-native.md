# Native AI-profile acceptance proof — 31 October 2026

Executable commit: [5a6ffdfe249ba01bc0622cd7f074d0e2e534ca60](https://github.com/kredavto/JobMatch-AI/commit/5a6ffdfe249ba01bc0622cd7f074d0e2e534ca60).
[Native job 124575447456 / run 41214282403](https://github.com/kredavto/JobMatch-AI/actions/runs/41214282403).
[Application 41214282525](https://github.com/kredavto/JobMatch-AI/actions/runs/41214282525).
[Structured 23-table regression 41214282646](https://github.com/kredavto/JobMatch-AI/actions/runs/41214282646).
Earlier complete native proof: [39591e5 / run41213791048/job124574008383](https://github.com/kredavto/JobMatch-AI/actions/runs/41213791048).

These are actual native PostgreSQL17 executions with minimal synthetic Auth/session claims, known public test keys and synthetic sources. No real Supabase Auth, provider backup, deployment key or user data is involved. They do not establish model/semantic/legal/operational acceptance.

## Original safe report: full schema

```json
{
  "format": "jobmatch-ai-profile-native-v1",
  "runKind": "actual-native-postgres/synthetic-auth-and-source-only",
  "nodeIssuer": true,
  "macVerifiedByPostgres": true,
  "unicodeAndCrlfOffsets": true,
  "batchRecords": 2,
  "concurrentWriters": 20,
  "concurrentCommits": 1,
  "concurrentConflicts": 19,
  "partialBatchRolledBack": true,
  "replayRefused": true,
  "crossOwnerReadRefused": true,
  "keyRotationRefusedPending": true,
  "historicalReadAfterRotation": true,
  "profileRevision": 3,
  "unconfirmedRecords": 3,
  "workspaceRevision": 1,
  "modelIdentityVerified": false,
  "modelAcceptance": "not-accepted",
  "providerAuth": "not-performed",
  "providerRestore": "not-performed",
  "userData": "not-used"
}
```

## Original safe report: populated upgrade

```json
{
  "format": "jobmatch-ai-profile-native-v1",
  "runKind": "actual-native-postgres/synthetic-auth-and-source-only",
  "nodeIssuer": true,
  "macVerifiedByPostgres": true,
  "unicodeAndCrlfOffsets": true,
  "batchRecords": 2,
  "concurrentWriters": 20,
  "concurrentCommits": 1,
  "concurrentConflicts": 19,
  "partialBatchRolledBack": true,
  "replayRefused": true,
  "crossOwnerReadRefused": true,
  "keyRotationRefusedPending": true,
  "historicalReadAfterRotation": true,
  "profileRevision": 3,
  "unconfirmedRecords": 3,
  "workspaceRevision": 1,
  "modelIdentityVerified": false,
  "modelAcceptance": "not-accepted",
  "providerAuth": "not-performed",
  "providerRestore": "not-performed",
  "userData": "not-used"
}
```

Before/after migration comparison retained the existing 13 baseline fingerprints. The native SQL suite also checks malformed receipt/selection/source/owner/session/revision/expiry, partial-batch rollback, direct DML/key-read refusal, 50-batch cap, frozen updates, key rotation, historical reads and account cascade. The twenty writers are actual asynchronous psql child processes; no synchronized-start or general capacity claim.

## Dump/restore and read-only behavior

The workflow asserted format jobmatch-backup-structured-v7 and **23 nonempty tables**, performed pg_dump/pg_restore with the owned PostgreSQL17 service, then emitted:

> PASS: all 23 table fingerprints match. Schema/RLS and Auth delivery still require separate checks.

```json
{
  "format": "jobmatch-ai-profile-native-restore-v1",
  "runKind": "actual-native-postgres-dump-restore/synthetic-only",
  "readOnly": true,
  "verifiedHistoricalRecords": 3,
  "restoredSigningKeyReady": true,
  "frozenSourceAndMacVerified": true,
  "modelIdentityVerified": false,
  "modelAcceptance": "not-accepted",
  "providerAuth": "not-performed",
  "providerRestore": "not-performed"
}
```

The behavioral verifier uses read-only transactions. An intentional administrator signature change produced exactly the reported differing table public.ai_profile_acceptances, comparison exit1 and behavioral verifier exit2. A subsequent key change produced differing table private.ai_profile_signing_config and comparison exit1. These negative results were required for the overall job to succeed. The job removed only its exclusively created temporary proof directory. No dump/model artifact was uploaded. This is an actual fixture restore, **not** a restore of a provider's Supabase backup or proof of RPO/RTO.

## Application and source evidence

1202 Vitest tests / 92 files; 58 Node evaluation tests; 103 Python tests; 305 browser passes / 2 live-account skips; lint, typecheck and build passed on this executable commit. Parser worker:76 tests in the same CI run set. Browser coverage includes RU/EN explicit batch selection, unconfirmed results, preserving manual drafts, double-click/cancel/ambiguous response/refetch, stale source/owner/receipt guards, historical single/full exports, metadata mismatch refusal, cancellation and locale changes. HTTP/model fixtures in these tests are scripted, not real models.

Before the local environment became unavailable, 1196 Vitest/91files,58 Node,103 Python,44 targeted browser tests,lint/types/build passed locally. The complete-journal integration was then committed through GitHub and tested in GitHub Actions, not claimed locally executed. The earlier English screenshot was visually inspected; the later UI is checked by actual-component CI browser/axe/overflow regressions. All38 runtime files were re-fetched by immutable commit and compared byte-for-byte against intended source.

The 36 compiled production profile model request bodies (12cases × 3aliases) were compared locally to #58 before environment loss and were identical, concatenated JSON SHA256:
`663c7fe1bb16e9371fa6bfba19bc38e009392835c619ee9b4167994e9dda095c`.
Subsequent export changes do not touch the producer. Real CPU model diagnoses and their negative quality results remain separately documented in the #57/#58 archives. This persistence change does not claim model improvement, independent held-out coverage or accepted deployment.

## Failed attempts and corrections

- [c12 / native41207848146](https://github.com/kredavto/JobMatch-AI/actions/runs/41207848146): a generated checksum expression was not immutable. PostgreSQL17 convert_to is STABLE. Corrected to an ordinary RPC-populated checksum with an integrity CHECK, not an IMMUTABLE wrapper.
- [3739 / native41208032435](https://github.com/kredavto/JobMatch-AI/actions/runs/41208032435): a temporary fixture helper could not access extensions. Only pg_temp fixture helpers gained SECURITY DEFINER; production grants were not widened. Core full/upgrade SQL then passed [1c4/native41208409204](https://github.com/kredavto/JobMatch-AI/actions/runs/41208409204).
- [b3a/native41212770139](https://github.com/kredavto/JobMatch-AI/actions/runs/41212770139) and [798/native41213094892](https://github.com/kredavto/JobMatch-AI/actions/runs/41213094892): psql boolean t was not JSON. The probe now explicitly serializes booleans as JSON; fixed phase markers expose no SQL/row diagnostics.
- [75b/native41213189164](https://github.com/kredavto/JobMatch-AI/actions/runs/41213189164): actual MAC/save/rollback/concurrency passed, then a cross-owner absent record returned SQL NULL, not JSON null. The probe now explicitly coalesces the nullable read to JSON null.
- [c16/native41213490502](https://github.com/kredavto/JobMatch-AI/actions/runs/41213490502): both native probes passed, then the new seed owner collided with an existing ordinary-English fixture. A new exclusive owner/session replaced it, without upsert, deleting or rewriting old data. Both complete later proofs passed.
- Initial local browser failures used getByLabel for a read-only textarea; the accessible textbox-role selector corrected the test without weakening product behavior. All44 targeted tests then passed, followed by299 full browser passes before the final six export cases and305 afterwards.

Remaining real SMTP/password recovery, Supabase-copy restore, operator PD placement/retention/withdrawal, accepted model/deployment/held-out/manual/live and final operational gates stay open. No production config/key/SQL, Supabase CLI, paid infrastructure, email, HH write, external LLM/user-data operation, merge or release occurred. See [protocol](../../docs/AI_PROFILE_ACCEPTANCE.md).
