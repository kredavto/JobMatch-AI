# Specialty tracker editor candidate — 2026-11-05

The current tracker editor is implemented on the explicit specialty API/SQL protocol in PR #115. Labels remain manual metadata; they are not inferred from resumes or job titles.

## Contract

Existing application rows expose an explicit RU/EN literal specialty editor. Opening, typing, clearing the local draft and cancelling do not write. Saving sends one application command, with unchanged saved status and note, and an explicit valid label or empty-string clear. No trimming, normalization, inferred specialty or employer submission is introduced.

Drafts belong to the workspace owner and retain the exact saved property basis, including missing, empty and unknown legacy JSON metadata. An external saved-label change requires an explicit comparison/rebase before saving. Unknown legacy metadata is not silently converted by opening the editor or unrelated writes.

The shared application write guard serializes commands. Response acceptance requires the same owner, exactly the next revision and the exact intended one-row change, preserving source, links, events and unrelated data. A mismatched acknowledgement pauses writes for an explicit reload. Later typing survives a completed save; cancelled drafts are not revived. Independent note drafts remain separate. Owner-unknown workspaces remain readable but cannot write.

## Verification and limits

Exact source results are recorded in [VERIFICATION_SPECIALTY_EDITOR_20261105](VERIFICATION_SPECIALTY_EDITOR_20261105.md): 1441 unit tests/98 files and 439 browser tests PASS, 2 live-account tests SKIP, all 17 source workflows successful. The 14 new editor and 11 existing note scenarios pass, including mobile automated axe/overflow and keyboard focus. No independent physical-device, visual, screen-reader or live-provider acceptance is implied.

The existing signed antivirus freshness requirement is unchanged. Normal CI run41990276094/job127120595392 passed with database28174 (2026-11-05T06:26:24Z, observed07:54:00.676Z). The earlier #115 stale-database failure remains historical. No migration, policy weakening, production configuration, main merge or release is part of this candidate.
