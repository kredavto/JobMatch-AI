# Current Next patch and installed dependency graph

Next.js and eslint-config-next are pinned to16.4.5, replacing16.4.3. The application
release version stays0.34.0. No production deployment or dependency activation on
the deployed main is claimed. Node24 remains the execution target; no SQL, model,
mail, personal-data flags or HH operation changed.

## Primary evidence and limits

The [official16.4.5 release](https://github.com/vercel/next.js/releases/tag/v16.4.5)
lists security fixes. At the5November review, its linked advisory metadata was not
uniformly reconciled with that release: several still said no patched version.
This update follows the published release; it does **not** independently establish
that every advisory is resolved or exploitable in this app.

| Advisory | Reported affected16.x range | Reported patched version |
|---|---|---|
| [GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h) | >=16.3.0 | None |
| [GHSA-vc7v-qv4w-wrv8](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8) | >=16.2.0 |16.4.2 |
| [GHSA-vvgp-ww4w-46vf](https://github.com/vercel/next.js/security/advisories/GHSA-vvgp-ww4w-46vf) | >=16.4.0 | None |
| [GHSA-rhh4-g77r-r9qj](https://github.com/vercel/next.js/security/advisories/GHSA-rhh4-g77r-r9qj) |16.0.0–16.4.2 | None |
| [GHSA-pc58-hwjq-p385](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385) | >=16.0.0 and <16.0.0 are both listed | None |
| [GHSA-7qx7-33qx-rqx2](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2) |16.0.0–16.4.2 | None |
| [GHSA-f3mh-rxg3-f5g2](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2) |16.0.0–16.4.2 | None |

Before/after runtime **and full** npm audit snapshots both reported0affected
packages. This is a catalog observation, not an independent security review or
evidence that the conflicting primary fields can be ignored. The full CI audit
now actually fails for development findings as well; it still prints its sanitized
inventory before failing. The earlier workflow exposed the full result without
enforcing a nonzero findings result.

## Installed graph gate

`npm run audit:dependency-graph` runs bounded, read-only `npm ls --all --json --long`.
It rejects invalid peers, missing required dependencies, unexplained extraneous
installations, unknown errors, malformed/oversized/deep reports, contradictory
nonzero results and changed package/lock files. Exit0 means only that this installed
npm graph passed; support-policy and independent-security acceptance stay separate.
Raw npm diagnostics, ranges, paths and provider text are never emitted by the gate.

Fresh npm11.9.0 installs mark two declared optional WASM artifacts as extraneous,
even with exit0. The gate admits a marker only when the installed name, exact
canonical in-project path and version match the same non-link optional lock entry,
the node is explicitly optional, and the diagnostic text exactly names that verified
artifact. Any other diagnostic or invalid peer still blocks. There is no package
name allowlist, arbitrary warning waiver, peer bypass or force install. Empty optional
slots are counted separately. Both app and dependency-audit CI run the new gate.

The current actual graph passed:1,087serialized nodes,122empty optional slots,
2verified optional artifacts,0problem signals. Snapshots in `security/snapshots/`
bind this observation to lock/manifest hashes and the observed time.

## ESLint10 experiment remains rejected

[ESLint's support policy](https://eslint.org/version-support/) marks9.x end-of-life
from6August2026. An isolated copy based on PR#121 installed10.14.0 using ordinary
npm commands with scripts disabled, without force/legacy-peer flags. npm exited0
with peer warnings. The first outside-base lint attempt only ignored its files and
was not counted as a pass. After copying the tracked sources into the owned probe,
actual lint passed with the same six existing warnings; `npm ls` still returned
ELSPROBLEMS for the import, jsx-a11y and React plugin peer declarations. The new
actual gate rejected that graph with24problem signals and exit1.

Published latest plugin metadata still declares ESLint<=9 for import2.32.0,
jsx-a11y6.10.2 and React7.37.5. The supported-tooling task remains **OPEN**; the
existing ESLint9 is not renamed supported merely because lint and audit pass.
No paid extended support was purchased. Publisher compatibility updates or a
separately verified migration retaining the rules are still needed.

## Verified source

Accepted `24d0492ceb8f330871006aacf159a50dd37fc22b`, tree
`76900306ed8b2edb70a6243fb1c59097ba134f6e`; all19sourceworkflows SUCCESS,
with hosted application/native checkout tree verified at its immutable SHA.
[Complete journal](VERIFICATION_CURRENT_NEXT_20261105.md).

Application1,615unit/108files,487browserPASS/2liveSKIP,types/lint/build passed on
Next16.4.5. Audit job29security tests and actual installed graph passed
(1,083nodes/122empty slots/0optional artifacts/0problem signals); runtime and
enforced full gates both0catalog findings. Native118Python and full current
write/source/version/restore/owner/default/rollback/TLS parser regressions passed.
Real fresh signed scanner28174 passed the unchanged24hgate. Actual CPU16synthetic
responses/1074tokens/0gold remainsNOT ACCEPTED, not a model qualification pass.

Local metrics and actual rejected ESLint10 graph are retained separately; optional
platform inventories need not have identical node counts. These are synthetic
fixtures, not provider-copy restore, real Auth/mail, model quality or independent
security acceptance. No local browser/native/manual or exploit-reproduction pass.

Full project remains incomplete. Qualified model/semantic/held-out evaluation,
real SMTP/recovery with an agreed recipient and permission, provider-copy restore,
operator personal-data decision, permitted HH operations, independent security/
capacity/manual/physical-device and final live acceptance remain open. No new merge,
release, production deploy or infrastructure spending was performed or authorized by
the historical explicit permission for PR#1/#2.
