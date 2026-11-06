# Rewrite CPU diagnostic — actual all-refusal result

Node24 verification:

```sh
npm ci --ignore-scripts
npx tsc -p evaluation/rewrite/tsconfig.json
node --test evaluation/dist/evaluation/rewrite/*.test.cjs
```

27tests pass locally and in the hosted harness. The actual public same-repository owned CPU run used existing immutable public weights/license/llama.cpp; runtime explicitly8192context/4096maxTokens/4threads/seed42. Frozen corpus/prompt unchanged. [Complete report and prior failure](results/20261106-owned-cpu.md).

The actual model returned6positive-token stop responses/282tokens; all6contract-valid, all7selected fact claims refused. **Zero actual rewrites; model NOT ACCEPTED.** No lexical findings because no text was changed. Runtime validity is separate from utility, semantic or held-out assessment. Model/deployment identity remains unverified. The explicit loopback OpenAI→Ollama envelope adapter is not a verified deployed provider.

The runner is default-closed: exact public CI/repository/opt-in guards, bounded CPU/RAM/pid/time/no-network/read-only/nonroot owned container, verified immutable weights/license before and after, no retries, exact source/compiled/image/binary hashes and full raw synthetic replies. Its flags are separate from production flags. CLI misuse refuses before model access. Process environment lease refuses overlapping evaluateCase calls and restores every owned setting on exit. Test backend fixtures are authored; only the archived CPU report contains actual model outputs.

Initial generic runtime refusal is retained without an invented root cause. Added bounded owned startup diagnostics; instrumented run succeeded without relaxed guards. Markdown-only evidence changes do not execute fresh inference (existing fail-closed scope helper).

Human review/edit decisions, normalized immutable AI-version save with DB/legacy-forgery defenses and UI remain unfinished. Independent semantic/held-out evaluation/useful model, SMTP/recovery, actual Supabase provider-copy restore, personal-data decisions, HH permissions and final live/security/device gates remain OPEN. Full project incomplete; no production activation/merge/release.
