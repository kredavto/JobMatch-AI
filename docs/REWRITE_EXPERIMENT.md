# Offline rewrite draft experiment (not shipped to public workflow)

This module defines a constrained rewrite prompt and validates model-shaped synthetic responses. It does not call Groq, read secrets, expose a public API, or transmit resume/vacancy data. Prior user authorization covered Groq tests on fictional data, not processing real resumes. The current environment has no GROQ_API_KEY or self-hosted endpoint, so no live-model quality result is claimed.

Each proposed rewrite is tied to one exact original fact. Unknown IDs, duplicate references, forged quotations, extra output fields, oversized content, changed numeric tokens or changed negation markers are rejected. Missing suggestions leave source facts intact. Original facts are always retained. The existing lexical audit is reused, not reimplemented.

Critically, a matching numeric/negation multiset does not prove factual preservation. Team achievements can become personal, units can change, causal claims and duties can be invented without changing markers. Tests intentionally demonstrate these undetected examples. Every proposal remains needs-human-review, semanticAssessment not-performed, canAutoApply false. This is a draft-review foundation, NOT a factual verifier or completed AI adaptation.

Before enabling any user-facing rewrite: establish permitted provider/data scope, enforce server-side provenance for vacancy inputs, use explicit recipient-specific consent, preserve immutable source context and review every changed passage side-by-side. Consent alone does not waive HH API data restrictions. Assess quality on a fixed synthetic Russian benchmark including employer/date boundaries, negation, ambiguous ownership, metrics/units, hallucinated skills, and prompt injection. No real-user data or HH API vacancy should be used in that benchmark.

## Live synthetic smoke, 2026-11-18

One bounded Groq `openai/gpt-oss-20b` request ran inside the authorized Preview build with the existing sensitive environment key. The key was not extracted or printed. Fixed input was three fictional facts, no HH vacancy and no real resume. No public endpoint was added. Request had a 25-second timeout, no retry, and maximum 1400 completion tokens. The temporary runner required Preview, the exact branch/commit message, and expiry before 06:00 UTC. It was removed immediately after the result; cleanup tree exactly matches the prior working preview tree.

Model returned three source-linked suggestions. It shortened punctuation/wording in two, preserved team ownership of 12 reports in 2024, retained 'Не руководил отделом', and left the learning-only Docker statement unchanged. The saved synthetic fixture passes the prototype's lexical/provenance checks and remains an unverified draft with no auto-apply. This is one successful narrow smoke, not a broad quality benchmark or semantic guarantee; no new full-resume rewrite UI is enabled.

Temporary smoke commit: 38e701ad71b5f8666386f6b9ed25fada546ce776. Cleanup commit: 90c358d8a160175363b81a4f50555e5420331dbd. Build log contained a single REWRITE_SMOKE draft_received result with requests=1.

## Synthetic preview and adversarial evaluation

A separate `/rewrite-demo` page shows only the saved fictional fixture side-by-side. It has no input fields, profile reads, provider calls, acceptance, export or apply control. Users can dismiss all proposals. The main resume flow remains local-only. Refused/malformed responses are rejected without template fallback; explicit empty suggestions show a separate no-change state.

Twelve adversarial semantic substitutions document lexical blind spots: team→personal, seniority, production scope, units, swapped numeric roles, certainty, organization, extra skills, invented causality, learning→experience, swapped date associations and commercial context. All remain unverified/review-only. Four numeric/negation/date changes are rejected, as is token-coverage exhaustion. These are offline evaluation cases, not live model accuracy measurements. One narrow live Groq smoke remains the only generation evidence.
