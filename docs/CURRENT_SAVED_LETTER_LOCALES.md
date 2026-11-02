# Current saved-letter presentation

Default Russian and optional English presentation cover the current SavedLettersPanel in the editor and versions view. Root locale reaches this panel without changing its owner key, save-form context key, preview lifetime or acknowledgement. Composer and lexical-review controls are covered separately in [the current local-letter contract](CURRENT_LOCAL_LETTER_LOCALES.md); the document remains Russian v1. Career controls now have [a separate current contract](CURRENT_CAREER_LOCALES.md); global English activation remains separate.

## Data and consent

History is explicitly read. Presentation uses the recorded acceptance instant in UTC, including whole seconds, through the existing version-date formatter. Locale never changes timestamps or stored metadata. Feedback stores status/semantic notice descriptors and renders with the current locale, including late responses and unknown writes. Raw text, fact/source IDs, vacancy, template ID and signed JSON remain literal.

The existing main-ru-letter-81cb1a6-v1 snapshot, validators, receipt signing, owner/revision/source checks, independent storage consent and final acceptance literal remain unchanged. Switching locale does not remount a valid preview or clear either consent. Source changes, paused writes, expiry and owner changes retain their existing guards. An uncertain write requires an explicit history read and exact receipt reconciliation, never automatic replay. Download validates the captured row and exports exact text/JSON. The model was not called by the application to generate this template; manually supplied text is not independently semantically assessed.

## Transport

The existing 2,100,000-byte and 20,000-ms limits are unchanged. The response uses the existing bounded reader with strict UTF-8 and JSON parsing, actual and declared byte limits, signal cancellation and a full-body wall deadline. Error, overflow and cancellation paths do not await untrusted stream cancellation hooks. Fixed error descriptors never display raw upstream response bodies.

## Evidence and limits

Two baseline browser regressions failed on device-local timestamps and a late Russian-only notice. Synthetic API routes use the real receipt-signing helper with a public fixture key; they do not send mail, call a model or verify a provider restore. Added tests cover locale during preview/acceptance, exact signed exports, unknown-write reconciliation, expiry, source changes, fixed errors and mobile automated accessibility. CI results are recorded in VERIFICATION.md once actually observed. Runtime was unavailable; remote immutable readback and GitHub Actions provide evidence, not local execution, physical-device or screen-reader acceptance.

SMTP/recovery, real Supabase provider-copy restore, operator data-placement decisions, self-hosted model qualification and final live/security/capacity acceptance remain OPEN. No merge/release/deploy, paid infrastructure or HH writes are authorized by this change.
