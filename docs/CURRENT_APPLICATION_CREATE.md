# Current application creation: draft and acknowledgement

The current Root uses a shared synchronous tracker guard for creation and existing note/status/link commands. Existing API command bodies, literal titles (including whitespace), planned status, null/selected version and owner/revision fields remain unchanged. Locale does not enter the command or edit epoch.

## New-draft preservation

A monotonic local edit epoch advances on both title and resume-version selection changes. Creation captures the epoch and exact intent before awaiting the response. Only an unchanged draft is cleared after a validated ACK. Later typing, edit-then-restore (ABA), or only changing the next selected version preserves the current title and selection. A semantic notice explains that the newer draft was not submitted. Tab and locale changes do not replay or redirect the request.

The synchronous guard serializes tracker create/update handlers before React commits busy state. Busy, paused and unknown-owner contexts cannot start a tracker write. Other workspace actions and Root component bindings remain intact.

## Exact response consistency

The generic workspace schema/owner/next-revision checks still run first. Before state adoption, a creation-specific predicate requires exactly one new application ID, the exact captured title, planned status, empty note, captured existing-version link, a full offset timestamp and one matching initial planned event. Captured profile/facts/versions/goal/vacancy and existing application rows must remain structurally equal; object-key order is immaterial. Legacy omitted/null unlinked values are equivalent.

This verifies a manual tracker row, not submission to an employer, truth, or provider identity. A mismatched ACK may follow a completed server write: it preserves the draft, pauses new writes, hides rejected data, and requires an explicit current-state read. No automatic replay is introduced.

## Evidence

Two baseline current-controller cases demonstrate a late valid ACK erasing newer typing and an empty schema-valid next-revision ACK being accepted. The latter baseline stopped on the resulting disabled create button before its value/error assertions; fixed-source waiting observes the independent sign-out busy state so a deliberately paused create button is not treated as request completion. No unsupported baseline result is claimed.

The pre-existing workspace-context positive create fixture used an empty event list. It now includes the actual SQL contract's initial event; all original owner/revision assertions remain. The current SQL/command schemas were read to establish literal-title, default-note, linkage and event behavior; no migration/provider write occurred.

Tests cover exact ACK mutations, structural equality/legacy linkage, later typing/ABA/version changes, same-frame duplicate/interleaved status actions, tab/locale preservation, manual rate retry, rejected ACK and explicit read, unknown-owner refusal and mobile automated accessibility. API identities/records are synthetic. Managed local runtime is unavailable: evidence is immutable GitHub readback/leased ref updates and existing CI, not local/manual/physical-device/screen-reader acceptance.

Tracker localization/UTC dates, newer note-draft reconciliation, remaining global locale work and final operational acceptance are separate work. SMTP/recovery, real Supabase provider-copy restore/RPO/RTO, operator PD placement and qualified self-hosted model remain open. No merge/release/deploy/mail/paid infrastructure/user inference/HH write is part of this change.
