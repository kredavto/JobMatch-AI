# Conservative evidence eligibility for MVP adaptation

The local adaptation route and the optional model-selection adapter now use one
eligibility gate before promoting source text into matched skills, prioritized
bullets or cover-letter quotations. It excludes recognized contact/instruction
lines, lexical negations/plans/learning-only statements, target-position fields,
and explicitly labelled desired-skills or copied-vacancy-requirement sections.
A labelled resume section ends the excluded section. Original resume text is
retained; this does not delete facts or fabricate missing skills.

The model still returns indices, not generated qualifications. A selected exact
quotation can be rejected by the same gate even when its index is valid. Provider
configuration, consent gates and local-only public adaptation remain unchanged;
no live AI request or new data transfer was made for this change.

This is deliberately conservative lexical filtering, NOT semantic verification,
complete PII redaction, prompt-injection elimination, or free-form rewriting.
Unlabelled third-party requirements and nuanced statements still need a richer
confirmed structured profile and evaluation before broader generation. A keyword
match is not proof of skill level or duration. Excluded facts remain visible in
the unchanged source, and possible false negatives are preferable to promotion
of unsupported experience.

End-to-end hh resume acquisition remains blocked by the provider's applicant API
restriction; an application token only enables vacancy reading. This independent
safety improvement does not complete the full MVP or introduce a file workflow.

Explicit false-negative boundary: mixed phrases such as «не только Python, но и
SQL» are conservatively omitted from emphasis, although retained verbatim in the
resume. No claim of zero false negatives is made. Positive regression cases cover
NoSQL/Notion (no accidental `no`/`not` substring exclusion), «планирование»,
quantitative achievements and actual development for employee training.
