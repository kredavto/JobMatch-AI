# Server letter UI candidate

Dependency: [PR #72](https://github.com/kredavto/JobMatch-AI/pull/72), immutable
head `9a7fc6052e8d7c872fe1c41c1ff603037c0c7a6d`. Current main remains
`a3a9ef0c69e1e760010fc391234d66cd4a747e3b`; the backend has not been merged or
applied to production. This child implements UI against that explicit dependency,
not against the old unmerged migration stack. No SQL, key, environment setting,
package dependency, merge or release is changed here.

## User actions and data boundary

The cover-letter editor remains a literal RU template plus the existing bounded
lexical review. Selected facts, whole-letter review and each manual-edit finding
must be acknowledged before server storage controls become available. The user
then explicitly reads letter history, grants separate consent to sending selected
sources/vacancy to the application and their later storage, requests a server
preview, inspects its exact text/sources and separately accepts that preview.
Local JSON source inclusion and server storage have independent consent controls.
Nothing is requested during render, typing or review. No model, employer, HH or
mail service is contacted by these controls. Preview does not create a version.

The backend's default-off flag/key requirements remain unchanged. A 503 leaves
local TXT/JSON available. This UI cannot activate storage. Operator data placement,
retention and key-bearing backup decisions still need separate approval.

The client validates the complete preview envelope, frozen v1 snapshot, selected
source/review/acknowledgement bytes, owner, workspace/letter revisions and original
UTF-8 hash against its captured current draft. It does **not** verify HMAC in the
browser or establish factual truth. The backend/native acceptance in #72 owns MAC,
current-source and transaction checks. `semanticAssessment: not-performed` and
`modelVersion: null` remain explicit; rejected models #66–#69 stay rejected.

## Draft and request lifetime

Source, owner/revision, profile/vacancy/goal dirty state, busy/paused state, draft,
review or storage-consent changes invalidate pending previews and separate
acceptance. Forms remount on those context changes; returning to an earlier text
or unpausing cannot revive an old storage consent. A 600-second monotonic deadline,
absolute expiry and wall-clock rollback checks bound previews; observed expiry
latches and clears acceptance. Only an explicit fresh preview can replace it.

Each active operation has a synchronous request guard; double clicks cannot send
two accepts. No read/write retry is automatic. Unmount/logout abort and discard
late UI results; an already submitted database write can still finish. A late
valid acceptance only adds the captured historical version, never replaces newer
text, profile, facts or score. Malformed or foreign acknowledgements do not commit
history state. Failed/unknown acceptance blocks another save until explicit
history reconciliation; its in-memory receipt is retained for exact comparison.

History reconciliation checks owner, complete contiguous metadata, nonregression
and immutability of previously read metadata. If the attempted ID is present, it
reads that record and checks checksum, metadata and the exact receipt bytes before
confirming that attempt. A missing ID is described only as absent in the history
just read: an in-flight operation might still finish. It is not called a definitive
failed write. No pending receipt is replayed. Any new save requires a new preview
and explicit acceptance, with native revision checks still authoritative.

Same-owner profile reload no longer removes the letter editor when analysis is
cleared. It preserves its text in memory and blocks writes when source facts or
vacancy differ. The user can inspect/copy the old text and prepare/review a new
letter explicitly. Leaving the editor, logout or page reload discards the local
draft; no browser disk/offline persistence is added. Owner changes remount all
letter state. Session/revision errors open the existing app recovery flow without
performing another write.

## Historical reads and exports

“My versions” has a standalone history reader; it needs no new analysis or draft
and remains useful with the signing/write gate off. History and individual record
reads are explicit and owner-bound. Reads never populate the current editable
letter or restore historical confirmations into the profile.

Historical JSON/TXT downloads validate the archived record/checksum against its
metadata before creating a file. JSON explicitly includes sensitive selected
sources and the vacancy; it is editable and not an independent offline signature
attestation. HTTP errors, malformed UTF-8/JSON and responses over 2,100,000 bytes
produce fixed errors; upstream diagnostics are never rendered. The complete
NDJSON archive link and three-file archive instructions from #72 remain available
in settings; an absent/false terminal completion marker means incomplete export.

## Verification boundary

Local checks: 737 unit/route tests (34 new client tests), 30 Python tests,
lint/types/build PASS. Full Playwright: 140 PASS / 2 live-account SKIP, including
24 new server-letter scenarios. New browser tests use controlled API responses
with actual Node-issued synthetic receipts; they are **not** an authenticated
Supabase delivery/storage acceptance. Mobile axe/overflow passed and the 390px
preview screenshot was inspected. Native migration/RPC/restore evidence remains
separate in #72; unchanged backend regression CI is also requested for this child.

Scenarios cover independent consent, exact preview and explicit save, double
click, dropped persisted reply, absent uncertain attempt, corrupt reconciliation,
malformed/foreign acknowledgement, owner/source/expiry drift, 401/409/429/503,
late preview after edits, late acceptance preserving newer text, logout,
source reload, dirty goal, history without analysis, verified downloads, 50-version
UI bound, monotonic expiry/clock rollback, lexical acknowledgements and mobile
accessibility. Initial browser failures were incorrect article/region and auth
mode locators; corrected tests did not weaken runtime guards. Source review
also identified draft loss when clearing analysis; the editor lifetime was fixed
and covered before the complete passing run.

Model/semantic/held-out acceptance, real SMTP/password recovery, real Supabase
backup/RPO/RTO, operator PD decisions and full production acceptance remain open.
See VERIFICATION.md and PR checks for immutable CI results, not just this configured
test plan.

Executed remote proof for [PR #73](https://github.com/kredavto/JobMatch-AI/pull/73):
source `ffd8ae6e90fc63e6ffa982f4d54b48941cb7d50d`, tree
`3c88dd0cd7308c746b51ac85bba8ee783bdc13b7`.
[Application](https://github.com/kredavto/JobMatch-AI/actions/runs/41289092891/job/124796422006)
repeated 737 unit/140 browser PASS with 2 live SKIP, lint/types/build PASS.
[Native regression](https://github.com/kredavto/JobMatch-AI/actions/runs/41289092910/job/124796422189)
repeated 30 Python and the unchanged backend's PG17/15-table synthetic drill.
These do not establish provider or model acceptance. The following documentation
commit changes no executable files; its CPU docs-only scope is not fresh inference.
