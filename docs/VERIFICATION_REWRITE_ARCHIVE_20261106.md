# Reviewed rewrite archive codec — 2026-11-06


## 2026-11-06 — PR #129: frozen structural history codec for reviewed rewrites

Fresh main/four plans/open PR inventory remains the observed a3a9ef0c69e1e760010fc391234d66cd4a747e3b; no main mutation. #128 final fb06a23d06a68a5a7015b0a045d9e9df5898261b has all20 final workflows SUCCESS and is ready/unmerged. #129 https://github.com/kredavto/JobMatch-AI/pull/129 is stacked on it in separate feat/rewrite-archive-codec-20261106. Accepted source `2085e4a6a3d5b4cd25c5e8b95cb8951be79272fe`, tree `879a1877a7ae674aec222aae6f5830fa41b91fb3`;5 code/test files immutable-readback verified and local Git tree identical.

Added shared frozen structural review-receipt decoder and prepared strict jobmatch-ai-rewrite-archive-v1 codec. Binds full original bytes/code-point ranges/selected evidence/complete rendered text, proposal versus manual/source origins, every decision/risk/global ACK and inherited nested deadline/key identity. Nested review issue time cannot precede preview issue by more than the existing5s clock allowance. Archive bounds original100000 code points and serialized UTF8 to1MiB; digest covers exact payload AND signature under a distinct hash prefix. Canonical original acceptedAt must lie inside the original signed acceptance interval. Literal v1 prompt STRING SHA e531f3a6d343ae61773928fc6e2d3aec58aa2804af2e34e01ad039bbf2d48a7f is frozen explicitly; ff51… is the source-file hash, not the string hash.

Historical reading does not consult current time/key/config/feature flags, call a network service, refresh TTL, regenerate proposals or claim semantic/model acceptance. Stored acceptance labels are assertions only: self-consistent invented JSON/digests can pass structural reading while current real HMAC verification rejects them. The codec is not a storage authorization gate or authenticated file import. Current server verification still checks the outer HMAC BEFORE structural work and separately verifies nested MAC/current owner/source/config/key/deadline; UI checks captured-response consistency, never MAC. Common decoder removes duplicated browser/server payload schemas without weakening current acceptance.

49 new tests PASS;133 focused archive/signer/UI tests across3files PASS; local26 current-root Chromium/Vite browser scenarios PASS, including mobile automated axe/overflow/races. Auth/model/DB replies are authored fixtures; real signatures use public fixture keys. Local types/focused lint/diff PASS. No local pinned Next16.4.5 build/clean dependency-graph claim with the reused16.4.3 cache.

All19 triggered accepted-source workflows independently observed SUCCESS. Canonical app42207057776/job127856235040: clean install/graph/lint/types,1877unit/115files, pinned Next16.4.5 build,513browserPASS/2liveSKIP. Native source42207058237/job127856236653:119Python/existing PG17 wire/owner/session/concurrency/false-lost committed ACK/manual reconciliation/rollback/reapply/20table synthetic native restore PASS. This does not test new rewrite persistence or Supabase provider-copy recovery.

Actual rewrite CPU42207058008/job127856235761:6 positive-token responses/282tokens, all7 claims REFUSED,0changed, NOT ACCEPTED. Older adaptation42207058150/job127856235934:16responses/1074tokens/0gold, NOT ACCEPTED. No semantic/independent held-out assessment performed. Prompt/corpus/resources/thresholds unchanged; no output-driven retuning and no raw report replacement.

Final evidence commit is Markdown-only; executable source/tests/workflows remain identical to accepted source. Final-head CI is tracked separately. Contract/full workflow inventory: docs/VERIFICATION_REWRITE_ARCHIVE_20261106.md.

Next internal block: dedicated native acceptance under owner lock, both MACs/current source/config/key/deadline, separate STORE_REVIEWED_AI_REWRITE consent, first-install trusted-metadata collision preflight and legacy writer guard, immutable normalized version/audit/CAS/cap/idempotent ACK, historical restore when disabled/rotated/expired and populated native rollback/reapply/20table restore. Then connect normalized HTTP save/read/result validation and explicit editor storage consent. This codec creates no table/writer/route or new trusted persisted tag; existing history is not retroactively promoted. SQL currently being prepared separately is unaccepted until native execution. Prior Supabase CLI automatic-review refusal over possible PostHog telemetry is respected; no CLI retry/provider query/migration packaging claimed.

Baseline0.34.0/b05c45d0 and scoped explicit historical #1/#2 merges retained. No later merge/release/deploy/liveDB/key/flag/mail/HHwrite/user-data externalLLM/paid infrastructure. Useful model, independent semantics/held-out, agreed real SMTP/recovery, actual Supabase provider-copy restore, operator PD placement/retention and final independent security/capacity/manual/device/live acceptance OPEN. Full project incomplete; internal work remains, automation continues.


## Contract boundaries

`decodeRewriteReviewReceipt` is a frozen structural v1 reader using only the supplied original and receipt. It rebinds the exact selected whole-line quotations and full original hash/length, derives the full reviewed rendering, origins, bounded lexical reports and every acknowledged issue/digest again. It checks nested key IDs/deadlines and review-issued lower bound. It does not verify either HMAC or current clock. Current server verifier retains both actual HMAC checks plus current owner/source/config/key/time; archive validation must never substitute for it during acceptance.

`validateRewriteArchive` accepts only the proposed v1 shape and declared non-acceptance/semantic-not-performed/user-declared-only markers. It checks owner, original, original acceptedAt, exact receipt-integrity digest and explicit literal prompt hash. It has no writer or automatic migration/registration in old workspace metadata. A compatible local file is not an authenticated database record. The “verified at storage acceptance” labels are stored assertions to be emitted only by a future accepted native writer; this reader cannot prove them.

The digest is SHA256 of UTF8 `jobmatch-ai-rewrite-archive-receipt-v1\n` + exact raw review payload + LF +64-character signature. It detects accidental signature corruption as well as payload changes. It is not a keyed MAC. A test deliberately changes the signature and recomputes this digest: structural validation can pass, and the real current server MAC verifier rejects it. A second test builds an entirely consistent invented manual review with900reports and recomputes all structural digests: it still cannot pass the current server MAC check. This prevents structural imports being misrepresented as verified storage, truth or model quality.

Current signer and browser confirmation share the new decoder. Browser confirmation still checks the captured expected preview, source/current owner/revision, choices and ACKs; it gains no signing secret. Current server first authenticates outer MAC, then validates structure and nested/current basis. Expired receipts remain invalid for current verification, even though a previously accepted archive assertion can be structurally read after expiry/rotation/config change/disable. No deadline is refreshed.

V1 prompt/renderer/review semantics are frozen. Changes require a separately versioned protocol and explicit historical dispatcher; mutating the v1 system prompt in place fails the archive's literal-hash test. Historical output is the original stored rendering, not a newly evaluated model output.

## Verification

49 new cases: source/proposal/manual rendering and origins; refused proposal versus manual render instruction; no current clock/key/config/flags/network for old history; current verifier rejection after expiry/rotation/source change; strict archive owner/format/labels/consent/unknown fields/time/digest/Unicode/length; full unselected and ranged bytes/CRLF/whitespace; original acceptance interval; critical nested/decision/render/origin/ACK/digest corruption despite recomputed integrity digest; future nested tags/lifecycle; self-consistent forgery distinction; serialized UTF8 cap before nested parse; long control-character IDs and exact issue IDs; no expiry refresh.

Focused local133/3files and actual current-root26browser tests PASS; types/lint/diff PASS. No physical device/manual accessibility/live Auth/model/DB acceptance is claimed. Hosted source app independently ran1877tests/115files and513browserPASS/2liveSKIP on clean pinned dependencies. Existing native suites operate owned PG17 only and are not new persistence or hosted restore proof.

## Accepted-source workflow inventory

All19 runs below are independently completed SUCCESS on `2085e4a6a3d5b4cd25c5e8b95cb8951be79272fe`; untriggered workflows are not passes. Final documentation-head results are a separate observation.

| Workflow/run | Conclusion |
| --- | --- |
| [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/42207057928) | SUCCESS |
| [Rewrite diagnostic harness](https://github.com/kredavto/JobMatch-AI/actions/runs/42207058032) | SUCCESS |
| [Mirror rollback compatibility — Current canonical reads PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42207058090) | SUCCESS |
| [Synthetic source-profile PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42207057979) | SUCCESS |
| [Current application commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42207057770) | SUCCESS |
| [Mirror rollback compatibility — Current projection parity PostgreSQL preflight](https://github.com/kredavto/JobMatch-AI/actions/runs/42207057810) | SUCCESS |
| [Current persisted reminder PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42207058074) | SUCCESS |
| [Mirror rollback compatibility — Current logical backup PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42207057815) | SUCCESS |
| [Current profile commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42207057804) | SUCCESS |
| [Current compact storage PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42207057763) | SUCCESS |
| [Current version commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42207058060) | SUCCESS |
| [Current literal source versions PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42207058237) | SUCCESS |
| [Mirror rollback compatibility — Current explicit writes PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42207057849) | SUCCESS |
| [Synthetic saved-letter PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42207057955) | SUCCESS |
| [Parser TLS API compact PostgreSQL integration](https://github.com/kredavto/JobMatch-AI/actions/runs/42207057993) | SUCCESS |
| [Isolated document parser](https://github.com/kredavto/JobMatch-AI/actions/runs/42207057910) | SUCCESS |
| [Exact-main adaptation CPU diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/42207058150) | SUCCESS |
| [Owned rewrite CPU diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/42207058008) | SUCCESS |
| [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/42207057776) | SUCCESS |
