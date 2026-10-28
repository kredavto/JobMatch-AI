# Antivirus deployment and acceptance runbook

Status: implementation under review in PR #13; no production activation. Use the live CI result and deployment checks below before enabling it. See ANTIVIRUS_GATE_DESIGN.md for protocol/security boundaries and historical checkpoints.

## Required resources and trust

The scanner and signature updater each use a separate 4 GiB memory ceiling; reserve additional capacity for the parser (512 MiB), gateway (128 MiB), observer (128 MiB), image builds, signature loading and the host. These ceilings are not a capacity/load guarantee. Maintain the host/kernel and supported engine packages. The pinned image is ClamAV 1.4.6; verify vendor support/security updates before an actual rollout.

Create an independent Ed25519 observer key through the operator's secret process. Keep its private file outside the repository, backups/artifact pipelines and logs; mount it only into scanner-observer at /run/secrets/scanner_observer_key. It must be readable by container UID10001 without exposing its host directory. File-backed Compose secrets use source filesystem permissions; verify actual access rather than assuming mode/UID fields are enforced. Give only the PEM public key to gateway as PARSER_SCANNER_PUBLIC_KEY. The ephemeral keys in CI are not deployment keys. Plan key rotation: stage the new trusted public key and matching observer private key together; a mismatch must return unavailable, never bypass verification.

Keep the separate gateway token from the existing parser deployment. Neither scanner nor parser receives that token or the observer signing key. The observer is a trusted measurement/signing process, not a file parser. Do not attach unrelated workloads or mount the Docker socket into any service.

## Inspect and stage

Use the overlay only with the original worker Compose file:

```
docker compose -f worker/compose.yaml -f worker/compose.antivirus.yaml config --quiet
docker compose -f worker/compose.yaml -f worker/compose.antivirus.yaml build --pull
```

Supply PARSER_WORKER_TOKEN, PARSER_SCANNER_PUBLIC_KEY and SCANNER_OBSERVER_KEY_FILE through operator-controlled configuration. The overlay fixes allowed engine to1.4.6 and sets scanner TZ=UTC. Keep this UTC setting: VERSION reports a local ctime string. The observer's explicit UTC confirmation is a deployment assertion, not discovery of a remote time zone. Synchronize host clocks.

Review the rendered configuration privately (it can include secrets); do not paste it into tickets or logs. Verify gateway retains parser/ingress networks and additionally joins scanner/observer internal networks. Scanner joins only scanner_private, parser only parser_private, observer scanner_private+observer_private. Only gateway binds loopback8081. No scanner/observer host port or persistent document volume should exist. The scanner image copies the vendor rootfs without inheriting its writable anonymous database volume; verify Config.Volumes and actual mounts. Rootfs is read-only and temporary scan files stay on bounded tmpfs.

Keep required mode, resource/scan limits and observer signature/freshness checks intact. Unknown engine, no loaded database version, future/invalid time, database older than24h, observation/lease older than30s, invalid signature, oversized/unknown response, busy scanner or timeout must prevent parser transmission. The observer issues10s leases and queries the daemon's loaded DB fields rather than the updater's file timestamps.

## Acceptance before users' files

Run the synthetic container test on a disposable Docker host, never against production service names:

```
JOBMATCH_ANTIVIRUS_CONTAINER_TEST=1 node worker/tests/antivirus-container.mjs
```

This assumes locally built jobmatch-parser:test and jobmatch-scanner:test images. It creates its own names/networks and ephemeral credentials, checks a real clean file and the harmless standard antivirus test string, then removes all resources. It must not use real documents or operator keys.

Before activation also test supported DOCX/PDF archives, encrypted containers, decompression/file/time limits, interrupted upload/scan, signature reload/update failure, public HTTPS proxy/application draft behavior, process/resource ceilings and multi-account boundaries. A clean verdict is not an absolute safety guarantee. The existing parser isolation, DOCX validation, OCR limits and explicit review/save remain necessary. Do not claim these broader cases passed solely because the basic smoke passed.

After review and separately authorized deployment, start the overlay on the owned host. Keep the TLS proxy/private health route and body logging restrictions from ISOLATED_PARSER.md. Verify real signed readiness and explicit draft saving on the application domain. No database migration is required by this stage.

## Signature maintenance and incident handling

The image seeds a named signature volume. Only signature-updater mounts it read-write; scanner mounts it read-only, and neither gateway, observer nor parser mounts it. The updater joins only its dedicated egress network, holds no document data or application/signing credentials, and runs FreshClam with hourly checks and database validation. Scanner SelfCheck10 notices a changed database and reloads without concurrent engine duplication. Readiness continues to describe the loaded engine, not the downloaded file; during startup/reload, stale or unavailable observations must close the gate.

Before activation test actual CDN access, update failure/backoff, loaded-version change after a successful update, signature validation, disk capacity and alerts. Do not delete freshclam state to bypass CDN throttling. A restart alone is not evidence of fresh signatures. Rebuilding with --pull also refreshes the supported scanner software; deploy a reviewed image and update the engine allowlist together when changing engine version. An immutable image digest pins software, while the separate signature volume can still update. Signature updates and engine security updates are different maintenance tasks.

Monitor readiness failures, observed engine/database version/age, resource kills and aggregate request outcomes without file data, original names, tokens, signatures or private keys. Alarm before the24h boundary. A stale image or failed update must make imports unavailable rather than switch scanning off. Preserve open drafts and allow manual text entry. Do not weaken limits to make an unscannable file look clean.

For a bad rollout, stop accepting file uploads and restore a reviewed working image/key pairing only if signatures remain fresh. An explicit decision to disable antivirus changes the security boundary; it is not automatic recovery. No persistent malware quarantine, operator document-download endpoint or raw-file retention is implemented. Establish separate access/privacy/retention/deletion policy before adding one.

This runbook prepares an operation; it does not assert that an owned host, keys, refresh schedule, real acceptance or production deployment already exist.
