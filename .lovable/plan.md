
## Document Template Generation Error Fix

### Problem Analysis

When clicking "Generate Document" for a Custom Template, the application crashes with:
**"Cannot read properties of undefined (reading 'font')"**

This occurs because:
1. Templates stored in the database may have incomplete nested objects (`branding`, `output`, `margins`)
2. The generation service directly accesses `template.branding.font` without null checks
3. The cast from `CustomTemplate` to `UnifiedTemplate` doesn't fill in missing properties

### Solution Overview

Apply defensive programming patterns to ensure all nested properties exist before accessing them, similar to the fix applied for the UnifiedTemplateBuilder.

### Technical Details

#### File 1: `src/services/unifiedTemplateGenerationService.ts`

Add a `normalizeTemplate()` method that ensures all required nested objects exist with default values:

```typescript
private normalizeTemplate(template: UnifiedTemplate): UnifiedTemplate {
  const defaultBranding = {
    font: 'Inter',
    primaryColor: '#0B5FFF',
    accentColor: '#00C2A8',
    header: '',
    footer: '',
    watermark: { enabled: false, opacity: 10 }
  };

  const defaultOutput = {
    format: 'PDF' as const,
    orientation: 'Portrait' as const,
    pageSize: 'A4' as const,
    includeHeader: true,
    includeFooter: true,
    includePageNumbers: true,
    filenamePattern: '{{title}}_{{caseNumber}}',
    margins: { top: 10, bottom: 10, left: 10, right: 10 }
  };

  return {
    ...template,
    branding: {
      ...defaultBranding,
      ...(template.branding || {}),
      watermark: {
        ...defaultBranding.watermark,
        ...(template.branding?.watermark || {})
      }
    },
    output: {
      ...defaultOutput,
      ...(template.output || {}),
      margins: {
        ...defaultOutput.margins,
        ...(template.output?.margins || {})
      }
    }
  };
}
```

Call this normalizer at the start of each generation method (`generateDocument`, `generatePDF`, `generateHTML`, `generateDOCX`).

#### File 2: `src/components/documents/TemplatesManagement.tsx`

Update the `handleGenerate` function to normalize the template before setting it as selected:

```typescript
const handleGenerate = (template: FormTemplate | CustomTemplate) => {
  if ('templateType' in template && template.templateType === 'unified' && 'richContent' in template) {
    // Normalize template with defaults before generation
    const normalizedTemplate = normalizeUnifiedTemplate(template as unknown as UnifiedTemplate);
    setSelectedUnifiedTemplate(normalizedTemplate);
    setUnifiedGenerateModalOpen(true);
  }
  // ... rest of function
};
```

Add a helper function to ensure all nested properties exist with defaults.

### Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/services/unifiedTemplateGenerationService.ts` | Add method | `normalizeTemplate()` with defensive defaults |
| `src/services/unifiedTemplateGenerationService.ts` | Modify | Call normalizer in all generation entry points |
| `src/components/documents/TemplatesManagement.tsx` | Add function | Template normalization helper |
| `src/components/documents/TemplatesManagement.tsx` | Modify | Apply normalization in `handleGenerate` |

### Testing Verification

After implementation:
1. Navigate to Document Management > Custom Templates
2. Select any unified template (Rich Text or Builder 2.0)
3. Click "Generate" button
4. Select a case from the dropdown
5. Click "Generate Document" - should download successfully without errors

The fix ensures backward compatibility with templates that were created before all branding/output fields were required, and prevents similar crashes for any future partial template data.
