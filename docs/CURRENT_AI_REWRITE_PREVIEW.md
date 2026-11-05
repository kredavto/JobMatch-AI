# Current per-fact rewrite preview

This is a new, disabled server-side proposal path, separate from the frozen
`jobmatch-ai-resume-adaptation-v1` literal-selection experiment. It can produce
changed wording; transport, provenance and bounded lexical checks do **not**
establish that wording's truth or preserve its meaning. The model is explicitly
`not-accepted`, its identity `unverified`, and semantic assessment `not-performed`.
There is no user interface, acceptance endpoint, persistent AI version, score
improvement, automatic fact verification or change to the master resume here.

## Request and source binding

`POST /api/ai-rewrites` accepts exactly `consent: true`, `expectedOwnerId`, current
`revision`, one to twelve distinct `factIds`, and `requestedLanguage: ru | en`.
Same-origin and authenticated owner checks precede source access. The server reads
its own workspace; clients cannot supply the source, vacancy or output. Each
selected fact must be verified and match exactly one whole trimmed original line.
Duplicate facts/lines, substrings, overlapping ranges, malformed Unicode, NUL,
missing source or excessive lexical tokens fail before quota/inference. Offsets
are Unicode code points. Original CRLF, indentation and all unselected bytes are
retained. A verified negative statement remains negative source for review; it
is not promoted to positive matching evidence.

The existing analysis quota is consumed before inference. Only selected fact IDs
and exact text, vacancy and requested language go to the configured server. Owner,
revision, source labels, full original and unselected facts are excluded. The
source snapshot in the returned proposal records owner, revision, original hash,
length, selected exact quotes/ranges and vacancy. This is potentially personal
information; no request/body/provider output is logged by the route observer.
Telemetry receives only the new static route label and existing coarse metadata.

## Configuration and bounded transport

All three flags must be explicitly true: `JOBMATCH_AI_REWRITE_ENABLED`,
`JOBMATCH_AI_ENABLED` and `JOBMATCH_AI_SELF_HOSTED`. The example keeps them false.
Existing fixed `/api/chat` URL, production HTTPS/token and credential restrictions
remain in force. Signing requires the existing server-only
`JOBMATCH_LETTER_SIGNING_SECRET`; it does not require enabling saved letters.
No operator endpoint, key, flag or database permission was changed during this work.

The new frozen prompt is `per-fact-paraphrase-v1`; old AI provider, prompt, corpus,
results and model pins are untouched. Each selected ID receives exactly one
`proposed` text or `refused`/null row. Unknown, duplicate, missing or extra fields
fail closed. Refusal retains the exact original line. Provider input is at most
48,000 UTF-8 bytes. One POST, no redirects/retries, a 20-second combined deadline,
128,000 response bytes, fatal UTF-8, HTTP 200/application-json and a complete
assistant `done: true`, `done_reason: stop` envelope are required. Provider content
and error details never become public error messages.

The opaque configuration identifier is a domain-separated HMAC over endpoint,
model declaration, token and new prompt; none of those credentials are disclosed
in it. `declaredModel` is a configuration label, not an observed model identity.
After inference the route authenticates again, rereads current source/revision,
checks configuration/flags again and rejects cancellation. Changed source,
owner, session, configuration or disabled permission returns no signed result.
These checks describe the observed request boundary, not a lock held after reply.

## Review and receipt

Only selected exact source ranges are replaced. The full result is re-rendered
against the original before signing. Per-fact source-to-proposal review uses the
unchanged `literal-edit-audit-v1`: exact numeric/negation token multiset changes,
code-point spans and a manual-edit finding. More than 64 tokens per category or
128 combined findings is refused. A numeric/negation finding remains an unreviewed
warning; even zero findings is not semantic acceptance. `requestedLanguage` says
what was requested for proposals, not the language of the unselected document.

Response: `{ ownerId, revision, receipt: { payload, signature } }`, no-store.
The `jobmatch-ai-rewrite-preview-receipt-v1` payload contains a random ID, issuer
key ID, issue/expiry seconds (600-second lifetime) and the validated proposal.
HMAC-SHA256 covers `jobmatch-ai-rewrite-preview-receipt-v1\n` plus the exact UTF-8
payload. This domain differs from existing saved-letter receipts. Payloads are
bounded to 262,144 UTF-8 bytes. Signing binds the actual current source, not an
arbitrary caller-supplied rendered string. Server verification checks MAC, key,
owner and time; browser structural decoding explicitly does **not** verify MAC.
Neither decoding nor signature verification accepts or persists the proposal.
A later acceptance implementation must additionally recheck current source and
configuration and obtain explicit human approval; this preview is not authority
to use legacy version writes or trust arbitrary version metadata.

## Remaining work and evidence boundary

Next internal block: explicit human review/edit decisions, normalized immutable
save with database enforcement (including legacy-write forgery protection),
strict acknowledgement/manual reconciliation, mixed history/export/restore and
actual native SQL lifecycle tests, then the user interface. No new SQL/table or
production migration is included in this preview block.

Tests use public synthetic source, an owned loopback HTTP server with authored
responses, and stubbed database authentication/read/quota. They test real HTTP
transport plus production route/provider/renderer/signer code, not a real model,
Supabase Auth/RLS, semantic verifier or provider-copy restore. Existing hosted
browser/native/scanner/CPU regression results must be read from the exact PR
checks. The old actual CPU model diagnostic remains 0/16 gold and NOT ACCEPTED;
this new prompt has not been run against a model or held-out semantic corpus.
External model resources/permissions and operator personal-data decisions remain
open, as do agreed SMTP/recovery, provider-copy restore, HH and final live gates.
