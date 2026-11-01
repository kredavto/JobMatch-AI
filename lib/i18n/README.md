# UI localization boundary

Russian is the only released application language. `ui` deliberately points to `ru`; no browser-language detection or language switch is enabled.

The shared Messages type requires equal keys in Russian and English for the extracted scope: navigation, match labels, authentication form labels, shell/loading/connectivity, request fallback messages and metadata. The analytics screen has a separate typed RU/EN catalog in analytics.ts, also released in Russian only. Other screen copy, server error messages, dates, static offline HTML and manifest text remain Russian.

Navigation state uses TabId, never translated labels. Recovery comparison visibility uses a boolean, never a notification prefix. Keep business decisions independent of presentation strings.

Do not translate or mutate original resumes, facts, evidence sources, vacancy quotes, version text, or persisted application status values. Translating a UI label is not evidence verification. Existing database status values and API contracts remain unchanged.

Before releasing English: extract remaining copy, map API error codes to messages, localize dates with an explicit locale, add the locale to server/client rendering and document lang, translate offline assets/manifest, and rerun both-language browser/accessibility tests. Do not activate a partial English interface.

Manual screen-reader verification still requires an environment with NVDA/VoiceOver/TalkBack. Automated axe checks are not a substitute.

Current API preparation after #90: `api-errors.ts` supplies closed code/status/RU/EN copy and fixed HTTP redaction; current clients retain explicit legacy same-origin RU compatibility. Strict OCR_LIMIT400 remains separate for existing PDF clients. This does not enable an English interface; see `docs/CURRENT_API_ERRORS.md`.

Current source profile/literal version panels have explicit optional locale props and a typed fixed UI catalog in `source-panels.ts`. Language changes preserve contextual state; frozen document framing and raw quotes are unchanged. History display uses explicit UTC. Production defaults RU, and this is not full-English acceptance; see `docs/CURRENT_SOURCE_LOCALES.md`.

Current public AuthPanel and confirmation/recovery forms accept locale props/defaultRU, with retained code/status/stage feedback and explicit pending/consent context boundaries. Root adoption/requests remain authoritative; private reauth/full UI still require localization. Existing placement disclosure requires operator review; translated acknowledgements do not prove mail delivery. See `docs/CURRENT_AUTH_LOCALES.md`.

Current workspace/demo preparation passes optional locale through WorkspacePage to shell,
AuthPanel, source panels, controlled OverviewPanel and current VacancyPanel. The
released page still mounts the Russian default. See CURRENT_WORKSPACE_LOCALES.md
and CURRENT_PROFILE_DRAFT_SAFETY.md in docs for state, request and draft boundaries.
No locale is sent in profile-write bodies; stored evidence/status/document content
is not translated. Remaining screens/dates/offline/global selector are still open.

The current rules editor has optional RU/EN presentation in ResumeEditorPanel,
with Root-owned saved-source context, pending and navigation guards. Only fixed
known rule reasons/category labels are translated; raw evidence/quotes and the
Russian v1 document remain literal. UI language preserves selection and undo;
dirty/paused/stale saved context blocks actions. Global selector remains OFF.
See docs/CURRENT_EDITOR_CONTEXT_LOCALES.md for limits and immutable CI evidence.
