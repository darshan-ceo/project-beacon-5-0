
## What’s happening (restating the issue precisely)
In **Document Management → Custom Templates**, you can:
- Add content in the **Design** tab and save the template successfully.
- Click **Generate**, select a case, and the PDF downloads.
- But the PDF content is **blank** (even though the template clearly contains text in the editor).
Additionally:
- The **Edit Template** dialog UI is **clipped** (variable panel/editor area not fully visible at normal resolution) across **Design / Fields / Branding / Output** tabs.

## What I found in the codebase (key observations)
### 1) PDF generation uses `html2pdf` on a hidden container
`unifiedTemplateGenerationService.generatePDF()`:
- Builds `processedContent` from `template.richContent`
- Wraps it using normalize/branding HTML (`applyBranding`)
- Sanitizes with DOMPurify and sets `container.innerHTML = sanitized(styledContent)`
- Appends container off-screen (`left: -9999px`)
- Calls `html2pdf().from(container).outputPdf('blob')`

A blank PDF strongly suggests one of these is true at runtime:
- The container ends up with **0 width/height** (html2canvas captures “nothing”).
- DOMPurify + full-document HTML string (`<!doctype><html><head>...`) results in **unexpected DOM** inside a `<div>` container.
- The element is off-screen in a way html2canvas/html2pdf fails to render (common if the element has no computed layout).
- The “content” is present, but the captured node ends up empty because of sanitization/DOM parsing quirks.

### 2) Variable pipelines are mixed (snake_case/dot paths vs camelCase app state)
Your app state objects appear camelCase (e.g. `case.caseNumber`, `client.name`), while some templates/seed content uses snake_case/dot (e.g. `case.case_number`, `client.display_name`).
We already added regex escaping and direct `{{case.xxx}}` replacement, but **value resolution can still yield empty strings** if the underlying data uses different key naming than the template expects.
This can reduce content, but it **does not fully explain totally blank PDFs when the template contains plain text**, so we need to fix the PDF capture robustness first.

### 3) UI clipping: Builder already has many `min-h-0`/overflow fixes, but some flex children still force height
In `UnifiedTemplateBuilder.tsx`, the editor area still includes:
- A `min-h-[500px]` wrapper around `EditorContent` inside a `ScrollArea`.
This can cause the dialog’s internal flex layout to “overflow + clip” at common resolutions, especially when combined with `overflow-hidden` parents.
Also, the left sidebar variable list uses a `ScrollArea className="flex-1"` but the sidebar container lacks `min-h-0`, which can break proper scroll sizing in nested flex.

## Do I know what the issue is?
Partially.
- **UI clipping**: yes—this is classic nested flex + missing `min-h-0` + “min-height forcing” (the `min-h-[500px]`) causing content to be clipped.
- **Blank PDF**: not 100% proven yet, but the most likely cause is the html2pdf/html2canvas capture node having **invalid/zero layout** due to building a full `<html><head><body>` document inside a `<div>` and/or offscreen sizing issues. We need to instrument and then adjust the capture DOM to a predictable structure.

## Implementation plan (no redesign; strictly regression fix)

### Phase 1 — Add targeted instrumentation (fast, decisive)
Goal: determine whether the PDF pipeline receives real HTML and whether the capture node has real dimensions.

In `UnifiedTemplateGenerationService.generatePDF()` add temporary debug logs:
- `template.templateCode`, `template.title`
- `normalizedTemplate.richContent.length`
- `processedContent.length` and a short preview `processedContent.slice(0, 200)`
- `container.innerHTML.length`
- `container.getBoundingClientRect()` (width/height)
- If width/height are ~0, that’s the smoking gun.

This will confirm whether the blank PDF is because:
- content is missing, or
- content exists but capture DOM is effectively empty.

### Phase 2 — Make the PDF capture DOM predictable and measurable (primary blank-PDF fix)
Refactor `generatePDF()` to stop injecting a **full HTML document string** into a `<div>`.

Instead:
1) Build **CSS** separately (from branding/output).
2) Sanitize **only the content HTML** (the template’s richContent), not the whole wrapper document.
3) Create a container like:

- `<div>` (outer) with:
  - explicit width matching page size (A4/Letter/Legal)
  - background white
  - padding/margins applied
  - `position: fixed; left: 0; top: 0; visibility: hidden;` (better than -9999px for some html2canvas cases)
- `<style>` element appended to the container (or document head temporarily)
- `<div class="document-content">` containing sanitized `processedContent`

4) Ensure the container has a valid computed size:
- set `container.style.width`:
  - A4 portrait: ~`210mm`
  - A4 landscape: ~`297mm`
  - or use px fallback (e.g., 794px for A4 width at 96dpi)
- set `container.style.minHeight` similarly

5) Call html2pdf on the inner content element or the container after it’s laid out.

This removes DOM parsing ambiguity and prevents “empty capture”.

### Phase 3 — Strengthen value resolution without breaking existing templates (variable regression hardening)
Update `resolveValue()` to support:
- snake_case → camelCase fallback per segment (e.g. `case.case_number` → try `case.caseNumber`)
- common aliases:
  - `client.display_name` → `client.name`
  - `case.case_number` → `case.caseNumber`
This keeps older templates working post-migration without needing manual edits.

Also update filename resolver to handle both:
- `{{case.case_number}}` and `{{caseNumber}}`
by using the same fallback logic.

### Phase 4 — Fix the dialog clipping (UI regression fix)
In `UnifiedTemplateBuilder.tsx`:
1) Remove or reduce the forced minimum height that breaks layout:
- Replace the editor wrapper `min-h-[500px]` with `min-h-0 h-full` so ScrollArea owns scroll.
2) Ensure every flex child that should scroll has `min-h-0`:
- Left sidebar container: add `min-h-0`
- Left sidebar ScrollArea: add `min-h-0`
- Fields tab left/right panels and their ScrollAreas: add `min-h-0`
3) Verify `TabsContent` containers:
- Keep `overflow-hidden` at the TabContent level (so the dialog doesn’t scroll)
- Ensure the inner ScrollAreas are the only scroll surfaces

This should make the builder fully visible at 1080p without needing to resize the window smaller.

### Phase 5 — Verification checklist (end-to-end)
1) Open Custom Templates → Edit Template:
- At normal screen size, confirm all tabs show fully and editor/variables panels are usable with internal scrolling.
2) Add plain text + at least one variable, Save & Publish.
3) Generate → select a case → download PDF:
- PDF must show:
  - the plain text from the editor
  - the resolved variable values
4) Confirm filename resolution:
- no `{{title}}_{{caseNumber}}.pdf` placeholders remain
5) Repeat on an older template created pre-migration (to confirm backward compatibility).

## Deliverables (what will change)
- `src/services/unifiedTemplateGenerationService.ts`
  - Add instrumentation (temporary)
  - Refactor PDF DOM build for reliable capture
  - Add robust snake_case/camelCase + alias resolution
- `src/components/documents/UnifiedTemplateBuilder.tsx`
  - Remove forced min-height, add missing `min-h-0`/scroll fixes to eliminate clipping

## Risk management
- The PDF change is localized to the generation service and does not affect template editing or saving.
- The resolver fallback will be additive: it tries the original path first, then tries fallbacks, reducing risk of breaking existing mappings.
- UI changes are CSS-class-level and can be validated quickly in the preview.

## What I need from you (only if the debug logs confirm ambiguity)
If after Phase 1 logs we still see “content exists and container has correct dimensions” but PDF is blank, then the next step would be to capture:
- the first ~200 characters of `container.innerHTML`
- `container.getBoundingClientRect()`
to pinpoint if html2canvas is failing due to CSS/CORS/font loading.
