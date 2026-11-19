# Mobile smoke: 2026-11-19

Baseline preview: 49e8f0f. Existing pinned Playwright 1.58.2 suite uses `playwright.mvp.config.ts`, with mobile cases at 390×844 and 375×812. Synthetic profile/copy case mocks the vacancy. Install tests assert the exact button label `Скачать приложение на смартфон` and mocked prompt/dismissal behavior. They do not install an app on a physical phone and do not test native Safari.

The local executor could not launch `/usr/bin/chromium`: crashpad startup and `process_singleton_posix.cc socket() failed: Operation not permitted`. One permitted retry with a temporary HOME outside the restricted shell reported the same socket restriction. No page was opened by these attempts; they are not passed E2E tests. Switching BASE_URL to localhost would not resolve a browser launch failure.

An existing repository workflow (`app-checks.yml`, standard Ubuntu 24.04, contents:read, no application secrets) is used for a bounded one-shot preview run. Public repository visibility was checked before starting. Standard GitHub-hosted runners are free for public repositories: https://docs.github.com/en/actions/concepts/billing-and-usage . No artifact upload or paid/larger runner is added. Temporary trigger is restricted to the exact preview branch, public visibility and unique commit message, then removed after the result. The result is recorded below; launching a run alone is not proof of success.


## Verified CI result

Run [44430140577](https://github.com/kredavto/JobMatch-AI/actions/runs/44430140577), job 135245119719, commit 9d1c0445febdd35d1eebc5cfa0d1fa84264dc97f: SUCCESS. Lint, typecheck, build and 214 selected MVP unit tests passed. All **17 Playwright E2E tests passed (7.6 seconds)**, including:

- Synthetic profile save/reload/selection/adaptation/edit/delete at the default desktop viewport.
- 390×844: unsaved text disappears on reload; no horizontal overflow.
- 390×844: denied clipboard triggers full exact text selection and manual instruction without unintended network mutation.
- Exact «Скачать приложение на смартфон» button; explicit click, mocked install dismissal and appinstalled handling.
- 375×812 with iPhone user-agent: Share instructions and standalone behavior. This is Chromium with a user-agent override, not Safari.
- Read-only synthetic rewrite preview and rejection; mocked HH refusal/cancellation scenarios.

The CI served a local production build and used synthetic/mocked inputs, no real accounts, secrets, resumes or Groq. It does not prove physical installation, actual mobile hardware behavior or live HH API access. Those are separate checks.

The temporary preview push trigger was removed after completion. Normal main/PR/manual triggers and contents:read remain; checkout credential persistence stays disabled. No recurring preview CI trigger or paid runner was retained. The first attempt had a YAML parsing error before any job ran; the corrected run above is the measured result.

The complete local unit suite also passed: 877 tests / 66 files.
