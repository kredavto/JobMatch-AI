# Browser workflow prototype

This folder is a transport-independent workflow contract, not an operational hh.ru connector. It is not imported by the application, has no real hh selectors, and does not connect to any user account. The Playwright fixture uses `page.setContent` with invented IDs and no network.

The intended session boundary is a browser already signed in by its owner. JobMatch must not collect passwords, copy cookie stores, persist authentication state, or bypass CAPTCHA/security pages. A future local extension or browser host would require the user's explicit installation/access approval and a separately reviewed implementation; no such component is installed or granted access here.

Before any real integration, account/site rules and supported actions must be resolved. hh.ru's [agreement](https://hh.ru/account/agreement) restricts credential sharing, software imitating an applicant, and automatic collection. A user's acceptance of that risk is not approval from hh.ru. No concealment, anti-detection, CAPTCHA-solving, or alternate access routes are implemented.

## Shared-profile risk

hh's [unified applicant profile](https://hh.ru/blog/obnovlyaem-profil-soiskatelya) can propagate experience changes to linked resumes. The prototype stops before writes unless the adapter has established that the requested field is resume-local. It supports a target-title change only, not shared experience, education or skills. Do not interpret the fixture's `fieldsAreResumeLocal=true` as live verification.

## State handling

- Read authenticated state, challenge state, exact vacancy and resume IDs before writes.
- Stop for manual sign-in, CAPTCHA, unknown target or shared-profile scope.
- Inspect existing applications before submission.
- Inspect persisted state after save and submit, not the current form input. Lost/ambiguous results are never automatically replayed.
- Keep the same `BrowserJournal` for retries of a task. Resetting it after a timeout invalidates duplicate protection. A real host would need a durable task journal without credentials before any unattended use.

Seven fixture browser checks cover the happy path/deduplication, CAPTCHA, shared-profile block, lost response with confirmed success, unresolved submit with no replay, a changed form input without a confirmed save, and missing explicit consent. They do not certify live hh access, selectors, account behavior, or application delivery.

## Explicit risk consent

`app/hh-automation-consent.tsx` is prepared but intentionally not mounted while live automation is unavailable. It uses a readable warning, an unchecked checkbox and an enable button disabled until acceptance. Consent is versioned and passed explicitly to the workflow. It acknowledges blocking risk; it does not grant hh permission, guarantee safety or remove service obligations. A future live host must bind this grant to the real activation and preserve it appropriately; the in-memory fixture object is not an audited production consent system. No registration is added.
