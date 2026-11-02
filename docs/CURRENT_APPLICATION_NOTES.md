# Current application updates and note draft context

The current Root validates one-row note/status/link updates after the existing workspace schema, owner and exact next-revision checks. The captured row ID, literal note, status and explicit/retained version link must match. Title/created/profile/facts/versions/goal/vacancy/other rows stay structurally unchanged. Existing events remain exact when status is unchanged; a status change appends exactly one full-offset-timestamp event with the expected status, preserving its prior history. This is response consistency for a manual tracker record, not employer submission or provider identity.

The generic action handler, shared synchronous tracker guard, creation handler and creation-predicate prefix remain byte-identical. The existing API/SQL and command normalization are unchanged. No automatic retry is introduced.

## Note editing context

A per-note local edit epoch advances for typing, cancellation and explicit base acknowledgement. An exact valid update clears only its unchanged acknowledged draft. Newer typing stays literal and is rebased to the acknowledged note. ABA edits preserve their context. Cancelled drafts are never revived; independently changed bases are not overwritten.

A clean displayed note starts the next edit from the current saved note, including after an explicit read of a completed uncertain write. A genuinely dirty draft on a changed server base requires separate comparison/rebase before Save is enabled. The comparison action preserves text and sends no request; Save remains a separate explicit action. Local cancellation during a pending save is allowed with a visible explanation that it does not cancel the already submitted request.

A mismatched update ACK hides rejected data, retains the draft and pauses writes until an explicit current-state read. The server write may have completed; no automatic replay or rollback is claimed.

## Verification and limits

Two baseline current-controller tests reproduce the false conflict after a late valid save and absent rejection of a wrong-note ACK. New tests exercise unchanged/newer/ABA/cancelled drafts, changed server base and deliberate comparison, uncertain-write read, note/status/link event behavior, same-frame guard/manual rate retry, locale/filter continuity, mobile automated accessibility and exact schema-valid ACK mutations.

Managed runtime is unavailable: GitHub leased refs, immutable full-source readback/Git tree metadata and existing CI supply evidence. No local tests/hashes/manual visual/physical-device/screen-reader claim. Test API identities/records are synthetic, not live multi-account/provider/model acceptance. Tracker RU/EN/dates, remaining global locale and operational acceptance are separate work. SMTP/recovery, actual Supabase provider-copy restore/RPO/RTO, operator PD decisions, qualified self-hosted model and final live/security/capacity/device acceptance remain open. No merge/release/deploy/mail/paid infrastructure/user inference/HH writes.
