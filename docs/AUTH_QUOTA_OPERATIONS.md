# Administrative quota monitoring and bounded purge (candidate)

Depends on PR #17; not deployed or scheduled. No public metrics/purge route, production credentials or new external service is added.

## Data and trust boundary

`private.auth_quota_outcomes` stores only fixed scope, epoch-minute and counters for allowed/global-denied/subject-denied quota decisions. It has no user/subject/email/IP/signature/key column and starts empty; old decisions are not reconstructed. Outcomes are updated in the same RPC transaction as the charge, including after a denied subject/global attempt. Failed MAC/shape requests and failed transactions are not counted. Database/provider failures and local pre-gate rejections therefore require separate operational monitoring: these metrics do not describe every application request or prove an outage's absence. Counts are saturating, not an immutable audit trail.

The private helper is SECURITY INVOKER with empty search_path, no PUBLIC/anon/authenticated EXECUTE. RLS/no client privileges also protect the outcomes table. A metric-write failure aborts the quota transaction and closes the Auth gate; it cannot silently allow a request or leave a partial charge. This adds an intentional dependency and shared scope/minute lock; measure contention/capacity before activation. No user-controlled labels or raw provider messages are stored.

`private.auth_quota_status()` is an administrative SECURITY INVOKER function only. It returns version, current bucket, config-row existence (not key contents or server-key equality), expired-row counts and five fixed scope totals over the last 60 epoch-minute buckets. There are no per-subject statistics or public health endpoint. Config presence alone is **not** readiness. Small aggregates/collection metadata may still reveal activity: review access/log retention before collecting them externally.

`private.purge_auth_quotas(limit)` accepts only 1..1000, deletes at most that many expired counters **and** that many expired outcome rows per call, returns counts, and never touches config/current quota rows. Cutoff is fixed at DB statement epoch-minute minus 1440, strict less-than. It uses ordered FOR UPDATE SKIP LOCKED so maintenance does not wait on active locks; subsequent runs must revisit skipped rows. It is atomic, SECURITY INVOKER, no client grants. No SECURITY DEFINER maintenance endpoint or service-role key is introduced.

## Fixed administrative CLI

Use existing approved DB administrative credentials via libpq PG* variables/profile/.pgpass, with verified TLS for remote databases and no password in command arguments. The script does not provision credentials, relax RLS or grant privileges. Run on the approved operator host; do not give its credentials to the web application. Its `row_security=off` deliberately refuses silently filtered data when the administrative identity lacks complete access.

```
JOBMATCH_AUTH_QUOTA_OPS_APPROVED=1 python3 scripts/auth_quota_ops.py status
JOBMATCH_AUTH_QUOTA_OPS_APPROVED=1 JOBMATCH_AUTH_QUOTA_PURGE_APPROVED=1 python3 scripts/auth_quota_ops.py purge --limit 500
```

These are separate read/purge approvals, not proof of user authorization or endpoint ownership. Only status/purge and a bounded integer are accepted, no SQL/table/URL arguments. Status uses repeatable-read READ ONLY. Both transactions have statement timeout5s/lock timeout2s and client deadline10s; output is emitted only after a successful COMMIT and exact completion marker, then strict schema validation. Stderr diagnostics, raw stdout, command args and credentials are never echoed on failure; exit2 means refused/incomplete, no automatic retry. An interrupted/lost purge response can follow an actual commit: reconcile status and explicitly rerun the idempotent expired-only operation if appropriate. Exit0 means a valid completed operation, not a healthy deployment or guaranteed full purge.

The CLI prints one JSON object; direct database responses must contain the exact known keys/scopes/types. Unknown fields, missing/duplicate scopes, negative/unsafe counts, excess output or missing completion marker fail closed. Keep operator stdout/report storage restricted; do not attach DB dumps or raw queries to alerts. The script is not a public Prometheus endpoint.

## Scheduling and alarms still require operator setup

No production scheduler, cron job or notification recipient is created in this PR. After migration/review/key provisioning/hosting decisions and separate authorization, configure the owned scheduler to run a bounded purge periodically and collect status. Choose cadence/retention/host resources explicitly; run multiple bounded batches while monitoring backlog instead of one unbounded DELETE. Strict retention cannot be claimed until scheduling, skipped-lock recovery, downtime/backlog draining, backups and deletion policy are tested.

Suggested operator signals: command failure/no recent collection, config absent when required is expected, expired-row backlog increasing across collections, and unusual denial ratios/traffic per fixed scope. Establish thresholds against measured capacity; no arbitrary SLA is claimed. Do not interpret zero outcomes as healthy service: signing failures, upstream outage or absent traffic can all leave zeros. Alarm delivery and incident ownership remain open; no email is sent here.

## Installation/rollback and evidence

Migration `20261029082413_auth_quota_operations.sql` is additive after #17 and replaces only the signed charging body to add transactional outcome recording. `schema.sql` contains the fresh equivalent. Apply only to a reviewed disposable provider copy first; inspect grants/advisors/PostgREST behavior before a separately approved release. Rolling application code back retains the old boolean RPC contract. SQL rollback to the earlier charging body must be reviewed before dropping outcomes/helper; do not drop objects while traffic uses them. No working DB/history/key is changed by this branch.

Synthetic SQL tests cover exact outcomes, no raw identity/key output, bounds/cutoff/current/config preservation, inaccessible functions, metric fault rollback, and real parallel charging/metrics. Native probes hold an expired row lock in another connection and verify purge skips it then removes it after unlock. Python tests mock psql only and verify fixed SQL, approvals, schema, timeout and completion protocol; real psql CLI behavior is checked in CI. None of this substitutes for real Supabase/provider restore, workload/security review, configured scheduler, external monitoring/alert delivery or public production acceptance.

Integration 30 October 2026: both #17 and #18 SQL definitions are included in the current feature stack using their original migration filenames. Native clean/incremental/fresh tests remain disposable. `backup-structured-v5` compares 19 application tables, deliberately excluding private quota config/counters/outcomes. Those exclusions do not establish full-provider restore or key-backup verification; unrestricted dumps require secret access controls and rekeying before traffic.

Observed integration CI, 30 October 2026, PR #40 runtime `0de67e05df2808b43b7681ec97746a16ee65f674`: https://github.com/kredavto/JobMatch-AI/actions/runs/41037352024 — clean, incremental and full PostgreSQL17.11 schema suites, actual psql status/purge,20 parallel connections (10 allowed/10 denied), atomic outcomes and SKIP LOCKED purge PASS. Application/structured CI706 unit,45 Python,185 browser passed/2 live-account skipped; lint/types/build PASS. This is disposable synthetic verification, not hosted PostgREST, key provisioning, real mail, provider-copy restore, capacity, scheduling or production acceptance.

Current receipt-stage scope (PR #42): the structured application manifest is v6/21, adding private.processing_notices and public.processing_consent_receipts. Historical v5/19 remains valid as v5. The same three private auth-quota tables are excluded; app-data hash comparison still does not verify signing-key backups or a full Supabase provider copy. See docs/CONSENT_RECEIPTS.md and BACKUP_RESTORE.md.

## Coarse route observations (PR #45)
Optional default-off operational events are separate from the signed PostgreSQL quota counters/outcomes above. They contain only fixed registered-handler response metadata, no identity/subject/key/config and no auth action/body. Realm caps explicitly mark incomplete observation; they are not global request limits, direct-Auth/WAF controls or a reliable quota denominator. The read-only file checker never attests collector completeness or production readiness. It sends no alerts. See OPERATIONS_MONITORING.md; operator retention/access/budget and actual deployment acceptance remain open.


PR #59 updates the app manifest to v7/23 with an independent AI-profile signing configuration and source journal. This does not add the three private Auth-quota tables to the manifest or establish complete provider/key backup coverage. The new AI key is distinct, starts empty and requires protected backup/provisioning/rotation; no production key was created. Historical v6/21 remains valid as v6. See [AI protocol](AI_PROFILE_ACCEPTANCE.md) and BACKUP_RESTORE.md.
