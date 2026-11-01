# Preregistered typed-support three-arm diagnostic — NOT production acceptance

Frozen protocol before any inference, 1 November 2026. Base main `da2de99bcdfe924ca3dbf3cdba635980574dac54`. This is an isolated evaluation-only experiment; no app/lib/API/SQL/package/flag changes. #66–#68 remain unaccepted drafts, not production dependencies.

## New question and honest boundary

#68 showed a real, high-confidence temporal defect: isolated dated tasks were mistaken for continuous years of work in RU and EN. This is not a short-context or compute issue. The next question is NOT whether raising the entailment threshold hides those errors. It is whether explicitly represented subject/time/quantity claims can be checked with a conservative formal contract, and what coverage is lost when NLI is also required.

This is **bounded formal-language verification**, not general semantic understanding or free-text resume adaptation. Inside the grammar, the typed algorithm already decides support. Therefore three arms on identical inputs are mandatory:

1. NLI-only: unchanged pinned classifier and fixed entailment score >=0.95.
2. Typed-only: explicit grammar + subject/scope matching + interval/count rules.
3. Hybrid: NLI support AND typed allow; abstention never permits a claim.

NLI cannot add safety beyond the complete typed decision inside this language; it can add false negatives. A reduction relative to NLI-only must not be credited as learned/general semantic improvement. Natural free-text parsing remains unsolved. The grammar-shaped cases are not a representative hidden benchmark.

## Representation before inference

`typed.py` accepts complete source lines and complete claims, with no text normalization, deletion, repair, substring guessing or model-generated attributes. All lines must parse; an unknown line, negation outside the grammar, unsupported claim or mixed syntax language causes unrepresented + abstain. Negations are NOT parsed contradiction proofs. Source truth/authenticity is an assumption of this synthetic fixture, not established by the parser.

- Actors are exact synthetic identifiers Person-A / Person-B / Company / Кандидат-А / Кандидат-Б / Компания. Identifiers can appear in either syntax language; they are not real-world identities or translated aliases.
- Quoted role/unit labels contain 1–50 letters/spaces/hyphens, first/last character a letter. Exact equality only, no stemming, synonyms or semantic interpretation of label internals.
- Explicit continuous intervals run from the start of one year to the start of another, `[start,end)`; years1900–2100, start<end. A claim requests1–99 full continuous years. Merge overlapping/touching intervals for the SAME subject and role; use longest connected component, NEVER sum gaps. Isolated event-years do not establish continuity.
- Quantities are exact exhaustive personal totals during the entire named year, integers0–100000, exact subject/unit/year scope. Do NOT sum repeated or different rows. Incompatible exact totals of the same scope cause abstention, even if both exceed a requested minimum. This is a conservative review policy for inconsistent evidence, not classical logical explosion.
- All parsed fields and full clauses carry exact Python Unicode-codepoint spans and source quotes. Span equality alone is not semantic verification: full grammar matching supplies the limited interpretation, and out-of-grammar material is retained and rejected rather than silently filtered.

The independently authored annotations include complete expected representations, field/full-clause spans, policy decisions and entailment labels. They were constructed without calling/importing this parser; quote offsets were independently checked against source text. Parser output must match those frozen annotations for all cases **before model loading**. No gold regeneration from parser output. The pre-inference comparison measures this small frozen grammar test, not generic extraction accuracy. Zero typed false-supports and zero representation errors on this corpus are enforced prerequisites already known before inference, NOT new model discoveries; the genuinely measured quantity is NLI behavior and coverage cost relative to typed-only.

## Frozen corpus, counters and decision

`corpus-v1.json` SHA256 `d15d9db68eb32fbdce74c62a01c082ce1fe52f16205660caf22de55e08847726`,42cases.36 represented cases:12 each temporal/subject/quantity,6positive6negative per domain,3positive3negative per language/domain. Six additional out-of-grammar probes include3positive paraphrases and3negative cases. Total21positive/21negative,21RU/21EN. All6 probes stay in the overall denominator; unknown is not a verified negative. Two represented conflicting-count cases also abstain.

Coverage tables include physical NLI rows, represented cases, representation errors, typed veto/abstention, and per-arm processed/valid, supported-positive, false-supported and abstention counts. Typed arm `valid` means deterministic processing completed, not that an unknown was semantically assessed. Report all raw logits/scores/argmax and exact typed assessments. Preserve partial rows; incomplete inference is not a negative decision. Scores are not calibrated truth probabilities.

Preregistered exploratory hybrid signal:42physical outputs,0representation errors,0false-supported across all21negatives, at least15/18 represented positives including>=5/6 EACH domain and>=7/9 EACH language. Report overall positive coverage against21, not only the easier18. Typed-only and NLI-only metrics remain equally visible. Even a passing signal is **always NOT ACCEPTED** for production, genuine paraphrasing or free-text semantics.

Before inference, property/regression tests check interval union vs an independent year-set calculation over1000seeded cases, ordering/duplicates, overlap/adjacency/gaps, actor/role/unit/year separation, no count summation, conflicting totals, malformed numbers/labels, full-context unknowns/negation, exact Unicode spans, frozen independent annotations, three-arm counters and forged/partial report rejection.

## One bounded free experiment

The model and inference settings are unchanged from #68 to control that component: MIT mDeBERTa-v3-base-xnli-multilingual-nli-2mil7, revision `b5113eb38ab63efdd7f280f8c144ea8b13f978ce`;557652046-byte safetensors plus fixed tokenizer/config/license files. No pickle/remote code, local-files-only, CPU float32, eval/inference mode, full pair <=512tokens with no truncation. One forward per NEW pair, no old-corpus replay, retries, threshold search or gold edits.

Verified public repository, standard free Ubuntu runner only. Same fixed4CPU/4GiB/no-swap/network-none/nonroot/read-only/dropcaps container,128PIDs,tmpfs64MiB,600sinternal/650sexternal/25minjob; actual free host disk/RAM preflight. #68 actually fit this budget at~2.22GiB peak. This does not authorize paid/larger/GPU provisioning or claim production serving latency. No credentials/user data/API endpoint/mail/database writes. Exact file hashes before/after; actual dependency versions/image/RSS recorded, not remote cryptographic model/deployment attestation. Base/transitive packages are not fully hermetic.

Official resource/billing references: https://docs.github.com/en/actions/reference/runners/github-hosted-runners and https://docs.github.com/en/actions/concepts/billing-and-usage . Model source/license: https://huggingface.co/MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7/tree/b5113eb38ab63efdd7f280f8c144ea8b13f978ce . MODEL-LICENSE preserves the author's MIT notice.

## Stop condition

One actual report ends this experiment. Keep the raw result and all limits, without threshold/corpus tuning or a docs-only production release. Do not deploy a template checker as if it were a general adaptation verifier. If the formal arm succeeds and NLI reduces coverage without added safety, say so explicitly; the next product decision is how to obtain reviewed structured evidence, not another identical model run. Full rewritten resume storage, explicit human acceptance and live/provider requirements remain open.
