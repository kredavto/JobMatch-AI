# Conservative AI link annotations — literal-quantities-v1

The read-only audit in `lib/ai-link-audit.ts` annotates an already validated AI review. It never confirms a qualification, truth, complete requirement coverage or semantic support. `semanticAssessment` is always `not-performed`; `no-rule-warning` means only that these limited rules emitted no signal. Manual review remains required. Quotes, verified facts, Score, saved versions, provider requests and gold grading are not modified.

## Rules and limits

| Signal | Meaning and limit |
| --- | --- |
| no-linked-facts | No eligible fact IDs were linked. |
| literal-gap | At least one known engine alias term is absent from the linked facts. Synonyms outside that dictionary and actual skill absence are not established. |
| coverage-unavailable | The quote is not exactly one known alias (apart from a leading bullet). Its complete meaning has not been checked. |
| quantity-difference | A supported explicit years/percent predicate differs from one linked literal value with the same unit and at least one shared content word. Matching words do not establish the same metric or context. |
| quantity-unknown | A numeric construction cannot be compared conservatively: ranges, multiple values, approximations, unsupported units/digits, calendar years, ambiguous facts or missing comparable evidence. |
| level-below | An adjacent English/английский CEFR label in one linked fact is lower than the required label. Current ability and context are not verified. |
| level-unknown | The language/level syntax, alternatives or multiple linked level labels are ambiguous or unsupported. |

Numeric grammar accepts one nonnegative ASCII decimal (dot/comma, at most two fraction digits) followed by years/year/yr/yrs/год/года/годов/лет or percent/%/процент/процента/процентов. Years above100 and values above1,000,000 are unknown. Prefix bounds include at least/minimum/не менее/от, more than/over/более, at most/up to/maximum/не более/до, less than/under/менее and explicit comparison signs. Negated bounds take precedence over positive suffixes in the numeric parser; “не более” and “не менее” have separate RU cases. Existing upstream English negation guards currently refuse quotes containing “not”, including numeric bounds: they remain unavailable with null report counts rather than bypassing that guard. Unsupported negated at-least/at-most parser constructions return unknown. Without a recognized prefix the rule compares literal equality, not an inferred semantic duration. It does not convert units, aggregate jobs, infer experience from dates or resolve trailing conditions. Approximation, ranges and residual numeric content stay unknown. CEFR supports a single adjacent English label A1–C2; French/alternatives/nonadjacent forms stay unknown. General negation/risk guards still run before the audit.

Validation checks exact source provenance and eligible evidence before annotating; <=500 facts and <=100,000 UTF-16 vacancy units bound the audit. Only eligible facts populate the per-call map; an unverified duplicate ID cannot replace a verified fact. Invalid context/validation/exception returns unavailable with an empty internal list. The report summary uses null for unavailable counts and notes, rather than a false successful zero. Caches are local to one invocation; there is no network, persistence, logging, model call or mutation.

## UI lifecycle and privacy

RU/EN notes show warnings/unknowns and an explicit manual-review caveat, without a qualification badge. The original quote and selected eligible fact text remain visible. An exact in-memory React key includes owner, revision, vacancy and every fact ID/text/verified flag; changing that context clears consent/result/error and aborts an old request even if owner/revision are unchanged. Locale alone does not clear state or replay a request. The key is not a digest or external identifier and is not written to DOM attributes, logs, storage or a network request. Existing owner/revision/AbortController/timeout validation remains.

The client request still contains only consent, owner and revision; the server loads source context. Audit summaries contain allowlisted signal codes, link indices/statuses and counts, never quotes/facts/numbers/IDs/provider exceptions. Public corpus case IDs are the only case identifiers in the evaluation report.

## CLI report4 and CPU V4

Set `JOBMATCH_AI_EVAL_LINK_AUDIT=literal-quantities-v1` explicitly to add schemaVersion4 and `linkAudit`. Unset/empty/off preserves the prior report1/2/3 modes. Unknown values refuse before provider access without echoing the value. Audit runs only after a validated review; unavailable cases have reason `no-validated-review` or `audit-unavailable` and null notes/counts. A valid empty review has observed coverage with zero links and still undergoes the original recall grading.

The report identifies planned28 cases, observed/unavailable coverage and one strict summary per bundled case. Notes use consecutive link indices and warning/unknown/no-rule-warning priority; warnings are literal-gap, quantity-difference or level-below. The CPU validator checks exact unique corpus IDs, versions, nullability, coverage totals, note indices/status/signals and every aggregate counter. It refuses malformed reports rather than repairing them. Audit coverage is not detector recall: it excludes invalid model reviews and does not judge whether a model link is actually supported.

CPU mode `JOBMATCH_AI_CPU_LINK_AUDIT=literal-quantities-v1` explicitly forwards that option and labels output `JOBMATCH_CPU_DIAGNOSTIC_V4` / `jobmatch-cpu-diagnostic-v4`. The source-line prompt, model input bytes, gold, weights, sampling and resource/network guards are unchanged. Existing V1/V2/V3 archives remain historical measurements. A synthetic HTTP process test compares all28 request bytes and grading with/without audit, then checks all28 provider-outage cases as unavailable; this fixture is not model inference. The separate actual CPU measurement, if completed, is archived under results with its runtime SHA/run.

No production AI activation, model acceptance, accepted rewrite, SQL migration, provider restore, SMTP delivery or hh.ru write is implied. Independent held-out judgments, accepted deployment identity and operational/data-placement permission remain open.
