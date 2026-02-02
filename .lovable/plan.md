
# Fix Plan: Custom Document Template Regression

## Problem Summary

After Supabase migration, the Custom Template feature has three regressions:
1. **Blank PDF** - Template content renders but variables aren't being replaced
2. **Unresolved Filename Placeholders** - Downloaded filename shows `{{title}}_{{caseNumber}}.pdf`
3. **UI Clipping** - Template editor content gets clipped at normal screen resolution

## Root Cause Analysis

### A. Blank PDF / Variable Resolution Failure

The variable replacement logic has a **key mismatch** between stored templates and the resolver:

**Stored Template Content** (in Supabase):
```html
<p>Client Name: {{client.display_name}}</p>
<p>Case Number: {{case.case_number}}</p>
```

**Stored Variable Mappings**:
```json
{
  "client.display_name": "client.display_name",
  "case.case_number": "case.case_number"
}
```

**Current Replacement Logic** (line 130-133 of `unifiedTemplateGenerationService.ts`):
```typescript
Object.entries(template.variableMappings).forEach(([variable, path]) => {
  const value = this.resolveValue(path, allData);
  // Replaces {{variable}} where variable = "client.display_name"
  // But regex needs to escape dots in the pattern
  const variableRegex = new RegExp(`{{${variable}}}`, 'g');
});
```

**Problem**: The regex `{{client.display_name}}` isn't escaping the dots, so `.` matches any character instead of a literal dot. This causes unreliable matching.

Additionally, there's a fallback issue where unmapped variables get replaced with empty strings (line 137), but the FIELD_LIBRARY uses underscore-style keys (`client_name`) while templates use dot notation (`client.display_name`).

### B. Filename Placeholder Mismatch

| Default Pattern | Expected by Generator |
|-----------------|----------------------|
| `{{title}}_{{caseNumber}}` | `${code}_${case.caseNumber}` |

The `generateFilename` method uses `${}` syntax but defaults/normalization provides `{{}}` syntax.

### C. UI Layout Clipping

The dialog uses `h-[90vh]` with flex layout, but inner `TabsContent` containers lack:
- `min-h-0` (required for flex children to properly shrink)
- Proper `overflow-auto` on scrollable content areas

## Solution

### Fix 1: Variable Replacement (Critical)

**File**: `src/services/unifiedTemplateGenerationService.ts`

Update `replaceVariables` method to:
1. Escape special regex characters in variable names
2. Also directly replace variables using their path (for dot-notation keys)
3. Add fallback direct replacement for common patterns

```typescript
private replaceVariables(...): string {
  let processedContent = content;
  
  const allData = { case: caseData, client: clientData, ...additionalData };

  // Replace each variable with its mapped value
  Object.entries(template.variableMappings).forEach(([variable, path]) => {
    const value = this.resolveValue(path, allData);
    // Escape special regex characters in variable name
    const escapedVariable = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const variableRegex = new RegExp(`\\{\\{${escapedVariable}\\}\\}`, 'g');
    processedContent = processedContent.replace(variableRegex, value);
  });

  // Also do direct path replacement for {{case.xxx}} and {{client.xxx}} patterns
  processedContent = processedContent.replace(
    /\{\{(case|client|system)\.([^}]+)\}\}/g, 
    (match, prefix, field) => {
      const path = `${prefix}.${field}`;
      return this.resolveValue(path, allData) || '';
    }
  );

  // Replace any remaining unmapped variables with empty string
  processedContent = processedContent.replace(/\{\{[^}]+\}\}/g, '');

  return processedContent;
}
```

### Fix 2: Filename Pattern Normalization

**File**: `src/services/unifiedTemplateGenerationService.ts`

Update `generateFilename` to handle both `${}` and `{{}}` placeholder styles:

```typescript
generateFilename(template: UnifiedTemplate, caseData?: Case): string {
  const normalizedTemplate = this.normalizeTemplate(template);
  let filename = normalizedTemplate.output.filenamePattern || '${code}_${now:YYYYMMDD}';
  
  // Replace ${code} and {{code}} style
  filename = filename.replace(/\$\{code\}|{{code}}/gi, normalizedTemplate.templateCode || 'document');
  
  // Replace ${title} and {{title}}
  filename = filename.replace(/\$\{title\}|{{title}}/gi, normalizedTemplate.title || 'document');
  
  // Replace ${case.*} and {{case.*}} patterns
  if (caseData) {
    filename = filename.replace(
      /(\$\{case\.(\w+)\}|{{case\.(\w+)}})/g, 
      (match, full, field1, field2) => {
        const field = field1 || field2;
        return (caseData as any)[field] || '';
      }
    );
    // Handle {{caseNumber}} shorthand
    filename = filename.replace(/{{caseNumber}}/gi, caseData.caseNumber || '');
  }
  
  // Replace ${now:format} and {{now:format}} patterns
  filename = filename.replace(
    /(\$\{now:([^}]+)\}|{{now:([^}]+)}})/g, 
    (match, full, fmt1, fmt2) => {
      const dateFormat = fmt1 || fmt2;
      return format(new Date(), dateFormat.replace('DD', 'dd').replace('YYYY', 'yyyy'));
    }
  );
  
  // Add extension if not present
  const extension = normalizedTemplate.output.format.toLowerCase();
  if (!filename.endsWith(`.${extension}`)) {
    filename += `.${extension}`;
  }
  
  return filename;
}
```

### Fix 3: UI Layout Overflow

**File**: `src/components/documents/UnifiedTemplateBuilder.tsx`

Update the dialog layout structure to ensure proper overflow handling:

```typescript
// Line 559 - Add min-h-0 to flex container
<DialogContent className="max-w-[1100px] h-[90vh] flex flex-col p-0 overflow-hidden">

// Line 634 - Add min-h-0 to Tabs container  
<Tabs ... className="flex-1 flex flex-col overflow-hidden min-h-0">

// Line 662 - Add min-h-0 to TabsContent
<TabsContent value="design" className="flex-1 flex gap-4 px-6 pb-4 overflow-hidden mt-4 min-h-0">

// Line 720 - Add min-h-0 and overflow to editor panel
<div className="flex-1 flex flex-col overflow-hidden min-h-0">

// Line 807 - Ensure ScrollArea has min-h-0
<ScrollArea className="flex-1 border border-t-0 rounded-b-lg min-h-0 overflow-auto">
```

Similar changes for Fields, Branding, Output tabs.

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/unifiedTemplateGenerationService.ts` | Fix regex escaping in `replaceVariables`, add direct path replacement, update `generateFilename` to handle both placeholder styles |
| `src/components/documents/UnifiedTemplateBuilder.tsx` | Add `min-h-0` and proper overflow classes to flex containers |

## Testing Checklist

After implementation:
1. Navigate to Document Management > Custom Templates
2. Edit an existing unified template - verify all tabs are fully visible without scrolling the browser
3. Add content and variables in the Design tab
4. Click Generate, select a case
5. Verify:
   - PDF contains the template content with variables replaced
   - Filename includes resolved case number (not `{{caseNumber}}`)
   - All tabs (Design, Fields, Branding, Output) scroll properly at 1080p resolution
