# Current editor: saved context and UI locales

This block follows #98 `61aed851a6052554bb63586976ba0ee2c904cbbe`.
It applies to the actual current WorkspacePage, not the older #28 branch.
Fresh main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, four plans/log and 88 open PRs were reviewed.
The managed local runtime is unavailable. Only pinned GitHub files, leased git
refs, immutable content/blob readback and existing CI are used; no local or manual
visual verification is claimed.

## Saved context owns actions

An accepted rules analysis now retains its requested owner/revision and saved
original/vacancy/facts in Root. The existing exact rules-v1 analysis validator is
unchanged. Source details and preview refer to that snapshot, not a newer draft.
Changing the UI language neither invalidates nor refreshes analysis.

Selecting edits, restore-original, undo and version save are blocked while busy,
paused, dirty in resume/vacancy/goal, or the accepted analysis belongs to another
owner/revision. Root handlers and the request entry point guard actions as well as
native disabled controls. An in-memory ref excludes duplicate analyze/version
requests in the same tick. A known owner is still required for version writes by
#97; legacy read/analysis shape is not migrated or newly authorized for writes.

A successfully saved goal changes revision and requires fresh analysis even if
the rule output would happen to be equal. A failed/uncertain write pauses actions
without automatic replay or erasing selection/history/preview. New analysis and
existing reload/login/logout/profile mutation paths clear their analysis basis.
Version save still sends only selected IDs, displayed revision and expected owner,
with the existing same-owner/next-revision response validator. This is not full
entity-delta validation or a new provider acceptance claim.

Analysis and version-save replies respect the navigation epoch captured before
the request. A later tab change, including away-and-back, prevents automatic
navigation after ACK. Current-context analysis may still be opened manually.

## Presentation and literal boundaries

ResumeEditorPanel is a controlled view. Root owns selection, undo history, source
basis, pending ref, request body, validation and navigation. No locale key remounts
the view or enters API bodies, source identity, analysis, scores, thresholds,
evidence IDs, document text, persistence or consent.

Optional locale defaults to Russian. Fixed controls, match labels, formula,
category labels and eleven recognized rule/evidence explanations have RU/EN
presentation. Unknown explanation text is preserved verbatim and escaped by React;
it is not interpreted as a protocol code or translated by substring matching.
The engine, evidenceIssue, parse/propose/gate/renderVersion and analysis-response
validator remain unchanged. Showing translated rule wording does not improve
heuristic confidence or establish semantic/AI/document verification.

Resume/facts/source labels/vacancy quotes remain literal, with neutral data lang.
The v1 rendered preview stays explicitly Russian with a visible template hint.
The score after reordering remains equal to before. No model, HH or email request
is caused by selecting edits or changing language.

## Verification boundary

Two actual-controller baseline cases target dirty-master version saving and late
analysis navigation before production changes. Eight total current-controller
cases then cover these regressions plus bilingual selection/undo/raw preview,
held single version/late tab roundtrip, dirty vacancy and goal, newer saved revision
requiring analysis, paused writes and mobile axe/overflow. Five unit/SSR cases
cover fixed copy/reasons, raw fallback, literal immutability, blocks and empty state.
All API/identity fixtures are synthetic and intercepted. A generated screenshot
is an artifact, not a manual visual audit. Immutable CI evidence follows in
VERIFICATION.md; pending outcomes are not declared successful.

Global language selection remains OFF. AI/letters/career/history/tracker/settings/
analytics/offline integration, physical devices/screen readers and final live/
security/capacity acceptance remain open. No API/SQL/RLS/GRANT/flags/auth/lockfile/
model/document codec change, production migration, actual SMTP, paid infrastructure,
user LLM traffic, HH write, main merge or release. SMTP/recovery, provider-copy
restore/RPO/RTO, operator PD policy/placement, qualified model and full acceptance
remain OPEN. Historic #1/#2 approval applies only to those merges.



CI исправления attempt1 `232c23c3c3a174cc0756cefab1e99ccc58f64576` / App41361787864/job125013495090:1178unit84files,lint/types/build PASS; два исходных regressions и ещё5новых browser cases PASS,1new quote-selector FAIL. Полный browser suite не завершён: при extract ошибочно удалены соседние SourceProfilePanel/SourceVersionsPanel invocations, existing source-profile cases ожидали отсутствующие панели и job отменён по20минутному лимиту. Подключения восстановлены дословно с исходными owner/revision/dirty/boundary props. Все18существующих imported UI component invocation counts сверены с #98; это разовый source audit, не замена E2E. Quote assertion уже отделяет literal от mandatory badge, validation/guards не ослаблялись. Новый полный CI pending; предыдущая попытка не выдаётся за PASS.
