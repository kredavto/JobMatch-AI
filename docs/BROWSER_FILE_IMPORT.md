# Browser-local resume input

`mvp/browser-resume-import.ts`: `parseResumeFile(file, signal?)` returns `{text,filename}`; no network upload, DB write or provider invocation. All errors are visible; no silent truncation. UI owns stale-selection handling/AbortController.

Accepted extensions: DOC/DOCX/TXT/RTF/PDF/PNG. File <=10MiB, extracted text <=100000 characters (existing local-profile bound), minimum20. Filename <=240 without control/path characters. MIME checked when present; octet-stream permitted, DOCX also ZIP MIME. Magic/structure checks still apply. AI provider limits are separate and may reject large profiles without truncating local import.

- TXT: BOM UTF16LE/BE, UTF8 preferred, Windows1251 fallback. Renamed ZIP/CFB/PDF/PNG/RTF rejected. Ambiguous legacy text encoding cannot be inferred perfectly; user sees preview.
- RTF: bounded groups, Unicode escapes/fallback, Windows1251/1252, paragraph/table separators. Skips non-body destinations and field instructions; never evaluates embedded objects. Unsupported encoding/structure rejected.
- DOCX: bounded central ZIP sizes/count/ratio, no macros/embedded objects; actual document XML inflation limit2MB, no DTD/entities; DOMParser, not innerHTML; iterative XML walk maxdepth100/output100k. Main document text/tables, not header/footer/comment metadata or deleted tracked-change text. No relationships fetched.
- DOC: bounded CFB FAT/DIFAT/mini-stream chains and cycle checks, Word97+ main-story CLX/PCD pieces. UTF16 and specified compressed ANSI pieces; main-story table cells normalized as line breaks. Encrypted and obsolete/unsupported files fail visibly. No macros execute. Main story only, not header/footer/footnotes/comments. Nested fields rejected rather than guessed.
- PDF/PNG: separate local module maintained by OCR implementation owner.

MS-DOC retrieval algorithm: https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-doc/01d5d8c4-cf9c-4ef9-80fd-439e763cfe01 ; FcCompressed: https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-doc/aa2e55a2-f4f2-4795-bab5-6d9d7a0ed249 . Not full Word layout fidelity; main-story text preview must be checked, particularly header-based CVs and complicated tables. Main-story-only limitation must not be called full layout preservation.

Verification: `npx vitest run tests/browser-resume-import.test.ts` (8 passed); genuine LibreOffice-created Russian Word97/RTF fixtures compare exactly. Real DOM/ZIP verification: `npm run test:mvp:e2e -- --grep "reads original"`, optionally with `CHROMIUM_PATH`. The browser checks the exact text with the actual JobMatch picker and asserts no document upload or requests to other origins. Fixture source/conversion is documented alongside files.
