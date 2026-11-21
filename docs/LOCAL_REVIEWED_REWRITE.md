# Optional AI wording in the local vacancy result

After adapting a selected file to a vacancy locally, optionally create an AI
draft under the account pilot. JobMatch sends only the previously consented
resume payload to the provider, not the vacancy, skills, or result. The output
is a separate wording proposal, not vacancy-aware generation.

Review each source/alternative pair and select only faithful alternatives.
"Использовать выбранные формулировки" rechecks the same authenticated account
and consent revision via GET; it makes no second provider request. A changed
vacancy, source, consent or account, discarded draft, or unresolved status does
not apply any change. The exact original bullet must occur once in the eligible
source and the current result. Nested/continued bullets, plain paragraphs and
changes to numbers, negation or listed/catalog skill membership cannot be
applied. This is a structural and lexical check, not a guarantee about meaning
or skills outside the lists. Always read the original and alternative.

Application alters only the current tab's result. The original file/profile,
target title, source-derived evidence ranking, matched/missing skills and
source-derived cover letter do not change. There is no automated application
or update on hh.ru. Existing explicit copy and local version-save controls are
unchanged. Running ordinary adaptation again restores the original wording.

Synthetic pilot harness: `npx playwright test --config playwright.full-resume.config.ts`.
Actual Home with mocked status, vacancy and AI, local-only:
```sh
NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_JOBMATCH_FULL_REWRITE_PILOT=true npm run build
npx playwright test --config playwright.reviewed-apply.config.ts
```
No provider key, real identity, real resume or external request is needed.
