
<context>
User-visible symptom: after uploading a PDF notice (~4 KB), the wizard shows “0.00 MB” and extraction fails (“Failed to extract text from PDF”) even after hard refresh.

Key observation from code:
- Both wizards display file size as MB with `toFixed(2)`. A 4 KB file is ~0.0039 MB, so it will display as “0.00 MB” even when the file is not empty.
- The extraction pipeline relies on PDF.js three times:
  1) `pdfToBase64Images()` for OpenAI Vision
  2) `pdfToBase64Images()` for Lovable AI fallback
  3) `extractTextFromPDF()` for regex fallback
  If PDF.js document loading fails (worker blocked/failed, parsing issue), all three tiers fail and you end up with the generic “Failed to extract text from PDF”.
</context>

<goals>
1) Remove confusion: show correct file size for small PDFs (KB/bytes, not “0.00 MB”).
2) Make PDF parsing resilient: if PDF.js fails in worker mode, automatically retry without worker.
3) Surface the real underlying PDF.js error so we can identify whether it’s a worker/network/CSP issue, password protection, or an invalid PDF stream.
</goals>

<non-goals>
- Changing your OpenAI API key setup (this issue is happening before any OCR call can run).
- Replacing the entire OCR pipeline (we’ll focus on fixing PDF ingestion first).
</non-goals>

<implementation-plan>
<step id="1" title="Fix file size display (0.00 MB for small files)">
  <what>
    Update UI in both Notice Intake wizards to display file size using KB/MB/bytes formatting instead of always MB with 2 decimals.
  </what>
  <why>
    A 4 KB PDF will always render as “0.00 MB” with the current code, which looks like “0 bytes” but isn’t. This is a display/UX bug that’s masking the real problem.
  </why>
  <files>
    - src/components/notices/NoticeIntakeWizardV2.tsx
    - src/components/notices/NoticeIntakeWizard.tsx
  </files>
  <details>
    - Replace:
      - Toast text: `(${(file.size / 1024 / 1024).toFixed(2)} MB)`
      - File card text: `({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)`
    - Reuse an existing formatter pattern already in the codebase (e.g. `orderDocumentService.formatFileSize(bytes)` logic) or extract a small shared helper `formatFileSize(bytes)` into a common util.
    - Target behavior examples:
      - 4000 bytes => “3.9 KB”
      - 800 bytes => “800 B”
      - 2,500,000 bytes => “2.4 MB”
  </details>
</step>

<step id="2" title="Add a resilient PDF.js loader with worker fallback">
  <what>
    Centralize PDF loading in noticeExtractionService and implement automatic retry using `disableWorker: true` when worker-based parsing fails.
  </what>
  <why>
    In real deployments, PDF.js worker loading can fail due to extensions, CSP, corporate proxies, MIME issues, or intermittent asset loading. When that happens, all extraction paths fail. Retrying without a worker often restores functionality (at the cost of performance, which is acceptable for small/medium PDFs).
  </why>
  <files>
    - src/services/noticeExtractionService.ts
  </files>
  <details>
    Implement a helper like:
    - `private async loadPdf(arrayBuffer: ArrayBuffer): Promise<PDFDocumentProxy>`
      1) Try `pdfjsLib.getDocument({ data: arrayBuffer }).promise`
      2) If it throws, log the original error and retry:
         `pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise`
      3) If retry fails, throw a new error that includes the original error name/message for debugging.
    Then update both:
    - `extractTextFromPDF()` to use `loadPdf(arrayBuffer)`
    - `pdfToBase64Images()` to use `loadPdf(arrayBuffer)`
  </details>
</step>

<step id="3" title="Improve diagnostics: show underlying PDF.js failure reason">
  <what>
    Preserve and expose the actual PDF.js error message (not only “Failed to extract text from PDF”).
  </what>
  <why>
    Right now, the service collapses most PDF.js failures into a generic message. Without the underlying reason, we can’t distinguish:
    - Worker load blocked
    - Password-protected PDF
    - Invalid/corrupt PDF bytes
    - PDF.js parsing incompatibility
  </why>
  <files>
    - src/services/noticeExtractionService.ts
    - src/components/notices/NoticeIntakeWizardV2.tsx
    - src/components/notices/NoticeIntakeWizard.tsx
  </files>
  <details>
    - In the service:
      - When PDF parsing fails, return `ExtractionResult` with a richer `error` message (safe, user-friendly) and keep a “technical details” string for console debugging.
      - Detect common PDF.js error types:
        - Password-protected: error name/message indicates password (e.g. `PasswordException`)
        - Worker/module load/network: “Failed to fetch”, “imported module”, “Failed to load module script”, etc.
    - In the wizard:
      - Update the destructive toast description to include a short actionable hint based on category:
        - If worker blocked: “Your browser/network is blocking the PDF parser. Try Incognito mode, disable extensions, or use another browser.”
        - If password-protected: “This PDF is password-protected. Remove the password and re-upload.”
        - If invalid bytes/header mismatch: “This file doesn’t look like a valid PDF.”
  </details>
</step>

<step id="4" title="Optional: add an on-screen 'PDF Debug Info' toggle (fast troubleshooting)">
  <what>
    Add a small expandable debug block in the Upload step (only when a debug flag is enabled) showing:
    - file.size in bytes
    - arrayBuffer.byteLength
    - first 5 bytes/header (“%PDF-” check)
    - pdfjs workerSrc string
  </what>
  <why>
    This allows non-technical users to capture exactly what’s wrong without digging into DevTools, and it helps confirm whether the browser is reading the file correctly.
  </why>
  <files>
    - src/components/notices/NoticeIntakeWizardV2.tsx (and optionally V1)
  </files>
  <details>
    Controlled by something like:
    - `localStorage.setItem('notice_ocr_debug', '1')`
    - or query param `?noticeOcrDebug=1`
  </details>
</step>

<validation-plan>
1) Upload the provided sample PDF again:
   - The UI should show “~3.9 KB” (not “0.00 MB”).
2) Start extraction:
   - If worker mode fails, the service should retry without worker automatically.
   - Extraction should proceed to either:
     - OpenAI Vision OCR (network call visible), or
     - Regex extraction (if AI is unavailable), but without hard failing at PDF parsing.
3) Confirm improved error feedback:
   - If it still fails, the toast should indicate the category (worker blocked / password / invalid PDF), and console logs should include the underlying PDF.js error.
</validation-plan>

<expected-outcome>
- The “0.00 MB” display no longer misleads; small PDFs show KB/bytes.
- The OCR pipeline works again in environments where PDF.js worker loading is blocked by retrying with `disableWorker`.
- If parsing still fails, you’ll get a precise, actionable error message instead of a generic “Failed to extract text from PDF”.
</expected-outcome>

<files-to-change-summary>
- src/services/noticeExtractionService.ts
  - Add `loadPdf()` helper with worker fallback and improved error classification.
  - Use `loadPdf()` in both text extraction and image conversion paths.
- src/components/notices/NoticeIntakeWizardV2.tsx
  - Use a proper file-size formatter in toast + file card.
  - Show categorized error hints; optional debug info toggle.
- src/components/notices/NoticeIntakeWizard.tsx
  - Same file-size formatting + improved error feedback.
</files-to-change-summary>
