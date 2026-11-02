# Current tracker presentation and recorded dates

Default Russian and optional English controls cover the actual current Root creation form and ApplicationList filters/cards, status history, note feedback, comparison and local cancellation. Root state/handlers are byte-identical; only view labels/attributes and the locale prop change. Locale is absent from component keys, filters, note/create edit epochs, draft bases, acknowledgements and command bodies.

## Canonical data and editing context

All seven Russian status IDs remain the API/filter/select values. Localized option labels have explicit canonical values; labels never become persisted statuses. Titles, notes, source version IDs, dates and raw saved-note text remain literal. Filter matching still uses saved title/notes with the existing AND logic; drafts are not searched or discarded by filtering.

Stable DOM selectors let the #105/#106 context tests cross languages without dropping their exact wire, acknowledgement, epoch or stale-base assertions. Conflict assertions use the actual conflict marker rather than Russian copy, so an English error cannot be hidden by a text-only selector. The existing create/update predicates, shared guard, functional note reconciliation and deliberate compare/rebase remain unchanged. Native open details and textarea selection survive locale changes.

## Recorded dates

The existing formatVersionCreated utility renders supported explicit ISO instants in named UTC with whole-second display. The creation-version picker and status history use it without changing stored values. Date-only records retain civil-day precision with a missing-time/zone label. Naive/unsupported legacy values remain literal, without device-zone conversion. The shared uncertainty copy now says the time zone is unconfirmed, avoiding an unsupported claim that no zone was saved when an unfamiliar format is shown. The formatter algorithm is unchanged; earlier history tests retain their raw-value checks and use the precise new qualifier.

ICS reminder behavior is separate and remains Russian, explicitly tagged lang=ru. Its state, UID, local-time conversion, calendar bytes and download/error handlers do not change. Global English activation, calendar localization and saved/delivered reminders remain separate work.

## Evidence and limits

Two baseline actual-controller cases demonstrate missing English controls and different calendar days for one stored offset instant on Los Angeles/Kiritimati devices. New cases cover the actual Root's locale-stable title/note caret, links, filters/details, canonical Russian API values under English labels, pending create/update, unknown ACK/read, separate English comparison, UTC/legacy precision, picker dates and mobile automated accessibility. Existing #105/#106 regression cases remain in the full suite.

Managed runtime is unavailable: immutable GitHub readback/leased refs and existing CI provide evidence, not local/manual screenshots, physical devices or screen readers. Browser API identities/records are synthetic, not live provider/model acceptance. SMTP/recovery, actual Supabase provider-copy restore/RPO/RTO, operator PD decisions, qualified self-hosted model and final operational acceptance remain open. No merge/release/deploy/mail/paid infrastructure/user inference/HH writes.
