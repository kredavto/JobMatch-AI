# Rewrite diagnostic: verified HTTP harness, CPU runner pending

6 November2026. Continues checkpoint b4b0a47d367671d2a8ae7135a8a9096641406df3 on ready/unmerged PR#123. Fresh main/four plans/113open PRs read. No production activation or model acceptance.

Run from repository root with Node24:

```sh
npm ci --ignore-scripts
npx tsc -p evaluation/rewrite/tsconfig.json
node --test evaluation/dist/evaluation/rewrite/harness.test.cjs
```

25tests exercise the actual production provider over owned loopback HTTP. The backend callback returns authored synthetic responses; this is **not actual inference**. They cover all six frozen RU/EN cases, selected-only input, exact raw reply preservation, numeric findings, refusals, malformed/unfinished/oversized/invalid UTF8 responses, nonpositive/overflow token counts, cancellation, exclusive process environment lease and restoration on every exit.69existing rewrite tests, full application types and focused harness lint also passed locally. Separate rewrite-harness CI installs dependencies canonically and executes the same compilation/tests at the exact PR head, without model downloads, external inference or secrets.

`evaluateCase` changes process environment only during its owned operation. It refuses concurrent calls (`REWRITE_DIAGNOSTIC_BUSY`); callers must await completion before starting another case. It does not change global fetch. The local HTTP gateway checks the captured production wire and translates the backend OpenAI envelope to the production Ollama shape without editing assistant content. Backend success, contract validity and model refusal are separate recorded outcomes. No semantic assessment is performed. Proposed changes with numeric issues can be structurally valid but remain unreviewed and NOT ACCEPTED.

The six public authored synthetic cases were frozen before inference. Corpus SHA256:
`0703166fc0491ed093676cd6612331f680f26f45b6b4883eed9e2465c10bdf73`.
Do not retune this corpus/prompt after reading forthcoming model replies. It is not independent held-out evidence. The earlier workspace interruption is retained in the four plans; testing is now completed for this harness sub-block only.

## Remaining CPU diagnostic work

1. Add a bounded owned runner using the existing immutable public weights and llama.cpp revision, verifying model/license/size before and after execution. Preserve complete raw synthetic replies, actual tokens/finish reasons, source/compiled/binary/image hashes; no retries or output substitution.
2. Explicit new runtime:8192context/4096maxTokens/4threads/seed42. Do not edit/misdescribe the old4096/2048pin/defaults or frozen0/16report. The envelope adapter is not evidence of a verified deployed Ollama service.
3. Add a separate public same-repository disposable inference workflow with existing opt-in/disk/RAM/download gates, no secrets, read-only/nonroot/no-network bounded container, exact runtime proof and job-owned cleanup. Docs-only commits must not count as new inference.
4. Execute actual pinned model on this unchanged corpus, report failures without weakening guards; keep acceptance NOT ACCEPTED and semantic/independent-held-out/model/deployment identity gates open.

Human review/edit decisions, normalized immutable AI-version save with DB/legacy-forgery defenses and UI remain unfinished. SMTP/recovery, actual Supabase provider-copy restore, operator personal-data decisions, HH permissions and final live/security/device gates remain open. Full project incomplete.


### Hosted evidence — 6 November 2026

[PR#124](https://github.com/kredavto/JobMatch-AI/pull/124), source `720346f04bee38432bb3c80421498eee6b0d1a8b`, tree `bf1fa91a7891ea6cbb4b1fa767741e4ddae4e3ff`.
[Rewrite harness run42184806382/job127782496148](https://github.com/kredavto/JobMatch-AI/actions/runs/42184806382/job/127782496148) completed SUCCESS: canonical npm ci, compilation and25tests/0skipped confirmed from completed job logs. Immutable full-content readback of all eight written files passed; complete base/source tree comparison confirms exactly10changed files, no deletion,697prior blobs untouched. Separate [application run42184806471](https://github.com/kredavto/JobMatch-AI/actions/runs/42184806471) was still running when this evidence was recorded (install/graph/lint/types passed); no completed full application/browser CI result is asserted here. PR remains draft pending those checks. This final evidence update changes Markdown only; executable tests/harness/workflow remain exactly at the source above. No actual model run or semantic acceptance.
