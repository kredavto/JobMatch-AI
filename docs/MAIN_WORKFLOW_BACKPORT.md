# Isolated workflow backport to main

Base: 3322011715e4528c98c5eb85b18e39a49dd4aa5e, not the unmerged PR #60 stack. No SQL migrations, dependency changes, schema/RPC contract changes, feature enablement, production settings or secrets are introduced.

The existing main profile list now offers Select all for unconfirmed skills. Bulk selection remains a local draft; individual rows can be deselected, cancellation sends nothing, and a separate explicit button submits the existing atomic verify batch. Already confirmed rows are unchanged. Existing individual confirmation remains available outside bulk mode.

HH URL/ID import is separately default-off (`JOBMATCH_HH_VACANCY_IMPORT=approved` requires registered application credentials, reviewed API terms/permissions and a valid HH user agent). Server authenticates owner/origin, consumes the existing import quota, parses only an ID, and fetches a fixed api.hh.ru URL without redirects. Input, time, output and HTML conversion work are bounded. No browser credentials or arbitrary endpoint are accepted. Preview, apply to draft and save are separate; cancel/edit/navigation aborts and cannot overwrite a newer draft. Fallback remains manual text. No HH profile write, scraping, employer submission or production API test is performed.

AI adaptation additionally requires `JOBMATCH_AI_ADAPTATION_ENABLED=true` and all existing self-hosted provider gates. It sends only eligible confirmed whole original lines and the saved vacancy after per-request consent. It proposes source-linked line selection; the existing main literal renderer promotes selected original wording. It is NOT generative rephrasing, accepted model quality or proof of semantic relevance. Source/owner/revision checks, reread after inference, manual review and a read-only memory-only draft apply. No automatic save/export/submission. The main UI and literal output remain Russian; no locale-provider or newer template stack is imported.

Both features remain disabled pending independent live/legal/operator acceptance. Fixtures test the software contracts only. This backport does not release the other unmerged project work or resolve SMTP, provider backup/restore, personal-data hosting, AI-quality or broader operational acceptance.

## HH lifecycle tightening (2026-11-01)
HH responses now carry an expiring, content-bound unsigned observation and reject archived text. HH remains default-off; preview is memory-only and cannot be applied through the legacy text-only save path. Full persistent provenance/archive deletion is blocked on additive storage/RPC and policy review, not solved by setting credentials. See [HH_PREVIEW_LIFECYCLE.md](HH_PREVIEW_LIFECYCLE.md).
