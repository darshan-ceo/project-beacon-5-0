# Custom Document Template Fix Plan

## Status: ✅ IMPLEMENTED

All phases have been implemented.

## Summary of Changes

### Phase 1-2: PDF Generation Pipeline Fix
**File**: `src/services/unifiedTemplateGenerationService.ts`

- **Refactored `generatePDF()`** to stop injecting a full HTML document string into a `<div>`.
- **Built CSS separately** via `buildPdfStyles()` method and injected as a `<style>` element.
- **Sanitized only the content HTML**, not the wrapper document.
- **Created container with explicit dimensions** matching page size (A4/Letter/Legal) using `getPageWidthMm()`.
- **Used `position: fixed; visibility: hidden;`** instead of `-9999px` for reliable html2canvas capture.
- **Added debug logging** to track content flow and container dimensions.

### Phase 3: Variable Resolution Hardening
**File**: `src/services/unifiedTemplateGenerationService.ts`

- **Added `toCamelCase()` helper** for snake_case → camelCase conversion.
- **Added `fieldAliases` map** for common aliases (e.g., `client.display_name` → `client.name`).
- **Updated `resolveValue()`** to try original key, then camelCase version, then snake_case version.
- **Added system variable aliases** (e.g., `current_date` → `currentDate`).

### Phase 4: UI Layout Clipping Fix
**File**: `src/components/documents/UnifiedTemplateBuilder.tsx`

- **Replaced `min-h-[500px]`** on editor wrapper with `min-h-0 h-full` so ScrollArea owns scroll.
- **Added `min-h-0` and `shrink-0`** to all flex children that should scroll vs. stay fixed.
- **Fixed Design tab**: Left sidebar and editor panel now properly scroll.
- **Fixed Fields tab**: Both left (Field Library) and right (Selected Fields) panels now properly scroll.
- **Ensured all ScrollAreas have `min-h-0`** for proper flex layout sizing.

## Verification Checklist
1. ✅ Open Custom Templates → Edit Template: All tabs fully visible at 1080p
2. ✅ Variables panel scrolls independently
3. ✅ Editor content scrolls independently
4. ✅ PDF generation uses proper DOM structure with explicit sizing
5. ✅ Variable resolution supports both snake_case and camelCase
6. ✅ Filename resolution handles both `${}` and `{{}}` styles
