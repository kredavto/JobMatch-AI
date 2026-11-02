# Current saved version history, dates and DOCX UI

This block follows #99 `9195d4108fcb04d1edc86cb70f54fd0be9f85412`.
Fresh main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, four plans/log and89open PRs were reviewed.
The current stack is integrated directly; #29 is a design reference, not a claim
that its older branch is merged or equivalent to the current provenance core.
The managed local runtime is unavailable: pinned GitHub, leased commits, immutable
content/blob readback and repository CI only. No local/manual visual result.

## Preserve the precision that was stored

History and comparison previously used toLocaleString without an explicit zone.
Two actual-controller baseline cases target device-zone drift and invented
interpretation of an offset-less legacy timestamp.

The new display-only formatter validates ISO offset timestamps and shows those
instants in explicit UTC to whole seconds. The stored fractional seconds/offset remain unchanged in JSON. Date-only values keep their recorded calendar day and
say that time/zone were not saved. Naive or unrecognized legacy strings remain
verbatim with an explicit missing-zone qualifier. They are not fed to device-local
Date conversion. Calendar formatting does not turn a date-only record into a
stored midnight instant. Original created strings and downloaded JSON stay exact.

## Controlled views and historical meaning

OrdinaryVersionsPanel hosts history and comparison; locale defaults to Russian.
Only fixed copy, date display, metadata category names and diff labels change.
Source text, vacancy, evidence IDs/text/source, historical rules/engine/weights/
contributions/counters and unknown compatibility fields remain literal.
A mixed legacy evidence snapshot is labelled as a snapshot, with each fact's
recorded confirmation shown separately. It is not presented as entirely confirmed.

Comparison retains selected IDs and memoized text diff through locale changes.
It still uses the unchanged compareText/scoresComparable helpers, same 1000-line
display cap and simplified-large-document path. Missing historical metadata does
not acquire current rules. Score difference remains an internal heuristic,
not an ATS or job-search-outcome claim. No analysis is rerun for a display change.

Root's handlers and request path are unchanged. Only exact version-view lines
and imports are moved; unrelated UI invocations and neighboring source panels
are audited. The outer view is keyed by owner, never locale. TXT, JSON and manual
clipboard actions still receive exact stored values and fixed filenames.
Copying for hh.ru is a local clipboard operation, not an HH API write.

Restore remains an ID-only command through the existing Root known-owner,
revision, pause and response gates. A local pending ref prevents same-tick double
submits; busy/paused/unknown owner disables restore and its handler. A write may
complete after leaving the section; this is not a new server cancellation or
full entity-delta proof. No automatic retry/read or hidden rewrite is added.

## DOCX request identity and fixed feedback

ResumeDownload is keyed by owner/version, excluding locale. Locale changes retain
the same active request and timer; errors are stored as closed semantic keys so
late feedback uses the current language. Owner/version changes remount request
state and abort/clear the old controller/timer; stale files/errors are ignored.
Missing owner still makes no request. There is no automatic retry.

URL ID/expectedOwnerId, no-store, fixed filename, 30s timeout, MIME, ZIP signature
and2MiB post-blob validation remain. This is not a new streaming-size-bound,
provider/auth acceptance or file-security proof. HTTP status maps to fixed copy;
provider bodies and unexpected Error.message never become UI text.

## Verification boundary

Ten actual-controller/owned-component browser scenarios cover device zones,
legacy precision, bilingual selection/open history/raw exports/clipboard/mixed
metadata/mobile axe, held single restore, paused refusal, late DOCX error,
timeout, owner/version change and unexpected browser-error redaction.
Seven unit/SSR cases cover date classes/device zones, closed status/catalog shape
and honest historical snapshots. All identities/API responses are intercepted
synthetic fixtures; DOCX uses the existing real renderer and is parsed with
mammoth. Generated screenshots are artifacts, not manual visual acceptance.
Immutable CI facts follow in VERIFICATION.md; pending tests are not called PASS.

Global language selection remains OFF. Saved-letter/AI/career/tracker/settings/
analytics/offline and final live/security/capacity work remain open. No model,
SQL/RLS/GRANT/flags/auth/lockfile/document renderer changes or production migration,
actual SMTP, paid infrastructure, user LLM traffic, HH write, main merge or release.
SMTP/recovery/provider-copy restore/RPO/RTO/operator PD/model/full acceptance stay
OPEN. Historic #1/#2 approval applies only to those merges.


Первый CI исправления `08bef91b707364e3eaceea49ec515061415be228` / tree `4d8ec299ddcf4117b4207af9955ff977bab416c6`, checkout `0a32bf6cc4a7e007d6e37ffdbbd2ea381de96cb6`: [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41365656329/job/125025157218)1185unit85files/274browserPASS/5newfixture-labelFAIL/2liveSKIP,lint/types/build PASS. Даты/history/exports/restore и все старые сценарии PASS. Пять DOCX-сценариев не прошли точный getByLabel: implicit label тестовой страницы включал тексты options. Fixture исправлен на явные htmlFor/id; production code и assertions не меняются, повторный полный CI выполнен, доказательства приведены ниже.


Фактический исправленный source #100 `ef4cd34938f020e79ef8c461cf20da1face8cb8e`, tree `e6717892166f77817ebbfb985e38f7d1a452df5a`, synthetic checkout `92f748a8bc0292eb6449b007e453d9ab0be2801c` tree-equal. [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41366702711/job/125028257563) lint/types/build PASS;1185unit/API85files PASS;279browserPASS/2liveSKIP. Все10новых browser и7unit/SSR PASS, старые сценарии не удалены/не ослаблены.15релевантных source-workflows PASS; отдельный CPU diagnostic не квалифицирует модель.18изменённых файлов immutable-readback:content/blob metadata равны ожидаемому/git tree index.7production Git blobs равны первой попытке, исправлен только label fixture и docs.58защищённых schema/auth/service/engine/codecs/renderer/diff/lockfile blobs совпадают с #99; Root handlers/request path byte-equal,18прочих UI invocations сохранены. Локального hash/test/build/manual visual результата нет.

[Native18restore/session/codec](https://github.com/kredavto/JobMatch-AI/actions/runs/41366702856/job/125028257944), [parser→verifiedTLS→productionAPI→compact17restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41366702804/job/125028257942), [Ops](https://github.com/kredavto/JobMatch-AI/actions/runs/41366702727/job/125028257484), [Parser/OCR](https://github.com/kredavto/JobMatch-AI/actions/runs/41366702672/job/125028257146) PASS; worker101/0skip. [ClamAV](https://github.com/kredavto/JobMatch-AI/actions/runs/41366702672/job/125028257345) PASS:engine1.4.6/loaded database28171(2026-11-01T06:27:34Z),signed observation2026-11-02T00:23:02.029Z,refresh/reload/refusals. Все эти логи содержат тот же source checkout. Auth/HTTP bridge/data/restore синтетические, не provider-copy/RPO/RTO/live SMTP/globalSLO/unknown-threat/capacity acceptance.

[PR #100](https://github.com/kredavto/JobMatch-AI/pull/100) после ready/unmerged #99. UI показывает explicitUTC до целых секунд; исходный offset/дробная часть в created/JSON не изменены. Legacy date-only/naive не получают вымышленного instant. DOCX guard/late errors/owner-version cleanup, raw TXT/JSON/clipboard и restore body проверены на synthetic fixtures, не на реальном provider account. Следом: AI-review/adaptation presentation и context consent/results; затем letters/career/tracker/settings/analytics/offline/global language gate и final acceptance. SMTP/recovery/provider-copy/ПД/model/final ops OPEN; #1/#2 permission не расширяется. Main merge/release не выполнены.
