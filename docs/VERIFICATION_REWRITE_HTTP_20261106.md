# Protected reviewed rewrite HTTP API — 2026-11-06


## 2026-11-06 — PR #131: protected HTTP acceptance and historical read

[PR #131](https://github.com/kredavto/JobMatch-AI/pull/131), above unmerged #130 final `2b998415f3d7d6ef3929cc2de6c95c7e27df1a98`. Accepted source `6b0a8ae44453cb6f08b56905ba489b286998fb89`, tree `607cec6aa602d8d9c9cadef7281f8bd19c6ee4c4`; independently fetched CI merge `f8914dab61a36bbf0acae9669bf3717d0bc9ed58` has the same tree. All22 source workflows SUCCESS. Main remains the previously read `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`; no merge/release/deployment/provider operation. Historical owner-authorized #1/#2 merges and 0.34.0 baseline retain their original scope.

- POST /api/rewrite-versions accepts only exact reviewed receipt/owner/revision plus separate explicit consentToStore and STORE_REVIEWED_AI_REWRITE. Default-off storage flag, same-origin/fatal-UTF8/512KiB/Auth/quota/current outer+nested MAC/source/config/key/deadline/reauth checks before one native call; SQL independently repeats authorization under lock. Score is existing rules on saved facts, not generated-text quality. No client text/source/score/config override, model call, automatic retry or snapshot fallback.
- GET history/single nonce works without current AI/write flags, signing key or unexpired receipt. Reserved AI namespaces require an installed closed native boundary. Compatibility snapshot containing AI metadata is discarded; read_rewrite_workspace checks protection and reads in one native statement/snapshot. Thus a delayed pre-installation JSON cannot acquire trust from a later readiness response. Ordinary command ACKs with AI history must match the protected read; changed/unavailable post-write state is WORKSPACE_WRITE_INVALID, not a rollback certificate. Legacy reads without reserved metadata have no new RPC dependency; canonical RLS reads may omit the older optional ownerId.
- Boolean readiness checks remain strict; effective INSERT/UPDATE/project bypass grants or missing freeze/guard functions close history/write capability. Current model/config/key gates apply to new acceptance only. Source SQL in supabase/protocols is still **not a CLI-generated migration**, not appended to schema.sql, and not installed in Supabase. Packaging/authorized provider installation remain OPEN.
- Unknown transport or malformed ACK after the native call returns outcome-unknown/invalid-write feedback. No replay. Full collections fail on malformed/unknown reserved tags, owner/provenance corruption or missing restore ancestors. No partial/empty repair.
- [Native PG17 run42222967224/job127909268410](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967224/job/127909268410) PASS:124 Python tests, full existing source-only protocol drill, plus production Next handlers → real bounded loopback RPC → native SQL,10 HTTP checks/3 AI writes. Confirmed actual lost and malformed responses **after commit**, exact manual nonce reads without another write, unchanged master source/facts, stale replay refusal, ordinary goal/restore after AI, immutable restore archive, key-rotated/disabled/expired historical rendering and effective-grant refusal. Auth envelopes/proposals are authored; no Auth-provider/model acceptance. Existing populated20table pg_dump/pg_restore/RLS/corruption drill remains synthetic owned-cluster evidence, not Supabase provider-copy restore/RPO/RTO.
- [App42222967316/job127909269902](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967316/job/127909269902): clean dependency graph/lint/types,1976 unit/API tests/118 files, pinned Next16.4.5 build,513 browser PASS/2 live SKIP. Local bounded full suite1976/118 PASS;69 new-block route/DB tests PASS;124 Python and29 security tests PASS; types/lint PASS with6 existing unused-variable warnings. Local reused Next16.4.3 cache is not claimed as a pinned16.4.5 clean installation. Initial local fixture used wrong goal-command keys (kind/goal instead of action/text); corrected the fixture, preserving production schema. A local implicit-any diagnostic was corrected before publication.
- [Ops42222967676/job127909270040](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967676/job/127909270040):16 static route labels/22 actual Next handlers, private canary refusal and capped/inconclusive reporting PASS. Added RU/EN fixed storage/history errors and no untrusted diagnostic display.
- **Prior #130 final-head erratum:** source4fa had22 SUCCESS, but doc-only final2b998415 App42220380694/job127900640288 FAILED:512 browser PASS/2 live SKIP/1 FAIL. A lost-English-letter test used ambiguous getByRole('alert') while two legitimate warnings were visible. #131 explicitly checks both expected warnings and count2; no first()/suppression/automatic rerun. Targeted local Chromium test PASS; accepted source131 full513 browser PASS. #130 final head is not relabelled all-green; its other21 workflows succeeded. Original source evidence/failure logs and model reports remain unchanged.
- Actual source CPU diagnostics remain **NOT ACCEPTED**: [rewrite42222967418/job127909269202](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967418/job/127909269202),6 responses/251 tokens/7 refused claims/0 changed; [adaptation42222967272/job127909269124](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967272),16 responses/1074 tokens/0 gold passes. Both complete runtime reports; independent semantic/held-out acceptance NOT PERFORMED. Prompt string SHA e531f3a6d343ae61773928fc6e2d3aec58aa2804af2e34e01ad039bbf2d48a7f remains distinct from prompt file SHA ff51cfd359eb90970f3ef0f4f713395230a8f047d4844f8183ef84592ab786e2.

Full project OPEN. Next available internal block: current RU/EN editor separate storage consent, exact immutable-history adoption/manual reconciliation, provenance/history/TXT/JSON/DOCX/restore and owner/revision/navigation browser checks. New UI work is not part of the above accepted source. Real SMTP/password recovery with agreed recipient+permission, actual Supabase-copy restore, operator PD hosting/retention/backups, permitted HH operations, useful owned model/independent semantic/held-out/capacity/security/device/live operational acceptance, and new merge/release approvals remain OPEN. No emails, third-party LLM transfer, HH writes, paid infrastructure or production activation. Final documentation-only commit checks must be tracked separately; source success is not a future-head result.

### Contract and trust boundary

Native readiness checks are not authentication of an imported archive. Only a protected server read after namespace closure supplies the history assertion; the frozen codec then checks internal consistency. The compatibility read is discarded when any reserved tag appears. There is no current-key/TTL requirement for an archived version. Administrative SQL remains an operator authority outside the closed public/auth/service-role write paths.

POST body: action=accept, expectedOwnerId, revision, receipt, consentToStore=true, accept=STORE_REVIEWED_AI_REWRITE; unknown fields refuse. The receipt carries the exact review, chosen source/model/manual origins and lexical acknowledgements. Native SQL supplies acceptedAt, immutable row and audit/consent together. A current endpoint read or a successful adapter is not proof of model usefulness. The human declaration is not semantic validation.

GET requires an authenticated actor and one expectedOwnerId; optional single UUID id enables bounded manual reconciliation. Duplicate/unknown query parameters refuse. A missing version in one read does not prove that a queued request rolled back. History reads and ordinary command responses do not silently remove malformed records.

### Source CI inventory

| Workflow | Result |
| --- | --- |
| [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967676) | SUCCESS |
| [Current compact storage PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967468) | SUCCESS |
| [Mirror rollback compatibility — Current logical backup PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967150) | SUCCESS |
| [Current persisted reminder PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967230) | SUCCESS |
| [Rewrite diagnostic harness](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967274) | SUCCESS |
| [Mirror rollback compatibility — Synthetic PostgreSQL restore](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967063) | SUCCESS |
| [Mirror rollback compatibility — Current canonical reads PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967231) | SUCCESS |
| [Central pre-auth quota (synthetic PostgreSQL)](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967153) | SUCCESS |
| [Synthetic source-profile PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967164) | SUCCESS |
| [Mirror rollback compatibility — Current projection parity PostgreSQL preflight](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967319) | SUCCESS |
| [Current application commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967211) | SUCCESS |
| [Parser TLS API compact PostgreSQL integration](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967128) | SUCCESS |
| [Mirror rollback compatibility — Current explicit writes PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967263) | SUCCESS |
| [Current version commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967348) | SUCCESS |
| [Current profile commands PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967220) | SUCCESS |
| [Reviewed rewrite native acceptance (source protocol)](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967224) | SUCCESS |
| [Isolated document parser](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967221) | SUCCESS |
| [Synthetic saved-letter PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967255) | SUCCESS |
| [Current literal source versions PostgreSQL protocol](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967368) | SUCCESS |
| [Owned rewrite CPU diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967418) | SUCCESS |
| [Exact-main adaptation CPU diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967272) | SUCCESS |
| [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/42222967316) | SUCCESS |

### Source sequence

- d907d56da806db338bdefac3997e3a489555d460: first HTTP implementation; native127905746257 PASS,10 checks/3 writes. Separate readiness followed by a historical snapshot was strengthened later; this earlier success is not proof of the new atomic-read property.
- 34ff82639b79de25308c6c915d7c1fc7d0171902: exact dual-warning browser assertion; native127907072911 PASS.
- 6b0a8ae44453cb6f08b56905ba489b286998fb89: protected one-statement historical read plus two delayed-snapshot regression tests; full22 source workflow success above.
- Local UI files started after source publication are excluded from this PR/source evidence. The next branch must independently test them.

### Deployment remains closed

JOBMATCH_AI_REWRITE_STORAGE_ENABLED defaults false. Review/rewrite/owned-provider config and native key/config readiness must all be explicitly active for a new write. No production setting was changed. The SQL source is tested only in disposable generated loopback PG databases; no packaged CLI migration, real-provider restore, operator-data decision or production AI enablement is claimed.
