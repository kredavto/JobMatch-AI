# Optional local versions: candidate, not deployed

Base: preview `646e879851ae3dfcbab7755152bc76dbf52a9f24`.

- Optional source/result comparison after adaptation; no new pre-adaptation gate.
- Explicit save stores an independent snapshot of source text, adapted text and letter. No profile mutation, remote storage, provider call or hh write.
- Three versions maximum; no automatic eviction. Strict schema/UUID uniqueness, 100k source, 200k result, 100k letter, 1.5M serialized-character bound, read/write symmetry and stale-tab check. This is a convenience cap, not a promise of available browser quota.
- Delete version confirms first. Delete profile explicitly warns that versions retain source copies and need separate deletion. This independence preserves old evidence after a profile edit/deletion, at the cost of duplication.
- Browser-local, unencrypted, explicit save only; clearing site data removes versions. Not for a shared device. Original source should also be backed up separately by the user.
- Comparison reuses existing read-only copy/selection controls. Source edits invalidate the current result; saved snapshots are never reapplied to the active profile.

## Evidence

- 884 unit tests across 67 files PASS, including 7 new storage tests: exact source reload round-trip, deletion, corrupt/duplicate/oversized data, corrupt-write refusal, stale tabs, quota failure, count/field/escaped-serialization limits.
- Typecheck and lint PASS; Next build PASS.
- Three new Playwright cases are authored: 390×844 save/reload/source edit/profile deletion/version deletion/no-overflow/no-resume POST; corrupt storage; quota error without false success or result loss.
- Local Playwright launch attempted with installed Chromium: failed BEFORE navigation at `process_singleton_posix.cc:297 socket() failed: Operation not permitted`. These browser assertions remain unverified. Do not count them as passed or reuse the previous baseline CI success as evidence for this candidate.
- No push, GitHub CI dispatch, deployment, Production change, credentials or external AI.
