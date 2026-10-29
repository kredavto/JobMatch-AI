# Rules editor: saved sources and presentation locales

Production `/` still fixes Russian. The optional RU/EN component locale is exercised only through the existing isolated test fixture; there is no new public English route, selector or language detection.

The editor names the saved profile, user confirmations and vacancy as its inputs. Its expandable context renders the saved source texts verbatim. A dirty resume or vacancy field disables rule analysis, selecting/restoring/undoing edits and saving an ordinary version. The action boundary also checks dirty sources before sending an analysis/version request. Manually restoring the exact saved fields re-enables the existing selection without an automatic request. No destructive automatic discard is introduced.

Typed copy covers rule results, category labels, source context, evidence warnings and version confirmation. Known current Russian rule reason strings map to display-only RU/EN wording after the existing rules-v1 analysis validation. Unknown future reasons remain verbatim with unspecified source language. The engine, score weights, confidence, evidence IDs and objects, vacancy quotes and source text are unchanged. Ordinary version text retains the existing frozen Russian template, including its labels. English UI explains this boundary before saving. Structured literal versions are outside this change.

A synchronous editor save guard prevents repeated clicks while pending. Late analysis/version success respects later navigation; source fields remain controlled and are not replaced by these results. The UI does not cancel an already submitted server operation. Reload/conflict and analysis-integrity gates remain in force.

## Verification scope

This change is developed through GitHub Git objects with leased branch updates because the local executor became unavailable after PR #27. Verification uses the repository's existing GitHub Actions workflows; local execution is not claimed. Runtime results and exact workflow links will be recorded after completion.

New unit tests exercise actual engine/evidence reason paths and check source/output immutability. Actual WorkspacePage component fixtures intercept service responses for RU/EN selection/history/JSON export, both dirty-source gates, late analysis, late save and conservative contradictory evidence. They do not establish real provider behavior. An English mobile axe/overflow check and screenshot use hardcoded SYNTHETIC profile data only. The test emits that synthetic screenshot to CI logs for visual inspection without a local browser; no real credentials or profile data are used.

Full bilingual Next routing, all surrounding editor panels (AI review, career coach and letters), ordinary version history/comparison/metadata, analytics/tracker/settings/ICS/offline/manifest and a public locale flow remain open. Native screen readers, physical PWA devices, live own-model evaluation, real mail delivery/recovery, actual Supabase provider-copy restore/RPO/RTO and operator data-location/retention decisions remain separate acceptance gates. No new provider calls, hh.ru writes, email delivery, paid infrastructure, merge, release or production migration is authorized by this PR.
