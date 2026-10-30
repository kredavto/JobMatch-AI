# Central pre-auth quota (candidate; not deployed)

This stage adds an opt-in shared PostgreSQL budget before application Auth requests. It is **not** WAF, CAPTCHA, protection of direct Supabase Auth requests, prevention of targeted account denial, or public-production acceptance. No real mail is sent by its tests; production is unchanged.

## Contract

`JOBMATCH_AUTH_QUOTA_MODE=local` is the compatibility default. Existing per-process guards remain; identity keys in those Maps now use a per-process random HMAC instead of raw email. This does not make local counters distributed.

`required` adds `consume_auth_quota` before login/register/refresh, password recovery request/exchange/update and signup resend. Invalid mode, absent/invalid key, unavailable/malformed/denied RPC never falls back to local-only. Denial returns 429/Retry-After60; config/RPC failure returns safe 503 with stable `AUTH_PROTECTION_UNAVAILABLE` and RU/EN catalog copy. No automatic retry. Same-origin, input, consent, mail-origin and required cookie checks precede the RPC. Registration charges credentials **and** shared mail budgets before signup. Recover/signup/resend share one normalized email budget, preventing endpoint switching. Passwords are never quota subjects; refresh/access/verifier secrets are HMACed before the RPC.

All budgets use server DB epoch-minute fixed windows. Limits are deliberately server-owned, not signed caller parameters:

| Scope | Global/min | Per subject/min |
| --- | ---: | ---: |
| credentials (login/register) | 120 | 10 |
| mail (signup/recover/resend) | 30 | 3 |
| refresh | 120 | 10 |
| exchange | 60 | 5 |
| update | 30 | 5 |

The global row is charged first and serialized across instances. Subject-denied attempts still consume global allowance. Global denial creates no new subject row. A SQL exception rolls back the entire RPC, including earlier global charge. Counts saturate; fixed windows permit a boundary burst of up to two windows' budgets. Existing stricter local limits may deny earlier. These starting ceilings require owned-host capacity/UX acceptance; they are not measured scale guarantees.

No `X-Forwarded-For` or other caller IP header is trusted by this implementation. Email alias variation remains distinct; global budgets bound that path, but a determined attacker can deny service globally or target an address. Trusted ingress/WAF and direct Auth endpoint controls remain mandatory separate work. Account existence is not returned by quota checks; a quota response can still reveal recent activity for a guessed address. HMAC pseudonyms remain linkable pseudonymous data, not anonymous data.

## Signed RPC boundary

A separate random 32-byte signing key is provisioned in server-only `JOBMATCH_AUTH_QUOTA_SECRET` as 64 lowercase hex characters and in the single protected `private.auth_quota_config.signing_key` bytea. No key is seeded by migration, derived from publishable keys, or accepted from browsers. Do not reuse service-role, SMTP or model secrets. The application needs no service-role key.

Subject = HMAC-SHA256(key, UTF8(`jobmatch-auth-subject-v1\n` + scope + `\n` + normalized subject)). The signature binds UTF8(`jobmatch-auth-quota-v1\n` + scope + `\n` + subjectHex + `\n` + integerEpochSeconds). Only scope, pseudonym, timestamp and signature reach RPC. Timestamp age is <=30s, future allowance <=5s; DB clocks must be synchronized. A captured signed request can be replayed in that interval to **consume** allowance, never increase/bypass it or perform Auth actions. Keep the RPC transport/parameters out of logs.

`SECURITY DEFINER` is required to charge protected counters before an authenticated uid exists. The public function validates all shape/time/MAC constraints before any write. It has empty search_path, qualified names and a 2s lock timeout, returns only boolean, and exposes no secret/counter read/configuration RPC. PUBLIC EXECUTE is revoked; anon/authenticated receive only EXECUTE on this function. Private tables have RLS/no policies and no PUBLIC/anon/authenticated privileges. Request JWT/user_metadata grants no authority; HMAC is the sole quota-authorizing credential. MAC comparison uses keyed digests to avoid prefix information from bytea equality. This narrow endpoint is not a general signed SQL/DB API.

Requires pgcrypto installed in `extensions`; the migration refuses a different namespace rather than silently relocating a provider extension. Upstream September 25 release notes about pgcrypto legacy PGP ciphers do not concern this HMAC-only design; no PGP encryption is used. Verify provider extension availability, installed version and role/grants before rollout.

## Install, enable, rotate and rollback (operator work, not performed)

1. Review migration `20261029080555_central_auth_quota.sql` on an isolated provider copy. It is additive; schema.sql contains its fresh-install equivalent. Review RLS/grants/advisors and signed anonymous PostgREST calls on that copy. No current production migration/history is changed by this PR.
2. Provision a unique key through the approved secret process into the protected config row and matching server-only variable. Do not paste it into git, SQL logs, shell history, tickets or reports. There is no unauthenticated key-setup endpoint. DB/server admins and private backups can access it; restrict them. Keep DB transport TLS and disallow request/body logging. The signing key is included in unrestricted DB dumps: secure backups and rekey a restore before enabling traffic. It is deliberately outside the current 19-table structured-v5 application-data manifest (and legacy 13-table formats); do not mistake that manifest for protection/verification of this secret.
3. Deploy reviewed code with compatibility mode first. Enable `required` only after explicit acceptance of limits, keys, public RPC grants/transport and failure behavior. Missing DB/key must produce safe 503 **before** any Auth operation. Test fresh/denied/outage flows without real mail first; use a separately agreed mailbox only with explicit permission.
4. Rotate both DB/server key together during a controlled interruption; there is one active key and no automatic dual-key fallback. Mismatch denies requests. Subject counters change with key; the global scope/minute budgets remain. Rotation is not a routine way to reset quotas.
5. Rolling code back to older code removes this application protection. Disabling `required` is an explicit operator security decision, not automatic recovery. Additive tables/RPC can remain while code rolls back. Do not drop configuration/counters or alter production data without a reviewed cleanup plan.

Counters older than 24h are ineligible and at most 200 stale rows are removed per authenticated RPC. Without traffic they are retained until operator cleanup; this is **lazy expiry**, not a strict retention SLA. Provision a reviewed purge/monitoring process and storage budget before production activation. Key/DB backup retention and personal-data hosting decisions remain open.

Tests use only synthetic keys/subjects and disposable PostgreSQL: grants/RLS, missing/forged/stale signatures, all subject/global limits, expiry and fault rollback; parallel connections verify exactly ten credential admissions out of twenty. Application tests mock only provider/DB and verify auth is not called after quota failure. These do not establish a live Supabase/WAF/load/privacy or SMTP acceptance result.

Primary references reviewed 29 October 2026:
- https://supabase.com/docs/guides/database/functions
- https://www.postgresql.org/docs/17/pgcrypto.html
- https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes

Integration 30 October 2026: #17/#18 are adapted onto the current #39 feature stack; no PR is merged by this change. Both existing migration filenames/content are retained. Canonical fresh schema appends the same definitions without changing structured-literal-v1, hashes, commands, reminders or saved history. Mail origin and typed provider/recovery errors remain in place. The 19-table manifest intentionally excludes the three private quota tables (config/counters/outcomes); a matching application manifest does not verify signing secrets, counters or metrics. An unrestricted dump may contain the key: restrict backup access and rekey a restore before enabling traffic. No hosted migration, key provision, mode activation, actual email, scheduler or live provider acceptance was performed.
