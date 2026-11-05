# Current ordinary English verification — 2026-11-05

[PR #120](https://github.com/kredavto/JobMatch-AI/pull/120), stacked on ready/unmerged #119 final f7801865bbcddf58897780dc9c842e161dd319e0. Fresh main a3a9ef0c69e1e760010fc391234d66cd4a747e3b, four main plans and109openPRs were read before selection; earlier #43/#44 inspected. Their older schema/runtime evidence is not reused as current acceptance. #119 final17workflows succeeded.

## Accepted source and complete readback

Accepted source `56ba9ae95000d2e130427718e4ce0721f47fa50c`, complete tree `d3099eadcf0842c2002b27a3c357b6b6400ec4a6` equals locally committed `78f459788a830e7029061d72edf1cb877042ce3f` tree. Actual synthetic checkout `6a6ddc6d55dae415c50382752860898c502085e5` has the exact same tree, verified through Git metadata. All51sourcefiles were fully read back from that immutable source and matched expected content/blob metadata. Recursive tree untruncated,673blobs;622prior non-directory blobs outside the intended delta preserve type/mode/SHA, with no deletion.

Production code is identical across the three source candidates. Only native-fixture diagnostics/destination isolation changed after initial publication. Default Russian command/text/untagged metadata remains compatible; new-save result validation is deliberately stricter for both languages. Earlier migrations and all older predecessor SHA pins are unchanged.

Fresh local1586unit/106files,115Python,types/lint(sixexistingwarnings)/productionbuild/20security PASS. Focused Playwright discovery33tests/3files includes9newscenarios; discovery alone is not execution. No local PG/browser/manual/physical-device claim: local Chromium remains unavailable as previously recorded, SQL/browser functional results below are hosted CI.

## Failure history and correction

Initial source `637e34cb4b003d8b0ab4ab62ff3e7de816411df7`/tree3de26907: [Application42025054399/job127237052891](https://github.com/kredavto/JobMatch-AI/actions/runs/42025054399/job/127237052891) PASS1586unit/106files,479browserPASS/2liveSKIP; all9newcases passed.18/19workflows succeeded. [Native42025054282/job127237052371](https://github.com/kredavto/JobMatch-AI/actions/runs/42025054282/job/127237052371) passed the existing RU protocol (32prepare/render-vs-SQL cases per path), but the English extension failed in its broad closed-rollback/restore/reapply stage. Not a complete native English/restore pass.

Diagnostic source `70ff05b2bd2a2b743f3957320072fba06a0885ab`/tree40fe0ec7: [Native42026537435/job127242037919](https://github.com/kredavto/JobMatch-AI/actions/runs/42026537435/job/127242037919) isolated **FileExistsError at reapply-checkpoint**. Two independent database paths shared a protected manifest destination. The snapshot tool correctly refused to overwrite prior evidence. Diagnostic output lists only failing stages, routine/ACL field names or relation names, without rows/raw provider diagnostics.

Accepted source gives each generated owned database its own before/after manifest names. Atomic no-overwrite behavior and every exact data/definition/ACL comparison remain intact. No production guard or migration was weakened. Both failed native attempts remain recorded.

## Hosted accepted source

[Application42027009520/job127243620869](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009520/job/127243620869): types/lint/build, **1586unit/106files;479browserPASS/2liveSKIP**, all9new current-controller cases PASS. Explicit independent template/locale/navigation, captured pending intent, old Russian/opaque history preservation, exact JSON/TXT/stored DOCX, unchanged original CRLF when selection empty, tampered/lost ACK manual reconciliation, unsolicited English refusal for Russian intent, exact history restore, dirty forced-handler refusal and English mobile automated axe/overflow PASS. No real model/SMTP/Supabase Auth/manual Word/screen-reader/PWA/device acceptance.

[Native42027009142/job127243620475](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009142/job/127243620475):115Python and existing current RU protocol PASS. Extended actual PG17 populated upgrade/full schema PASS: transactional late-fault rollback; default API+DB permission closed; current TypeScript service→owned loopback transport→real SQL→exact ACK→stored DOCX; **64native Unicode rendering/ACK cases** across both paths. Real backend commits followed by altered/lost HTTP replies reject success, commit exactly once and reconcile through a separate authenticated read, without replay.20writers produce1commit/19conflicts/1audit per schema; owner/session/unknown-tag and actual100record cap guards PASS. Closed rollback retains exact English restore; reapply preserves data and routine definitions/ACLs. Real20table synthetic pg_dump/pg_restore preserves function grants, owner read/default/RLS and English extra; tag corruption is detected. Synthetic Auth/transport/native restore **not actual Supabase provider-copy restore, migration-list/advisor or live production acceptance**. CLI telemetry-related automatic-review refusal respected; no Supabase CLI invoked for this block.

[Scanner42027009466/job127243621793](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009466/job/127243621793): actual ClamAV1.4.6/refreshed signed28174 dated2026-11-05T06:26:24.000Z, observed2026-11-05T12:27:06.021Z, unchanged24h gate PASS. Signed observer/private-network/startup/ZIP/nesting/encryption/limits/fail-closed paths PASS; temporary resources removed.

[CPU42027009437/job127243621003](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009437/job/127243621003): actual16synthetic backend responses/1074tokens at the accepted authored head;0/16gold,14provenance failures/2gold mismatches, **NOT ACCEPTED**. Semantic/independentheld-out not performed; model/deployment identity not verified. Frozen prompt/corpus/weights remain unchanged. Successful diagnostic workflow is not model qualification or generative rewriting acceptance.

All19relevant source workflows SUCCESS:

| Workflow | Run | Result |
| --- | --- | --- |
| Operational telemetry (synthetic Next) | [42027009548](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009548) | SUCCESS |
| Central pre-auth quota (synthetic PostgreSQL) | [42027009518](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009518) | SUCCESS |
| Current persisted reminder PostgreSQL protocol | [42027009566](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009566) | SUCCESS |
| Mirror rollback compatibility — Current projection parity PostgreSQL preflight | [42027009117](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009117) | SUCCESS |
| Mirror rollback compatibility — Current canonical reads PostgreSQL protocol | [42027009450](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009450) | SUCCESS |
| Current compact storage PostgreSQL protocol | [42027009034](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009034) | SUCCESS |
| Mirror rollback compatibility — Current logical backup PostgreSQL protocol | [42027009560](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009560) | SUCCESS |
| Mirror rollback compatibility — Current explicit writes PostgreSQL protocol | [42027009555](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009555) | SUCCESS |
| Current application commands PostgreSQL protocol | [42027009418](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009418) | SUCCESS |
| Current profile commands PostgreSQL protocol | [42027009459](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009459) | SUCCESS |
| Synthetic saved-letter PostgreSQL protocol | [42027009035](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009035) | SUCCESS |
| Parser TLS API compact PostgreSQL integration | [42027009636](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009636) | SUCCESS |
| Current version commands PostgreSQL protocol | [42027009142](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009142) | SUCCESS |
| Synthetic source-profile PostgreSQL protocol | [42027009273](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009273) | SUCCESS |
| Mirror rollback compatibility — Synthetic PostgreSQL restore | [42027009522](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009522) | SUCCESS |
| Current literal source versions PostgreSQL protocol | [42027009146](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009146) | SUCCESS |
| Isolated document parser | [42027009466](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009466) | SUCCESS |
| Exact-main adaptation CPU diagnostic (synthetic only) | [42027009437](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009437) | SUCCESS |
| Application checks | [42027009520](https://github.com/kredavto/JobMatch-AI/actions/runs/42027009520) | SUCCESS |

## Boundaries and next work

[Contract](CURRENT_ORDINARY_ENGLISH.md). Frozen ordinary-literal-en-v1 headings, literal wording/numbers/evidence, independent choice and immutable recorded metadata; complete new-save ACK for both languages. This is deterministic framing, not semantic/model/source-authentication proof. Ordinary JSON is not a full original-source snapshot or signed preview hash. English new-formatting flags defaultOFF; stored reads/exact restore survive disabling. API capability, exact source-body predecessor guards, invoker/definer/grants/search_path and shared normalized revision/cap retained. No new table/archive scope or package changes.

Final evidence changes only six Markdown files. Final immutable content/blob readback, whole-tree code/test type/mode/SHA parity and documentation-triggered checks are recorded in PR metadata; docs-only CPU is not fresh inference. No liveDB/config/flags/mail/real-userLLM/HHwrite/paidinfra/mainmerge/release/productiondeploy. Historical0.34.0/b05c45d0 and explicit merged#1/#2 permission remain scoped to those actions.

Next available internal block: current structured-source English immutable codecs; supported tooling and actual generative/model qualification also remain. Full actualSMTP/recovery approvedrecipient/run,actualSupabase-provider-copyrestore/target/cost/RPO/RTO,operatorPDplacement/retention/deletion,HHpermissions,independentsecurity/capacity/manual/screen-reader/physicalPWA/device/live acceptance OPEN. Full project incomplete; automation continues.
