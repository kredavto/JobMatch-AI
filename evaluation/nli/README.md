# Preregistered independent NLI diagnostic — not production acceptance

Frozen before any model inference (1 November 2026). This evaluation-only stage is based on main `da2de99bcdfe924ca3dbf3cdba635980574dac54`; it contains neither rejected runtime candidate #66 nor an application integration of #67. AI/HH flags, app/library/API code, database and dependencies of the application are unchanged.

## Objective and decision

#67's Qwen2.5-1.5B instruction classifier produced 10/18 false-supported decisions and only 4/6 verdict-only positive matches (2/6 with exact evidence IDs). It never chose partial/insufficient. Hypothesis: a separately NLI-trained discriminative classifier can better distinguish full entailment from merely related facts without generative JSON/schema distractions. It may fail; do not equate architectural difference with higher quality.

Choose **one** model: `MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7`, immutable revision `b5113eb38ab63efdd7f280f8c144ea8b13f978ce`. The model card documents multilingual factual/adversarial NLI training including Russian and English. Its reported ANLI performance (~54%) is a warning, not safety evidence. The earlier MNLI/XNLI-only variant has slightly higher reported XNLI scores; the present choice favors the more relevant adversarial training hypothesis, not leaderboard shopping. MIT LICENSE is downloaded and hash-verified with the weights. Keep its permission notice. Author's original license file is retained as MODEL-LICENSE.

Source: https://huggingface.co/MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7/tree/b5113eb38ab63efdd7f280f8c144ea8b13f978ce

## Frozen protocol and metric

- Replay all 24 #67 cases byte-identically: `replay-v1.json` SHA256 `c4e0b886e5289f327d9c2c1f605a981fa63221664c8fdb5bb0483ec2759416b3`.
- Premise = ALL fact texts, original order, joined by one LF. Hypothesis = original requirement, unmodified. No filters, removal of negation/instructions, source/gold-dependent rewriting, or trial-specific prompt.
- Important confound: vacancy fragments and normative requests are not always declarative hypotheses. Replay tests task-formulation fit as well as NLI, and cannot isolate the cause of failure.
- Independently authored prospective supplementary challenge: 12 declarative pairs, six positive/six negative, three of each per RU/EN. `challenge-v1.json` SHA256 `2e3367a7f576ec53ebe41b5b8957c35acab4b93e1757beae6d8744ba141deba4`. Tests negation, roles, quantity, subjects and dates. Known categories and paired templates, not hidden acceptance data. Frozen before outputs.
- Exactly one CPU forward per pair, same model, full pair including special tokens <=512; **no truncation**. Overlength/error means incomplete, never a correct negative. No retries, per-case changes, automatic resources expansion, or threshold search.
- Record all three actual logits and softmax scores, raw argmax and fixed entailment score >=0.95 decision. Scores are NOT calibrated truth probabilities. Verify label order from pinned config. Other classes collapse to NOT supported; do not invent partial/neutral equivalences.
- Primary safety metric separately in each cohort: false-supported among negatives at threshold, and raw argmax false-supported reported alongside. Positive coverage is required to defeat an all-rejecting system.
- Exploratory signal per cohort: all rows valid, zero false-supported, at least 5/6 supported positives including at least 2/3 in EACH language. Both cohorts must pass before even considering further research. Passing is NOT production acceptance. Zero observed failures on 18 or six negatives cannot establish low real-world risk.
- Comparison with #67 is only descriptive for binary support verdicts on the unchanged replay. Compare 4/6 verdict-only, **not** 2/6 citation-aware success. Different model/task/output/threshold prevents controlled causal attribution.
- NLI supplies no source IDs, provenance validation or span localization. Existing guards are not replaced or relaxed. It does not generate/admit a rewritten resume, measure full adaptation or establish live acceptance.

## Free-resource and security preflight

Official GitHub documentation states standard public Ubuntu runners have 4 CPU /16 GB RAM and standard public-runner usage is free: https://docs.github.com/en/actions/reference/runners/github-hosted-runners and https://docs.github.com/en/actions/concepts/billing-and-usage . Repository visibility was independently checked public. No larger/self-hosted runners, paid API, credentials, uploads, caches or user data.

Pinned safetensors weights: 557,652,046 bytes; all allowlisted model files <600 MB. Float32 parameters estimated ~1.12 GB plus activation/runtime/tokenizer overhead; 4 GiB is a testable budget, not an empirical fit guarantee. Container cap stays 4 CPU/4 GiB with no swap, PID128, tmpfs64 MB, read-only filesystem, nonroot, dropped capabilities, no-new-privileges and network none. 600s internal alarm, 650s external container deadline, 25min total standard job. Preflight requires >=6GiB actual free target disk and >=5GiB available host RAM. CPU inference and download are bounded; budget breach stops, no silent paid/GPU escalation.

No pickle weights or remote code: safetensors only, pinned model/config/tokenizer hashes checked before AND after, local-files-only, offline environment. Dependency versions pinned in Dockerfile; actual key versions, image identity and peak RSS recorded. Base image/transitive packages are not fully hermetic; this is diagnostic evidence, not remote cryptographic attestation. Model/deployment identity flags remain false. Each completed row is flushed immediately; termination attempts a bounded partial report. A forced kill may leave only row checkpoints, which must not be mistaken for a complete report. Runtime gets only synthetic premise/hypothesis, never rationale or gold labels. No provider endpoint/contact/mail/database mutations.

## Interpretation / stop condition

A technically complete report ends the single pre-registered experiment, regardless of signal. Do not rerun the same hypothesis to seek green metrics. Publish the raw negative/positive evidence, retain `acceptance: not-accepted`, keep failed candidate draft, and do not merge/deploy docs-only for activity. A separate challenge, calibration, source-localization and live/durable safety design would still be necessary before any production activation.
