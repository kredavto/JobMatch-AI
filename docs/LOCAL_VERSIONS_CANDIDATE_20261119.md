# Optional local versions: verified test Preview

Base: preview `646e879851ae3dfcbab7755152bc76dbf52a9f24`.

- Optional source/result comparison after adaptation; no new pre-adaptation gate.
- Explicit save stores an independent snapshot of source text, adapted text and letter. No profile mutation, remote storage, provider call or hh write.
- Three versions maximum; no automatic eviction. Strict schema/UUID uniqueness, 100k source, 200k result, 100k letter, 1.5M serialized-character bound, read/write symmetry and stale-tab check. This is a convenience cap, not a promise of available browser quota. The stale-tab check is optimistic, not an atomic multi-tab transaction; strictly simultaneous writes can still race.
- Delete version confirms first. Delete profile explicitly warns that versions retain source copies and need separate deletion. This independence preserves old evidence after a profile edit/deletion, at the cost of duplication.
- Browser-local, unencrypted, explicit save only; clearing site data removes versions. Not for a shared device. Original source should also be backed up separately by the user.
- Comparison reuses existing read-only copy/selection controls. Source edits invalidate the current result; saved snapshots are never reapplied to the active profile.

## Evidence

- 884 unit tests across 67 files PASS, including 7 new storage tests: exact source reload round-trip, deletion, corrupt/duplicate/oversized data, corrupt-write refusal, stale tabs, quota failure, count/field/escaped-serialization limits.
- Typecheck and lint PASS; Next build PASS.
- Three new Playwright cases passed in hosted Chromium: 390×844 save/reload/source edit/profile deletion/version deletion/no-overflow/no-resume POST; corrupt storage; quota error without false success or result loss.
- Local Playwright launch attempted with installed Chromium: failed BEFORE navigation at `process_singleton_posix.cc:297 socket() failed: Operation not permitted`. This local launch is not a product failure or a browser pass. The separate hosted run below executed the assertions successfully.
- Actual GitHub CI run [44529829707](https://github.com/kredavto/JobMatch-AI/actions/runs/44529829707), job 135579891288, source `30982393b794a25f7a1bad6d9664fe68a69a997b`: lint, types, selected unit tests, build and **20 Playwright tests PASS (9.1s)**, including all three new cases. Tests use a local build and synthetic/mock vacancy data, not real resumes or live hh. No physical smartphone installation is claimed.
- The same test SHA reached Vercel Preview READY (`dpl_5hQaC6H1ieWSAXuuAGMrv3piQ4Gk`, aliasError null). Temporary branch-specific CI push trigger removed after success; application tree unchanged by that cleanup.
- No Production, credentials, environment variable changes or external AI.
