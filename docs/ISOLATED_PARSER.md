# Optional isolated document parsing

This dependent stage follows PR #10. No service has been deployed and the default remains `IMPORT_PARSER_MODE=inline`. Inline parsing retains its existing cooperative deadlines. Worker mode requires an owner-operated endpoint and fails closed without falling back to inline parsing.

## Data flow

The existing import API checks origin, authentication, owner and quota before sending the bounded file. It sends only raw bytes, a validated `txt`/`docx`/`pdf` extension and an independent service credential to the configured HTTPS gateway. It does not send the original filename, Supabase JWT, owner ID or cookies. The entire worker request/response has a 20-second application deadline, including a noncooperative transport; redirects and automatic retries are forbidden.

The gateway checks its token and forwards only bytes and extension to a fixed private `http://parser:8080` backend. It never imports document extraction code. The parser container receives no credentials, rejects credential headers, and refuses to start with secret environment variables. Its subprocess receives an explicit minimal environment rather than the gateway or application environment. The gateway and parser have separate process/filesystem namespaces. Only the gateway is reachable by the operator's TLS proxy; the parser has no published port and only an internal network.

The parser accepts one job per container lifetime, starts an extraction subprocess, returns bounded JSON and exits. Docker restarts it for another job, with a new PID and fresh tmpfs. Gateway readiness returns 503 while a job is active or its parser is restarting. There is no queue or automatic replay; concurrent requests can return 503. A failed parser or gateway cannot trigger a database write. The application receives text in its existing editable draft and the user must explicitly save/import and confirm facts.

## Enforced limits

| Boundary | Budget |
| --- | --- |
| Input | 4,000,000 bytes; TXT, DOCX or PDF only |
| Result | 100,000 UTF-16 characters; 800,000 response bytes; strict JSON/status schema |
| Worker cgroup | 512 MiB total memory, no additional swap, 1 CPU, 64 PIDs |
| Gateway cgroup | 128 MiB, no additional swap, 0.25 CPU, 32 PIDs |
| Parser subprocess | Linux `prlimit`: 8 CPU seconds, no core dumps, 64 file descriptors |
| Subprocess wall deadline | 15 seconds, parent timer plus process-group SIGKILL |
| Upload / gateway forwarding | 10-second upload deadline; 18-second backend deadline |
| Application worker call | 20 seconds total, with cancellation |
| Filesystem | Read-only root, bounded noexec/nosuid tmpfs; no host bind mounts |

Both entrypoints inspect cgroup v2 limits and refuse absent, unlimited or looser than the worker ceilings (512 MiB, 1 CPU, 64 PIDs, zero swap). The gateway has stricter Compose budgets; CI checks its actual 128 MiB allocation. V8 heap flags are additional measures, not total memory limits. Nonroot UID 10001, dropped capabilities, no-new-privileges and Docker's default seccomp remain enabled. Node's SIGUSR1 inspector activation is disabled. All stderr from untrusted extraction is discarded; protocol errors are fixed codes and never contain document data or raw parser diagnostics. The DOCX archive and format validation from inline mode are reused inside the child.

This is process/container isolation, not antivirus or a quarantine service. Optional PDF OCR is described in [SCANNED_PDF_OCR.md](SCANNED_PDF_OCR.md); it remains off by default. No file is deliberately persisted, but host/platform logging, swap, crash collection, reverse proxy buffering and backup policy need an operator decision. A compromised host/kernel is outside this boundary. Private network access to the gateway is authenticated; never attach other services or credentials to the parser network/container.

## Provisioning and enabling

Use a maintained Linux Docker host with cgroup v2 and Compose support for these resource controls. Review data location, capacity, update policy and retention before real files. Reserve at least the combined 640 MiB service budget plus host/image overhead; no capacity/load guarantee is made.

1. Generate an independent 32–128-character token using only letters, digits, `_` and `-`. Supply it to Compose as `PARSER_WORKER_TOKEN` using the operator's secret store. Do not put it in git, command history or shared logs. Never supply Supabase keys or application user tokens to either container.
2. From the repository root run `docker compose -f worker/compose.yaml config --quiet`, then `docker compose -f worker/compose.yaml up --build -d`. The gateway binds only `127.0.0.1:8081`; the parser has no host binding. Keep restart behavior, internal network and all resource controls intact. Inspect the actual cgroups and isolation; an accepted YAML file alone is insufficient.
3. Configure the operator's HTTPS reverse proxy to the local gateway, allowing a maximum 4 MB raw POST body, disabling request/response body logging and persistent buffering, and setting bounded connection/rate limits. The public extraction URL must end at `/extract`, without credentials, query or fragment. Keep health access private. TLS termination and ingress anti-abuse are not implemented by this repository.
4. Validate `/health` and synthetic TXT/DOCX/text-PDF jobs through the HTTPS proxy. Check wrong tokens, invalid formats, oversized files, timeouts, busy/restart behavior, no filename/JWT forwarding and no raw content in logs. Confirm each parser job retires and a restart clears tmpfs. CPU/RAM tests intentionally kill disposable containers and must run only in a synthetic isolated test environment.
5. In the application deployment set `IMPORT_PARSER_MODE=worker`, `IMPORT_PARSER_URL=https://<owned-host>/extract` and `IMPORT_PARSER_TOKEN` to the same gateway-only token. These are server variables, never `NEXT_PUBLIC_*`. Do not enable before the endpoint and privacy review exist. Test upload, error recovery and explicit draft confirmation on the real application domain before accepting users' files.

Gateway errors: `INVALID` 400, `TOO_LARGE` 413, `TIMEOUT` 408, `BUSY`/`UNAVAILABLE` 503. Invalid gateway credentials return an empty 401. The application maps unexpected authentication/proxy responses to a generic unavailable error. No retry or fallback occurs. The worker does not read or write Supabase and this stage adds no migrations.

## Verification and rollback

`npm run test:parser-worker` compiles the worker and tests actual Linux child processes, CPU/core/FD limits, wall interruption, cancellation, clean environment and real document extraction. `npm test` covers the adapter and import route, including authorization/quota order, metadata minimization, malformed/bounded responses, redirects and a transport that ignores cancellation. These local checks do not prove Docker networking or cgroup RAM enforcement.

`.github/workflows/parser-worker.yml` additionally validates Compose, builds the image and runs `JOBMATCH_PARSER_CONTAINER_TEST=1 PARSER_TEST_IMAGE=jobmatch-parser:test node worker/tests/container-smoke.mjs`. Only synthetic fixtures and an ephemeral token are used. The test exercises the real gateway/private parser HTTP path for all formats, gateway credential separation, rootfs/network restrictions, one-job retirement and restart with fresh tmpfs, kernel CPU kill and a bounded cgroup OOM. It removes all test containers and networks even on failure. Results and skipped live tests are recorded in `VERIFICATION.md`.

To disable worker mode, explicitly choose whether returning to the previous inline risk boundary is acceptable. Set `IMPORT_PARSER_MODE=inline` and redeploy only after that decision, or leave worker mode unavailable and offer manual text entry. Stop Compose with `docker compose -f worker/compose.yaml down`, remove/rotate the gateway token and remove the TLS route. No database rollback is necessary. Do not weaken cgroup or network settings to make a failing deployment serve requests.

The complete roadmap item stays open until quarantine/scanning, owned deployment, operator privacy decisions and live acceptance are done. Optional RU/EN OCR is implemented in the dependent OCR stage; deployment and accuracy acceptance remain open.
