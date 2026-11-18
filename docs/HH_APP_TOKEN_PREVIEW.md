# HH application-token vacancy reading (preview)

The MVP vacancy route uses the server-only `JOBMATCH_HH_APP_ACCESS_TOKEN`,
`HH_USER_AGENT` and exact HTTPS `HH_APP_ORIGIN`. It does not depend on the
applicant OAuth enablement flag, client secret, session encryption key, or
applicant cookies. Never prefix the token with `NEXT_PUBLIC_` or send it to the
browser. Configure only the authorized preview branch.

Only GET `https://api.hh.ru/vacancies/{numeric id}` is made. Redirects, missing
credentials, unexpected origins, oversized bodies, mismatched vacancy IDs and
archived vacancies fail closed. Errors are bounded local messages, not upstream
payloads. There is no retry, HTML fallback, token regeneration or CAPTCHA bypass.
A rejected application token asks the owner to check configuration, not the
applicant to log in again.

This enables vacancy reading only. Applicant resume-list/read/write and responses
remain unavailable according to the November 16 support reply. It does not turn
the application token into an applicant credential or establish a complete MVP.
No file-upload workflow was introduced by this change.

The earlier local commit 04e44fd was not available in this executor or the remote;
this change was reconstructed from preview 64fdecc in an isolated worktree.
