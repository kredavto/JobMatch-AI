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
