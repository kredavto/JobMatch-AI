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
