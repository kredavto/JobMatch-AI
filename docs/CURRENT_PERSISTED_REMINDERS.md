# Persisted reminders — server protocol candidate

The API/SQL layer stores manual reminder intent separately from the workspace and immutable
resume/letter provenance. It is not a background scheduler, browser notification service or
calendar-provider integration. `delivery: none` is explicit. Existing local ICS serialization
and UI remain unchanged. Tracker integration is the next technical block.

## Contract

`GET /api/reminders` returns a strict owner-bound, no-store state. `?export=1` downloads
that same complete current reminder state, including cancelled/completed records and global
revision. There is no retained content history. Deleted content is removed; the counter
survives to prevent revision ABA. Account/workspace deletion cascades both tables.
This is a separate export; existing personal/source downloads do not silently gain a new scope.

POST requires same origin, authenticated active session, matching owner hint/body,
explicit `consentToStore: true`, current `workspaceRevision`, reminder `revision` and
one strict command: create, reschedule, complete, cancel or delete. Create/reschedule
contains a caller UUID, current owned application ID, manual kind, literal description,
local time, named zone, explicit offset, matching UTC instant and duration. Unknown fields,
unpaired surrogates, invalid times and hidden delivery options are refused. Descriptions are
bounded to3000 Unicode scalars; up to100current records are retained. Explicit delete frees a slot.

New/rescheduled occurrences are validated against current Node/PG timezone rules; a mismatch
fails closed. A saved occurrence retains its accepted local/offset/UTC relationship after tzdb
changes. It is not silently reinterpreted. Completion/cancellation requires scheduled status;
explicit rescheduling can reopen completed/cancelled records. No status changes happen on a timer.

Writes serialize under the existing owner advisory/workspace lock order, verify both revisions
and recheck the active session after waiting. Current application ownership is checked when
creating/rescheduling. An unrelated source change conflicts rather than rewriting the workspace.
Existing reminder completion/cancellation/deletion can still address a formerly linked application.
Only the counter/target record changes. Monotonic revision increments survive deletion/recreation.
The API verifies the full exact expected effect before accepting an ACK. Lost/invalid responses
require a deliberate read; no request is retried automatically. A later UI must retain drafts
and must not infer failure from a lost response.

## Activation, access and rollback

API writes require `JOBMATCH_REMINDERS_ENABLED=true`; database writes independently require
the private `reminder_storage_permission()` operator gate. The migration sets that gate false.
No live flag, grant, configuration or schema was changed. Operational/PD approval is required
before activation. HTTP and native RPC consume the existing service quota; an HTTP write
therefore consumes two quota units. Storage remains bounded even for direct RPC callers.

Both tables enable RLS. Authenticated direct access is owner/session-bound SELECT only on
records; private counters and direct mutations are revoked. Public RPCs are invokers; narrowly
scoped private definers bind `auth.uid()`, active sessions and an empty search path. `anon` and
service-role direct access are explicitly revoked. No key is added to a browser or log.
Telemetry adds only the static route label to the existing coarse observer.

The additive migration is transactionally appended to fresh schema. Older migrations and SHA
pins remain frozen; native fixture suffixes explicitly include the known ordered addon.
Rollback closes writes/grants without dropping records, counter or read/export RPCs.
Reapply preserves rows and closes the operator gate again. Deploy the migration before API
rollout; it is source code only until authorized. No automatic migration is run by the application.

An explicit20table v4 backup scope extends the18table source-version scope with both reminder
tables; older formats are unchanged. Native restore must preserve ACLs as well as rows.
The disposable CI drill does not prove actual Supabase-copy recovery or operational RPO/RTO.

## Evidence and remaining acceptance

Fresh local1496unit/101files,112Python,lint/types/build pass. Native full/populated upgrade,
actual production TS wire/ACK, direct ACL/RLS/session tests, lifecycle/cap/concurrency,
transactional late-fault rollback/forward and20table synthetic restore are authored but
await GitHub CI. Results are recorded in VERIFICATION.md after execution.
The CLI-created empty migration file was edited directly after automatic review rejected
further CLI session use over possible PostHog telemetry; no CLI repeat/advisor/live-query claim.

Saved-reminder UI, manual reload/draft guards, integration into the complete personal-data
export flow and explicit notification permission/delivery are unfinished. No mail/push/calendar
event is sent or created. No independent manual/device/live acceptance is established.
Full model, actual SMTP/recovery, actual provider-copy restore, operator PD placement/retention,
HH permissions and final independent security/capacity/PWA/operational acceptance remain open.
