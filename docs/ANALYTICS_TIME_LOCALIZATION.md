# Analytics: recorded-time policy and presentation locales

Production remains Russian. Optional default-RU locale props prepare AnalyticsPanel and AnalyticsTimeline; no public English route/switch/detection is added. Date/version filters survive locale changes, messages/headers resolve at render, and local CSV errors use fixed semantic feedback with explicit retry. No record is written by filtering/export/localization.

## Recorded time and metrics

The former Date.parse path interpreted offset-less legacy times in the device zone, allowing the same history to produce different UTC cohorts on different devices. The new validation distinguishes explicit ISO instants, calendar-only days and recorded times with no zone.

- Explicit offset-bearing instants use their actual UTC instant.
- Calendar-only legacy records keep their established calendar-day bucket. The internal UTC midnight is only a grouping convention. Selection CSV now retains the raw calendar date rather than exporting an invented midnight instant.
- A valid recorded non-planned event without a time zone makes the application's first-event placement uncertain. The entire application is excluded from date-filtered/monthly cohorts; a later known event is not silently substituted. A notice counts these applications within the selected version scope even if date filtering hides them.
- With no date filter, valid recorded statuses still count in overall sent/response/interview metrics. Unknown time does not erase an observed status. Planned or invalid events do not create submissions. Malformed dates do not create outcomes; all original history remains unchanged.

Monthly grouping and outcome validation no longer rely on device-zone parsing. UTC date filters, inclusive periods, previous-period comparison, manual-event deduplication, version attribution and no-causality caveats remain. CSV headers explain precision; titles/statuses/created strings/version IDs stay canonical, formula escaping remains, and only first-event derived date precision changes. No database schema/migration/provider setting or source date is modified.

## Verification scope

Development uses immutable GitHub files/Git objects and expected-head ref leases because the local executor remains unavailable. CI results will be recorded after completion; no local execution is claimed. Five unit cases cover device-zone independence, day-only/offset CSV precision, invalid dates/outcomes, distinct unplaced counts and combined filters/headers/source immutability. Five actual WorkspacePage browser cases cover RU/EN filter/rate/CSV preservation, two browser zones, translated reversed-period errors and redacted CSV failures/manual retries. Existing analytics/UTC/monthly/CSV/formula/app regressions remain required.

Sources are hardcoded SYNTHETIC fixtures with intercepted service responses. An English mobile JPEG is emitted into CI logs for visual review with axe/overflow checks; no real accounts or provider data are used. This is component/derived-metric QA, not global English/Next/manual screen-reader/PWA or live acceptance. Tracker late-add/note-base preservation, status/date UI, settings/legacy ICS/offline/manifest/global locale, English document provenance, own-model evaluation/semantic rewriting, SMTP/recovery, provider-copy restore/RPO/RTO, operator data decisions and final acceptance remain open. No paid infrastructure, mail, real inference/hh.ru writes, production migration, merge or release is performed.
