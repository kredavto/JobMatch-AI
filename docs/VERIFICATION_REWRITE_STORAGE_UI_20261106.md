# Reviewed rewrite storage in current workspace — 2026-11-06


## 2026-11-06 — PR #132: current RU/EN rewrite storage and provenance

[PR #132](https://github.com/kredavto/JobMatch-AI/pull/132), above unmerged #131 final fd4ac979b33e77cb5bf5d0be5cf0405cfa7da4a6. Accepted source `1f0f4c41dce1d361036285ea3d1c73440cc65478`, tree `39eafbf13f0b2c0e84aa2303ccb1a9f68d94f0a9`; independently fetched CI merge c9b44d98487ca714490a042d320926fba11614bb has that same tree. **All20 triggered UI source workflows SUCCESS**, including corrected review/storage outcome copy. Fresh main rechecked a3a9ef0c69e1e760010fc391234d66cd4a747e3b; no merge/release/provider deployment or flag activation.

The earlier progress message saying22 for this UI branch was incorrect:20 ran. Synthetic base-restore and central pre-auth-quota workflows did not trigger on this UI diff; their22-workflow predecessor evidence belongs to #131 and is not relabelled a fresh #132 result. Both initial742ae148a0542844436157e11385cc23d68cf0c7 and current source have20 successful triggered workflows.

- Separate STORE_REVIEWED_AI_REWRITE consent appears **after** confirmed review/chosen text. Review confirmation alone does not store a version. Source/decision/undo/navigation/pause/dirty/revision/expiry/clear boundaries revoke consent. An owner-keyed persistent attempt retains a possibly committed nonce/receipt across navigation/locales; logout removes private local state. No private localStorage/sessionStorage persistence.
- Same-origin/no-redirect/no-store transport uses25s/2MiB/fatal UTF8/exact200+JSON, one request and no replay. Root locks other workspace mutations, validates exact owner/next revision/receipt/full immutable row against the captured complete workspace and rechecks the owner/frame after asynchronous validation. Adoption appends only the row/revision, preserving original/facts/vacancy/goal/applications/earlier versions and user drafts.
- Cancellation stops waiting, not a possible database write. Unknown/malformed/foreign ACK pauses writes without adopting untrusted data. Explicit single-ID GET matches the exact immutable receipt, never replays the writer or silently reloads/adopts the master workspace. Missing/error history does not prove rollback/absence. Explicit regular workspace reload is the recovery boundary.
- History records source/manual/model origins, original acceptance time/source, user-declared review, lexical-only coverage, model NOT ACCEPTED and semantics NOT PERFORMED. Rules score is explicitly on saved facts, not generated-text quality. TXT/JSON retain exact saved text/archive; ID-only restore appends an immutable copy without changing master facts. Actual DOCX handler preserves chosen paragraphs with existing CRLF normalization and no invented headings/language inference; personal export retains receipt/archive/restore provenance. This is not a provider backup.
- [Application checks 42230851235/job127936031933](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851235/job/127936031933): clean dependency graph/lint/types,2004 unit/API tests/120 files, pinned Next16.4.5 build,523 browser PASS/2 live SKIP. Local bounded full2004/120 and28 new helper/export tests PASS;36 current-editor browser tests PASS (10 new), all10 after layout adjustment PASS,5 after outcome-copy fix PASS. Final current English mobile screenshot test PASS; screens manually inspected, scoped axe0/overflow0. Browser Auth/API/model/DB replies are authored fixtures, not provider acceptance. Local reused Next16.4.3 cache is not a pinned16.4.5 clean install. Lint retains6 existing unused-variable warnings, no new errors.
- [Reviewed rewrite native acceptance (source protocol) 42230851185/job127936031759](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851185/job/127936031759):124 Python tests and complete existing reviewed-rewrite native protocol/real bounded RPC HTTP10checks/3 AI writes PASS. Includes actual post-commit lost/malformed ACK/manual reads, ordinary goal/restore after AI, closed key/config/expiry history, effective-grant checks,12writers/1row/audit, fault/queue/reapply and owned populated20table native dump/restore/RLS/corruption refusal. SQL remains source-only, not CLI-packaged or installed in Supabase; real provider-copy/RPO/RTO acceptance OPEN.
- [Operational telemetry (synthetic Next) 42230851278/job127936032231](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851278/job/127936032231):41TS observer tests, existing Python/report and16 route labels/22 actual Next handlers PASS. Triggered parser/OCR/scanner and native regressions also SUCCESS; no live production/WAF/scanner acceptance implied.
- [Owned rewrite CPU diagnostic (synthetic only) 42230851319/job127936033480](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851319/job/127936033480):6 actual owned CPU responses/282 tokens/7 refused claims/0 changed, NOT ACCEPTED. [Exact-main adaptation CPU diagnostic (synthetic only) 42230851380/job127936032911](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851380/job/127936032911):16 actual responses/1074 tokens/0 gold, NOT ACCEPTED. Independent semantic/held-out checks NOT PERFORMED. Original reports/corpora/prompts/thresholds unchanged; rejected/stopped #66–#69 research reviewed, not resumed. No new1.5B inference occurred.
- Initial source742 passed runtime checks but manual copy review found the old confirmation sentence falsely asserting “No version was saved” after an unknown committed write. Current1f source separates review confirmation from storage outcome and tests absence of that false claim in RU/EN. An initial local7/8 new-browser run used the wrong JSON-button selector; corrected to actual “Скачать JSON + evidence”, preserving exact-download assertions. No assertion suppression/first()/automatic inference rerun or weaker gates.

Full project OPEN. Historical owner-authorized #1/#2 merges and0.34.0/b05c45d0b77fd1b25916892611ccc622d4b4b128 baseline retained; no future publication permission inferred. Actual SMTP/password recovery with agreed recipient+permission, Supabase-copy restore, operator PD hosting/retention/backups, qualified useful model/independent semantic/held-out/security/capacity/device/live acceptance, permitted HH contracts/scopes/writes and specific new merge/release approvals remain OPEN.

Next technical block: one **materially safer offline CLI packaging preflight**, distinct from the earlier network-capable CLI action refused over possible PostHog telemetry. Proposed pinned public CLI3.0.0 runs only after network=none/actual ENETUNREACH/nonroot/read-only/capability-free512MiB checks, in an empty job-owned project with private tmpfs home and public SQL, without credentials/project/session data. Seven local policy/archive/cleanup unit guards PASS; actual CLI execution/filename/provider advisors/migration-list/installation are **not yet established**. This code is outside the accepted UI source and will be independently reviewed/tested. Final docs-only head results remain separate from source success.

### Trust and recovery contract

Browser validation is authenticated-response consistency, never current HMAC verification or authentication of an imported file. Native acceptance/protected history remain authoritative. Frozen codecs preserve original acceptedAt/receipt/declared model and never refresh TTL; manual/model text never becomes a verified master fact.

Consent unmounts independently of the persistent attempt. Navigation/dirty/pause/source boundaries revoke consent while retaining an unknown nonce for explicit reconciliation. Clearing local results discards memory and does not delete server records. A late known valid ACK is still a known ACK; owner/frame changes prevent adoption. No error or absent manual read certifies rollback. Regular workspace reload is explicit.

DOCX is text-only OOXML, retains supported characters and line/paragraph content, and normalizes CRLF as before. It does not preserve the original binary document formatting. Personal export has workspace/audit/consent scope and is not a Supabase provider backup.

### Exact triggered source workflow inventory

| Workflow | Result |
| --- | --- |
| [Current application commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851249) | SUCCESS |
| [Current persisted reminder PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851518) | SUCCESS |
| [Mirror rollback compatibility — Current explicit writes PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851188) | SUCCESS |
| [Exact-main adaptation CPU diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851380) | SUCCESS |
| [Isolated document parser](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851289) | SUCCESS |
| [Current literal source versions PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851420) | SUCCESS |
| [Owned rewrite CPU diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851319) | SUCCESS |
| [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851278) | SUCCESS |
| [Rewrite diagnostic harness](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851332) | SUCCESS |
| [Synthetic saved-letter PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851527) | SUCCESS |
| [Reviewed rewrite native acceptance (source protocol)](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851185) | SUCCESS |
| [Current compact storage PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851363) | SUCCESS |
| [Synthetic source-profile PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851324) | SUCCESS |
| [Current version commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851329) | SUCCESS |
| [Mirror rollback compatibility — Current canonical reads PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851181) | SUCCESS |
| [Mirror rollback compatibility — Current projection parity PostgreSQL preflight](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851285) | SUCCESS |
| [Current profile commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851359) | SUCCESS |
| [Mirror rollback compatibility — Current logical backup PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851197) | SUCCESS |
| [Parser TLS API compact PostgreSQL integration](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851405) | SUCCESS |
| [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/42230851235) | SUCCESS |

The two untriggered predecessor workflows are not counted as current results. Two live-only browser checks remain skipped. No overall project/release acceptance, actual mail delivery/recovery, real-provider restore, paid deployment, third-party LLM transfer or HH write was performed.
