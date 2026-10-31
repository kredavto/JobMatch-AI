# Cover-letter edit review: main-only stage

This stage strengthens the existing local TXT cover-letter flow without model calls, database changes or importing the unmerged stack.

Before TXT export the current facts and saved vacancy must still match the generation snapshot; the original template is recomposed again at download time. Unsaved resume/vacancy drafts and paused workspace synchronization block generation and export. Changed or revoked evidence cannot silently export an old draft. Errors are fixed messages, not raw exception text.

Every manual text change requires a whole-edit acknowledgement as well as the existing final approval. A bounded lexical audit also lists added/removed numeric expressions and selected Russian/English negation markers, including occurrence counts and Unicode code-point positions. Each listed finding must be reviewed. Editing text or changing style/selection resets approvals. Restoring the template resets them as well.

Limits: 15,000 UTF-16 units, valid Unicode, at most 64 numeric or negation tokens per side/type. Invalid, empty or over-limit text blocks export without destroying the editable draft. If the generated source exceeds the token limit, choose fewer source facts and generate again; restoring that same over-limit source cannot resolve the limit.

**Not semantic verification.** Units, roles, reordered quantities, scope and many contradictions are not detected. Identical token multisets do not prove unchanged meaning. The review does not authenticate a human, certify truth, accept a model, create immutable server provenance or rewrite prose. The current output stays exact user-approved TXT; no new JSON format, persistence, employer delivery or model/HH request is introduced.

Both existing AI/HH gates stay default-off. No SQL, migration, database/RPC, package, secret or deployment setting changes are required. The rest of the project's model acceptance, provider restore, live Auth/SMTP, localization and semantic-review requirements remain open.

Tests use synthetic sources and intercepted requests. Direct real-component fixtures are bundled with Next's existing webpack and TypeScript dependencies; no test dependency is added. Full project checks and focused recovery/guard/browser scenarios are recorded in the release verification report.
