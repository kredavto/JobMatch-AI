# Settings: locale and owner boundaries

The SettingsPanel accepts the existing locale interface and defaults to Russian. A locale change preserves the canonical deletion confirmation УДАЛИТЬ and pending action identity; it does not send requests or recreate component state.

The main JSON archive and four existing same-origin export links still form five separate files. NDJSON completion markers and existing limits are explained in both languages; this is not a single transactional backup.

Exports and account deletion require a known UUID owner and synchronized workspace. All four links carry the exact expectedOwnerId query. Missing identity or a paused workspace renders inactive text rather than an unbound download link. The action handler also enforces known owner/synchronization before HTTP, and a shared synchronous component guard prevents duplicate export/deletion requests.

The main archive must pass the existing ExportSchema and match the requested owner in user.id and, when present, workspace.ownerId before the client creates a file. A mismatch pauses further actions and requires a manual read of current data. No automatic retry is introduced. Existing server identity, authorization and streaming validation remain authoritative.

The settings copy describes configurable AI and isolated parser/OCR without asserting deployment or live acceptance. It does not hardcode a hosting country or establish the operator's personal-data/backup-retention decisions. Rules remain conservative; semantic rewriting, live model quality, real SMTP/recovery, provider-copy restore and final operational acceptance remain open.

Tests use synthetic service/archive data and intercepted deletion acknowledgements. No real account was deleted or external message sent. Global language selection/offline/manifest and full bilingual/live acceptance remain separate work.
