# HH vacancy link import (local implementation, disabled by default)

Base: PR #60, `d606f91a03fc46d6721cad1189999adab4b5fe46`, remote head checked 2026-10-31.

## User flow

Paste a vacancy HTTPS URL (`hh.ru`, mobile or a single regional subdomain) or numeric ID in the link field, then **Load from link**. A URL pasted into the old text field also changes its save action into import; it is not saved as job requirements. Query strings and fragments are discarded. The preview shows plain text, canonical source and archived status. Explicit **Replace text with this import** changes only the unsaved draft; Save and Analyze remain separate actions. Existing draft text survives errors, cancellation, navigation and delayed responses. Changing link/text invalidates a pending preview; locale changes preserve it. Manual paste/save remains available even when the integration is disabled.

## Official documentation checked 2026-10-31

- [HH OpenAPI](https://api.hh.ru/openapi/en/redoc#tag/Vacancies/operation/get-vacancy): `GET /vacancies/{vacancy_id}`, OAuth security declaration, client identification header; 403 can require CAPTCHA, 404 may mean inaccessible as well as missing, 429 is rate limiting.
- [HH API terms](https://hh.ru/article/15116): registration and credentials (1.1), applicant onboarding acceptance (1.4), restrictions on changing materials (3.11) and third-party transfer (4.6) require operator review. This implementation is not proof of permission or legal acceptance.

No live vacancy was fetched and no credentials were supplied during development. Tests use synthetic responses. A documented endpoint or an anonymously successful call does not establish production permission.

## Activation gate (not enabled by this change)

All three server-only values are required: `JOBMATCH_HH_VACANCY_IMPORT=approved`, `JOBMATCH_HH_USER_AGENT=App/Version (real-contact@example.org)` and `JOBMATCH_HH_APP_ACCESS_TOKEN` with application-only (client-credentials) authorization for public vacancy access. Never configure an applicant/employer/user token: a shared privileged token could expose account-restricted vacancies to other JobMatch users. The application-token type is an operator provisioning requirement; opaque tokens cannot be classified locally. This code does not acquire, refresh or share user OAuth sessions. The operator must first verify registration, token scope/use model, onboarding compliance, plain-text conversion/storage permission and downstream processing. In particular, do not enable API import alongside an AI/third-party data path until those permissions are established. Existing workspace storage has no durable HH-source provenance flag, so permission-specific downstream policy cannot be inferred from stored text. This limitation is an activation blocker, not a claim that the feature flag proves compliance. Token expiry/permission failures safely fall back to manual input. No production settings changed.

## Security boundaries

- Authenticated, same-origin POST; owner header/body checked before quota/fetch; existing distributed `import` quota. Request max 4096 bytes; URL max 2048 chars. No database writes except consuming the existing quota.
- Extract digits only; construct the fixed `https://api.hh.ru/vacancies/<id>` destination. Never fetch the user's URL, returned `alternate_url`, CAPTCHA link or redirect. No configurable destination, arbitrary ports, credentials in URL, IP literals, lookalike domains or HTTP. Regional names do not affect the network destination, so attacker-controlled subdomain DNS cannot redirect the fetch. TLS/DNS for the fixed trusted API remain infrastructure trust assumptions.
- Redirects rejected, no retry/scraping/CAPTCHA bypass. Server-held token sent only to the fixed API; incoming browser cookies/headers are not forwarded. `no-store` on fetch and response.
- 10-second upstream deadline includes body; 256000-byte body limit, JSON/type/ID validation, 30000-character output limit (reject rather than silently truncate). HTML never rendered; scripts/styles removed, limited entities decoded once, tags become plain text. Upstream text remains untrusted data, not instructions or verified resume facts.
- Stable localized errors never expose provider response/token. Route telemetry records only existing coarse route metadata.

## Acceptance

Synthetic route/unit/browser checks cover normal import, redirects/destination tricks, quotas/auth/origin/owner, body limits, archived data, UTF-8/HTML/entities, error fallback and stale UI responses. Live HH service and registration/onboarding/token permissions are not accepted by fixture tests. No publish, merge, deployment, HH write, OAuth authorization or external model call was performed.
