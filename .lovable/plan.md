
# Fix Plan: Case Edit Data Loss for Notice Date, Reply Due Date, Authority Level, and City

## Problem Statement

When editing a case, the following fields that were populated during creation appear blank and lose their data after saving:
1. **Notice Date** - appears blank in edit mode, value lost after save
2. **Reply Due Date** - appears blank in edit mode, value lost after save
3. **Authority Level** - appears blank in edit mode, value lost after save
4. **City** - appears blank in edit mode, value lost after save

## Root Cause Analysis

### Issue 1: Authority Level - Select Value Mismatch (Critical)

The Authority Level dropdown shows blank because of a case-sensitivity mismatch:

| Layer | Value Format | Example |
|-------|-------------|---------|
| Database `stage_code` | UPPERCASE | `ASSESSMENT` |
| After `normalizeStage()` | Title Case | `Assessment` |
| Authority Hierarchy IDs | UPPERCASE | `ASSESSMENT` |
| Form `currentStage` | Title Case | `Assessment` |

**Problem Flow:**
1. Database stores: `stage_code = 'ASSESSMENT'`
2. `normalizeStage()` converts to: `'Assessment'` (title case)
3. `formData.currentStage` gets: `'Assessment'`
4. Select dropdown has options with `value={level.id}` = `'ASSESSMENT'`
5. Select component can't find matching option (`'Assessment' !== 'ASSESSMENT'`)
6. Dropdown shows blank, and on save, either user picks new value or stale value persists

### Issue 2: Unused `authorityLevel` Field Overwriting Data

The form has an `authorityLevel` field that:
- Is hydrated from `c.authorityLevel || c.authority_level` - both undefined/null
- Gets saved with empty string value
- This field is redundant since `currentStage` holds the same information

In `CaseModal.tsx`:
- Line 137: `authorityLevel: c.authorityLevel || c.authority_level || ''` - always empty
- Lines 317, 371: `authorityLevel: formData.authorityLevel` - saves empty string

### Issue 3: Notice Date and Reply Due Date - Field Mapping Gap

The form hydration should work correctly (line 130-131):
```javascript
notice_date: c.noticeDate || c.notice_date || '',
reply_due_date: c.replyDueDate || c.reply_due_date || '',
```

However, looking at `DataInitializer.tsx`, both camelCase and snake_case variants are mapped (lines 297-301). But the issue may be that when the case object comes from `state.cases` (not directly from Supabase), the frontend-only `Case` interface fields might not be consistently populated.

Additionally, the `useEffect` dependency array includes `state.cases.length` which could cause re-renders and unexpected resets if the cases array changes.

### Issue 4: City Field - Potentially Same as Notice Date Issue

The `city` field hydration looks correct (line 150):
```javascript
city: c.city || '',
```

And `DataInitializer.tsx` line 285 maps it: `city: c.city || ''`

## Technical Solution

### Fix 1: Align Authority Level Select Options with Form Value

**Option A (Recommended):** Keep the `normalizeStage()` output format and update the Select to use `level.name` as the value:

```typescript
// In CaseForm.tsx - make the Select value match option values
<Select 
  value={formData.currentStage} 
  onValueChange={(value) => setFormData(prev => ({ 
    ...prev, 
    currentStage: value,
    matterType: ''
  }))}
>
  <SelectContent>
    {authorityHierarchyService.getActiveAuthorityLevels().map(level => (
      <SelectItem key={level.id} value={level.name}>  {/* Use level.name instead of level.id */}
        {level.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Option B:** Update hydration to skip normalization for `currentStage`:

```typescript
// In CaseModal.tsx hydration
currentStage: c.stage_code || c.currentStage || 'ASSESSMENT',
```

**Recommendation:** Option A is simpler and maintains consistency with how other parts of the app display stages in title case.

### Fix 2: Remove Redundant `authorityLevel` Field

Remove the `authorityLevel` field from:
1. `CaseFormData` interface
2. Form hydration in `CaseModal.tsx` (line 137)
3. Case creation payload (lines 317-318)
4. Case update payload (lines 371-372)

Since `currentStage` already contains this information and `authorityLevel` is never properly populated.

### Fix 3: Fix Form Hydration for Date Fields

The form uses `notice_date` and `reply_due_date` (snake_case) as form field names, but the `Case` interface and DataInitializer provide both variants. Ensure proper fallback chain:

```typescript
// In CaseModal.tsx hydration - ensure both formats are checked
notice_date: c.notice_date || c.noticeDate || '',
reply_due_date: c.reply_due_date || c.replyDueDate || '',
```

Also remove `state.cases.length` from useEffect dependency to prevent unwanted re-renders:

```typescript
}, [caseData, mode, contextClientId]); // Remove state.cases.length
```

### Fix 4: Ensure City Field Hydration Works Correctly

The city hydration looks correct but ensure consistent access:

```typescript
city: c.city || '',  // This is already correct
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/cases/CaseForm.tsx` | Update Select to use `level.name` as value instead of `level.id` for consistency |
| `src/components/modals/CaseModal.tsx` | (1) Remove `authorityLevel` from form data and payloads, (2) Fix useEffect dependencies, (3) Verify date field hydration |

## Detailed Code Changes

### CaseForm.tsx (Authority Level Select Fix)

Current code at line 453:
```typescript
<SelectItem key={level.id} value={level.id}>
  {level.name}
</SelectItem>
```

Changed to:
```typescript
<SelectItem key={level.id} value={level.name}>
  {level.name}
</SelectItem>
```

### CaseModal.tsx Changes

1. **Remove `authorityLevel` from formData interface and initialization**

2. **Remove from hydration** (line 137) - delete entire line

3. **Remove from create payload** (lines 317-318) - delete `authorityLevel: formData.authorityLevel,`

4. **Remove from update payload** (lines 371-372) - delete `authorityLevel: formData.authorityLevel,`

5. **Fix useEffect dependency** (line 170):
```typescript
}, [caseData, mode, contextClientId]); // Remove state.cases.length
```

## Testing Checklist

1. **Create a new case** with:
   - Notice Date: 2026-01-15
   - Reply Due Date: 2026-02-14
   - Authority Level: Assessment
   - City: Ahmedabad

2. **Verify in database** that all fields are stored correctly

3. **Edit the case** - verify all fields display with correct values

4. **Save without changes** - verify no data is lost

5. **Modify one field and save** - verify other fields retain their values

6. **Test Authority Level dropdown**:
   - Verify currently selected level is shown
   - Verify changing the level works correctly
   - Verify the value persists after save

## Risk Assessment

- **Low Risk**: Changes are localized to form handling, no database schema changes
- **Backward Compatibility**: Existing cases with `stage_code` values will continue to work
- **Testing Focus**: Pay special attention to the Authority Level dropdown as it involves Select component value matching
