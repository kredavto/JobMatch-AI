# Document language and local letter provenance

Document language is an explicit choice, initially the current interface language. Interface changes preserve the chosen document language and any prepared text/approval. An explicit letter-template language/style/fact change clears its draft and approval, as disclosed beside the control. Career export language preserves filters and open advice.

The default Russian composeLetter/careerPlanText APIs retain their old output. Four English letter frames are fixed wording around exact user-confirmed source facts. Interview-plan English labels/advice use the existing known advice catalog; source facts/quotes and unknown advice remain verbatim. Neither export creates qualifications, rewrites source facts or calls a model.

An approved letter may export jobmatch-cover-letter-v1 JSON. It contains only selected fact snapshots, the source vacancy, template identity/language/style, generated text, approved text and an edited flag. It declares literal-template, model_version:null, unsigned-local-snapshot, reported-user-review and semantic_verification:not-performed.

validateLetterExport reconstructs the generated template and checks exact evidence, IDs, language/version and metadata consistency. It rejects revoked evidence, altered generated numbers and forged assurance fields. Manual text is allowed only with its edited flag correctly reported; the validator does not establish the truth or semantic correctness of that text. A self-consistent forged source snapshot is not authenticated. This is a local unsigned record, not a signature or an immutable server version.

Both TXT and JSON handlers require approval, an unpaused/clean source context, and a current-source/evidence check. TXT is exactly the approved text; JSON additionally includes the selected facts and full source vacancy, as disclosed in the UI. Files are downloaded locally; they are not sent or saved automatically. Browser download errors are redacted and retried only explicitly.

Structured-literal-v1 snapshots, hashes, RPC/schema and saved resume versions remain unchanged. English immutable resume/structured templates need a separately versioned protocol. Consent/operator decisions, own-model/semantic evaluation, real mail/provider-copy restore and final operational acceptance remain open. Synthetic fixture tests do not close those gates.
