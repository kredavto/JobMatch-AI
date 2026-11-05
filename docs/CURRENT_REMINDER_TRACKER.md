# Current saved-reminder tracker

The current Root exposes the #117 owner-scoped API through an explicit read button.
Mounting the panel, changing locale/section and typing do not fetch or write reminders.
Drafts stay in owner-keyed tab memory across section/locale changes and are cleared
on sign-out/unmount. Existing local ICS composer remains separate and unchanged.

The manual form requires an owned application, named zone, local time, explicit fold
occurrence, visible UTC preview, literal description and consent to account storage.
It does not add resume text or tracker notes. Current timezone rules validate a new
proposal; the saved accepted UTC instant is shown independently and never silently moved.
Completion, cancellation, explicit rescheduling/reopening and confirmed deletion are separate
commands. They do not change job application status or create a calendar-provider event.

One request guard and Root busy coordination prevent duplicate sends and concurrent controls.
Full exact one-effect ACK/owner/revision checks precede state adoption. New typing or
withdrawn consent survives a late ACK; cancelled/replaced editing sessions are not revived.
An edited-then-restored field is still a new intent. An external row/workspace change requires
an explicit combined read and a separate comparison/rebase. An uncertain creation discovered
by read becomes a comparison target; it is not automatically created or sent again.
Unknown owners cannot load/write or obtain an unbound download. Session/conflict/unknown
results pause writes; errors use fixed RU/EN copy without raw provider text.

Loaded current reminders can be downloaded as a checked owner snapshot with finally-based
Blob cleanup and manual retry. Settings also exposes the owner-bound server JSON export.
The complete current-data archive now has six separate files; it is not one transactional
snapshot. Reminder JSON includes current scheduled/completed/cancelled records and global
revision, with no retained deleted content or edit history. Account deletion removes both
reminder tables via the already verified database cascade; downloaded files and backup
copies remain subject to their separate retention rules.

API and DB write gates remain default off. delivery:none is unchanged. No notification,
email, push, background task or external calendar delivery is requested by this interface.
Consent to storage does not grant notification permission. Explicit notification permission
and delivery are still separate unfinished work; live/manual/physical-device acceptance
and provider operational gates remain open.

Fresh local1511unit/102files,lint/types/build and20security pass.16new actual-Root browser
scenarios plus11existing settings scenarios PASS in hosted CI. Accepted source0c8b6d60 passed455browser/2liveSKIP and all17relevant workflows; the initial3failures and correction are preserved in [VERIFICATION_REMINDER_TRACKER_20261105](VERIFICATION_REMINDER_TRACKER_20261105.md). New unit cases verify draft
basis, explicit time selection, stale source/row, late typing/consent, ABA and cancellation.
HTTP browser transport is synthetic; native #117 SQL evidence is separate. Local Chromium
was unavailable (missing/truncated official install; packaged extraction EINVAL/chown),
so no local browser or independent manual/device pass is claimed.
