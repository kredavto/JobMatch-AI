# Explicit user-declared rewrite review (disabled)

POST /api/ai-rewrite-reviews returns a signed **review receipt only**. It never calls a model or saves a version/profile/history; only the existing analysis quota is consumed once. Auth/DB route tests use stubs, while HMAC/renderer/confirmation logic are real. Production flag JOBMATCH_AI_REWRITE_REVIEW_ENABLED must be true in addition to existing rewrite/self-hosted settings and signing config. Example defaults are false; no deployed settings were changed.

For every selected fact the owner must explicitly choose reviewed:true and one action:

- keep-source retains the exact selected source text, dismissing the discarded model proposal.
- accept-proposal is available only for an actual proposed claim, never a refused claim.
- edit supplies bounded well-formed manual text; origin remains manual even if it happens to equal model/source text.

The renderer replaces only the original selected exact ranges, retaining every unselected byte, Unicode code-point alignment and CRLF/whitespace. This changes no master facts, verification flags, score or other workspace content. Proposal claims, chosen renderer instructions and per-fact origins are separate; renderer status is not evidence of model origin. Requested language is not a claim that the entire retained source has that language.

For accepted proposals, source→chosen text gets bounded lexical number/negation/manual-edit review. Manual edits to an actual model proposal get source→manual and proposal→manual comparisons separately. Manual edits after a model refusal get only source→manual: a refused claim has no proposal text. keep-source needs no acknowledgements for discarded changes. No comparison establishes grammatical scope, facts, duration, causality, completeness or semantic entailment. Aggregate findings above128 or per-comparison token limits refuse without dropping findings.

The review SHA256 binds the canonical current source, opaque configuration ID, prompt hash, requested language, actual proposal claims, canonical per-fact decisions/origins, chosen render instructions, all issue spans and full rendered text. The owner must submit exactly this digest plus exactly all issue IDs, no missing/unknown/duplicate entries, together with global consent:true/reviewed:true and every fact's reviewed:true. Even zero-issue decisions require the full digest. Digests and acknowledgements are user declarations bound to content, not proof of human attention or truth. The browser helper performs structural/lexical consistency, never MAC verification.

The backend verifies the original preview HMAC, current owner/source/revision/selected verified quotes, original rendering and current configuration before issuing a review. It reauthenticates and rereads state/configuration after signing, discarding results on owner/session/source/config/key/flag changes or cancellation/expiry. Request body is bounded to512KiB, original/outer receipts to262144UTF8bytes. Safe RU/EN errors reveal no request or provider diagnostics.

The new HMAC domain is jobmatch-ai-rewrite-review-receipt-v1 followed by newline, separate from preview/letter domains. The payload contains a new review UUID, current issuer key ID, issue time, the **unchanged original preview expiry**, original signed preview receipt and recomputed user-declared review. It cannot refresh the original ten-minute deadline. Future-dated, expired, wrong-domain/key/owner/source/configuration receipts refuse. The server verifier rederives all choices/rendering/acknowledgements and rejects even correctly fixture-signed malformed content. Key rotation invalidates current unconsumed review receipts.

A review UUID is not an implemented database write/idempotency key. This endpoint has no immutable accept/save operation and no UI. Repeated review requests can produce different UUIDs before the same inherited deadline; no automatic retry exists. Model acceptance remains not-accepted, semantic assessment not-performed and the original model identity unverified. Manual review does not qualify the actual small model, whose frozen CPU diagnostic refused all selected claims.

## Required next storage block

A separate explicit consent-to-store must accompany a normalized owner/revision-bound command. The database must independently validate current signing configuration/domain/context/expiry and deterministic rendering under the owner lock; reserve trusted metadata from legacy opaque-extra forgery before enabling; enforce immutable version/count/duplicate/cascade/RLS rules; return an exact transaction ACK. Unknown committed replies require manual reconciliation without automatic replay. Old accepted history must retain its original provenance through export/restore/key rotation/feature disablement, without reinterpreting an expired historical signature as a fresh approval. Native lifecycle/false/lost-reply/concurrency/rollback/mixed20table synthetic restore checks and UI remain unimplemented for this new protocol. Existing storage regressions do not close them.

No production flag, mail, live database, provider-copy restore, HH write, paid resource, merge or release changed. SMTP/recovery, actual Supabase provider-copy restore, operator personal-data decisions, qualified useful model/independent semantic evaluation and final live/security/device acceptance remain open.
