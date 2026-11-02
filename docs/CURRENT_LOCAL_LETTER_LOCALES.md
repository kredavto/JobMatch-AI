# Current local letter controls and lexical acknowledgements

The current composer and bounded lexical review support default Russian and optional English controls. Document language remains explicitly Russian v1. Interface language does not regenerate or translate the generated or manually edited letter, selected facts, vacancy, quotes, source IDs or code-point spans. Global English activation and separately versioned English document framing remain open.

## State and protocol

Locale is a presentation prop, absent from component keys, memo dependencies, selected style/fact values, whole-letter acknowledgement, local JSON source consent, review IDs and saved-letter consent keys. Changing locale preserves the draft, selection/caret, style, fact selection, reviewed issue set, whole-letter acknowledgement and local JSON consent. Existing explicit style/fact changes, editing, template restore, blocked/dirty/stale guards and navigation keep their previous behavior. Download errors use closed semantic descriptors rendered in the current language, never raw exception text, and require a manual retry.

The complete composer state and handler section was compared with the pinned #102 base after substituting only semantic error descriptors. Root handlers and APIs are untouched. The literal composeLetter engine, reviewLetterEdit token/issue algorithm, frozen main-ru-letter-81cb1a6-v1 codec/golden snapshots, saved-letter receipt signing/validation and exact exports are unchanged. No new English codec is inferred from older unmerged #31/#39 work.

Lexical review remains limited to numeric expressions and certain negation markers with raw code-point spans. It does not verify quantities, scope, roles, contradictions, truth or meaning. A token-limit refusal still blocks export even if whole-letter acknowledgement is checked. Local JSON is unsigned/editable and contains sensitive selected sources; it is not server acceptance or source authentication.

## Verification

Two tests first demonstrate current Russian-only composer/review headings with optional English UI. Additional actual-controller tests cover exact JSON/TXT through language changes, raw Unicode issue IDs/spans, independent acknowledgements, caret/style/selection, editing and style resets, token-limit refusal, current-workspace pause, fixed download error/retry and mobile automated accessibility. The prior #102 integration tests now use stable current element IDs when crossing languages; all original signed-receipt, late-response, uncertain-write and expiry assertions are retained. CI results are recorded in VERIFICATION.md only after observation.

Managed runtime is unavailable: immutable GitHub readback, leased branch refs and existing Actions provide evidence. There are no new local/manual screenshots, physical-device or screen-reader acceptance claims. Routes/identities/signing keys in tests are synthetic; there is no mail, real model inference or provider-copy restore acceptance. Career, remaining screens, global locale and operational acceptance are separate work. SMTP/recovery, provider-copy restore/RPO/RTO, operator data placement, qualified self-hosted model and final live acceptance remain open.
