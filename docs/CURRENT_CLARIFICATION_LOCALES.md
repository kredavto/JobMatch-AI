# Current clarification-builder UI locales

This stage follows immutable #97 `46961ac02e39d7277886bb92160257bbacaac50d`.
The managed local runtime remains unavailable; source is read from pinned GitHub
commits, saved with leased git refs, read back from immutable content/blob trees
and verified in existing repository CI. No local or manual visual result is claimed.

## Fixed presentation, unchanged literal data

StructuredFactPanel now accepts optional UI locale (default Russian), passed by
the actual Root. The panel owns its language attribute; this overrides the old
Russian child-slot wrapper for English controls. Fixed copy has 37 UI entries and
three closed error keys. Validation/unacknowledged/synchronization feedback is
stored as a key and renders in the current language, including late replies.

The current v1 renderer in app/structured-fact.ts remains byte-identical.
The preview remains explicitly lang=ru. A visible hint says that current template
wording is Russian and changing the UI language does not translate input.
Organization/role/activity/unit data stay literal; kind/scope enum values, ISO
months, counts, years and continuity assertions are not localized or recomputed.
Language does not create tenure, sum episodes/quantities, turn a team result into
personal achievement, change document/source hashes or qualify an AI model.
It saves an ordinary unverified user-clarification line, not structured evidence.

## State and acceptance boundaries

Locale is not part of owner/revision basis, source keys, duplicate comparison,
pending identity, input change handlers or review consent. Fields, selection/caret,
literal preview and existing explicit review survive a language change. A real
field edit still invalidates preview/review. Dirty master/vacancy/goal, missing
owner, 500-fact cap, stale saved revision and duplicate raw wording still block
saving. A new current-source preparation requires a new review as before.

The pending ref still rejects duplicate submits. Working fields stay disabled.
The existing Root callback and exact addedClarification check plus #97 owner/next
revision validator remain responsible for accepting a new unverified fact.
A failed/uncertain acknowledgement retains fields and uses current-language fixed
feedback; there is no automatic retry, refresh, hidden inference or HH request.
Successful saves clear fields only through the existing acknowledged path.
Another owner gets a new constructor state; no draft/preview/consent is transferred.

Static source comparison reverses only closed local error-key/null substitutions
and finds the changed/prepare/save handlers and blocked/stale/duplicate expressions
byte-equal to #97. This is a refactor audit, not independent semantic/provider proof.

## Verification boundary

Six actual-controller browser cases cover episode/caret/preview/review/held save,
team result/unconfirmed acknowledgement, validation plus mobile axe/overflow,
dirty/newer source re-preparation, duplicate raw wording and English owner change.
Four unit/SSR cases cover copy/qualifications/scenario values, owner/limit/dirty
blocking and an exact Russian v1 team line using English input. All old renderer
and structured-fact browser tests remain. APIs/identities are intercepted synthetic
fixtures with reserved example.test addresses; no real email is sent.

Actual immutable CI results follow in VERIFICATION.md. The global language
selector remains OFF. Remaining editor/history/tracker/settings/analytics/offline
integration and final live/security/capacity acceptance remain open. No server
API/SQL/GRANT/flags/auth/lockfile/model/renderer/document codec changes, real email,
paid infrastructure, user LLM traffic, HH writes, main merge or release.
SMTP/live recovery, provider-copy restore/RPO/RTO, operator PD policy/placement and
qualified model remain OPEN. Historic #1/#2 approval authorizes only those merges.


CI attempt bf3869c20c8a9f817cea86ff940e0e1623e9743d: lint/types PASS, 1171 unit PASS / 1 new unit FAIL; build/browser did not run. The positive fixture used a joined emoji containing U+200D, rejected by the unchanged v1 hidden-character rule. Positive fixtures now use a permitted supplementary symbol; an explicit negative unit and a current-language browser validation check retain joiner refusal and raw invalid input. Renderer/production code and safeguards are unchanged. Corrected full CI follows.
