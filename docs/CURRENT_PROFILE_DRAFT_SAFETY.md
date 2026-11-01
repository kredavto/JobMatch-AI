# Current demo and master-profile save safety

This stage follows immutable PR #94 `4d2fa712b3cadcdcb3d7f228cbd7f4e663be9e8e`.
It fixes the actual current WorkspacePage/controller, not the older Root from the
localization reference PR #27. The initial three regression cases fail against #94:
demo is available over an unsaved resume; a late master save clears newer vacancy
text and replaces newer resume text; a late demo replaces an edited-then-cleared
resume and forces navigation away from the chosen settings tab.

## Submit and response boundaries

- Demo is blocked in the view and controller if the saved profile has original
  text/facts, any resume/vacancy/goal field is dirty, the owner is unknown, writes
  are paused or another operation is busy. This is a client preservation guard,
  not a new server permission policy. The existing API's explicit demo operation
  still replaces original text/facts and vacancy under its current SQL contract.
- Master save and demo share a synchronous controller pending ref; the controlled
  overview has its own pending ref. Same-frame submit/clicks cannot send the same
  profile write twice. After a definitive rejection, a retry remains explicit.
- Before adopting either response, `validatedProfileWrite` validates the current
  Workspace schema and exactly `submitted revision + 1`. When the submitted owner
  is known, the returned owner must match, including refusal of a missing owner.
  This catches context mismatch; it is not semantic validation of every fact or
  independent verification of provider authentication.
- The existing optional-owner legacy workspace shape remains compatible for master
  saves: without an initial owner, only schema and next revision are checked. Demo
  requires a known owner. This does not attest ownership of a legacy owner-less
  response. Other mutation response paths remain outside this new helper's scope.
- A rejected/missing response does not establish that the write failed on the
  server. Drafts stay, writes pause according to the existing status rules, and
  the user must load current data before the next write. There is no replay,
  compensating write, rollback claim or automatic merge.

## Draft and navigation behavior

Resume and vacancy edit epochs distinguish edits made while a request is pending,
including edit-and-restore/clear ABA sequences. The existing resume/parser epoch is
retained; vacancy edits have a separate epoch. A pre-existing unsaved vacancy is
also kept during master save. Unedited fields adopt the acknowledged server text.
Goal remains local as before, with an explicit dirty/edit check for comparison
feedback. The current server contract still clears the saved vacancy on a master
import; the profile hint now states this. The change does not alter that SQL rule.

When any draft is preserved, a fixed bilingual acknowledgement says that data was
saved on the server and local text remains, and exposes the existing server-text
comparison. It does not say that nothing was saved. Source-profile/version gates
continue to use the actual current saved original/revision and local dirty state.

An explicit navigation epoch protects tab choice during demo. A same-tab language
change does not count as navigation. A user trip away from and back to Overview
still prevents late automatic navigation. A successful demo without navigation
keeps the existing transition to Profile. Other action-specific navigation and
other input fields are not claimed to be covered by this profile-write change.

## Prepared localization

The overview is a controlled, optional-locale component with Russian default;
only its bounded view/copy design is adapted from immutable PR #27. Current
backend/parser/profile contracts are retained. Counts still derive from current
user confirmations and manually recorded Russian status values; a caption makes
clear that they do not verify hh.ru submissions or responses. Demo content stays
in Russian and is not translated. The already localized current VacancyPanel now
receives the prepared Root locale, preserving its current HH preview-only and
source/dirty guards; no old HH client or localization copy is substituted.

The global language selector stays OFF. Remaining profile/editor/versions/tracker/
settings/dates/offline and further component integration are subsequent work.
No user data, source ranges, source hash, frozen document framing or model version
is rewritten by changing presentation locale.

## Verification and open acceptance

The owned loopback fixture mounts the actual WorkspacePage and current panels.
All APIs/identities are intercepted synthetic fixtures; no email/provider/model
traffic occurs. Fifteen new browser cases cover the original three regressions,
all three dirty fields, owner-unknown refusal, same-frame submits, language and tab
round trips, pre-existing vacancy draft, known-owner/missing-owner/revision refusal,
normal save, explicit retry, late goal and mobile axe/overflow. Eight unit/SSR cases
cover the response contract, explicit legacy compatibility and actual overview
copy/counts. The earlier current workspace locale test now expects the prepared
English VacancyPanel label; its raw draft assertion remains unchanged.

Actual full-tree results and immutable CI jobs are recorded in VERIFICATION.md.
SQL/API/auth/GRANT/flags/lockfile/model/document codecs remain unchanged. SMTP/live
recovery, provider-copy restore/RPO/RTO, operator PD policy/placement, HH permissions,
qualified model and final live/security/capacity acceptance remain OPEN. Historic
#1/#2 approval authorizes only those merges; no merge/release is done here.


Recorded executable: `5a136f6ef3eeb90fcb9a2a883dbd8e465514763b`, tree
`bda6feba27e4a3382ba383f6ae8dccace2877400`, [PR #95](https://github.com/kredavto/JobMatch-AI/pull/95).
[Actual current-tree app job](https://github.com/kredavto/JobMatch-AI/actions/runs/41350486284/job/124979380313):
1,155 unit/API tests in 80 files; 229 browser PASS / 2 live SKIP; lint/types/build PASS.
Twelve current PostgreSQL protocols, ops and isolated parser workflows also PASS.
See VERIFICATION.md for exact jobs and explicit synthetic/live acceptance limits.


Current follow-up: [write response context](CURRENT_WRITE_RESPONSE_CONTEXT.md) retires
owner-less writes in the current client. Earlier compatibility statements above
record the pinned historical stage only. Legacy reads remain available; writes
now require the displayed owner and the next same-owner revision. No server API
or saved-data migration is involved.
