# Ordinary version history and presentation locales

Production `/` still fixes Russian. Optional default-RU locale props are exercised by the existing isolated WorkspacePage fixture; no partial public English route, switch or language detection is enabled.

## Data and commands

OrdinaryVersionsPanel extracts saved history, source snapshots, provenance, text/JSON/DOCX actions and manual hh.ru transfer instructions. VersionComparison and MatchMetadataPanel use typed RU/EN copy. Version text, vacancy, evidence IDs/source text/user confirmations, stored score/rules/weights/contributions, extra JSON fields, engine/source-version IDs and canonical restore payloads stay unchanged. Existing score-comparability and bounded line-diff algorithms are unchanged. Historical summaries are not fresh analyses or evidence of improved outcomes. Missing historical metadata is not replaced with current rules.

Comparison choices use stable version IDs; locale changes do not reset them or request data. A vanished selection has an explicit empty option rather than visually implying another version. Restore has a synchronous pending guard; completion does not navigate or replace newer source drafts. Restoring creates a separate version through the existing authorized command; no hh.ru write is performed.

## Date precision

Offset-bearing ISO instants display using the existing locale-aware formatter and explicitly named UTC. Calendar-only dates display without an invented time, with a missing time/time-zone note. Offset-less or other legacy values remain verbatim with a missing-zone/no-conversion note. The renderer never interprets them in the device zone; original strings remain in JSON exports. This preserves legacy read compatibility without changing schemas or asserting an unrecorded instant.

## DOCX request lifecycle

DOCX errors store semantic keys and resolve at render; provider/exception text does not become UI. Locale changes preserve the existing request and chosen version. A change of owner/version remounts the bound request state, aborts the old read and clears timers, without replaying it. Pending guards, owner/version query binding, timeout, status handling, MIME/ZIP-header/size checks and explicit retry remain. This is a read/download lifecycle; it does not cancel server-side writes or prove provider delivery. The pre-existing ZIP signature gate is not a full structural DOCX validator.

## Verification

Development uses immutable GitHub files/Git objects and leased ref updates because the local executor remains unavailable. Results will be recorded from the existing GitHub Actions workflows after completion; no local execution is claimed. New unit cases cover explicit/legacy precision, device-zone independence and semantic status feedback. Actual WorkspacePage fixtures cover bilingual selection/metadata/provenance/TXT/JSON/clipboard, legacy missing provenance, late restore and late DOCX status/retry. A small actual ResumeDownload fixture covers owner/version change, missing owner, timeout, error-status/invalid-file handling and unexpected exception redaction. Service replies/accounts/documents are synthetic; no real providers or credentials are used.

The English mobile history fixture emits a hardcoded SYNTHETIC screenshot into CI logs for visual review, alongside axe and page-overflow checks. Surrounding coach/letters/AI/analytics/tracker/settings/legacy ICS/offline/manifest/global locale, full bilingual Next navigation, physical PWA/manual screen readers, live own-model evaluation, real SMTP/recovery, actual Supabase provider-copy restore/RPO/RTO, operator data-location/retention and final acceptance remain open. No paid infrastructure, mail, external model/hh.ru writes, production migration, merge or release is performed.
