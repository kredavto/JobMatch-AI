# Experimental AI-selected literal resume adaptation

Status: implementation and fixture-tested workflow, **not model acceptance**. No model is claimed to work successfully on real resumes. Do not enable in production until the existing AI release acceptance requirements and an adaptation-specific review have passed. No deployment or inference against real user data was performed for this change.

## Boundary

Click **Адаптировать резюме / Adapt resume** after explicit per-request consent. The independently gated POST `/api/ai-resume-adaptation` reads the authenticated saved workspace, uses the existing bounded self-hosted AI review provider, then offers source lines linked by the model to exact vacancy quotes. This is AI selection, followed by deterministic literal rendering; it is **not freeform generative rewriting**. The provider sees only eligible confirmed original lines (IDs/text) and the vacancy, not the full resume or fact metadata. No deterministic substitute is presented as AI if inference fails.

`JOBMATCH_AI_ADAPTATION_ENABLED=true` is an additional operator opt-in, off by default; all existing `JOBMATCH_AI_*` provider controls still apply. Opt-in is not an acceptance attestation. Output always carries `modelAcceptance: not-accepted` and the UI states that acceptance has not passed.

The user must select individual proposed lines, confirm manual review, and explicitly request a draft. The draft promotes unchanged whole source lines and keeps the rest of the original resume. It is read-only, manually copyable, memory-only, and never automatically saved, exported or submitted. Revoking a selection clears the reviewed draft. Source/account/revision changes and leaving the editor discard state and abort pending work. Locale changes do not replay inference.

## Safety properties and limits

- Same-origin request, authenticated owner, body limit/strict schema, expected owner, quota and saved workspace revision checked server-side; source re-read after inference.
- Independent gate precedes quota/source reads. No browser-supplied resume, endpoint, model, or proposed text accepted.
- Confirmed unique facts must equal whole original lines; unverified, ambiguous or risky lines are excluded. IDs and exact vacancy quotes are revalidated on both sides, and again before rendering.
- Output is text, not HTML. Freeform model-written claims have no schema slot. No automatic retries or fallback draft.
- Exact provenance does **not** prove semantic relevance or truth of the user's original claim. A model can link unrelated existing facts; manual review is mandatory. The original resume can contain errors; this workflow does not certify it. No ATS score or hiring guarantee is made.
- This workflow does not change Match Score, profile facts, saved versions or application records.

## Verification

`npx vitest run tests/ai-resume-adaptation*.test.ts` covers domain, gate/provider and route behavior using explicitly mocked inference, not real-model acceptance.
`npx playwright test tests/e2e/ai-resume-adaptation.spec.ts` covers button-triggered consent, manual review, literal draft, no writes, inaccessible/invalid/stale output and navigation cleanup. It also uses explicitly intercepted fixture responses; it is not evidence of model quality.

Required before release: a separately reviewed real-model evaluation for semantic relevance, contradictory/negated contexts, prompt injection, source completeness, multilingual inputs and latency/failure behavior; human review of resulting drafts; operational/privacy review. Freeform rewriting needs a distinct claim-level grounding design and acceptance suite rather than weakening this literal contract.

Local verification on 2026-10-31: production `next build --webpack`, TypeScript checking and targeted ESLint passed; 30 adaptation unit/provider/route tests and all 6 browser tests passed (including axe accessibility). Browser tests ran against the connected panel in a local production server with intercepted synthetic responses. These results verify the software contract only, not live model capability or acceptance.
