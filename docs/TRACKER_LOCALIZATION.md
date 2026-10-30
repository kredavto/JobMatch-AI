# Tracker presentation and recorded dates

This change prepares RU/EN presentation in the existing WorkspacePage locale interface. The production page still chooses Russian until the global language selector is implemented.

- Filters, linked version IDs, status values and request payloads remain canonical. Russian application statuses are persisted exactly as before; translated labels are display text. Source titles, notes and saved history are not translated or rewritten.
- A locale change does not rekey components, trigger effects, refetch or replay writes. Controlled title/version/note drafts, list filters, open saved-note details and note selection survive. Existing navigation behavior is retained: parent drafts survive; list filters reset when the list unmounts.
- Supported explicit ISO times, including basic offsets, minute precision and lowercase z, share normalization with analytics. Normalization is for calculation/display only. UTC is named explicitly. Minute records do not gain displayed seconds. Day-only records do not gain a midnight or a zone. Unsupported/unzoned values remain verbatim with an uncertainty label.
- Tracker writes remain explicit and retain the synchronous pending guard. Acknowledgements reconcile only exact submitted values and editing context. Reload-required state prevents further writes while local text remains editable.
- The legacy ICS composer, global language selector, settings, offline metadata and full live acceptance remain separate work. Component fixtures and synthetic PostgreSQL restore are not proof of live account/provider/model acceptance.
