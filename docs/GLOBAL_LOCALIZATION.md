# Global language selection and offline privacy

The public app uses a shared RU/EN context. Existing components still accept explicit locale props for callers and fixtures without a provider. Locale changes keep component identity, drafts, selection, filters and pending actions; they do not refresh the router, replay a request or submit registration/recovery forms.

Only an explicit language preference is persisted, in jobmatch-ui-locale with Path=/, a one-year max age, SameSite=Lax and Secure on HTTPS. Unknown or duplicate values fall back to Russian. This preference is not an identity or authorization input. Browser storage refusal keeps the tab usable and displays a persistence limitation.

The server layout reads only the named preference for html language and metadata. The client keeps document language, title, description, skip link, connectivity copy and manifest consistent with the current tab. Manifest variants retain the same app identity/scope/start URL and icons. Next 16.4.3 APIs were checked against [cookies](https://nextjs.org/docs/app/api-reference/functions/cookies) and [generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata).

The generic offline HTML has both translations and a local preference script. Service worker cache v2 retains exactly the four fixed public assets, requested without credentials. API replies, successful main documents, profiles and drafts never enter Cache Storage. Navigation remains network-only with a generic offline fallback. Old app-owned public asset caches are replaced; no user data cache is introduced. An evicted-cache fallback contains both languages.

Actual Next-route tests cover preference/SSR consistency, no request replay, form stages, draft preservation and offline privacy. Automated axe/mobile screenshot checks do not establish manual screen-reader or physical Android/iOS installation acceptance.

Existing consent wording/version, operator personal-data/retention decisions and frozen document templates are unchanged. English document framing/provenance and consent locale/version auditing remain separate work. This change does not establish live SMTP/recovery, provider-copy restore, own-model quality, hh.ru permissions or final release acceptance.
