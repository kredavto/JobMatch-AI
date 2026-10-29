# Public API error codes v1

This stage follows PR #21 and prepares complete RU/EN localization. It does not enable an English UI, language switch, browser-language detection, emails or new integrations. Current released UI remains Russian until all screens/dates/offline assets and bilingual acceptance are complete (lib/i18n/README.md).

## Wire and compatibility

All application HTTP failures emitted by `failure` have `{error:string,code:ApiErrorCode}`. `error` remains a human-readable Russian string by default; old clients can continue reading it and HTTP status. Copy is now canonicalized from `lib/i18n/api-errors.ts`; variants of equivalent owner/export/write messages may become the same copy. It is not a byte-for-byte promise for old presentation strings. There is no change to success payloads, cookies, SQL, allowed operations, quotas, redirects, credentials or ownership/revision rules. No provider schema was migrated.

Codes and their status meanings are stable public identifiers. Copy can be edited/translated without changing control flow. Catalog entries contain RU/EN copy and the allowed HTTP status; REQUEST_FAILED is a safe generic fallback for any400–599 error. Unknown/uncoded UserError, unknown code or a code/status mismatch is redacted to that generic code. Invalid error status is clamped to500. Unexpected errors have INTERNAL_ERROR; Zod/JSON syntax errors have INVALID_INPUT. Existing plain-Error internal AUTH/ORIGIN/CONFLICT/RATE control tags map to AUTH_REQUIRED/ORIGIN_REJECTED/REVISION_CONFLICT/RATE_LIMITED. Own-property checks reject prototype names.

No raw exception `.message`, Zod issue/input, SQL/provider diagnostic, endpoint, token, email or user content is serialized by the HTTP boundary, even when a UserError has a known code. The internal Error message remains for existing local callers/tests, but is not HTTP copy. All94 production UserError construction sites were reviewed/assigned explicit codes, including dynamic timeout and parser cases. Codes describe the failure; they are not permissions, delivery receipts, idempotency keys or a retry policy.

No-store is preserved. RATE_LIMITED remains429 with Retry-After:60. Other statuses remain their existing values. A status or code never proves that an uncertain write failed. No automatic mutation retry is introduced.

## Client transport and localization

`errorFromResponse(value,status,locale='ru')` uses fixed catalog copy for a known code with matching HTTP status. It ignores any arbitrary `error` text on coded responses. Unknown/malformed/prototype/mismatched codes get CLIENT_INVALID_RESPONSE with actual HTTP status retained. A body code cannot spoof an auth status; existing recovery/conflict behavior still uses HTTP status, not code or translated text.

For compatibility with earlier **same-origin** servers, a body with no code can still display a bounded nonempty Russian-mode `error` string (up to2000 UTF-16 units, excluding binary controls). This is a limited legacy trust boundary, not permission to display arbitrary third-party diagnostics. English mode cannot translate unknown legacy copy and uses a fixed English fallback. Invalid/oversized legacy messages are discarded. A future code is handled safely rather than shown verbatim. Remove the legacy path only after a reviewed compatibility transition.

`RequestError.code` records server or local transport code. CLIENT_NETWORK_LOST has status0 and explicitly says the write outcome is unknown; CLIENT_INVALID_RESPONSE preserves an error HTTP status (or0 for malformed success JSON). CLIENT_REQUEST_FAILED is the generic legacy fallback. `requestJson` and manual import/structured profile/literal version/task callers share the same factory; there is no duplicated raw-error rendering path in these API consumers. Schema/ack validation retains existing conservative recovery behavior.

RU remains the default. `requestJson`/validation/error helpers accept an explicit RU/EN locale for future complete UI integration; `failure` also accepts an explicit locale internally. No HTTP header/query/cookie activates partial English in this branch. Locale values outside the supported set fall back to Russian. Evidence, original resumes, quotes, stored status values, command identifiers and confirmation literals (including УДАЛИТЬ) are not translated.

## Parser and provider boundary

The private parser protocol remains unchanged. Validated INVALID/TOO_LARGE/TIMEOUT/OCR_LIMIT/BUSY/UNAVAILABLE codes map to public API codes with the same status. The gateway now decides whether an error can be forwarded by its explicit code, not by comparing Russian messages. A thrown error that merely happens to match the Russian BUSY text is no longer forwarded. Worker payloads remain enum-only; unknown protocol/status/timeout paths still fail closed without inline fallback.

Supabase/Auth, AI, recovery, upload/documents, workspace, source profile/literal versions, tasks/history/export throw explicit public codes. Provider-specific raw details are still discarded before public response. AI endpoint/mode, SMTP configuration, PKCE/session revocation and quotas are unchanged. HTTP fixtures do not establish live provider behavior or model quality.

## Verification and rollback

Unit/route tests cover code/status/no-store/Retry-After, both locales, unknown/prototype/coded/uncoded detail redaction, input privacy, old-body compatibility, English fallback, status spoofing, lost writes without replay, auth/owner/upload/recovery validation before downstream operations, and parser code forwarding independent of Russian wording. Browser tests additionally use **real unauthenticated local routes** (no account/SMTP/model) and synthetic workspace writes for conflict/unknown-code/status-spoof/draft retention/mobile accessibility. Real recovery tests submit an invalid email string, rejected before provider invocation; no message is sent.

Full app/browser and existing PostgreSQL17 /19-table restore/concurrency and parser/OCR/ClamAV regression CI are recorded in VERIFICATION.md. Those are separate synthetic/native proofs, not live Supabase Auth/PostgREST, provider backup restore, SMTP/recovery, real model evaluation or final-domain acceptance.

Old clients ignore additive code. New clients support earlier code-less same-origin error bodies in Russian mode. Rolling back this code changes neither SQL nor user data. Schema migrations/production/merge/release are not performed. Next localization work is extracting all remaining screen/date/offline copy and completing both-language acceptance before enabling the language switch.

## Current main mail UX integration (PR #24)
The owner-merged main/PR #15 mail origin gate and password-recovery advice are retained when combined with this contract. Additive AUTH_INVALID_CREDENTIALS (400), MAIL_SERVICE_UNAVAILABLE (503), MAIL_NOT_CONFIGURED (503) and MAIL_ORIGIN_MISMATCH (400) use fixed RU/EN copy; configured primary URLs and provider diagnostics are not echoed through failure. AUTH_REJECTED remains 400 with neutral authentication advice, without diagnosing SMTP. Documented over_request_rate_limit is handled from either provider code field. Mail flow, delivery, central-auth quota #17/#18 and provider acceptance remain separate; no real mail is sent by these synthetic tests.
