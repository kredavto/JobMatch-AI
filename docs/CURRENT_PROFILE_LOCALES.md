# Current main profile and supplementary fact drafts

This stage follows immutable #95 `f02b20b29681fda9aa3ffa5f4033d1dba854abfb`.
The managed local runtime became unavailable during initial regression work.
No local completion is claimed. Code is read from pinned GitHub commits, saved
with leased refs in a separate branch, read back from immutable commits, and
verified by the repository's existing public GitHub CI.

## Actual red baseline

Commit `851594005a27cfcf7debdc1fc050e6e9f64e732f`, tree
`5c47cb7fb84d7e5cfa995054d6b9ea9250587fb4`, adds only two regression cases/config
and leaves production code unchanged. [App job](https://github.com/kredavto/JobMatch-AI/actions/runs/41352199608/job/124984631956):
1,155 unit tests PASS; 229 browser PASS / 2 new FAIL / 2 live SKIP.
Both failures receive an empty fact field instead of the newer text, including
an edit-and-restore ABA. Checkout `c867c9bcce61390e33cff6cde2d53465af72b6f6`
has the same tree. This is intentional baseline evidence, not a green result.

## Current-controller change

The ordinary supplementary-fact handler captures the submitted text, saved
workspace and a synchronous local edit epoch. Only an acknowledged addition may
clear the field, and only if there were no intervening edits. A same-frame
pending guard lives in the controller; the controlled main panel also guards its
own actions. Draft state remains in Root across tab changes. Language changes do
not submit, fetch, refresh, reinitialize fields, clear consent or reset selection.

The existing `addedClarification` check now also covers this ordinary fact path:
known original owner, next revision, exact original-plus-text, unchanged old facts
and exactly one new unverified `Уточнение пользователя` fact. Another owner, an
already verified fact or no addition is refused before adoption/clearing. Unknown
owner cannot submit an ordinary fact. This verifies response consistency, not
human truth, semantic rewriting or independent provider authentication. Earlier
owner-less master-save compatibility from #95 is unchanged; other mutation
response paths still need their separate context audit.

The current act/load/upload pipelines, expected-owner/revision bodies, no-replay,
session/paused-write rules, master/demo pending refs and edit/navigation epochs,
and isolated parser abort/epoch guards remain. Root's StructuredFactPanel and
its Russian v1 rendering are retained as an unchanged child slot, with an explicit
Russian language wrapper. Bulk confirmation remains the current
SkillConfirmationList with its selection, provenance matching and acknowledgement
rules; only fixed control copy gets an optional locale. Its raw fact/source/flag
metadata stays literal.

## Prepared profile/history presentation

ProfilePanel is controlled by actual Root and defaults to Russian. Its optional
locale translates the main fields/actions, explanations and history labels;
bulk controls also receive it. Only bounded copy/design references from immutable
#24 are used; its old backend/mail/profile checkbox implementation is not restored.
The import warning retains #95's saved-vacancy clearing and preserved-draft scope.

History still requires an explicit read and is validated before display.
Visible instants use explicit ru-RU/en-GB plus UTC, independent of the browser zone.
The original ISO offset remains in time.datetime and downloaded JSON.
User facts, sources, IDs, input values, original dates, ranges, model/template
metadata, frozen document framing and source hashes are not translated.
Viewing/downloading history never restores confirmations or issues a write.
The global selector stays OFF; StructuredFactPanel and remaining
editor/versions/tracker/settings/dates/offline integration are subsequent work.

## Verification boundary

Ten current-controller browser cases cover the two original regressions, normal
single acknowledgement, unknown owner, three invalid acknowledgements, retained
bulk selection/pending identity, explicit history/UTC/download and mobile
axe/overflow. Five unit/SSR cases cover qualifications, UTC/fallback and literal
values/metadata. Existing locale tests use stable associated control IDs while
retaining their original raw-data/caret/request assertions across translated labels.
All APIs and identities are intercepted synthetic fixtures. CI results are
recorded after completion in VERIFICATION.md. With no local runtime, no local
test or manual screenshot inspection is claimed.

No SQL/API/auth/GRANT/flags/lockfile/model/document codec changes, real email,
paid infrastructure, user LLM traffic, HH writes, main merge or release.
SMTP/live recovery, provider-copy restore/RPO/RTO, operator PD policy/placement,
qualified model and final live/security/capacity acceptance remain OPEN.
Historic #1/#2 approval applies only to those merges.


Recorded executable: `377d6c52dad962f19e836ee428b1369d35f9d2b7`, tree
`7625e0bea48f234bfda177419b526cd00247c43d`, [PR #96](https://github.com/kredavto/JobMatch-AI/pull/96).
[Actual app CI](https://github.com/kredavto/JobMatch-AI/actions/runs/41352955020/job/124986879229):
1,160 unit/API tests in 81 files; 239 browser PASS / 2 live SKIP; lint/types/build PASS.
All ten new current-controller cases PASS; 15 relevant source workflows PASS.
The exact jobs, baseline failures, immutable readback and runtime limits are in
VERIFICATION.md. No local/manual visual result is inferred from CI.
