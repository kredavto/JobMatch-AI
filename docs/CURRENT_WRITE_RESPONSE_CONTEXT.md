# Current workspace write response context

This stage follows immutable #96 `c7744dca17534002bf07da87fa03555574566cec`.
The managed local runtime remains unavailable. Source is read from pinned GitHub
commits and written through leased git refs; validation uses existing repository
GitHub CI only. No local checks or manual visual result are claimed.

## Red baseline and defect

Commit `c64b0d930bd9e42bd71e4a0f9f378b26703dab09`, tree
`8b3811cb5f37e7443c5a39bd1d00bb7c324af4c6`, adds only two tests/config.
Production code is unchanged. [App baseline](https://github.com/kredavto/JobMatch-AI/actions/runs/41355055234/job/124993224864):
1,160 unit PASS, 239 browser PASS / 2 new FAIL / 2 live SKIP.
Both new cases show that a schema-valid goal reply from another owner or an old
revision is adopted instead of refused. These are intentional red regressions.

## Uniform current-client contract

All workspace-producing commands are explicit: goal, vacancy, verify, import,
demo, fact, application, version and restore. Before sending a write, the current
client requires an identified displayed owner. The existing request body then
includes that expectedOwnerId and the submitted revision, as before.

Before adopting a successful response, validate the existing Workspace schema,
the same returned owner and exactly submitted revision + 1. Missing owner,
foreign owner, old/same/future revision or malformed body is refused before state
adoption. The failure uses fixed local RU/EN copy and existing uncertain-write
pause behavior. Drafts remain; no mutation is replayed or compensated. A refused
response does not prove that the server write failed. Explicit current-data
loading remains necessary before the next attempt.

The profile helper delegates to the common validator while preserving its
profile-specific error key. The ordinary fact's additional exact
addedClarification check remains; tuple consistency does not establish a correct
entity delta, source truth, semantic rewriting or independent provider identity.

Auth/login/refresh/logout, analysis, export and deletion receipts retain their
separate existing contracts. Delete additionally requires a known displayed
owner before sending and its UI stays disabled without one; its strict
acknowledgement still does not contain a workspace/revision. No synthetic receipt
is described as provider or deletion acceptance.

## Deliberate compatibility transition

Earlier #95/#96 allowed an owner-less master write. That current-client fallback
is retired here. Legacy snapshots still pass the unchanged read schema and can
be viewed/filtered/downloaded where already allowed. They no longer authorize
goal/master/entity writes or deletion. A fixed message asks the user to copy the
draft before reloading; no automatic draft transfer to a newly identified account,
refresh, logout or data deletion occurs. Current GET and mutation routes already
return ownerId from authenticated user.id, so no stored-data migration is needed.

Only two existing writer-fixture files gain current owner metadata (recovery and
the explicit note-save case); their request assertions now check expectedOwnerId.
Read-only legacy fixtures remain owner-less. The profile helper unit now asserts
refusal of unknown expected owner instead of the retired write compatibility.
The ordinary-fact foreign-owner assertion expects the earlier common context
refusal while retaining no-adoption/no-clear/no-replay checks.

## Scope and verification

Sixteen current-controller browser cases cover the two original regressions,
foreign owner for vacancy/verify/version/restore/application, missing/future goal
metadata, sequential goal revisions, successful next-owner replies for the other
five commands and owner-less read/write/delete refusal. Existing import/demo/fact
tests remain. Eight new unit cases cover tuple/schema/raw compatibility fields and
the explicit action policy. Full actual CI results and immutable file/tree readback
are recorded after completion in VERIFICATION.md.

No server API/SQL/RLS/GRANT/flags/auth/lockfile/model/document codec changes, real
mail, paid infrastructure, user LLM traffic, HH writes, main merge or release.
Current API expected-owner enforcement and native PostgreSQL protocols remain the
server authorization evidence; this client change is response consistency only.
SMTP/live recovery, provider-copy restore/RPO/RTO, operator PD policy/placement,
qualified model and final live/security/capacity acceptance remain OPEN.
Historic #1/#2 approval authorizes only those merges.
