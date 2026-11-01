# Current workspace shell, recovery and feedback

This stage follows PR #93 without enabling the global language selector. `app/page.tsx`
remains the default-Russian route and mounts the actual client controller in
`app/workspace-page.tsx`. The latter accepts an optional `UiLocale` for the prepared
integration and the owned browser fixture. No locale is inferred from the browser,
written to storage, added to a request body, used as an owner/source key, or added to
initial-load dependencies.

## Presentation scope

- Shared navigation, header, sidebar, processing/footer copy, public AuthPanel and
  current source-profile/source-version panels receive the prepared locale.
- 22 local error keys, eight ordinary notice keys plus the OCR-page-count notice,
  and 22 shell/recovery entries have explicit Russian and English copy. Notices
  retain keys/data, failures retain their `RequestError` and authoritative status.
  Switching language renders existing feedback again without fetching or retrying.
- Local guard failures use `WorkspaceRequestError` with a closed presentation key.
  Unknown exceptions get a fixed context-specific message. API codes/status pairs
  use the current common catalog. The earlier bounded same-origin code-less RU
  message compatibility remains; English uses a fixed fallback. This does not
  claim that arbitrary legacy RU server copy has been redacted.
- Parser error selection still uses HTTP status, PDF extension/content type and
  the strict `{code:'OCR_LIMIT'}` contract. Copy does not authorize OCR or select a
  recovery action. Raw parser text, user input, IDs and server comparison values
  are not translated. HTML textareas normalize line endings for display as before;
  no document codec, source hash or stored snapshot is rewritten by this stage.

## Recovery behavior

The controlled private reauthentication form locks email/password during a pending
request and uses a synchronous ref to reject duplicate same-frame submits. The
email field has the same 200-character bound as public login. Reload has its own
synchronous guard. These are user-triggered operations only; locale changes never
submit, refresh, reload, merge drafts, or clear the paused-write guard.

The existing controller still owns credentials, account checks, expected owner,
revision, acknowledgement validation, workspace adoption and import cancellation.
After successful same-owner reauthentication, drafts stay in their fields and the
server copy remains available for comparison. Another owner is refused before
adoption; the old draft remains and writes stay paused. A failed write is not
replayed. Password clearing still occurs in the existing action's `finally` block.

Static review against immutable predecessor `e188a31112ab76d2438b22c1b2b591a503e86763`
finds byte equality of `load` and `act` after reversing only the explicit view-state,
fixed-message constructor and fallback changes. Normalized predecessor SHA256:
`load` `ffacc9f270f36dfa4e24dd82796b2ce782ff44fcf7914cc5ee9dc636bfccb67b`,
`act` `6f0aba97379d2be4a4f3512fce774ee69bb8cb18b8e4f5683816815e491acb51`.
This is a refactor audit, not independent proof of provider authentication.

## Verification boundary

The owned loopback Vite fixture mounts the actual current WorkspacePage/controller,
not a replacement auth/workspace parent. APIs and identities are intercepted,
synthetic and reserved `@example.test`; no real email is sent. The inherited fixture
server remains opt-in, IPC-controlled, loopback/ephemeral-port only, with env files
and public env injection disabled and only the existing proxy/CA allowlist passed.
The two new fixture assets must return 404 from production Next.

Seven new browser cases cover conflict/reload, all three draft fields and selection,
same-frame reauth/reload, held replies through language changes, wrong-owner refusal,
strict OCR tags, pending import and edited-draft protection, local export rejection,
mobile overflow and limited axe checks. Seven unit/SSR cases cover closed copy,
status/code pairing, private-exception fallback, legacy compatibility, original RU
parser messages and literal comparison/credential values. Production Next's full
existing suite additionally checks the real route and its default-Russian behavior.
Actual results and immutable CI evidence belong in `VERIFICATION.md`.

## Still open

Overview/profile/editor/version/tracker/settings copy, remaining component
integration, dates, offline/metadata/connectivity and the final global selector are
subsequent work. A mixed-language internal fixture is intentional preparation, not
full English product acceptance. Existing deployment-country/processor disclosure
is not newly verified; operator policy/placement approval remains required. No
backend auth/SQL/GRANT, provider flags, package/lockfile, model pipeline, document
renderers or external permissions change. Actual SMTP/recovery, provider-copy
restore/RPO/RTO, model qualification, HH authorization and final operational/live
acceptance remain OPEN. Historic #1/#2 merge approval does not authorize this PR's
merge or release.


Recorded executable: `bdd418c057e73f8bec662dcb061ceec0ac4a1cbd`, tree
`0e4b274e0124fbbe55c959dc02fa88af7ca1e1c9`, [PR #94](https://github.com/kredavto/JobMatch-AI/pull/94).
[Actual current-tree app job](https://github.com/kredavto/JobMatch-AI/actions/runs/41348544296/job/124973511523):
1,147 unit/API tests in 79 files; 214 browser PASS / 2 live SKIP; lint/types/build PASS.
Twelve current PostgreSQL protocols, ops and isolated parser workflows also PASS;
see the exact jobs and synthetic/live boundaries in VERIFICATION.md.
