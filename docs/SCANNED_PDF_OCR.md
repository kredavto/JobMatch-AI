# Opt-in OCR for scanned PDF pages

This stage depends on PR #11. It adds OCR inside the private parser container, without deploying it or changing the default inline path. `PARSER_WORKER_OCR=false` remains the Compose default. No external AI/OCR service receives the file, and no application credentials reach Poppler or Tesseract.

## Behavior

With `PARSER_WORKER_OCR=true`, PDF.js first reads each page's embedded text. If a page has fewer than five characters after trimming leading/trailing whitespace, Poppler renders that page and Tesseract recognizes it using the installed `eng+rus` LSTM models. Pages with embedded text keep their existing text. Mixed PDFs can therefore combine embedded and recognized pages in document order. At most three pages may require OCR; a fourth rejects the entire import with `OCR_LIMIT` 400. The original 30-page/4,000,000-byte PDF limits still apply.

This is a heuristic for pages without a useful text layer. It does not identify every image region on a page that already contains text. Hidden/incorrect text layers, tables, handwriting, rotation, low contrast, other languages, semantic layout and arbitrary mixed regions need manual review; they are not claimed as supported accuracy guarantees. A truly blank page may produce empty OCR text, but an entirely blank document is rejected by the usual text gate. A CLI failure, oversized/invalid output or timeout aborts the whole document; no partial success is returned. A runtime limit may be reached before three pages.

Success adds optional `ocrPages` (integer 1–3) to the strict worker/import response. Non-OCR success stays `{text}` at the application API. The adapter rejects OCR metadata on TXT/DOCX and rejects malformed metadata. The UI validates it before replacing the draft and explicitly asks the user to check names, dates and numbers. An error preserves the existing draft and never retries or saves it automatically. Saving and fact verification remain separate explicit actions. `ocrPages` is a transient draft hint, not persisted fact provenance, model versioning or a confidence score.

## Resource and privacy boundary

- Poppler and Tesseract are invoked as fixed absolute executable paths with argument arrays, no shell, no original filename and a minimal environment. They inherit the isolated job's process group and Linux CPU/core/FD limits. OMP threads are limited to one.
- Each native command has a four-second wall deadline and bounded stdout (400,000 bytes / 100,000 resulting characters); output must be valid UTF-8 without NUL. Stderr is discarded. The existing supervisor still kills the whole process group after 15 seconds; the application deadline remains 20 seconds. CPU 8 seconds, total container RAM 512 MiB/zero additional swap, 1 CPU and 64 PIDs remain unchanged. Heap flags are not the RAM limit.
- Each rendered page is grayscale with its longer side at most 2,000 pixels (at most about 4 MB of PGM pixels). One raster is kept at a time. This bounds the emitted image, not arbitrary intermediate PDF decoding; the container budgets and deadlines bound that work.
- OCR lazily creates a random mode-0700 directory under the existing bounded noexec/nosuid `/tmp` tmpfs. The input uses an exclusive fixed filename and mode 0600; the job's umask is 077. No user-controlled path enters a command. Raster files are removed after each page; the PDF and directory are removed in job cleanup. On hard cancellation/OOM, container retirement/restart removes the tmpfs. No host bind mounts, persistent document volume, queue or cache is added.
- A local native test outside Docker can prove command/output/tempfile behavior, not private networking or hard container RAM. Real container tests separately exercise OCR through the credential gateway and private parser. Host logging/buffering/swap/crash collection, supported packages, retention and jurisdiction still require operator review.

## Enable, verify and disable

1. Complete the owned worker/TLS/privacy checks in [ISOLATED_PARSER.md](ISOLATED_PARSER.md). Build the updated image, which installs Poppler, Tesseract 5 and English/Russian models. No model download happens per request. Validate `tesseract --list-langs` in the image and retain supported package/security updates.
2. Set `PARSER_WORKER_OCR=true` only for the `parser` service, then recreate it with the existing Compose runbook. Invalid values refuse parser startup. Do not set it on the gateway, expose it through `NEXT_PUBLIC_*` or add any credential to the parser. No application variable changes are needed beyond the previously configured worker mode.
3. Before real files, verify synthetic English/Russian image-only and mixed PDFs, blank input, a four-scanned-page rejection, timeouts, draft warnings and explicit saving through the owned HTTPS/application domain. Confirm process retirement, no raw data in logs and tmpfs cleanup. The repository's synthetic accuracy fixtures do not replace acceptance on representative consented documents.
4. To disable OCR, set `PARSER_WORKER_OCR=false` and recreate the parser. Text PDF/DOCX/TXT behavior remains available. Image-only PDFs then follow the previous generic extraction rejection/manual-paste path. No database rollback is necessary.

## Reproduce tests

`npm run test:parser-worker` compiles and runs real child/CLI tests plus strict resource/protocol tests. Install `poppler-utils`, `tesseract-ocr`, `tesseract-ocr-eng`, `tesseract-ocr-rus` and `fonts-dejavu-core` for all OCR fixtures. `JOBMATCH_REQUIRE_OCR_TESTS=1` refuses missing binaries/Russian language instead of accepting skipped fixtures. The parser workflow sets this flag. Tests generate raster PDF fixtures with no searchable layer, check actual English/Russian recognition, mixed ordering, blank/default-off behavior, whole-document page-limit failure, private file modes, bounded raster dimensions and cleanup.

`npm test`, lint/types/build and Playwright additionally check the adapter/route, strict OCR metadata, mobile review warning, preservation of the draft and explicit saving. Docker smoke tests repeat bilingual/mixed/default-off/blank/page-budget cases through the real gateway/private parser alongside the previous isolation/CPU/RAM/restart probes. Results: `VERIFICATION.md` and PR CI.

The implementation follows [Tesseract's command-line usage](https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html) for languages/engine/stdout and the [Poppler `pdftoppm` manual](https://manpages.debian.org/bookworm/poppler-utils/pdftoppm.1.en.html) for page selection, grayscale and bounded scaling. The two engines are third-party native parsers inside the existing boundary; OCR is not antivirus or quarantine. Those roadmap items, real deployment and live acceptance remain open.
