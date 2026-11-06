# Current AI rewrite review editor

Status: experimental, feature gates default-off. PR #127 stacks on #126; accepted source `8a297b013bc73bbd3f0b57cb21029fbc4eb165a0`. This is a browser interface to the existing preview/review contracts, not immutable reviewed-version storage, a useful-model qualification or operational acceptance.

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

A successful message says confirmation received and no version saved. The editor never calls ordinary version-save, profile/score mutation, HH writes or model-dependent export. Its chosen text is not silently placed in the ordinary literal-version form. No new schema, migration, stored metadata tag, API endpoint or production flag is introduced here.

## Accessibility, localization and verification boundary

RU/EN copy lives in `lib/i18n/ai-rewrite-editor.ts`. Native labels/fieldsets/legends, stable unique DOM IDs, escaped evidence and responsive minimum widths support keyboard and narrow-screen use. Automated English mobile axe reports zero violations and no horizontal overflow; a screenshot was inspected. This is not manual screen-reader, physical-device or full WCAG acceptance.

The26 browser cases execute the actual current React root but use authored public synthetic data and stub Auth/API/model/DB replies. Fixture receipts use real signing helpers with public fixture-only keys. They test UI state, provenance display and request boundaries, not a real model, live Auth or native persistence. Server and owned native regression evidence is recorded separately in VERIFICATION_AI_REWRITE_EDITOR_20261106.md.

## Next write block

Immutable reviewed-version storage must add a separate explicit storage consent and a normalized command with authenticated current receipt verification, deadline/source/config checks under the owner lock, caps/nonce idempotence and exact acknowledgement/manual reconciliation without automatic replay. Trusted metadata must be rejected by every legacy forgery route. Mixed old/new history, export, historical restore/key rotation/feature disable, concurrency, revoked waiters, fault rollback/reapply and populated native20table restore remain necessary before an editor Save action is connected. No such persistence is accepted by this PR.
