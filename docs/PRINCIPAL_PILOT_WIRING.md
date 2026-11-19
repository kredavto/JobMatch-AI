# Principal-bound pilot integration (local only, disabled)

This candidate connects an AI-only panel to `/api/rewrite-pilot` while preserving normal local adaptation without login. The panel is hidden unless `NEXT_PUBLIC_JOBMATCH_FULL_REWRITE_PILOT` is explicitly true. The server route is independently default-deny with no runtime dependencies installed; setting a public/environment flag alone cannot spend provider credit. No settings have been changed.

The service factory authenticates a real principal through a supplied verifier. The existing verifier adapter uses the `jm_access` HttpOnly cookie, Supabase user verification and existing active-session check; it never trusts owner headers/body fields. `expectedSubject` is only a mismatch guard. New account consent policy `groq-full-resume-account-v1` is distinct from the previous browser-only prototype. LocalStorage grants are never migrated or treated as server consent.

Status returns only subject and consent snapshot, no token/email. Grant/revoke use current authenticated principal, expected revision and policy. Requests carry expected subject, server consent ID/revision, request UUID and full resume. The durable contract accepts no resume, vacancy, output or content hash. Reserve must atomically verify active eligible session, explicit expiring pilot entitlement, current unrevoked consent, one-use request ID and global/user daily ceilings before a provider call. `canDeliver` runs before and after provider output; authentication is rechecked after generation. Revocation/logout can suppress a pending draft, but cannot retract past provider transmission.

UI clears prior results and consent checks on source/account changes, logout, revoke and focus recheck. Login uses the existing service endpoint and is required only for AI. Async responses are version-checked so stale login/consent/rewrite responses cannot overwrite the active UI. Error messages never repeat raw resume/provider text. Existing contact/ID marker and semantic-verification limitations still apply.

Durable SQL is being prepared separately with no remote apply. The planned Supabase RPC adapter must strictly validate responses, use only the current user's token, reject missing/changed policy and accept only literal `true` reservations/delivery checks. SQL concurrency/privilege execution is a separate prerequisite; mocked interface tests do not establish transactional safety. Deployment requires explicit reviewed setup, tested auth, durable budget and entitlements, account-specific consent/revocation browser tests, bounded live synthetic provider evaluation and then Preview verification. Production remains out of scope until those release gates pass.

The Supabase adapter now matches the independently prepared SQL draft RPC names/status fields. It is only an injected transport adapter; no migration/config/credential is applied and no RPC is executed in tests. It accepts literal boolean permits only and checks returned policy, account scope, recipient, revision and grant state. After an AI response the client additionally refetches status using the current browser cookie and discards the draft on subject/consent mismatch (the original request's captured cookie alone cannot detect a later cross-tab account switch).

Local validation after composition: 940 unit tests across 72 files, typecheck, lint and Next build PASS. Includes verified-cookie principal, subject mismatch, account-only policy, grant/revoke revision flow, reserve denial, post-response revocation/logout, strict RPC parsing, and mocked authenticated service→RPC adapter→pinned Groq adapter composition. These tests do not execute Postgres, Supabase Auth, real Groq, or the new account UI in a browser. The earlier local browser-harness attempt remained blocked before navigation by Chromium socket permissions. Server route continues default-deny; composition is not registered there yet.

## Isolated Preview configuration (not applied)
Legacy `/api/service` supports workspace persistence and must NOT be activated by
this pilot. Do not configure `SUPABASE_URL` or `SUPABASE_PUBLISHABLE_KEY` for it.
Pilot uses exclusively server-only `JOBMATCH_PILOT_SUPABASE_URL` (pinned to existing
JobMatch project), `JOBMATCH_PILOT_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_`, never
service role), and `JOBMATCH_PILOT_ENABLED=true`. Absence is default-deny.
`GROQ_API_KEY` is read only by the server composition. The independent browser
flag `NEXT_PUBLIC_JOBMATCH_FULL_REWRITE_PILOT=true` only reveals the UI, not authority.

Dedicated `/api/pilot-auth`: login, session GET, refresh and local-session logout
only; scoped HttpOnly Strict cookies `jm_pilot_access`, `jm_pilot_refresh`. No signup,
workspace import/export/delete, resume storage or legacy cookie reuse. Existing
verified accounts required; no signup/password recovery UI added. The UI login
uses this endpoint only. Expired access currently asks user to log in again;
refresh endpoint exists but automatic client refresh is not enabled.

`20261120010000_isolated_ai_pilot.sql` is an unapplied additive migration. Initial
config is disabled/caps zero; pilot cannot spend until reviewed config caps and an
explicit expiring account entitlement are provisioned. No service-role runtime.
Before release: run concurrent SQL/privilege smoke; apply only this reviewed
migration; scope config to existing Preview branch only; choose bounded global/user
caps and expiring pilot users, verify sign-in/consent/revoke and synthetic provider
smoke. Setting env alone must not grant an entitlement. Do not enable Production.
Auth relies on Supabase's native auth abuse controls; local in-memory counters are
not a durable spending safeguard. No claims of real login or browser E2E until run.

### Account browser harness
`tests/fixtures/full-resume-browser/entry.tsx` now renders the active
`PrincipalRewritePanel` with two synthetic accounts and fake same-origin handlers.
All fetches terminate in that fixture; no real auth, Supabase or provider. Only
synthetic account consent is kept in fixture sessionStorage to simulate server
persistence; source/output are not stored. Three Playwright cases cover reload,
two explicit rewrites on one consent, revoke, logout/second account, stale account,
source changes, fallback, mobile overflow and no auto-save. This is UI evidence
only, not proof of actual server authentication. Local Chromium launch remains
blocked at socket()/process_singleton before navigation; CI run still required.
