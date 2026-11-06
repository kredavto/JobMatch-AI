# Preregistered independent support classifier diagnostic v1

**Experimental verifier, NOT semantic verification or model acceptance.** No app,
API, production lib, database, credentials or feature flag changes. This is an
offline synthetic experiment only, unrelated to promotion of rejected PR66.

## Objective hypothesis and decision rule (fixed before inference)

Instead of asking a small generator to extract/link all requirements, ask a
separate instruction-tuned model to classify ONE requirement against the complete
bounded supplied source context: supported / partial / contradicted / insufficient.
The hypothesis is that this decomposition can reject unsupported claims while
retaining useful positive support. All negations and source instructions remain
in context; no eligibleAiFacts filter is used to hide the hard cases.

- supported: all required elements directly established, including scope/units.
- partial: proper subset of an explicit multi-clause requirement established,
  remainder unestablished, without an explicit contradiction.
- contradicted: explicit denial or incompatible statement of the same scoped claim;
  contradiction takes precedence over partial support.
- insufficient: no relevant clause established, unrelated measure, ambiguous dates,
  or instructions without an actual accomplishment.

Primary metric is **false-supported proposals among18 non-supported cases**,
counted after JSON parsing BEFORE schema/citation rejection. Separately report
admitted false-supported outputs after those guards, supported success among6
positive cases (verdict AND exact gold evidence IDs), verdict-only supported
proposals, separate parsed/validated exact-label confusion matrices,
per-language counters and physical/schema coverage. Parsed unsafe proposals must
not disappear merely because their IDs were invalid. Raw invalid/unreceived outputs
remain separate failures, not safe negatives.

Preregistered exploratory signal requires all24 valid outputs, zero false-supported
proposals, at least5/6 supported successes and at least2/3 positives in each language.
The predicate also requires uninterrupted execution and unchanged verified weights.
Even if it passes, `acceptance` remains **not-accepted**:24 templated synthetic cases
are not human semantic, real-world, independent held-out or deployment acceptance.
No automatic routing of real resumes or generator outputs to this classifier.

## Model choice and resource boundary

Official Qwen2.5-1.5B-Instruct Q8 GGUF, Apache-2.0:
https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF
- revision91cad51170dc346986eccefdc2dd33a9da36ead9,
  file qwen2.5-1.5b-instruct-q8_0.gguf,1894532128bytes,
  SHA256 d7efb072e7724d25048a4fda0a3e10b04bdef5d06b1403a1c93bd9f1240a63c8.
- Exact Apache license hash832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e checked at download/runtime.
- Pinned llama.cpp8642541b255bfb5dc39cd351a178be09013a55d6; actual binary/image/CPU recorded.

This available pinned1.5B model is chosen for a bounded CPU feasibility test, NOT
because its advertised multilingual capability proves support-classification
quality. Prior adaptation and profile diagnostics did not accept it. Model size,
task, prompt and token budget differ from the0.5B experiments, so no causal or
head-to-head improvement claim is permitted. We do not treat same-family model
self-approval as an independent guarantee.

One attempt per case,24requests; seed42,temperature0,context4096,256output tokens,
20s request bound,750s internal run deadline and900s container timeout. Standard
public ubuntu24 GitHub runner only;4CPU/4GiB/128PID, nonroot/read-only/network-none
model runtime, no swap growth, no cache/model upload/secrets/user data. Immutable
pointer/size/digest/license and actual disk/RAM preflight must pass. No local Docker
or existing production inference endpoint is available; this experiment runs only
in authorized free public CI. Missing resources fail closed, not paid provisioning.

## Frozen corpus and evidence

24 independently annotated new synthetic cases,6/class and3RU+3EN/class.
`corpus-v1.json` SHA256
c4e0b886e5289f327d9c2c1f605a981fa63221664c8fdb5bb0483ec2759416b3.
Gold/rationale/case IDs/language/class-order metadata are NOT in model messages.
The author knows previous failure categories; these are not hidden held-out data.
Evidence IDs are gold-scored only for supported cases; every returned ID still
must name an actual supplied fact and be unique. No gold/prompt tuning after run.

Report preserves exact request hashes, raw bounded synthetic replies/envelopes,
all failure stages and source/model/runtime identities. attempted rows are separate
from complete physical stop responses and valid classified outputs. Timeout does
not establish that the server produced no tokens. Summary contains only validated
bounded counters, never model text. Green workflow means diagnostic execution,
not semantic safety. Final Markdown-only archive skips fresh inference.

A successful pilot would justify a larger separately reviewed adversarial/held-out
study and an explicit operational acceptance decision, not production activation.
Full rewriting additionally needs claim-level provenance and durable reviewed
versions: current SQL accepts literal rules-v1 only, and an additive migration
requires approved backup/restore and data handling. Live acceptance still requires
explicit disposable-account/mail permissions and a working trusted browser path.
