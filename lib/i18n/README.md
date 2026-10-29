# UI localization boundary

Russian is the only released application language. `ui` deliberately points to `ru`; no browser-language detection or language switch is enabled.

The shared Messages type requires equal keys in Russian and English for the extracted scope: navigation, match labels, authentication form labels, shell/loading/connectivity, request fallback messages and metadata. The analytics screen has a separate typed RU/EN catalog in analytics.ts, also released in Russian only. Other screen copy, server error messages, dates, static offline HTML and manifest text remain Russian.

Navigation state uses TabId, never translated labels. Recovery comparison visibility uses a boolean, never a notification prefix. Keep business decisions independent of presentation strings.

Do not translate or mutate original resumes, facts, evidence sources, vacancy quotes, version text, or persisted application status values. Translating a UI label is not evidence verification. Existing database status values and API contracts remain unchanged.

Before releasing English: extract remaining copy, connect the completed API error catalog to the selected locale, localize dates with an explicit locale, add the locale to server/client rendering and document lang, translate offline assets/manifest, and rerun both-language browser/accessibility tests. Do not activate a partial English interface.

Manual screen-reader verification still requires an environment with NVDA/VoiceOver/TalkBack. Automated axe checks are not a substitute.


## API errors v1
`api-errors.ts` defines stable public code/status semantics and typed RU/EN copy. HTTP failures retain `error:string` plus additive `code`; canonical copy is not a byte-for-byte contract for old wording. Client transport retains HTTP status/recovery/no-retry behavior, handles new codes safely and supports legacy code-less same-origin bodies in RU mode. See docs/API_ERROR_CODES.md. English helpers are preparatory; no language switch or partial English UI is enabled.
