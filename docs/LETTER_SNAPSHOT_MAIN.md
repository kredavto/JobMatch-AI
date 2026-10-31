# Reviewed local letter snapshot (main-only)

The separate **Скачать снимок письма (JSON)** action downloads an unsigned,
editable local JSON file. It is not an immutable version, server approval,
signature, model acceptance or semantic verification. TXT remains available
without consenting to source inclusion. Neither action saves or sends anything.

The JSON action requires the same current-source/dirty/paused checks and explicit
whole-letter and lexical-issue acknowledgements as TXT, plus separate consent to
include sensitive source data. Editing/restoring/regenerating text or changing
style/selection resets that consent. Immediately before either download the full
current facts and vacancy are rechecked and the original template is recomposed.

The packet includes only selected facts (including their source labels), the saved
vacancy, selection/style, generated and reviewed text, exact lexical review and
acknowledgements. It does **not** contain the whole profile, unselected facts,
owner/session data or timestamps. Keep the file private. There is no upload/import
UI or automatic storage.

`validateLetterSnapshotJson(json)` in `lib/letter-snapshot.ts` is a pure offline
validator returning a fixed error or the parsed packet. It rejects unknown nested
fields/versions, ill-formed Unicode, excess lengths/counts, duplicate fact IDs,
non-exact selections/acknowledgements, unavailable lexical coverage and altered
composition/review. Object property order and acknowledgement order are irrelevant during validation;
creation sorts acknowledgement IDs canonically. Limits are checked
before recomposition: 1 MB UTF-8 input, 5 source facts, 2,000 units per fact/source,
30,000-unit vacancy, 15,000-unit letter, existing 64-token-per-kind lexical budget.

Validation proves **only internal consistency of the supplied packet**. All
fields and approval markers are editable; coordinated edits can produce another
valid packet. It does not authenticate provenance or user identity, check current
server state, prove completeness of a profile, or discover omitted contradictions.
The full-profile check happens only during creation in the current UI. After
minimization, recomposition must also succeed against selected facts; otherwise
JSON fails closed without affecting TXT.

`main-ru-letter-81cb1a6-v1` pins the current template contract. A committed golden
fixture covers all four Russian styles; changes to composition/framing/evidence
gates require deliberate version review and a new supported version, not blind
snapshot updates. This release uses the current composer, not a permanent archive
of historical implementations. Unknown future versions fail closed. Long-term
cross-version import compatibility is not promised.

No SQL/migrations, DB/RPC changes, dependencies, AI/HH activation or model calls.
