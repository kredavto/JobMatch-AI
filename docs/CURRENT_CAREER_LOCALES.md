# Current career presentation and selected-group export

Default Russian and optional English controls apply to the actual current CareerPanel through a view-only Root locale prop. The component retains its semantic filter values and detail keys; locale is absent from memo dependencies and keys, so selected groups and open details survive language changes.

The core careerPlan/careerPlanText functions, matching/ranking, requirement IDs/statuses/partial flags and confirmed evidence are unchanged. Requirement quotes, fact text, IDs and source text are displayed literally with neutral language metadata. Unknown future advice also stays literal.

The fifteen existing rule-advice strings have exact display-only RU/EN mappings, adapted from earlier unmerged #31 after checking that its core career source blob still equals the pinned current base. Only exact known strings are mapped; no facts or vacancy quotes enter this lookup. Supported-by-rules and unconfirmed remain limited rule observations. Missing evidence does not establish absent skills, and practice tasks are not completed achievements. No model is called.

## Export and failures

The existing selected-group TXT remains exactly careerPlanText(visible), with Russian rule wording and literal raw sources, under the unchanged jobmatch-interview-plan.txt filename. A visible disclosure explains the document/interface-language distinction. No automatic download, upload, profile mutation or fact confirmation occurs on a language/filter change or on the clarification navigation action.

Download has a fixed failure state rendered in the current language without raw exception text. The URL is revoked even if the anchor click throws. Empty groups refuse a download; retries require a new explicit click.

## Evidence and open work

The first baseline actual-controller test demonstrates missing current English headings. The second stops before locale change because the implicit filter label includes its option text; an explicit label/select association fixes that accessible-name issue. Preservation of the selected group/open details is established by the fixed-source test, not claimed as a proven baseline state-loss defect. New actual-controller cases cover locale-stable filters/details/raw source text, exact TXT in each group/language, known advice and qualification caveats, empty group refusal, fixed error/manual retry, clarification navigation and mobile automated accessibility. Unit coverage traverses all fifteen advice paths from actual supported/unconfirmed core plans, verifies untouched plans/exports, and checks literal unknown Unicode/quote-like fallback.

Existing GitHub CI and immutable remote readback provide evidence; managed local runtime was unavailable. No local/manual visual, physical-device or screen-reader claim. Browser API identities are synthetic, not live multi-account/provider/model acceptance. Global English, remaining tracker/analytics/settings/offline flows, separately versioned English documents and final operational acceptance remain open. SMTP/recovery, real Supabase provider-copy restore/RPO/RTO, operator data placement and qualified self-hosted model remain open. No merge/release/deploy/mail/paid infrastructure/user inference/HH write is part of this change.
