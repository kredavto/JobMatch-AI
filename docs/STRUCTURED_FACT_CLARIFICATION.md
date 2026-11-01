# Guided user clarification, not AI adaptation

The profile screen includes **«Уточнить опыт по полям»** alongside the existing free-text fact input. It helps a person state distinctions explicitly; it does not extract or verify facts from documents.

Two optional workflows:
- One closed work episode: organization, personal role, start/end month. No duration arithmetic, joining of episodes, open-ended date inference or implied continuity. Continuity appears only after the separate user assertion.
- A nonnegative integer quantity: explicit personal/team/organization scope, activity, count, unit and accounting year. Scope has no default. No aggregation, rounding, percentages or inferred personal contribution. Team/organization text always retains «Не использовать как личное достижение.»; the existing conservative evidence screen excludes it from personal-skill proposals even if the user later checks the row.

Input is bounded and rejects control/hidden characters, invalid or reversed months, future periods and ambiguous integer syntax. Free-text fields remain user assertions and are not semantically verified. The renderer produces one ordinary text line, not a persistent typed-evidence record or signed provenance.

**No write during entry/preview/review.** The person reviews the exact sentence and separately clicks «Добавить как неподтверждённый факт». The existing authenticated `fact` action appends it to the master profile as `verified:false`, source «Уточнение пользователя». Existing rows stay unchanged. Confirmation of the whole new fact remains a separate existing action. No model/HH call, publication, application submission or new database contract.

Dirty profile/vacancy/goal, paused synchronization, busy state, missing owner, full fact limit, stale preview and duplicate text block submission. Owner/revision and dirty state are checked again at the request boundary. Exact new-unverified-row acknowledgement and live owner are checked **before** installing the returned workspace. Unexpected acknowledgements, conflicts and uncertain network outcomes preserve the form and require explicit resynchronization; no automatic retry. Pending submission blocks duplicate clicks. Late successful responses preserve newer profile/vacancy text drafts instead of overwriting them.

The form is local to the mounted profile panel; leaving the section or signing out discards it. This is stated in the UI. Existing free-text input, import, confirmation and immutable literal-version workflow remain available. No migration, secret, feature flag, paid service or model acceptance is introduced.
