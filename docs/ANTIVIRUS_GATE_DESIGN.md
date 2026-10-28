# Antivirus gate: implementation contract

Status: design only, following PR #12. No scanner, quarantine, deployment or antivirus guarantee is implemented by this document. The existing import path is unchanged.

## Placement and verdict

Put scanning before document extraction, after the existing authentication, owner, quota, extension and byte gates. The gateway holds one bounded immutable upload buffer in memory while awaiting a verdict. Only the exact scanned bytes may reach the parser. Never re-fetch a URL or reopen a user-controlled path after scanning. Do not send JWT, service token, owner ID or original filename to the scanner.

Use a separate credential-free scanner boundary. Neither the parser nor scanner should have access to each other's private networks. The gateway joins both private networks; the scanner has no host port or internet route. A separate signature updater may reach approved signature distribution endpoints but must never receive uploaded files. Its database volume may contain signatures only, never documents. Keep scanner rootfs read-only, nonroot, capabilities dropped, core dumps disabled and bounded tmpfs/resources.

Implement a strict clamd INSTREAM client: one command and one verdict per connection, four-byte network-order chunk lengths, zero-length terminator, bounded response and absolute deadline. Accept only the exact clean verdict for the stream. Detection, scan limit, encryption/unscannable input, ERROR, unknown/truncated/extra response, unavailable scanner, cancellation, timeout, stale signatures or unknown database state must prevent parser transmission. Never treat a socket close or successful TCP write as a clean verdict. Do not return signature names or daemon diagnostics to users.

A clean verdict is not proof that a file is safe. Preserve the isolated parser, DOCX archive checks, byte/page/CPU/RAM limits and explicit draft review. No bypass or automatic fallback when scanning is enabled.

## Capacity and signatures

Do not reuse the parser's 512 MiB budget for a full signature database. Select and measure a separate scanner memory budget, including database reload peaks, before activation. Pin a supported engine/image revision and record the tested signature set. The official deployment guidance describes materially larger RAM needs than the existing parser budget.

A production gate must verify engine readiness and loaded signature freshness, not merely the updater's download timestamp or the daemon's PING response. Define a maximum accepted database age and conservative behavior during reload/partial update. Validate engine support for all configured fail-closed scan limits; scanning only a prefix or silently skipping an archive member is not success. Update and scan privileges remain separate. No CDN downloads in individual user requests.

## Quarantine semantics

Initial scope: transient in-memory withholding until a clean verdict, then discard the upload buffer after the single request. Do not create a persistent malware collection or operator download route. Persistent quarantine requires separate access, retention, encryption, deletion and privacy decisions; it remains out of scope until those are specified. Do not add raw files to logs, backups, CI artifacts or application audit records.

## Required acceptance evidence

1. Protocol fixtures: split frames, clean/detected/error/limit verdicts, extra bytes, invalid encoding, disconnects, stalled read/write, cancellation and bounded output. Assert that every non-clean outcome makes zero parser calls.
2. HTTP route: origin/Auth/owner/quota checks precede scanning; exact bytes scanned equal bytes forwarded; no credential/filename forwarding; failures preserve the draft and make no database writes/retries.
3. Real engine: synthetic clean fixtures and the standard harmless antivirus test string, including supported archives. Distinguish custom test-signature fixtures from acceptance with a real current signature database. A fake daemon is not antivirus evidence.
4. Real containers: scanner/gateway/parser network separation, no host bindings or document volumes, secret isolation, resource ceilings, database stale/reload/unavailable scenarios and cleanup after success/failure/cancellation.
5. Budget integration: scanning time must fit the existing application/gateway deadlines or those contracts must be explicitly revised and tested together. Never append a scan timeout that silently exceeds the client's deadline.
6. Operator acceptance: owned host capacity, engine/signature updates, health alerts without PII, privacy/retention and real HTTPS/application smoke before enabling. Keep the overall antivirus/quarantine roadmap item open until these checks pass.

## Primary references

- [clamd protocol](https://github.com/Cisco-Talos/clamav/blob/main/docs/man/clamd.8.in): INSTREAM framing and stream limit errors.
- [ClamAV container guidance](https://docs.clamav.net/manual/Installing/Docker.html): memory requirements, signature updates and deployment boundaries.
- [clamd configuration](https://github.com/Cisco-Talos/clamav/blob/main/etc/clamd.conf.sample): scan/resource/queue controls. Pin and verify against the selected supported release before implementation; main is not a release contract.

## Transport implementation checkpoint

`worker/clamav.ts` implements bounded INSTREAM framing, exact clean verdict with EOF, conservative blocked/error outcomes, cancellation and absolute deadline. `afterCleanScan` prevents parser dispatch for every non-clean result and isolates the forwarded bytes from scanner callback mutation. Ten local TCP/gate tests pass. This is not wired into the production gateway: real engine/signature freshness, scan-limit behavior, deployment isolation and end-to-end acceptance remain required. No antivirus protection is claimed from protocol fixtures alone.

## Gateway wiring checkpoint

The gateway now accepts `PARSER_SCAN_MODE=off|required` (default off; invalid values refuse startup). Required mode uses the scan gate and rechecks readiness before parser dispatch. Its readiness provider deliberately returns false until real engine/signature attestation exists: required mode currently returns unavailable and health 503, with no parser transmission. This is a closed integration checkpoint, not an enabled antivirus service. Seventeen protocol/gate tests pass, including readiness loss and cancellation between scan and extraction. No Compose scanner service or production activation has been added.

## Readiness policy checkpoint

`scanner-readiness.ts` validates a strict scanner-side observation: explicitly allowed engine, positive loaded database version, loaded database timestamp, observation time and short expiry. Future timestamps, stale observations/databases, unknown fields/engines, invalid policy and expired/overlong leases fail closed. The version in tests is only a synthetic allowlist fixture, not a recommendation for a supported engine release. This validates policy, not authenticity: a trusted scanner-side observer and authenticated transport must still be implemented. Never accept this object from an upload or caller-supplied HTTP header. Gateway readiness remains deliberately false; this policy alone does not enable scanning.

## Attestation verification checkpoint

`scanner-attestation.ts` authenticates bounded canonical-base64 payload bytes with an operator-pinned Ed25519 public key and a protocol-specific domain prefix before parsing JSON or evaluating freshness. Unknown keys, altered payload/signature, extra envelope fields, invalid encoding and signed stale/unsupported reports fail closed. Synthetic ephemeral keys are generated only within tests. This does not supply a real observer, trustworthy database measurement, key provisioning/rotation or authenticated report retrieval; gateway readiness remains false until those components and real-engine acceptance exist. Never accept a public key from the report or upload.

## Signed observer transport checkpoint

Gateway required mode now uses a fixed private `http://scanner-observer:8080/readiness` endpoint, with a bounded 500 ms total call and 10 KB response, no redirects, cookies, authorization or caller-provided URL. It verifies the signed envelope and freshness before allowing INSTREAM/parser progression. Required mode refuses startup without `PARSER_SCANNER_PUBLIC_KEY` and comma-separated explicit `PARSER_SCANNER_ENGINES`. Public keys are gateway-only operator configuration, never uploaded input. An unavailable/invalid observer fails closed. Earlier hardcoded-false readiness checkpoints are superseded by this transport.

The real scanner-side observer is still absent: nothing here measures ClamAV's loaded database or signs such a measurement. No observer endpoint, signing key or scanner deployment is provisioned. Required mode is therefore not operational until those components and real-engine/container acceptance exist. Synthetic signed reports test transport/authentication only; they do not establish antivirus protection. Signature age policy currently requires <=24 hours, observation/lease <=30 seconds, with no future clock allowance.

## Loaded-engine observer implementation

`scanner-measurement.ts` queries the fixed private scanner's `zVERSION` command with a 200 ms deadline/512-byte bound and strict EOF framing. It rejects missing database metadata, impossible calendar dates, wrong weekdays, future timestamps and unsupported response shapes. ClamAV 1.4.6 source `clamd/session.c::print_ver` obtains these fields from CL_ENGINE_DB_VERSION/CL_ENGINE_DB_TIME, not from freshclam download metadata: https://github.com/Cisco-Talos/clamav/blob/clamav-1.4.6/clamd/session.c . Scanner TZ must be UTC because the daemon renders ctime in its local zone.

`scanner-observer.cts` now serves signed fresh observations on GET /readiness, with one measurement at a time and no document endpoint. It requires a separately mounted Ed25519 private key at /run/secrets/scanner_observer_key, an explicit engine allowlist and SCANNER_TIMEZONE_UTC_CONFIRMED=true, plus bounded cgroups. Invalid deployment refuses startup; unavailable/stale/unknown engine observations return 503. No signing key is generated or committed by the service. This supersedes earlier statements that observer implementation is absent. Actual scanner/observer Compose topology, operator key provisioning, UTC enforcement and real-engine/container acceptance remain open; do not activate production from fixture tests.

## Container topology checkpoint (not yet executed)

`worker/compose.antivirus.yaml` is an opt-in overlay: scanner has a private network only, gateway joins scanner/observer networks, observer joins both internal scanner and observer networks, parser keeps its original private network. Only observer receives its signing-key secret; scanner has no signing key or gateway token. Scanner TZ is explicitly UTC and engine is pinned to 1.4.6. Scanner resource budget is separate (4 GiB/zero extra swap/1 CPU/64 PIDs), observer 128 MiB/0.25 CPU/32 PIDs. Signature databases are preloaded in the image; no updater or per-request downloads are enabled. Read-only scanner rootfs avoids persistent document storage; the image deliberately does not inherit the vendor's anonymous database volume.

The pinned clamd configuration uses bounded stream/archive/scan limits and encrypted/limit alerts, a single scanning thread and tmpfs-only temporary files. Option names were checked against the 1.4.6 sample. Administrative command-disable options introduced in 1.5 are deliberately absent. Scanner readiness must expire if bundled signatures become stale; refreshing the image and a maintained update procedure remain operational requirements. Image build, actual startup/config compatibility, real clean/test-string/limit scans, observer signature flow and full Docker HTTP acceptance have not yet been executed for this overlay. Do not enable production based on YAML inspection.

## Real-engine CI prepared

The antivirus job builds the pinned scanner and observer images and runs `JOBMATCH_ANTIVIRUS_CONTAINER_TEST=1 node worker/tests/antivirus-container.mjs`. It uses a real preloaded ClamAV database, ephemeral test signing key/token, separate internal scanner/parser/observer networks, and a loopback gateway port. It checks actual signed readiness, blocking the standard harmless antivirus test string before consuming the parser, clean extraction, refusal after observer/scanner removal, absence of inherited scanner database volumes and cleanup of all synthetic containers/networks/key files. No real documents or operator secrets are used. This test is prepared but has not yet been run; protocol fixture results are not substituted for its outcome.
