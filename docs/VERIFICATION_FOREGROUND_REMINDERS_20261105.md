# Foreground reminder verification — 2026-11-05

[PR #119](https://github.com/kredavto/JobMatch-AI/pull/119), stacked on ready/unmerged #118. Fresh main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`, all four main plans and108openPRs were read before selection. #118 final400793d0 has17green workflows. Historical release0.34.0/b05c45d0 and explicit merged #1/#2 permission remain scoped; no later merge/publication permission is inferred.

## Accepted source and readback

Source `7aa71c18614f6097d1962449d4d6bc95eb00f49d`, tree `8fcb3b4d454006d8c34485f216e9b80ee4965830` exactly equals locally committed `6c4fff2c5888973387f5433a190faa40eebd897d` tree. Synthetic checkout `dc8948d05f918e28cbf9101f94c42e89892993b5` has that exact tree, verified through Git metadata. All13source files were completely read back at the immutable source and compared against expected content/blob metadata. Whole recursive tree is untruncated;642prior non-directory blobs outside the intended delta preserve type/mode/SHA, with no deletion. Only the native test evolved between the three source trees; production guards were preserved.

Fresh local1522unit/103files, types, lint(six existing warnings), production build and20security PASS. Focused discovery31tests (15new+16tracker) is discovery only. Local browser remains unavailable: previously recorded truncated Chromium install/packaged extraction failure. Hosted browser execution below is separate; no local/manual/physical-device pass.

## Failure history retained

Initial `103f696a88be3d1674ab9bf4c445f74a98646204`/tree4966a831: [App42010245533/job127187129585](https://github.com/kredavto/JobMatch-AI/actions/runs/42010245533/job/127187129585) had1522unit,468browserPASS/1FAIL/2liveSKIP.13/14new scenarios passed. Native test expected a second read but observed only the manual first read. A subclass wrapper was removed to observe the original API; this was not a proven diagnosis.

Second `47e5151454f44979fe3bcf8af0ae8dc356f3da9c`/treef8d6160b: [App42011818649/job127192461561](https://github.com/kredavto/JobMatch-AI/actions/runs/42011818649/job/127192461561) again had1522unit,468browserPASS/1FAIL/2liveSKIP. The original API was secure/native but `Notification.permission=denied` despite the test grant. Therefore no native constructor success was claimed. Both source attempts had16other successful workflows; actual model diagnostic remained0/16NOT ACCEPTED.

Accepted source preserves that default headless-shell/incognito configuration as a real negative test and separately launches full Chromium new headless (`channel: chromium`) in a new regular temporary profile. It checks the original native function/secure context/granted permission and the actual component's constructor-request counter. Cleanup closes the browser and removes only the newly created owned profile, even if closing fails. No mocked permission/constructor is used in this positive test; no unsupported browser is silently skipped. The observed difference between two configurations is not a general claim about all incognito browsers. [Channel/persistent context docs](https://playwright.dev/docs/api/class-browsertype), [upstream notification-testing issue](https://github.com/microsoft/playwright/issues/23954).

## Hosted accepted results

[App42013447387/job127197940390](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447387/job/127197940390): lint/types/build,1522unit/103files; **470browserPASS/2liveSKIP**, all15new cases and existing16tracker+11settings PASS. Actual native denial and regular-profile constructor cases both PASS. Synthetic permission/visibility/show-error injections separately cover no prompt/read before opt-in, consent withdrawal, owner/revision/session failures, no automatic retry, cancellation/stop/sign-out, late answer suppression, duplicate/clock bounds, privacy, RU/EN mobile automated axe and overflow. None proves physical delivery or a human permission-dialog flow.

[Native42013447197/job127197940626](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447197/job/127197940626):112Python and actual PG17 full/populated upgrade/default-off gates/TypeScript wire+exact ACK/owner/RLS/directDML/session/time/lifecycle/monotonic recreation;20writers1commit19conflicts;transactional late-fault rollback/forward definition+ACL+row parity;20table native synthetic dump/restore/fingerprint/corruption/account cascade PASS. Not provider-copy restore or production Supabase acceptance. No Supabase CLI invoked in this block; earlier telemetry-related automatic-review refusal respected.

[Scanner42013447278/job127197939955](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447278/job/127197939955): refreshed ClamAV1.4.6 signed loaded database28174 dated2026-11-05T06:26:24.000Z, observed2026-11-05T10:47:45.826Z; unchanged24h gate. Signed observer/startup/ZIP/boundaries/encryption/private-network/fail-closed paths PASS; synthetic resources removed.

[CPU42013447444/job127197940271](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447444/job/127197940271): exact accepted head, actual16synthetic backend responses/1074tokens, **0/16gold, NOT ACCEPTED**;14provenance failures/2gold mismatches. Semantic assessment/independent held-out not performed; model/deployment identity not verified. Frozen prompt/corpus/weights unchanged. This is not a verified generative rewrite model or real-user LLM transfer.

All17relevant source workflows SUCCESS:

| Workflow | Run | Result |
| --- | --- | --- |
| Operational telemetry (synthetic Next) | [42013448112](https://github.com/kredavto/JobMatch-AI/actions/runs/42013448112) | SUCCESS |
| Mirror rollback compatibility — Current canonical reads PostgreSQL protocol | [42013447471](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447471) | SUCCESS |
| Mirror rollback compatibility — Current explicit writes PostgreSQL protocol | [42013447179](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447179) | SUCCESS |
| Current application commands PostgreSQL protocol | [42013447219](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447219) | SUCCESS |
| Current persisted reminder PostgreSQL protocol | [42013447197](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447197) | SUCCESS |
| Mirror rollback compatibility — Current logical backup PostgreSQL protocol | [42013447125](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447125) | SUCCESS |
| Synthetic source-profile PostgreSQL protocol | [42013447435](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447435) | SUCCESS |
| Current version commands PostgreSQL protocol | [42013447533](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447533) | SUCCESS |
| Mirror rollback compatibility — Current projection parity PostgreSQL preflight | [42013447189](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447189) | SUCCESS |
| Current compact storage PostgreSQL protocol | [42013447121](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447121) | SUCCESS |
| Synthetic saved-letter PostgreSQL protocol | [42013448099](https://github.com/kredavto/JobMatch-AI/actions/runs/42013448099) | SUCCESS |
| Current profile commands PostgreSQL protocol | [42013447412](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447412) | SUCCESS |
| Current literal source versions PostgreSQL protocol | [42013447078](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447078) | SUCCESS |
| Parser TLS API compact PostgreSQL integration | [42013447194](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447194) | SUCCESS |
| Exact-main adaptation CPU diagnostic (synthetic only) | [42013447444](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447444) | SUCCESS |
| Isolated document parser | [42013447278](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447278) | SUCCESS |
| Application checks | [42013447387](https://github.com/kredavto/JobMatch-AI/actions/runs/42013447387) | SUCCESS |

## Limits and next work

[Contract](CURRENT_FOREGROUND_REMINDERS.md): explicit RAM opt-in, visible-tab only, authenticated fresh owner reads, generic payload, five-minute eligibility, bounded RAM duplicate suppression and cancellation/stop/logout/error/stale/busy guards. Native constructor counter is a show **request**, not physical device receipt. External cancellation reconciles on the next permitted read; no atomic read-and-OS transaction, hidden/closed-tab delivery or durable/cross-tab exactly-once claim. Server `delivery:none` and API/DB write gates remain unchanged/defaultOFF.

Final evidence changes only six Markdown files. Final immutable readback, complete code/test type/mode/SHA parity and documentation-triggered CI are recorded in PR metadata; docs-only CPU is not fresh inference. No API/SQL/PWA/worker/dependency/liveflag/config/DB/mail/real-userLLM/HHwrite/paidinfra/mainmerge/release/deploy changes.

Full actualSMTP/recovery approvedrecipient/run,actualSupabaseprovider-copyrestore/target/cost/RPO/RTO,operatorPDplacement/retention/deletion,HHpermissions,qualifiedmodel/semantic/held-out,independentsecurity/capacity/manual/screen-reader/physicalPWA/device/live acceptance OPEN. Internal English immutable resume codecs and supportedtooling remain. Next technical block: explicit separately versioned English resume framing/export/storage preserving previous Russian bytes and evidence; interface locale must not relabel saved versions. Project incomplete; automation continues.
