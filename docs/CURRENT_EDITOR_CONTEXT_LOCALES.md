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



CI исправления attempt1 `232c23c3c3a174cc0756cefab1e99ccc58f64576` / App41361787864/job125013495090:1178unit84files,lint/types/build PASS; два исходных regressions и ещё5новых browser cases PASS,1new quote-selector FAIL. Полный browser suite не завершён: при extract ошибочно удалены соседние SourceProfilePanel/SourceVersionsPanel invocations, existing source-profile cases ожидали отсутствующие панели и job отменён по20минутному лимиту. Подключения восстановлены дословно с исходными owner/revision/dirty/boundary props. Все20существующих default/named UI component invocation counts сверены с #98; это разовый source audit, не замена E2E. Quote assertion уже отделяет literal от mandatory badge, validation/guards не ослаблялись. Итог полного исправленного CI приведён ниже; предыдущая попытка не выдаётся за PASS.


Фактический итог #99: executable source `e9f5d9c5081270ea19a36b6d770e4c150ab7b2b6`, tree `82e1c9fa7ef2712a511f0e77f7def8b18affb856`, synthetic checkout `05d2ec226819e67e966012ba10a89921cb7263e0` tree-equal. [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41363571347/job/125018920877) lint/types/build PASS;1178unit/API в84файлах PASS;269browserPASS/2liveSKIP. Все8новых controller cases и5unit/SSR PASS; existing source-profile21/source-version3cases PASS.15релевантных source-workflows PASS, отдельный CPU diagnostic не является квалификацией модели.12изменённых файлов immutable-readback content/blob metadata равны ожидаемому/git tree index.56защищённых engine/evidence/analysis-validator/schema/auth/service/lockfile/codec Git blobs совпадают с #98.20default/named UI invocation counts и дословные соседние source-panel bindings сверены. Локального hash/test/build/manual visual результата нет.

Red baseline `4b7ef92dcdd26feec6e0f7ca71fa364abe30f845` / tree `a904c009e43d98dbf89f3200039d770c455a3a4c`, checkout `42d6b4c3828dcdd93499be25b09d7183236db427` tree-equal: [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41361327297/job/125012119737)1173unit83files/261browserPASS/2newFAIL/2liveSKIP. Первый extract `232c23c3c3a174cc0756cefab1e99ccc58f64576`:1178unit84files/7newbrowserPASS/1quote-selectorFAIL; missing adjacent panels вызвали existing failures и отмену по20минутному лимиту, полного PASS нет. Quote-only correction `8f9b66521afe15e08d9da58fc95f0ca96b9124d6` / [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41361943291/job/125013972835):8newbrowserPASS, но тот же missing-panel failure/timeout; полного PASS нет. Итоговый source восстанавливает оба подключения дословно, существующие проверки не удалены и не ослаблены.

[Native18restore/session/codec](https://github.com/kredavto/JobMatch-AI/actions/runs/41363571396/job/125018919386), [parser→verifiedTLS→productionAPI→compact17restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41363571434/job/125018919489), [Ops](https://github.com/kredavto/JobMatch-AI/actions/runs/41363571345/job/125018919205), [Parser/OCR](https://github.com/kredavto/JobMatch-AI/actions/runs/41363571495/job/125018919912) PASS; worker101/0skip. [ClamAV](https://github.com/kredavto/JobMatch-AI/actions/runs/41363571495/job/125018919638) PASS:engine1.4.6/loaded database28171(2026-11-01T06:27:34Z), signed observation23:46:17.499Z, refresh/reload/refusals. Все эти логи содержат тот же source synthetic checkout. Auth/HTTP bridge/data/restore синтетические, не provider-copy/RPO/RTO/live SMTP/globalSLO/unknown-threat/capacity acceptance.

[PR #99](https://github.com/kredavto/JobMatch-AI/pull/99) после ready/unmerged #98. Следом: история/сравнение версий и DOCX-feedback, explicit date/time display; далее AI/letters/career/tracker/settings/analytics/offline/global language gate и final acceptance. SMTP/recovery/provider-copy/ПД/model/final ops OPEN; #1/#2 permission не расширяется. Main merge/release не выполнены.
