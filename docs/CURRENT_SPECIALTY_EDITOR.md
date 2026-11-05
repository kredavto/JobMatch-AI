# Specialty tracker editor candidate — 2026-11-05

This is a newly reconstructed implementation on PR #115 base `468bbb3957a1d517ab7ebafdcfd9e44f8030e998`. The prior unpublished local candidate and its patch were unavailable after an execution-environment change. This candidate is not that old commit, and its checks must be reported independently.

## Contract

Existing application rows expose an explicit RU/EN literal specialty editor. Opening, typing, clearing the local draft and cancelling do not write. Saving sends one application command, with unchanged saved status and note, and an explicit valid label or empty-string clear. No trimming, normalization, inferred specialty or employer submission is introduced.

Drafts belong to the workspace owner and retain the exact saved property basis, including missing, empty and unknown legacy JSON metadata. An external saved-label change requires an explicit comparison/rebase before saving. Unknown legacy metadata is not silently converted by opening the editor or unrelated writes.

The shared application write guard serializes commands. Response acceptance requires the same owner, exactly the next revision and the exact intended one-row change, preserving source, links, events and unrelated data. A mismatched acknowledgement pauses writes for an explicit reload. Later typing survives a completed save; cancelled drafts are not revived. Independent note drafts remain separate. Owner-unknown workspaces remain readable but cannot write.

## Verification and limits

Results for this reconstruction are recorded in `VERIFICATION.md`. Browser execution requires a permitted Chromium runtime; a browser launch failure is not a functional test pass. No physical-device or live-provider acceptance is implied by synthetic tests.

The existing signed antivirus database freshness requirement is unchanged. A normal CI run with a genuinely fresh signed database is still required; prior successes elsewhere do not erase the recorded antivirus failure. No migration, policy weakening, production configuration, main merge or release is part of this candidate.
