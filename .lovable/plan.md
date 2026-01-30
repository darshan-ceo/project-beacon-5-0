

# Fix: Remove Duplicate Upload Area in Notice Intake Wizard

## Problem Identified

The Notice Intake Wizard Step 1 shows **two upload-like areas**:

| Location | Lines | Description | Functionality |
|----------|-------|-------------|---------------|
| **Top (Header)** | 667-674 | Large Upload icon + "Upload Notice Document" + "Select or drag and drop your ASMT-10 notice PDF" | **Non-functional** (just decorative header) |
| **Bottom** | 755-769 | Dashed border dropzone + "Click to select or drag and drop your PDF notice" | **Functional** (actual file input) |

The top section **looks like a dropzone** but has no file input attached - it's purely decorative. This confuses users who try to drag files onto it.

---

## Solution

**Remove the duplicate decorative upload header** (lines 667-674) while keeping the functional file input dropzone (lines 755-769).

The step content should start directly with the AI/OCR Configuration card, followed by the functional file upload zone.

### Changes to `src/components/notices/NoticeIntakeWizard.tsx`

**Remove lines 667-674** (the decorative header that looks like an upload area):

```typescript
// REMOVE THIS SECTION:
<div className="text-center">
  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
  <h3 className="text-lg font-semibold mb-2">Upload Notice Document</h3>
  <p className="text-sm text-muted-foreground">
    Select or drag and drop your ASMT-10 notice PDF
  </p>
</div>
```

The actual functional dropzone at lines 755-769 already provides clear instructions:
```typescript
<div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
  <input type="file" accept=".pdf" ... />
  <label htmlFor="notice-file-input" className="cursor-pointer">
    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
    <p className="text-sm text-muted-foreground">
      Click to select or drag and drop your PDF notice
    </p>
  </label>
</div>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/notices/NoticeIntakeWizard.tsx` | Remove lines 667-674 (decorative upload header in `case 1` of `renderStepContent`) |

---

## Visual Result

**Before:**
```
┌─────────────────────────────────────┐
│     [Upload Icon - Large]           │  ← Looks clickable (NOT functional)
│  "Upload Notice Document"           │
│  "Select or drag and drop..."       │
├─────────────────────────────────────┤
│  [AI/OCR Configuration Card]        │
├─────────────────────────────────────┤
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐     │
│  │  [Upload Icon - Small]   │       │  ← ACTUAL functional dropzone
│  │  "Click to select or..." │       │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘     │
└─────────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────────┐
│  [AI/OCR Configuration Card]        │
├─────────────────────────────────────┤
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐     │
│  │  [Upload Icon]           │       │  ← Single, clear upload area
│  │  "Click to select or..." │       │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘     │
└─────────────────────────────────────┘
```

---

## Testing Checklist

1. Open the Notice Intake Wizard from "From Notice" button
2. Verify only **one** upload area is visible
3. Click on the upload area → File picker should open
4. Drag and drop a PDF → File should be accepted
5. Verify file name and size are displayed correctly
6. Click "Next" → Extraction should proceed normally

