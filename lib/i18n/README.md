# UI localization boundary

Russian is the only released application language. `ui` deliberately points to `ru`; no browser-language detection or language switch is enabled.

The shared Messages type requires equal keys in Russian and English for the extracted scope: navigation, match labels, authentication form labels, shell/loading/connectivity, request fallback messages and metadata. The analytics screen has a separate typed RU/EN catalog in analytics.ts, also released in Russian only. Other screen copy, server error messages, dates, static offline HTML and manifest text remain Russian.

Navigation state uses TabId, never translated labels. Recovery comparison visibility uses a boolean, never a notification prefix. Keep business decisions independent of presentation strings.

Do not translate or mutate original resumes, facts, evidence sources, vacancy quotes, version text, or persisted application status values. Translating a UI label is not evidence verification. Existing database status values and API contracts remain unchanged.

Before releasing English: extract remaining copy, connect the completed API error catalog to the selected locale, localize dates with an explicit locale, add the locale to server/client rendering and document lang, translate offline assets/manifest, and rerun both-language browser/accessibility tests. Do not activate a partial English interface.

Manual screen-reader verification still requires an environment with NVDA/VoiceOver/TalkBack. Automated axe checks are not a substitute.


## API errors v1
`api-errors.ts` defines stable public code/status semantics and typed RU/EN copy. HTTP failures retain `error:string` plus additive `code`; canonical copy is not a byte-for-byte contract for old wording. Client transport retains HTTP status/recovery/no-retry behavior, handles new codes safely and supports legacy code-less same-origin bodies in RU mode. See docs/API_ERROR_CODES.md. English helpers are preparatory; no language switch or partial English UI is enabled.


## Structured components
Typed RU/EN copy for source-backed profile/literal versions/saved tasks, semantic feedback and explicit-zone date helpers are prepared. Optional component locale props default to RU; production exposes no partial English route/switch. Isolated test-only React fixtures verify both languages, immutable data/commands and draft preservation. Saved literal-v1 text is still the frozen Russian template. See docs/STRUCTURED_UI_LOCALIZATION.md; remaining global profile feedback/auth/editor/analytics/settings/offline/global locale wiring and full bilingual acceptance are open.

## Master profile component
`ProfilePanel` has typed RU/EN goal/import/facts/history copy with controlled drafts and exact canonical callbacks. History instants use explicit UTC; persisted sources, IDs and downloaded snapshots stay unchanged. Pending fact completion clears only the unchanged submitted draft. Production page remains RU; its shared notices/import/error feedback and all remaining shell screens still need locale wiring. Isolated bilingual component fixtures and a real-page regression with mocked service responses do not establish full-app English or provider acceptance.

## Workspace feedback
`WorkspacePage` stores semantic notice keys and typed request/fallback errors; `WorkspaceFeedback` resolves the current locale without replaying requests or resetting drafts. Internal validation client codes preserve context but cannot be accepted from an external API body. Unexpected exception text is redacted, and another import clears stale extraction-success feedback. Production `/` still fixes RU; other screens and global locale/document/offline wiring remain open. See docs/WORKSPACE_FEEDBACK_LOCALIZATION.md for the isolated whole-workspace fixture scope and evidence limits.

## Authentication shell and mail forms
`workspace-shell.ts` and `mail.ts` prepare typed RU/EN shell/sign-in/reauth/comparison/confirmation/recovery copy. Forms keep semantic feedback/status+stage, preserve fields/cooldown across locale changes and ignore late UI responses after unmount; recovery has a synchronous pending guard. This does not cancel an already submitted provider action or prove SMTP delivery/session revocation. Default production wrappers remain RU. See docs/AUTH_SHELL_LOCALIZATION.md for actual-component fixture scope, Next Link context limits and open global/bilingual/live gates.

## Overview and vacancy
Typed RU/EN overview/vacancy components preserve canonical commands, source text and Russian demo/example data. Demo guards cover saved facts and unsaved sources; late import/demo/fact replies preserve newer source drafts, and a late demo does not override later navigation. Vacancy ID/result state is local, resets on edit and makes no hh.ru request; example selection is draft-only. Production remains RU. See docs/OVERVIEW_VACANCY_LOCALIZATION.md for evidence and remaining bilingual/live gates.

## Rules editor and saved sources
`EditorPanel` prepares typed RU/EN rule results, evidence warnings, edit selection and save controls. Known current rule reasons are translated for display only; unknown reasons remain verbatim. Saved quotes, IDs, rules output and frozen Russian version text are unchanged. Unsaved resume/vacancy fields disable analysis and version selection/saving; late completions preserve later navigation and drafts. Production remains RU. See docs/EDITOR_LOCALIZATION.md for CI fixture scope and open global/bilingual/live acceptance.

## Ordinary version history and exports
Typed RU/EN copy covers ordinary version history/comparison, historical score metadata and DOCX feedback. Explicit instants display in UTC; legacy date-only or offset-less values retain their recorded precision with an explicit warning rather than acquiring a device time zone. Locale changes preserve comparison IDs and pending downloads; owner/version changes reset and abort only the old read. Source text/snapshots/metadata/TXT/JSON/DOCX content and canonical restore commands stay unchanged. Production remains RU. See docs/VERSION_HISTORY_LOCALIZATION.md for fixture/CI evidence and remaining global/live gates.

## AI review presentation
Typed RU/EN AI-review copy stores semantic errors without rendering response/exception messages. Locale changes preserve consent, pending request and validated result; owner/revision changes invalidate them and abort the old request. Exact-citation/eligible-fact/envelope validation is unchanged and does not establish semantic correctness. Production remains RU and the model remains off by default. See docs/AI_REVIEW_LOCALIZATION.md; own-model live evaluation and operator approvals remain open.

## Letters and career advice
Typed RU/EN copy localizes letter controls, semantic errors and known rule advice for display only. Locale changes preserve manual text/caret/style/evidence selection/approval and career filter/open details. Unsaved sources or paused workspace actions block letter actions/export without discarding manual text; typing still clears approval. Existing Russian letter framing and rule-plan TXT exports remain unchanged and are named explicitly in English UI. New wording is not semantically verified. Production remains RU. See docs/LETTER_COACH_LOCALIZATION.md.

## Analytics locales and recorded time
AnalyticsPanel/AnalyticsTimeline use optional default-RU locale props with preserved filters and semantic CSV failures. Explicit instants use UTC; legacy day-only records keep calendar buckets and day-only CSV precision. Offset-less times never acquire the device zone: affected applications remain observable in overall recorded-status metrics but are excluded from date/month cohorts, with an explicit count. A later known event is not substituted for an unplaced first event. Source history/statuses/IDs remain unchanged. Production stays RU. See docs/ANALYTICS_TIME_LOCALIZATION.md; tracker drafts/status/date presentation and global/live acceptance remain open.


## Inline evidence review integration
`requirement-evidence.ts` provides typed RU/EN whole-line confirmation/candidate copy; existing editor reason catalog remains display-only. `WorkspaceNotice` stores confirmed-before/after scores or an explicit saved-but-not-reanalyzed outcome. Changing global locale preserves expanded candidates/pending confirmation and translates feedback without replay. Saved quote/source/ID/rule output stays unchanged. See docs/INLINE_EVIDENCE.md for strict one-fact owner/revision acknowledgement and deferred-analysis behavior.


## Explicit acceptance records
`consent-receipts.ts` has typed RU/EN display feedback. Operator notice language is a separate explicit choice: UI locale changes preserve the exact published body/version/hash and acknowledgement. Terms/receipt text is never translated. Lost writes require manual reconciliation and an unchanged explicit retry reuses its command ID. The new complete journal is the sixth archive file; old consent rows remain separate observations. The empty operator catalog/web-write default-off do not establish legal/placement approval. See docs/CONSENT_RECEIPTS.md for the owner/session protocol and evidence limits.

## Frozen structured document language
PR #43 adds an explicit document-template selector for new structured literal versions: structured-literal-v1 (Russian, default) or structured-literal-en-v1 (English). Global locale only changes controls/feedback; it preserves the selected template, pending request and approval. Changing the document template clears preview/approval. Quotes and stored historical text/hash remain unchanged. Both exact tags share existing history/TXT/JSON/NDJSON; unknown tags or mismatching response/summary tags fail closed. Ordinary version framing is still Russian. See docs/STRUCTURED_VERSIONS.md for protocol/install/rollback and verification limits.
