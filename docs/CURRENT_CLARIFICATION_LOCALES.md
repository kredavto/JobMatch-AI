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
Five unit/SSR cases cover copy/qualifications/scenario values, owner/limit/dirty
blocking an exact Russian v1 team line using English input, and retained U+200D refusal. All old renderer
and structured-fact browser tests remain. APIs/identities are intercepted synthetic
fixtures with reserved example.test addresses; no real email is sent.

Actual immutable CI results follow in VERIFICATION.md. The global language
selector remains OFF. Remaining editor/history/tracker/settings/analytics/offline
integration and final live/security/capacity acceptance remain open. No server
API/SQL/GRANT/flags/auth/lockfile/model/renderer/document codec changes, real email,
paid infrastructure, user LLM traffic, HH writes, main merge or release.
SMTP/live recovery, provider-copy restore/RPO/RTO, operator PD policy/placement and
qualified model remain OPEN. Historic #1/#2 approval authorizes only those merges.


CI attempt bf3869c20c8a9f817cea86ff940e0e1623e9743d: lint/types PASS, 1171 unit PASS / 1 new unit FAIL; build/browser did not run. The positive fixture used a joined emoji containing U+200D, rejected by the unchanged v1 hidden-character rule. Positive fixtures now use a permitted supplementary symbol; an explicit negative unit and a current-language browser validation check retain joiner refusal and raw invalid input. Renderer/production code and safeguards are unchanged. Corrected full CI passed as recorded below.


Фактический исправленный source #98 `5eb00282e09926534ff08ff6417304312342190f`, tree `33e13ae7bccbb297004b8ed435bb709a8c992983`, synthetic checkout `188bf945b2761872ab40ed6677c96241e1160fa3` tree-equal. [App CI](https://github.com/kredavto/JobMatch-AI/actions/runs/41359208029/job/125005730237): lint/types/build PASS;1173unit/API в83файлах PASS;261browserPASS/2liveSKIP. Все6новых controller-сценариев и5unit/SSR PASS.15релевантных source-workflows PASS; отдельный CPU diagnostic исключён из квалификации модели.11изменённых файлов immutable-readback: content и blob metadata равны ожидаемому/git tree index. Локального hash/test/build/manual visual результата нет. Production blobs между двумя CI попытками одинаковы; исправлены только fixtures/tests/docs.

[Native18restore/session/codec](https://github.com/kredavto/JobMatch-AI/actions/runs/41359207954/job/125005730145), [parser→verifiedTLS→productionAPI→compact17restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41359207963/job/125005730175), [Ops](https://github.com/kredavto/JobMatch-AI/actions/runs/41359208011/job/125005730382), [Parser/OCR](https://github.com/kredavto/JobMatch-AI/actions/runs/41359207978/job/125005730359) PASS, worker101/0skip. [ClamAV](https://github.com/kredavto/JobMatch-AI/actions/runs/41359207978/job/125005730617) PASS: engine1.4.6, loaded signed database28171(2026-11-01T06:27:34Z), observation22:52:53.613Z, refresh/reload/refusals. Логи содержат тот же synthetic checkout. Auth/HTTP bridge/data/restore синтетические; это не provider-copy/RPO/RTO/live delivery/globalSLO/unknown-threat/capacity acceptance. Renderer v1 и проверенные защищённые source/schema/auth/service/lockfile Git blobs совпадают с #97.

[PR #98](https://github.com/kredavto/JobMatch-AI/pull/98) следует за ready/unmerged #97; main merge/release не выполняются. Следом: редактор и оставшиеся экраны/даты/offline до отдельного global locale gate. SMTP/recovery/provider restore/ПД/model/final acceptance OPEN.
