# PDF and PNG in the browser

The file picker reads PDF and PNG locally. PDF.js pulls selectable text from
the actual PDF text layer. A page without a readable text layer is rasterized
locally and read by Tesseract; PNG is decoded and recognized locally. Both
Russian and English are enabled in the same OCR pass. Text is not sent to
JobMatch or an OCR vendor. This path does not persist the file or call Groq.

- Input: up to 10 MiB; PDF: up to 10 pages, at most 4 OCR pages; PNG: up to
  12 megapixels and 8,000 px per side. OCR's input raster is bounded to 4
  megapixels and 2,400 px along the longest side. OCR workers are terminated
  on cancellation/replacement and when the bounded import completes.
- Local text result: up to 100,000 characters, with an explicit error rather
  than truncation. Protected PDFs and unreadable scans show an error. Blank or
  substantially illegible scan pages can prevent import of a whole PDF rather
  than silently disappearing. On each PDF page with readable selectable text,
  that text wins; an image with additional writing on such a mixed page is not
  separately merged. Multi-column layout, low resolution, and handwriting may
  be imperfect. Review the extracted text before use and re-upload a corrected
  document if necessary.
- PDF.js (already pinned, 6.2.108) and Tesseract.js 7.0.0, with Russian/English
  package data 1.0.0, are obtained via the integrity-locked package registries
  at install time. `npm run dev` and `npm run build` use `predev`/
  `prebuild` to copy the exact files from installed packages. The copy requires
  no network, no secrets, and no generated binaries tracked in Git. The PDF
  decoder, OCR worker, chosen WASM core, and language files are loaded on
  demand from versioned paths on the same JobMatch origin. The complete build
  adds about 23 MiB of static assets, but a new OCR browser fetches just one
  core variant and two language files (~9.3 MiB before HTTP transport
  compression). The first uncached OCR run needs the app origin to be
  reachable; it does not need a third-party site. Runtime CSP forbids other
  origins and grants WebAssembly compilation only in the two exact workers.
- Synthetic Playwright coverage in `tests/e2e/resume-ocr.spec.ts` generates
  a real bilingual text-layer PDF, image-only PDF and PNG. It checks exact
  selectable text, real OCR, worker CSP, no OCR load for the searchable PDF,
  and no document/network writes or off-origin retrieval. The small unit suite
  covers limits and pre-aborted imports.

Upstream references: [PDF.js API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html),
[Tesseract.js API](https://github.com/naptha/tesseract.js/blob/v7.0.0/docs/api.md),
[Tesseract.js worker protocol source](https://github.com/naptha/tesseract.js/blob/v7.0.0/src/worker-script/index.js).
