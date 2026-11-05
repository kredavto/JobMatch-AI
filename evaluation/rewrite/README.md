# Rewrite CPU diagnostic — unfinished checkpoint

5 November 2026. Started from ready/unmerged PR#123 final
6b774a0d675053c56bd8f84a7c19cb1e85388af9 (tree 76380f242e7454fced22f52fbc4c6cb3b4e1df73).
Fresh main a3a9ef0c, four main plans and113openPRs were reread first.

**Not a completed technical block or model acceptance.** The managed workspace
became unavailable before the first typecheck/test/compile command could run.
The authored corpus, initial harness and compile configuration are checkpointed
in git so the next environment can resume. No runner, workflow, tests or actual
inference for this new protocol exists yet. No new PR is opened for this WIP.
No production flag/key/data/DB, mail, HH write or paid resource changed.

The six RU/EN cases are explicitly public authored synthetic examples frozen
before any model call. Original locally generated corpus SHA256 was
0703166fc0491ed093676cd6612331f680f26f45b6b4883eed9e2465c10bdf73;
verify bytes against this value before pinning/using the corpus. Do not tune the
prompt or corpus in response to the forthcoming outputs. This is not independent
held-out or human semantic evidence. The harness has not passed even typecheck.

Intended next steps:

1. Fresh checkout this branch; inspect main/four plans/openPRs again. Check the
   frozen corpus hash, source bindings and harness carefully; typecheck/build it.
2. Add meaningful actual-loopback tests of the harness: one production provider
   request, selected-only input, raw output unchanged, valid/refused/malformed/
   unfinished/oversized responses, cancellation, environment restoration and
   default-closed CI guard. Auth/DB are outside this diagnostic.
3. Add a bounded owned runner using the existing immutable public CPU weights and
   llama.cpp revision, with SHA/license/size/read-only checks before/after,
   process/image/binary/source/compiled hashes, no network except loopback during
   inference, no model retries and complete raw synthetic responses/token counts.
   The Ollama-shaped local HTTP gateway is an explicit envelope adapter to the
   pinned llama HTTP server; it is not a verified deployed Ollama provider.
4. New runtime parameters are explicitly8192context/4096maxTokens/4threads/seed42;
   do not alter or misdescribe the old4096/2048 pin/defaults or frozen 0/16 report.
   Record actual parameters. Keep model/deployment identity unverified, semantic/
   independent-held-out assessment not-performed and acceptance not-accepted.
5. Add a separate public same-repository disposable CI workflow with existing
   owned disk/RAM/download gates, no secrets, read-only/no-network/nonroot bounded
   container, exact runtime proof and cleanup of only job-owned resources. A docs
   update must not count as new inference. No third-party inference endpoint.
6. Update the four plans/journal, test, commit, create a concrete PR and read back
   immutable content/tree. Record any refusal/failure without weakening guards.

Human review/edit decisions, normalized immutable AI-version storage with DB/
legacy-forgery defenses and UI remain separate unfinished work. SMTP/recovery,
real Supabase provider-copy restore, operator personal-data decisions, HH
permissions, model qualification and final live/security/device gates remain open.
The full project is incomplete. The environment failure is not evidence that
only user-controlled external blockers remain, so no automation is paused here.
