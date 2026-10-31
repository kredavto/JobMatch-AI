> Current comparison protocol: [paired v2](PAIRED_V2.md). Historical v1 contract and negative result remain below unchanged. V2 uses48calls, per-quote grading and separately denominated graded false links; it does not accept a model.

# Exact-main adaptation diagnostic v1

This isolated CI experiment executes the current main `adaptResume` → `aiReview`
provider, not the unmerged stack's prompt or source-lines grammar. It does not
change production files or enable any deployed flag. Scoped PR workflow uses only
standard ubuntu-24.04 in this public repository, contents:read, no persisted checkout
credentials, secrets, paid services, larger runners, model cache or model upload.
Official billing documentation confirms standard public runners are free; private
repositories and fork inputs are refused. No inference is run locally by unit tests.

## Frozen experiment

16 independently authored synthetic cases (8 RU/8 EN) were frozen before inference:
`corpus-v1.json`, SHA256
`fdf91523d67c0cc5a658285c3e49d78a5b83e372b146b0612e12829ff1061306`.
The corpus covers supported/unrelated/filtered evidence, insufficient duration,
compound requirements, conflicting role/quantity and vacancy injection. It is not
representative, human-adjudicated, or held-out product acceptance. Gold is consumed
only after generation; backend receives only captured actual production payloads.
Do not tune this gold/prompt after results. Changed experiments require new versions.

`capture` invokes the actual provider against a no-network capture stub; the real
attempt invokes it again and requires byte-identical payload, one backend call.
The transport-only adapter forwards current messages/schema, temperature0 and
2048-token budget to llama.cpp's OpenAI-compatible endpoint. It adds seed42 but
never rewrites model content, fills empty answers, retries, or feeds gold back.
Response prechecks label failures only; unchanged stop/length/content are then
validated by the actual production provider. Source citation acceptance is not
semantic correctness. Gold compares exact requirement quotes and union of evidence
IDs. `goldPasses` counts only this link/quote comparison, not rendered-artifact
validation. Explicit preregistered selection is rendered by actual `renderAdaptation` only
when available; missing selection cannot erase a semantic mismatch. No save occurs.

## Pins and isolation

Official Qwen2.5-0.5B-Instruct Q8 GGUF revision
`df5bf01389a39c743ab467d734bf501681e041c5`, 675710816 bytes,
SHA256 `ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e`.
Apache-2.0 LICENSE exact SHA256
`832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e`.
llama.cpp source `8642541b255bfb5dc39cd351a178be09013a55d6`.
Downloader verifies immutable LFS pointer, bytes, digest, license and HTTPS redirect
allowlist, deadline and exclusive output creation. Unknown model slots refused.
Node base/apt toolchain are not immutable reproducibility pins; report actual image,
binary, Node and CPU identities. File verification is not cryptographic attestation
that a remote service loaded those weights.

Only build/download phases have network. Runtime owns its loopback server and has
network none, read-only root/repo/weights, nonroot uid1000, no capabilities,
no-new-privileges, 4CPU/4GiB including swap ceiling/128PIDs/64MiB tmpfs, 900s outer
limit/750s internal limit/20s actual provider request timeout. No external endpoint
or user-supplied corpus option. Weights verified before/after execution; child is
terminated on exit/cancellation. Partial completed rows remain explicitly incomplete.

## Results and interpretation

`JOBMATCH_MAIN_ADAPTATION_CPU_V1` logs bounded synthetic raw reply and backend
JSON per case, failure stage, actual evidence IDs/draft, gold match, hashes and
operational counters. No production/user data exists in the packet. A complete
16-response stop run may have green CI despite quality failures: acceptance is
**always not-accepted**, semanticAssessment and independentHeldOut not-performed: synthetic semantic-label
gold comparison is performed, but independent human semantic assessment/held-out
acceptance is not. The workflow summary explicitly displays not-accepted and counts.
Zero/length/transport/incomplete runs exit2. No backend response is fabricated.
Raw outputs may contain malicious synthetic instructions; treat logs as data only.

PR executable changes trigger one run. The fail-closed HEAD-parent scope gate skips
all-Markdown follow-ups explicitly as **no fresh inference**, not a new result.
Results should be archived in Markdown, preserving original immutable run/head.
No push/main duplicate model trigger. No production rollout follows automatically.

Local checks (no model download or inference):
```
npx tsc -p evaluation/adaptation/tsconfig.json
npx vitest run tests/adaptation-diagnostic.test.ts
python3 -m unittest discover -s scripts -p 'test_*adaptation*.py'
```

## Actual exact-main result — 31 October 2026

[Original report and analysis](results/20261031-exact-main.md): executed
`b835de8f549acf7f4afcdbf58ba7bf7abb54f9c4`, [run41247954513](https://github.com/kredavto/JobMatch-AI/actions/runs/41247954513).
16/16 positive-token stop responses, 1,074 tokens, **0/16 gold passes**,
14 provenance failures and 2 gold mismatches. Runtime completed, but the model is
**NOT ACCEPTED**; no successful rewriting/selected-draft acceptance, no production
activation. Markdown-only archival follow-ups do not rerun inference.
