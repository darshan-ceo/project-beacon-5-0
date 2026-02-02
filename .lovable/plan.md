
# Custom Document Template Fix Plan

## Problem Summary

After Supabase migration, the Custom Template feature has these issues:
1. **Blank PDF** - Template content exists in database but PDF renders blank
2. **UI Clipping** - The template editor dialog height is too small; content is cut off across all tabs

## Root Cause Analysis

### Issue 1: Blank PDF Generation

**Database State:**
Templates stored in `system_settings` have content but use a **legacy schema**:
```json
{
  "richContent": "<h2>Re: Response to GST Scrutiny...</h2>...",
  "variableMappings": {"client.display_name": "client.display_name"},
  "branding": null,  // Missing or null
  "output": {
    "filename": "${code}_${case.case_number}_${now:YYYYMMDD}.pdf",
    "dms_folder_by_stage": true,
    "timeline_event": "Document Generated"
  }
}
```

**Expected Schema:**
```json
{
  "richContent": "...",
  "branding": {
    "font": "Inter",
    "primaryColor": "#0B5FFF",
    "watermark": { "enabled": false, "opacity": 10 }
  },
  "output": {
    "format": "PDF",
    "pageSize": "A4",
    "orientation": "Portrait",
    "margins": { "top": 10, "bottom": 10, "left": 10, "right": 10 }
  }
}
```

**Problem:**
- The `normalizeTemplate()` function merges with defaults but doesn't handle the case where `output` has a completely different structure (legacy vs modern)
- When `output.format` is undefined, the generator defaults to HTML but still tries to call PDF-specific methods
- The template normalization in `TemplatesManagement.tsx` doesn't account for legacy output structures

### Issue 2: UI Layout Clipping

**Root Cause:**
- The dialog uses `h-[90vh]` which is approximately 900px on a 1080p screen
- DialogHeader contains the metadata grid (~200px) taking significant vertical space
- The Tabs component with content area has `flex-1` but gets compressed
- The EditorContent uses `min-h-[300px]` but the actual visible area ends up much smaller due to competing heights

**Current Structure:**
```
DialogContent (h-[90vh] = ~900px)
├── DialogHeader (~200px with metadata grid)
├── Tabs (flex-1 → gets ~640px)
│   ├── TabsList (~48px)
│   └── TabsContent (flex-1 → gets ~590px)
│       ├── Variables Sidebar (w-64)
│       └── Editor Panel
│           ├── Toolbar (~48px)
│           ├── ScrollArea (flex-1 → should get ~500px but gets less)
│           └── Preview Toggle (~48px)
└── DialogFooter (~60px)
```

## Solution

### Fix 1: Schema Migration for Legacy Templates

**File:** `src/services/unifiedTemplateGenerationService.ts`

Update `normalizeTemplate()` to detect and convert legacy output schema:

```typescript
private normalizeTemplate(template: UnifiedTemplate): UnifiedTemplate {
  const defaultBranding = { ... };
  const defaultOutput = { ... };

  // Detect legacy output structure (has filename but no format)
  const hasLegacyOutput = template.output && 
    'filename' in template.output && 
    !('format' in template.output);

  // Build normalized output
  let normalizedOutput = {
    ...defaultOutput,
    ...(hasLegacyOutput ? {} : (template.output || {})),
    margins: {
      ...defaultOutput.margins,
      ...(!hasLegacyOutput && template.output?.margins ? template.output.margins : {})
    }
  };

  // Preserve legacy filename pattern if present
  if (hasLegacyOutput && (template.output as any).filename) {
    normalizedOutput.filenamePattern = (template.output as any).filename;
  }

  return {
    ...template,
    branding: { ...defaultBranding, ...(template.branding || {}), ... },
    output: normalizedOutput,
    ...
  };
}
```

### Fix 2: Template Normalization in UI Layer

**File:** `src/components/documents/TemplatesManagement.tsx`

Update `handleGenerate()` and `handleEdit()` to properly convert legacy templates:

```typescript
const handleGenerate = (template: FormTemplate | CustomTemplate) => {
  if ('templateType' in template && template.templateType === 'unified') {
    // Detect legacy output and transform
    const rawTemplate = template as unknown as UnifiedTemplate;
    const hasLegacyOutput = rawTemplate.output && 
      'filename' in rawTemplate.output && 
      !('format' in rawTemplate.output);
    
    const normalizedTemplate = {
      ...rawTemplate,
      branding: { ...defaultBranding, ...(rawTemplate.branding || {}) },
      output: hasLegacyOutput 
        ? { ...defaultOutput, filenamePattern: (rawTemplate.output as any).filename }
        : { ...defaultOutput, ...(rawTemplate.output || {}) }
    };
    
    setSelectedUnifiedTemplate(normalizedTemplate);
    setUnifiedGenerateModalOpen(true);
  }
};
```

### Fix 3: Increase Dialog Height and Optimize Layout

**File:** `src/components/documents/UnifiedTemplateBuilder.tsx`

1. **Increase dialog height** from `h-[90vh]` to `h-[95vh]`:
```tsx
<DialogContent className="max-w-[1100px] h-[95vh] flex flex-col p-0 overflow-hidden">
```

2. **Reduce header metadata density** - move some metadata items to a collapsible section or reduce padding:
```tsx
<DialogHeader className="px-6 pt-4 pb-3 border-b shrink-0">
  // Reduce vertical spacing in metadata grid
  <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
```

3. **Ensure TabsContent gets proper height** with explicit min-height:
```tsx
<TabsContent value="design" className="flex-1 flex gap-4 px-6 pb-4 overflow-hidden mt-2 min-h-0" style={{ minHeight: '400px' }}>
```

4. **Remove the competing min-h-[300px] from EditorContent** and let ScrollArea handle it:
```tsx
<div className="min-h-0 h-full flex flex-col">
  <EditorContent editor={editor} className="flex-1 min-h-0" />
</div>
```

5. **Make preview toggle row more compact**:
```tsx
<div className="border-t p-1.5 flex justify-between items-center bg-muted/30 shrink-0">
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/unifiedTemplateGenerationService.ts` | Detect and convert legacy output schema in `normalizeTemplate()` |
| `src/components/documents/TemplatesManagement.tsx` | Add legacy schema detection in `handleGenerate()` and `handleEdit()` |
| `src/components/documents/UnifiedTemplateBuilder.tsx` | Increase height, reduce header padding, fix editor layout |

## Technical Details

### Legacy vs Modern Output Schema Detection

```typescript
// Legacy (pre-migration):
{
  "output": {
    "filename": "${code}_${case.case_number}_${now:YYYYMMDD}.pdf",
    "dms_folder_by_stage": true,
    "timeline_event": "Document Generated"
  }
}

// Modern (post-migration):
{
  "output": {
    "format": "PDF",
    "orientation": "Portrait", 
    "pageSize": "A4",
    "margins": { "top": 10, "bottom": 10, "left": 10, "right": 10 },
    "includeHeader": true,
    "includeFooter": true,
    "includePageNumbers": true,
    "filenamePattern": "${code}_${case.caseNumber}_${now:YYYYMMDD}.pdf"
  }
}
```

Detection logic: `'filename' in output && !('format' in output)` → legacy template

### Layout Height Calculations (1080p screen)

**Current (broken):**
- Dialog: 90vh = 864px
- Header: ~200px
- Footer: ~60px
- Available for Tabs: ~604px
- TabsList: ~48px
- Available for content: ~556px
- Toolbar: ~48px, Preview toggle: ~48px
- **Editor visible area: ~460px** (but actually less due to cumulative issues)

**Fixed:**
- Dialog: 95vh = 912px
- Header: ~150px (reduced padding)
- Footer: ~50px (more compact)
- Available for Tabs: ~712px
- TabsList: ~48px
- Available for content: ~664px
- Toolbar: ~48px, Preview toggle: ~36px (compact)
- **Editor visible area: ~580px** (+120px improvement)

## Testing Checklist

1. Open Custom Templates → Edit existing unified template
2. Verify all tabs are fully visible at 1080p resolution without needing to resize browser
3. Add content in Design tab with plain text and variables
4. Save template
5. Click Generate, select a case
6. Verify PDF contains:
   - Plain text from editor
   - Resolved variable values (client name, case number)
7. Test with older templates created before migration
8. Verify filename resolves correctly (no `{{caseNumber}}` placeholders)
