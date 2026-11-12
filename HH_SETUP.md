# HH applicant integration (preview only)

The integration is disabled unless JOBMATCH_HH_OAUTH_ENABLED=true and every setting below is valid. Approval of an HH application alone does not configure or authorize credential handling. Obtain explicit owner approval before configuring persistent access or enabling the integration. Never paste secrets in chat, source control, URLs or logs.

## Required configuration

Configure only the agreed branch's Preview environment in the existing Vercel jobmatch-ai project:

- HH_CLIENT_ID: approved applicant application's ID.
- HH_CLIENT_SECRET: that application's secret, supplied through the secure configuration interface.
- HH_SESSION_KEY: independent cryptographically random 32-byte key, encoded as 64 hex characters; store as a secret. Rotation invalidates local sessions.
- HH_USER_AGENT: application/version and the owner's authorized developer contact email, as required by HH.
- HH_APP_ORIGIN: https://jobmatch-ai-git-feat-simple-mvp-20261108-digagency.vercel.app
- JOBMATCH_HH_OAUTH_ENABLED: true only after approval and configuration.

Register exactly this redirect URL in the approved HH application:
https://jobmatch-ai-git-feat-simple-mvp-20261108-digagency.vercel.app/api/mvp/hh/callback

Use the stable preview hostname for login. Other deployment hostnames fail the exact-origin checks deliberately. No production setting is required or changed.

## Implemented scope

- User initiates OAuth at hh.ru/oauth/authorize. JobMatch never receives the user's password.
- Random expiring state and S256 PKCE; backend exchange at api.hh.ru/token.
- Applicant role verified with GET /me before accepting a session.
- Access token encrypted with AES-256-GCM in a Secure, HttpOnly, SameSite=Lax, host-only cookie for at most one hour. No refresh token retained. Reauthorize after expiry.
- Local disconnect clears JobMatch cookies, not the HH account's authorization grant; revoke that grant on HH if needed.
- GET /resumes/mine, then GET /resumes/{id} only after membership in the user's current list. No arbitrary URL fetching, no resume writes, no negotiations/applications.
- Selection extracts title, experience, skills and primary education. Dedicated contact, photo, birth-date and salary fields are excluded. User-entered free text may still include personal details. Public adaptation is local-only on the JobMatch server: resume and vacancy text is not sent to external AI providers. HH API agreement clause 4.6 prohibits sharing service data with third parties; client labels, URLs and consent cannot establish redistribution rights. All public AI routes remain closed until a server-enforced provenance/rights design is reviewed (see SECURITY.md).
- Upstream requests do not follow redirects, have bounded time/body size, do not log payloads/tokens, and do not echo upstream errors.

## Verification and remaining limits

Unit tests use synthetic credentials and mocked HTTP only. UI tests use synthetic sessions and resume bodies; no real HH account or resume is a test fixture.
The current official OpenAPI references /resumes/mine in the applicant profile but does not define its full pagination contract. The implementation accepts absent pagination metadata, follows reported page counts up to 10 pages, and rejects oversized responses. Verify this contract with an owner-authorized account after configuration; do not claim live integration before that check.

Test success, declined login, invalid state, expired/revoked token, empty resume list, own-resume selection, lost access, logout, and source clearing before accepting a replacement resume. Check that no credentials occur in browser-readable storage or responses. Do not send applications or change resumes as part of verification.

Official sources checked 2026-11-10:
- https://api.hh.ru/openapi/specification/public
- https://api.hh.ru/openapi/redoc#section/Avtorizaciya/Avtorizaciya-polzovatelya
- https://api.hh.ru/openapi/redoc#tag/Informaciya-o-soiskatele/operation/get-current-user-info
- https://api.hh.ru/openapi/redoc#tag/Prosmotr-rezyume/operation/get-resume
