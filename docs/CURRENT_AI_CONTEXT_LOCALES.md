# Current experimental AI panels: context, UI and bounded reads

This block follows #100 `97021c6eeeaa007c702e0cc87a0a46dc393a8b6a`.
Fresh main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, four plans/log and90open PRs were reviewed.
Managed local runtime is unavailable: pinned GitHub, leased refs, immutable
content/blob readback and existing CI only. No local or manual visual result.

## Consent belongs to a saved context, not a language

AI-review now has a bound child keyed by owner/revision, vacancy, factual
id/text/source/confirmation tuples and readiness. Context changes revoke its
consent/result and abort the previous request; a pending ref excludes same-tick
duplicates. Locale is excluded from identity, consent, requests and provenance.
The existing adaptation key still includes owner/revision/original/vacancy/facts/
readiness; it is not weakened. An original-only change resets adaptation while
review of unchanged facts/vacancy remains valid.

Controllers and25s timers are cleaned on unmount/context change and completion.
Active-controller checks guard late headers/body/result adoption. Paused controls
cannot acquire consent. Language preserves same-context consent, pending state,
fixed errors, selected literal lines, explicit manual review and draft wording.
Readiness changes intentionally reset ephemeral adaptation drafts, as before;
the lifetime copy now says so. No server records or user-entered profile drafts
are deleted by this reset.

Root passes optional/default-RU locale and existing boundary-state setters.
Current401/409 responses pause ordinary writes/show reauthentication or sync,
without auto-refresh or replay. Other read errors do not claim a write occurred.
Review/adaptation request bodies remain consent/revision/expectedOwnerId only.
Root's existing command handlers, source/revision guards and unrelated UI
invocations remain unchanged.

## Fixed presentation without model qualification

Review controls/results/feedback use typed RU/EN copy and closed local keys.
HTTP status is handled before body parsing; error bodies are discarded without
awaiting an untrusted cancellation hook. Provider content, JSON parser details
and unexpected Error.message never become UI text. Late errors use the current
locale; same-context retry is explicit and is never automatic.

Adaptation's existing bilingual copy is extracted with the same key checks.
Russian v1 template headings, raw quotes/fact lines, accepted selection and the
readonly manual-copy draft remain literal. The visible template hint explains
the Russian framing. Both panels say the model has not passed acceptance.
Translated controls and intercepted endpoint fixtures are not a working or
qualified model, semantic entailment, rewriting or score improvement.

The server API, AiReviewSchema/eligible facts/exact citation validator,
adaptation schema/literal renderer and modelAcceptance:not-accepted contract
remain byte-identical. Exact quotes establish provenance, not suitability.
Match Score, original resume, facts and persisted versions are not changed by
these read/preview actions. The archived main diagnostic0/16gold remains NOT
ACCEPTED; this block does not regrade it.

## Bounded response transport

Successful response bodies are capped at2MiB declared and actual decoded bytes,
with strict UTF-8/JSON decoding and the existing25s total request budget.
This accommodates the worst-case escaped compact current50rows x
(quote2000 +20IDs x100) schema, without accepting unlimited JSON whitespace.
The shared reader does not replace caller owner/revision/envelope/provenance
validation. It cancels refused bodies without awaiting cancellation promises.
Partial, invalid, oversized or stale responses never become a partial preview.
These are client transport/resource checks, not provider capacity or security
acceptance.

## Verification boundary

Two actual-Root red cases reproduce raw non-JSON503 details and consent/result
retained during pause on unchanged production. Sixteen final browser cases cover
these, bilingual held review/score, selected literal adaptation, Root conflict
boundaries, owner/revision/fact/vacancy/readiness cancellation, original-only scope,
oversized valid JSON, timeout and raw-error refusal. Eight unit/SSR cases cover
byte/encoding/abort/cancel boundaries, fixed status/copy and unknown-owner view.
All API/identity/model outputs are intercepted synthetic fixtures. Generated
screenshots are artifacts, not manual visual acceptance. Exact CI facts follow
in VERIFICATION.md; pending outcomes are not called PASS.

Global language selection remains OFF. Letters/career/tracker/settings/analytics/
offline and final live/security/capacity work remain open. No API/SQL/RLS/GRANT/
flags/auth/lockfile/model/license/prompt/corpus/document codec change, production
migration, actual SMTP, paid infrastructure, user LLM traffic, HH write, main merge
or release. SMTP/recovery/provider-copy restore/RPO/RTO/operator PD/model/full
acceptance stay OPEN. Historic #1/#2 approval applies only to those merges.


Фактический source #101 `350bafcbc4950f3e70843b3d4b3d050b42404f5d`, tree `1b58d2ebdaa4c86b7d3b1762ca24bdfb6917d518`, synthetic checkout `1d7eba29bd58d080282ac0a20beee3cd42d6c5e6` tree-equal. [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41370252424/job/125038981771) lint/types/build PASS;1193unit/API86files PASS;295browserPASS/2liveSKIP. Все16новых browser и8unit/SSR PASS, старые сценарии не ослаблены.15релевантных source-workflows PASS; отдельный CPU diagnostic не квалифицирует модель.16изменённых файлов immutable-readback content/blob metadata равны ожидаемому/git tree index.61защищённый schema/auth/service/engine/AI-contract/body/codecs/renderer/diff/lockfile blob совпадает с #100. Root handlers byte-equal;19существующих UI invocation counts сохранены. Локального hash/test/build/manual visual результата нет.

Red baseline `f4def7247f5f64b6cbd044e9de9bf850dd811a0c` / tree `e0f08e7b1003e13f6b46773d2536b54d02964aa2`, checkout `56f56de7956f4a6e9c5beaa39d0d0b1760fb62c5` tree-equal: [App](https://github.com/kredavto/JobMatch-AI/actions/runs/41368772732/job/125034514406)1185unit85files/279browserPASS/2newFAIL/2liveSKIP. Старый parser error выводил synthetic PRIVATE fragment, consent оставался checked при paused workspace. Исправленный source использует status-before-parse/fixed keys и source/readiness identity; оба regression cases PASS. Модель/проверки точных цитат/eligible facts/дословный renderer не менялись.

[Native18restore/session/codec](https://github.com/kredavto/JobMatch-AI/actions/runs/41370252381/job/125038981616), [parser→verifiedTLS→productionAPI→compact17restore](https://github.com/kredavto/JobMatch-AI/actions/runs/41370252382/job/125038981606), [Ops](https://github.com/kredavto/JobMatch-AI/actions/runs/41370252436/job/125038981836), [Parser/OCR](https://github.com/kredavto/JobMatch-AI/actions/runs/41370252398/job/125038982018) PASS; worker101/0skip. [ClamAV](https://github.com/kredavto/JobMatch-AI/actions/runs/41370252398/job/125038981866) PASS:engine1.4.6/loaded database28171(2026-11-01T06:27:34Z),signed observation2026-11-02T01:03:01.107Z,refresh/reload/refusals. Все логи содержат тот же source checkout. Auth/HTTP bridge/data/restore синтетические, не provider-copy/RPO/RTO/live SMTP/globalSLO/unknown-threat/capacity acceptance.

[PR #101](https://github.com/kredavto/JobMatch-AI/pull/101) после ready/unmerged #100. Model acceptance OPEN: archived main0/16gold остаётся NOT ACCEPTED. UI/HTTP fixture, bounded body и переведённое согласие не доказывают семантическую пригодность модели. Следом: панели писем/сохранённых писем и карьерного плана с сохранением draft/provenance; затем tracker/settings/analytics/offline/global language gate и final acceptance. SMTP/recovery/provider-copy/ПД/model/final ops OPEN; #1/#2 permission не расширяется. Main merge/release не выполнены.
