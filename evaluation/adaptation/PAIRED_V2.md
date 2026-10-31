# Preregistered adaptation candidate comparison v2

Base main: da2de99bcdfe924ca3dbf3cdba635980574dac54. The v1 result is
preserved unchanged. Its 16 cases are now DEVELOPMENT REGRESSION, not hidden tests.

## Candidate locked before inference
Only adaptation changes; generic aiReview and existing source/selection validators
are unchanged. The candidate separates exact physical vacancy line spans (UTF-16
start/end offsets) from eligible original resume facts. Schema quote and fact-ID
enums are input-specific; an independent post-check rejects out-of-enum quotes.
The prompt explicitly distinguishes vacancy quotations from supporting resume
facts and demands abstention for partial, uncertain or conflicting requirements.
Dates, duration, percentages and team scope are not interchangeable.

This is NOT a semantic or numerical validator. The new rules are instructions to
an unaccepted model. Existing provenance remains mandatory; grammar does not prove
that a line is a requirement, or that any proposed link is true. Known risky lines
are screened by existing evidenceIssue, without claiming injection completeness.

Segmentation is physical-line only, deduplicated; it does not infer bullet scopes
or split multiple requirements in one paragraph. More than 50 eligible lines,
lines over 2000 UTF-16 units, invalid Unicode, an over-30000-unit vacancy or no
eligible lines fail closed before fetch with an input error. The entire bounded
request has a 48KB cap. Nothing is silently truncated. Manual workflow remains.
Every case reports whether its gold quotations were representable by this rule;
coverage loss must not be reclassified as improved model performance.

## One paired attempt
- Frozen existing16 SHA fdf91523d67c0cc5a658285c3e49d78a5b83e372b146b0612e12829ff1061306.
- Prospective8 SHA 4276c665681171cbd4442b70c782785de5c0697eee47a2591edf32b33ddb7561.
  Independently authored before inference after candidate design; author knew
  failure categories. This is a prospective synthetic probe, NOT hidden held-out
  product acceptance. Gold is not sent to either model arm.
- Baseline function is exact da2de99 provider, with relative imports relocated;
  runtime verifies normalized source SHA against the original. Shared dependencies
  are unchanged. Candidate uses the actual new production adaptation provider.
- Both arms on all24 cases =48 real requests, one attempt each, same built image,
  binary, weights and owned model process; case-wise order alternates. Requests
  are stateless. No retries, output repair or changed gold after results.
- Existing public standard CPU runner, model/license/download verification,
  network-none/read-only nonroot4CPU/4GiB/128PID runtime,750s internal deadline,
  900s container limit,20s provider deadline and2048tokens remain unchanged.
- Raw replies/envelopes, per-case payloads/source hashes, full accepted mappings,
  provenance failures, missing quotes, validated false links, render outcomes and
  arm counts are retained. Positive-token stop responses are not valid links.
- Gold compares EACH quote to its expected evidence IDs, never only union of IDs.
  Old16 each have one required quote; their gold interpretation is unchanged.
- A diagnostic workflow can be green despite gold failures. Every report states
  NOT ACCEPTED. Comparison is valid only with complete matching execution bounds;
  partial results remain preserved but are not a complete paired comparison.

A positive signal needs increased useful positive links WITHOUT new false links,
not merely more schema-valid output. Prompt+schema+postcheck change together, so
any difference cannot be attributed to one component or generalized beyond these
synthetic cases. No human semantic or live acceptance is performed. Literal
selection is not full paraphrasing. AI/HH flags stay off; no credentials, SQL,
paid resources or user data are used. Final archive-only changes skip inference.

## Actual result: candidate rejected
The single [paired attempt](results/20261031-paired-rejected.md) failed the physical-completeness gate (47/48 responses) and did not meet the safety criterion. Do not promote this runtime candidate. Complete original evidence is preserved; no inference retry or gold tuning.
