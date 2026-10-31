# Local manual-letter edit review

Candidate stacked on unmerged PR #59. This is a bounded lexical review tool, not a generative model, semantic verifier, authenticated source or immutable server version. No inference, provider operation, workspace write, migration, production setting, mail sending or release is introduced.

## Behavior

The existing literal-template draft and selected user-confirmed facts remain the baseline. A changed draft always creates a **manual-edit** finding requiring review of every claim. Additional findings show exact numeric expressions or selected RU/EN negation markers added/removed relative to that generated draft, including occurrence counts and code-point ranges in the corresponding text. Changes are not compared to unselected facts or inferred from the vacancy.

Both TXT and JSON downloads require the existing whole-letter approval and an explicit acknowledgement of every finding. Every keystroke, restore, generation, fact/style/template-language change clears relevant acknowledgements. Interface-language changes preserve them; dirty/paused source guards and the existing current-evidence recheck still govern downloads. No acknowledgement is treated as independent proof of truth or a physical reviewer's identity. Restoring the template clears findings and approval.

## Limits and blind spots

- Inputs must be well-formed, nonblank strings of at most15000 UTF-16 units, matching the existing letter packet limit.
- At most64 numeric candidates and64 negation candidates per text; exceeding either limit blocks export rather than silently truncating a report. There can be at most257 findings.
- Numeric recognition preserves signs, some separators, Unicode number characters and optional percent spacing. Values are never normalized or interpreted as dates, duration, magnitude, units or qualifications.
- Negation recognition covers a finite set: не/нет/без/никогда/ни, no/not/never/without and word forms ending in n’t/n't. It is not complete across either language. Homonyms/capitalization and typography can cause extra findings.
- Exact raw-token multisets cannot detect a number moving to another claim, swapped quantities, changed units, grammatical scope, contradictory affirmations, sarcasm or many paraphrases. Numeric/marker equality **never means semantic equivalence**. Such text still has the mandatory manual-edit finding. Source context, factual support and the meaning of the whole text require human assessment; semanticAssessment always says not-performed.

The scanner uses bounded input and linear code-point accounting; no model offsets or automatic claim repairs are used. Quotes render as escaped text and wrap on mobile. Findings are advisory categories with a mandatory reported-review gate, not evidence that an edit is correct.

## Export compatibility

The UI JSON is now a versioned **jobmatch-reviewed-cover-letter-v1** envelope containing:

- letter: the unchanged strict jobmatch-cover-letter-v1 packet, including exact generated/approved text, template language/version, selected fact snapshots, unsigned-local-snapshot, reported-user-review, model_version=null and semantic_verification=not-performed;
- edit_review: literal-edit-audit-v1 report with coverage, edited flag, code-point spans and findings;
- reviewed_issue_ids: all required IDs exactly once in canonical order.

validateReviewedLetterExport validates the old packet, recomputes the report and checks every acknowledgement. Missing/invented findings, altered spans/flags, extra properties, duplicates/omitted/unordered IDs and token-limit reports refuse. Object-key order is irrelevant. TXT remains exactly approved_text after the same gates. The existing v1 producer/decoder and templates are unchanged for historical files; old readers must explicitly select the nested letter from a new envelope rather than reinterpret the envelope as v1.

This is an editable local export. It has no server signature, trusted timestamp, durable owner ledger or immutable accepted-version guarantee. It duplicates selected facts and the vacancy locally, as the prior letter export did. Downloaded-file retention remains the user's/operator's responsibility; no personal-data placement or retention decision is made here.

## Validation and next work

The phase entry in VERIFICATION.md records actual unit/browser/CI counts and links. Fixtures test the lexical contract and real React controls with synthetic sources, not a model or live provider acceptance. Independent tests explicitly preserve undetected unit/role/negation-reordering examples as limitations, and check Unicode, repeated occurrences, tampering, cancellation by restore/typing, locale preservation and no network writes.

Server-bound immutable accepted-letter versions with source/revision ownership, independent semantic/contradiction evaluation, accepted self-hosted deployment and real documents remain separate work. Existing SMTP/password recovery, actual Supabase-copy restore/RPO/RTO, operator PD placement/retention/withdrawal, HH permissions, security/monitoring and final live/manual acceptance gates remain open. Historical #1/#2 authorization is not permission to merge or release this candidate.
