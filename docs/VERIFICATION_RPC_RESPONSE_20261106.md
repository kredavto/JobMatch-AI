# Bounded RPC response protocol — 2026-11-06

PR #128 is a prerequisite for the next normalized reviewed-version writer, stacked on #127. Accepted executable source: `12375a9164a51ffbb0459011d26b5f059b743f35`; Git tree `23a85ec7d0e60be12d2d30d3659fda5019929f47`. This closes a shared transport gap in current RPC reads/writes. It introduces no persisted rewrite format, DB schema/migration, endpoint, feature activation or model qualification.

## Before and after

Ordinary RPCs previously followed Fetch's redirect default, used unbounded `Response.text()` and accepted any `res.ok` success without checking MIME. Replacement decoding could silently alter malformed UTF-8 before a higher-level exact-ACK check. The SQL `AUTH` error was normalized only for a manually maintained subset of RPC paths, omitting general workspace commands and future writers.

`lib/db-rpc-response.ts` is now used for all `/rest/v1/rpc/` calls except the existing separately bounded pre-auth quota lane. Successful RPC acknowledgement requires exact HTTP200 and application/json (case-insensitive media type, optional parameters). Redirects are rejected by the actual Fetch call;201/202/204/206 and3xx do not become successful writes. JSON values remain uncoerced, including legitimate null, booleans and numeric RPC results; downstream command/capability schemas still validate their meaning.

A success body is bounded to16MiB of actual response bytes. This is above the existing <15,000,000-byte complete workspace SQL budget, with room for the owner/revision wrapper. Error bodies use a separate64KiB budget. The existing bounded reader checks declared length and accumulated chunks, including absent Content-Length, and releases the reader/cancels on failure without awaiting an untrusted cancel hook. Fatal UTF-8 decoding rejects malformed bytes; nonempty valid JSON is required. Response bytes, URL, credentials and provider diagnostics never enter an error.

The same15s abort signal spans fetch headers and response body; body decoding also has the shared reader deadline. Endless or incomplete streams cannot keep a request alive indefinitely. HTTP401/403,429 and5xx take precedence and their bodies are discarded without waiting for completion. Bounded known PostgREST4xx errors still reach the existing safe SQL-error mapping. SQL `AUTH` now maps to the session boundary for every authenticated RPC, including a command revoked while waiting for an owner lock, without an endpoint allowlist.

The authentication HTTP API retains its own201/204-compatible behavior. The pre-auth quota lane keeps its existing128-byte/two-second/exact200 protocol. No authentication request was sent to a real provider, and no email or credential was changed in this block.

## Acknowledgement and retry limits

Transport validity is not write acknowledgement or proof of commit. Current owner/revision/schema/exact response checks remain in each command. Unknown transport/framing/body outcomes after a write are handled by existing command-specific unknown-result/manual-read behavior. No automatic retry or snapshot fallback was added. A caller cannot infer rollback merely because it received a502/503 or lost the reply.

The actual loopback HTTP tests call the production `supabase` and `acceptSavedLetter` functions using native Fetch. Their server has only public authored JSON and an accepted-command counter; this counter is not a PostgreSQL commit or provider acceptance. Seven lost/malformed/redirect/server-error write replies each cause one request and one counter increment, with LETTER_SAVE_UNKNOWN and no replay. Existing native PG17 workflows separately prove their real transaction/lost-ACK/rollback behavior.

## Verification boundaries

60 new tests cover media/status framing, Unicode split across real chunks, UTF-8 failure in success and error JSON, byte budgets including exact16MiB success, streamed/declared oversize, finite errors, a real307 with zero arrivals at the redirect target, unfinished error streams, actual15s header/body timeout, cancellation hooks, SQL AUTH normalization, uncoerced values, preserved owner/revision ACK checks, legitimate authored Auth201 and unknown write outcomes.

Local targeted60/2files PASS on immutable final code; expanded100/5files PASS includes prior document/framing/calendar regressions. A default-parallel full run produced worker/test timeouts and was explicitly interrupted (exit130), not counted as a pass. Those four initially failing tests passed in the bounded rerun; no guard/assertion was weakened. Full bounded run with `vitest run --maxWorkers=2`:1828 tests/114 files PASS,119.64s. Types/focused ESLint/diff check PASS.

The reused local dependency cache is not a clean installation: its installed-graph audit FAILED (5295 nodes/129 empty slots/15422 problem signals), and installed Next is16.4.3 while the repository pins16.4.5. Shared cache was not repaired or represented as accepted. Clean hosted npm-ci/graph/types/lint/unit/pinned build/browser evidence is recorded below. No local pinned production-build success is claimed.

Native regression reports refer to owned PostgreSQL17, synthetic Auth/HTTP and populated20table dump/restore; they are not Supabase PostgREST/live Auth/provider-copy recovery/RPO/RTO evidence. Actual small owned CPU diagnostics remain NOT ACCEPTED regardless of transport/workflow success; independent semantics and held-out assessment are not performed.

## Exact-head evidence and next block

## 2026-11-06 — PR #128: bounded RPC framing and session-boundary normalization

Fresh current main/four plans read at `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`,117 open PRs inspected. #127 final `89b204b6a8995add75a497a7a51dd5e612504453` now has all19 final workflows SUCCESS, including application42201789333; ready/unmerged. #128 https://github.com/kredavto/JobMatch-AI/pull/128 is stacked on #127 in separate `fix/rpc-response-boundaries-20261106`. Accepted source `12375a9164a51ffbb0459011d26b5f059b743f35`, tree `23a85ec7d0e60be12d2d30d3659fda5019929f47`; four executable/test files read back at immutable SHA and local Git tree matches canonical.

Before adding another normalized writer, fixed a shared transport gap: ordinary RPCs no longer follow redirects or accept arbitrary success statuses/MIME/unbounded replacement-decoded text. Successful ACK requires exact HTTP200/application-json, strict nonempty JSON/UTF-8, actual/declared16MiB success and64KiB error budgets, shared15s header/body deadline, cancellation without awaiting an untrusted hook.401/403/429/5xx bodies are discarded before waiting/decoding; bounded known4xx retain safe SQL errors. SQL AUTH now normalizes on every authenticated RPC, including workspace commands/future writers after lock wait, replacing an incomplete allowlist. Auth HTTP201/204 and pre-auth quota128B/2s remain separate. Per-command owner/revision/schema/exact ACK guards and unknown-result/manual-read behavior remain; no automatic retry/fallback.

60 new unit/actual-loopback-HTTP cases PASS. Real native Fetch tests prove split multibyte decoding, redirect target receives zero requests, streamed and declared oversize, invalid UTF-8 in success/error, endless body/error cancellation, actual15s deadline and seven accepted-fixture-command/unknown-reply outcomes without replay through production acceptSavedLetter. Owned public HTTP counters are not DB commit, hosted Auth/PostgREST or restore evidence. Local targeted60/2files and expanded100/5files PASS. Unrestricted parallel full run produced worker/test timeouts and was interrupted(exit130), not accepted; initially failing four tests passed with2workers. Bounded full1828unit/114files PASS (119.64s); types/focused lint/diff and29security tests PASS. Reused local dependency-graph audit FAILED (stale shared cache, installed Next16.4.3 versus pinned16.4.5); no local pinned build or clean graph success claimed, no shared cache repair.

Canonical application42204272894/job127846873303: clean npm-ci/dependency graph/lint/types/1828unit114files/Next16.4.5 production build/513browserPASS/2liveSKIP SUCCESS.
All20 triggered workflows on the accepted source were independently observed SUCCESS. No untriggered check is counted as a pass.
Native source-version42204272971/job127846875044:119Python, existing current wire/owner/session/concurrency/lost-ACK/manual-reconcile/rollback/reapply and20table synthetic native restore/RLS/corruption PASS. Version commands42204272989/job127846873036: existing actual service/SQL exactACK,20writers1commit/19conflicts, mixed rollback/restore PASS; SQL does not attest relevance. Central pre-auth42204272985/job127846873449: actual production signer/bounded HTTP to anonymous ownedPG, five ceilings and20connections10allow/10deny PASS, no Auth/mail. Ops42204273248/job127846875203:41TS/27Python and actualNext15labels20handlers PASS.

Owned rewrite CPU42204273065/job127846874211 on exact source:6 positive stop responses/251tokens,6 contract-valid, all7 selected claims REFUSED,0changed; NOT ACCEPTED. Older adaptation42204272984/job127846873646:16/1074/0gold, NOT ACCEPTED. Semantics/independent held-out NOT PERFORMED; no model/prompt/corpus/gate retuning. Evidence-label clarification: earlier narrative called ff51cfd359eb90970f3ef0f4f713395230a8f047d4844f8183ef84592ab786e2 “promptSHA”; it is SHA256 of the `lib/ai-rewrite-prompt.ts` source file. The frozen system prompt STRING hash in actual preview payloads is e531f3a6d343ae61773928fc6e2d3aec58aa2804af2e34e01ad039bbf2d48a7f. Both were already present in the original raw report; original reports are retained unchanged.

Final evidence commit changes only Markdown, with executable/tests/workflows identical to accepted source; final-head CI must be observed separately. Full contract and inventory: docs/VERIFICATION_RPC_RESPONSE_20261106.md.

Next available technical work: frozen structural history codec for human-reviewed rewrite versions, then normalized immutable acceptance with separate storage consent, current MAC/source/config/deadline under owner lock, trusted-metadata legacy-forgery preflight, exact ACK/no replay/manual reconciliation, mixed history/export/key-rotation/disable/restore and native lifecycle; then explicit editor save. No new persisted rewrite tag is trusted/activated by #128.

Baseline0.34.0/b05c45d0 retained; historical PR#1/#2 merged with explicit scoped owner permission, not authorization for future merges/releases. No merge/release/deploy/liveDB/SupabaseCLI/production key/flag/mail/HHwrite/real-user externalLLM/paid infrastructure. Useful qualified model, semantic/held-out assessment, agreed real SMTP/recovery, actual Supabase provider-copy restore, operator PD placement/retention and independent security/capacity/manual/device/live acceptance remain OPEN. Full project incomplete; internal work remains and automation continues.

## Completed source workflow inventory

All20 rows were independently fetched for exact accepted source SHA. Final evidence-head CI is a separate observation.

| Workflow | Conclusion |
| --- | --- |
| [Rewrite diagnostic harness](https://github.com/kredavto/JobMatch-AI/actions/runs/42204272898) | SUCCESS |
| [Central pre-auth quota (synthetic PostgreSQL)](https://github.com/kredavto/JobMatch-AI/actions/runs/42204272985) | SUCCESS |
| [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/42204273248) | SUCCESS |
| [Mirror rollback compatibility — Current explicit writes PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42204272899) | SUCCESS |
| [Current application commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42204272999) | SUCCESS |
| [Parser TLS API compact PostgreSQL integration](https://github.com/kredavto/JobMatch-AI/actions/runs/42204273024) | SUCCESS |
| [Mirror rollback compatibility — Current projection parity PostgreSQL preflight](https://github.com/kredavto/JobMatch-AI/actions/runs/42204273039) | SUCCESS |
| [Synthetic source-profile PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42204273005) | SUCCESS |
| [Current persisted reminder PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42204272903) | SUCCESS |
| [Current profile commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42204273078) | SUCCESS |
| [Current compact storage PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42204272941) | SUCCESS |
| [Synthetic saved-letter PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42204273047) | SUCCESS |
| [Current version commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42204272989) | SUCCESS |
| [Mirror rollback compatibility — Current canonical reads PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42204272935) | SUCCESS |
| [Mirror rollback compatibility — Current logical backup PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42204273044) | SUCCESS |
| [Isolated document parser](https://github.com/kredavto/JobMatch-AI/actions/runs/42204273032) | SUCCESS |
| [Current literal source versions PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42204272971) | SUCCESS |
| [Owned rewrite CPU diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/42204273065) | SUCCESS |
| [Exact-main adaptation CPU diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/42204272984) | SUCCESS |
| [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/42204272894) | SUCCESS |
