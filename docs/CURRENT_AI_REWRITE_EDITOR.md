# Current AI rewrite review editor

Status: experimental, feature gates default-off. PR #127 introduced preview/review; #130–#132 add native immutable storage, authenticated historical reads and separate browser storage consent. PR #133 packages the actual CLI-created migration for isolated installation tests. These branches are unmerged; useful-model qualification, provider installation and operational acceptance remain open. Historical editor-only evidence is retained in VERIFICATION_AI_REWRITE_EDITOR_20261106.md; current storage evidence is in VERIFICATION_REWRITE_STORAGE_UI_20261106.md and VERIFICATION_OFFLINE_CLI_20261106.md.

## Scope and provenance

`app/ai-rewrite-editor.tsx` mounts in the current workspace editor with an owner-prefixed React key. It accepts only the current owner/revision, original résumé, vacancy and current facts. Selection is limited to verified facts whose trimmed text occurs exactly once as a whole original line; duplicate IDs, ambiguous quotes and unsupported facts are not offered. The user selects at most12 facts and an output language, then separately consents to an inference request. The server preview sends selected evidence only according to the frozen provider contract; this editor does not broaden that wire.

Each selected fact requires an explicit keep-source, accept-proposal or manual-edit choice and a separate reviewed checkbox. A refused model claim cannot be accepted as a proposal. Manual text remains user-origin text; a user's declaration does not establish factual truth. Unselected original bytes remain the full renderer's responsibility and are checked against the current original. The interface shows the whole proposed chosen document and distinguishes original, actual model proposal/refusal and manual origin. Text is React-escaped, never interpreted as markup.

The interface uses the existing bounded lexical comparison, including number/negation issues and manual-versus-actual-proposal comparison only when a proposal exists. It shows before/after evidence and requires every exact issue ID plus the current review SHA. Bounded lexical checks are not semantic validation; all current model results remain NOT ACCEPTED. A separate review confirmation request records the explicit user declaration and obtains a signed receipt. It does not save or authorize saving a version.

## Request and state boundaries

A single owner-local request mutex protects both preview and review operations. Controls are disabled while pending; handlers also enforce the guard. Every request captures owner, revision, current source, choices, requested output language and consent. Only HTTP200 with application/json is accepted; the shared response reader bounds decoding to2MiB, rejects invalid UTF-8/JSON and has a25s deadline. Fixed localized errors avoid displaying raw server diagnostic content. No automatic retry follows timeout, cancellation, error or unknown outcome.

Unchecking a request consent or leaving the active editor aborts its operation. Aborted, superseded, foreign-owner, changed-source or stale replies cannot replace current state. HTTP401/409 trigger the existing session/pause boundary. UI language may change during a pending operation without changing its captured output language or submitted data. Explicit output-language changes affect future requests.

Current draft decisions survive tab and UI-language changes while the same owner root stays mounted. Source edits pause actions; a changed source/revision or expired preview makes the old review read-only. Editing a fact clears its reviewed state and increments an epoch: undoing to exactly the earlier text still invalidates old risk/global acknowledgements. Removing and re-adding a risk acknowledgement also revokes global consent. A new successful preview can replace the current draft only through an explicit request and preserves one previous local draft for comparison, without copying decisions/consent into new evidence.

The complete preview deadline is inherited from the original signed preview and never extended by review confirmation. A timer refreshes expiry display; operation handlers check the actual clock before and after acceptance. Late responses cannot revive an expired preview. Clear explicitly discards local drafts and resets request consent/generation. Logout, owner change and reload remove all editor drafts. No localStorage/sessionStorage/cache/IndexedDB persistence is added; there is no crash/reload recovery promise. Pending request cancellation and stale-result guards are separate from retaining an already entered local manual draft.

## Client consistency versus authenticated review

`lib/ai-rewrite-review-ui.ts` strictly validates response wrappers, exact owner/revision, original source/layout, selected fact IDs, requested language, nested preview equality, review choices, reconstructed full text, review digest, receipt key ID and inherited expiry. It rejects extra fields, mismatched source/proposals/acknowledgements and tampered full review structure.

These browser checks do not verify HMAC. The browser has no signing key. A structurally consistent forged MAC can pass a browser decoder and still fail the server's authenticated verifier; an explicit unit test preserves that distinction. The existing server review route verifies the current preview MAC and source/config/key/expiry, obtains a fresh owner read before and after work, and signs the review under a separate domain. Current-context verification is not a historical restore policy.

A successful review message says confirmation received; the separate storage card reports storage outcome. It never asserts that no write occurred after an unknown acknowledgement. A review receipt alone does not authorize storage. The editor never silently places chosen text in the ordinary version form or changes master profile/facts/goal. HH writes and model-dependent export remain outside this editor.

## Accessibility, localization and verification boundary

RU/EN copy lives in `lib/i18n/ai-rewrite-editor.ts`. Native labels/fieldsets/legends, stable unique DOM IDs, escaped evidence and responsive minimum widths support keyboard and narrow-screen use. Automated English mobile axe reports zero violations and no horizontal overflow; a screenshot was inspected. This is not manual screen-reader, physical-device or full WCAG acceptance.

The original26 and10 added storage browser cases execute the actual current React root but use authored public synthetic data and stub Auth/API/model/DB replies. Fixture receipts use real signing helpers with public fixture-only keys. They test UI state, provenance display and request boundaries, not a real model or live Auth. Separate owned PG17 and actual HTTP-to-SQL evidence appears in the native/HTTP/storage journals.

## Separate immutable storage

Storage requires explicit STORE_REVIEWED_AI_REWRITE consent after confirmed chosen text, plus the default-off storage flag and native current receipt/key/config/source/deadline checks under the owner lock. One write is sent; timeout/cancellation/invalid or lost acknowledgement remains outcome-unknown, without replay. A persistent owner-local attempt permits an explicit exact-nonce historical read across navigation/locales; it never silently adopts the master workspace. Logout discards local private state. Root adopts a valid exact acknowledgement by appending only the immutable version/revision and preserving master data/drafts.

Reserved AI metadata is accepted only from a native protected read in the same SQL snapshot as its readiness check. Frozen historical decoding does not claim current HMAC verification or semantic truth. History/export/ID-only restore preserve original source, receipt, acceptance time and manual/model origins even after key rotation, feature disable or expiry. Rules scores describe saved facts, not generated-text quality. The CLI-packaged migration and closed rollback retain immutable history and refuse effective legacy write bypasses. No production migration, key/config activation or future merge/release permission is implied.
