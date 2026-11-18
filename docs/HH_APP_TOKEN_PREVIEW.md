# HH application-token vacancy reading (preview)

The MVP vacancy route uses the server-only `JOBMATCH_HH_APP_ACCESS_TOKEN`,
`HH_USER_AGENT` and exact HTTPS `HH_APP_ORIGIN`. It does not depend on the
applicant OAuth enablement flag, client secret, session encryption key, or
applicant cookies. Never prefix the token with `NEXT_PUBLIC_` or send it to the
browser. Configure only the authorized preview branch.

Only GET `https://api.hh.ru/vacancies/{numeric id}` is made. Redirects, missing
credentials, unexpected origins, oversized bodies, mismatched vacancy IDs and
archived vacancies fail closed. Errors are bounded local messages, not upstream
payloads. There is no retry, HTML fallback, token regeneration or CAPTCHA bypass.
A rejected application token asks the owner to check configuration, not the
applicant to log in again.

This enables vacancy reading only. Applicant resume-list/read/write and responses
remain unavailable according to the November 16 support reply. It does not turn
the application token into an applicant credential or establish a complete MVP.
No file-upload workflow was introduced by this change.

The earlier local commit 04e44fd was not available in this executor or the remote;
this change was reconstructed from preview 64fdecc in an isolated worktree.

## Verification on 2026-11-18

The reconstructed change passed 790 unit/route tests (58 files), TypeScript and
ESLint. No live-provider claim is made by these mock-transport tests. Browser E2E
and deployed integration are separate checks.

The baseline pinned Next.js 16.4.3 build completed compilation and static pages,
but its built-in advisory checker returned SecurityFatalError. An ordinary retry
completed with a warning. This did not establish safety. Official release 16.4.5
lists seven security fixes; e.g. GHSA-pc58-hwjq-p385 includes 16.4.3 in its affected
range (application-specific exploitability has not been established):
https://github.com/vercel/next.js/releases/tag/v16.4.5
https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385

A separate dependency patch pins Next.js and eslint-config-next to 16.4.6, the
November 9 patch release, using normal npm installation without lifecycle scripts:
https://github.com/vercel/next.js/releases/tag/v16.4.6

After the 16.4.6 patch: all 790 tests, lint, typecheck and build passed; the Next.js
warning no longer appeared. Browser E2E could not start Chromium in this executor
(crashpad startup and process-singleton socket permission failures), including a
permitted elevated retry; those checks are not passed.

A production-only npm audit still reports existing parser dependency findings:
`pdfjs-dist` GHSA-hq66-cqwq-w95j (high), and `yauzl` 3.2.0
GHSA-gmq8-994r-jv83 (moderate). This patch is not a clean security audit or full
MVP acceptance. No remote push or deployment was performed at this checkpoint.

### Parser patch follow-up

The remaining production dependency advisories were addressed in a separate
change: `pdfjs-dist` 5.7.284 → 6.2.108 and `yauzl` 3.2.0 → 3.4.0. The installed
PDF.js range had advanced under its existing caret declaration; it is now pinned.
Sources: https://github.com/advisories/GHSA-hq66-cqwq-w95j and
https://github.com/advisories/GHSA-gmq8-994r-jv83. These advisories have deployment
conditions; their presence was not evidence of exploitation of this application.

The parser patch passed all 790 tests, typecheck, lint and build. Production-only
`npm audit --omit=dev` reports zero findings after the patch. Development-only
dependencies and application threat modelling are not covered by that result.
