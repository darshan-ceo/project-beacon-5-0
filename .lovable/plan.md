
# UI/UX Improvement Plan: Notice Intake Wizard Brand Alignment

## Problem Analysis

The screenshot shows workflow step badges (Upload → Extract → Create Case → Tasks) using a **teal/green background (`bg-secondary`)** with dark text, creating poor contrast that hides text content.

**Current State**:
```tsx
<span className="px-2 py-1 rounded bg-secondary">Upload</span>
```
This renders as teal (#0F766E) background with dark text = unreadable.

---

## Brand Guidelines Reference

From `index.css`:
- **Primary**: Deep Blue (#1E3A8A) - for emphasis
- **Secondary**: Teal (#0F766E) - for secondary actions
- **Muted**: Light gray (#F1F5F9) - for subtle backgrounds
- **Muted Foreground**: Slate (#64748B) - for secondary text

**Brand Rule**: Use `bg-muted text-muted-foreground` for workflow step indicators (subtle, readable), or `bg-primary/10 text-primary` for themed badges.

---

## Changes Required

### File 1: `src/components/notices/wizard/EntryDecisionStep.tsx`

**Issue**: Lines 55, 57, 59, 61, 92, 94, 96, 98 use `bg-secondary` with no foreground color.

**Solution**: Replace with brand-aligned styling:
- Workflow steps: `bg-muted text-foreground` for neutral steps
- Icon containers: `bg-primary/10` with `text-primary` for New Case
- Icon containers: `bg-muted` with `text-muted-foreground` for Existing Case

**Specific Changes**:

| Line | Current | Replacement |
|------|---------|-------------|
| 43 | `bg-primary/10` | Keep (icon bg is correct) |
| 55-61 | `bg-secondary` | `bg-muted text-foreground` |
| 80 | `bg-secondary` | `bg-muted` |
| 92-98 | `bg-secondary` | `bg-muted text-foreground` |

---

### File 2: `src/components/notices/wizard/StageAwarenessStep.tsx`

Review and align any stage-specific styling with brand colors.

---

### File 3: `src/components/notices/wizard/CompletionStep.tsx`

Review success indicators to ensure proper contrast.

---

### File 4: `src/components/notices/NoticeIntakeWizardV2.tsx`

Review dialog styling, progress bar colors, and button variants for brand consistency.

---

## Detailed Implementation

### EntryDecisionStep.tsx Changes

```tsx
// Workflow step badges - BEFORE
<span className="px-2 py-1 rounded bg-secondary">Upload</span>

// Workflow step badges - AFTER (neutral, readable)
<span className="px-2 py-1 rounded bg-muted text-foreground font-medium">Upload</span>
```

For icon containers:
```tsx
// New Case icon (emphasis) - CORRECT
<div className="p-2 rounded-lg bg-primary/10">
  <FolderPlus className="h-5 w-5 text-primary" />
</div>

// Existing Case icon (secondary) - CORRECT
<div className="p-2 rounded-lg bg-muted">
  <FolderOpen className="h-5 w-5 text-muted-foreground" />
</div>
```

---

## Additional UI/UX Enhancements

1. **Add subtle border to workflow badges** for definition:
   ```tsx
   bg-muted text-foreground border border-border
   ```

2. **Improve card hover states** with brand colors:
   ```tsx
   hover:border-primary hover:bg-primary/5
   ```

3. **Add smooth transitions** for selection feedback:
   ```tsx
   transition-all duration-200
   ```

4. **Improve visual hierarchy** with proper spacing and typography

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/notices/wizard/EntryDecisionStep.tsx` | Fix badge contrast, icon containers |
| `src/components/notices/wizard/StageAwarenessStep.tsx` | Align stage indicators |
| `src/components/notices/wizard/CompletionStep.tsx` | Check success/summary cards |
| `src/components/notices/NoticeIntakeWizardV2.tsx` | Review progress bar and dialog styling |

---

## Expected Outcome

After implementation:
- All workflow step badges will have proper text contrast (dark text on light gray)
- Icon containers will use brand-appropriate backgrounds
- Cards will have consistent hover states aligned with Legal Blue theme
- The wizard will maintain professional legal appearance per brand guidelines
