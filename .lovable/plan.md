
# Progressive Disclosure for Quick Actions in Case Overview

## Overview

Implement a collapsible Quick Actions section that starts **collapsed by default** on the Case Overview screen. This reduces visual clutter and vertical space usage while maintaining full access to document generation shortcuts with a single click.

---

## Current State Analysis

**File:** `src/components/cases/CaseManagement.tsx`  
**Location:** Lines 1310-1342

The Quick Actions section currently displays all available form template buttons unconditionally for each case card. The buttons are generated dynamically using `formTemplatesService.getFormsByStage()`.

---

## Implementation Approach

### Technical Strategy

Use Radix UI's `Collapsible` component (already available at `@/components/ui/collapsible`) to wrap the Quick Actions section. This provides:
- Smooth expand/collapse transitions
- Accessibility (keyboard navigation, ARIA attributes)
- Consistent with existing patterns (see `AIAssistantPanel.tsx`)

### Session Persistence

Store expand/collapse state per case in `sessionStorage` to persist preferences during the current session without backend changes.

---

## Detailed Changes

### File: `src/components/cases/CaseManagement.tsx`

#### 1. Add Imports

Add to existing imports (line ~1-34):
```typescript
import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
```

#### 2. Add State for Tracking Expanded Cases

Add new state (around line ~90):
```typescript
// Track which cases have their Quick Actions expanded
const [expandedQuickActions, setExpandedQuickActions] = useState<Set<string>>(() => {
  // Load from sessionStorage on initial render
  try {
    const stored = sessionStorage.getItem('quickActions-expanded');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
});

// Toggle handler with session persistence
const toggleQuickActions = (caseId: string) => {
  setExpandedQuickActions(prev => {
    const updated = new Set(prev);
    if (updated.has(caseId)) {
      updated.delete(caseId);
    } else {
      updated.add(caseId);
    }
    // Persist to sessionStorage
    try {
      sessionStorage.setItem('quickActions-expanded', JSON.stringify([...updated]));
    } catch {
      // Ignore storage errors
    }
    return updated;
  });
};
```

#### 3. Replace Quick Actions Section (Lines 1310-1342)

**Before:**
```tsx
{/* Quick Actions for Form Templates */}
<div className="pt-2 border-t border-border">
  <div className="flex items-center gap-2 mb-2">
    <FileText className="h-4 w-4 text-muted-foreground" />
    <span className="text-sm font-medium text-muted-foreground">Quick Actions:</span>
  </div>
  <div className="flex flex-wrap gap-2">
    {formTemplatesService.getFormsByStage(...).map(...)}
  </div>
</div>
```

**After:**
```tsx
{/* Quick Actions for Form Templates - Progressive Disclosure */}
{(() => {
  const quickActionForms = formTemplatesService.getFormsByStage(caseItem.currentStage, caseItem.matterType);
  const isExpanded = expandedQuickActions.has(caseItem.id);
  
  return (
    <div className="pt-2 border-t border-border">
      <Collapsible
        open={isExpanded}
        onOpenChange={() => toggleQuickActions(caseItem.id)}
      >
        <CollapsibleTrigger asChild>
          <button
            className="flex items-center gap-2 w-full text-left py-1 hover:bg-muted/50 rounded transition-colors group"
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronRight 
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                isExpanded ? 'rotate-90' : ''
              }`} 
            />
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Quick Actions ({quickActionForms.length})
            </span>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-2">
          <div className="flex flex-wrap gap-2">
            {quickActionForms.map(formCode => (
              <Button
                key={formCode}
                variant="outline"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  const template = await formTemplatesService.loadFormTemplate(formCode);
                  if (template) {
                    setFormTemplateModal({
                      isOpen: true,
                      template,
                      caseId: caseItem.id
                    });
                  }
                }}
                className="text-xs"
              >
                Generate {formCode.replace('_', '-')}
              </Button>
            ))}
            {quickActionForms.length === 0 && (
              <span className="text-xs text-muted-foreground">
                No forms available for {caseItem.currentStage} stage
              </span>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
})()}
```

---

## Visual Design

### Collapsed State (Default)
```
▶ Quick Actions (8)
```
- Compact single-line header
- Chevron points right indicating expandable
- Count shows number of available actions
- Smaller font, neutral secondary styling

### Expanded State
```
▼ Quick Actions (8)
[Generate DRC01-REPLY] [Generate DRC05-REPLY] [Generate DRC06-REPLY] ...
```
- Chevron rotates 90° pointing down
- Buttons wrap gracefully
- Maintain existing button spacing and styling

---

## Responsive Behavior

| Viewport | Collapsed | Expanded |
|----------|-----------|----------|
| Desktop | Single line, full width | Buttons wrap horizontally |
| Tablet | Single line, full width | Buttons wrap 2-3 per row |
| Mobile | Single line, full width | Buttons stack vertically |

The `flex flex-wrap gap-2` classes already handle responsive wrapping.

---

## Interaction Rules

| Action | Result |
|--------|--------|
| Click header | Toggle expand/collapse |
| Click button | Generate document (existing behavior) |
| Expand/collapse | No page reload, no state change |
| Session refresh | State persists via sessionStorage |
| Browser close | State resets (session only) |

---

## Preserved Functionality

All existing functionality remains unchanged:
- Button labels
- Click behavior (document generation)
- Template loading via `formTemplatesService`
- Form modal display
- Permissions and validations
- Audit logging

---

## Technical Specifications

| Aspect | Detail |
|--------|--------|
| Component | Radix `Collapsible` (already installed) |
| Animation | CSS transform on chevron (200ms) |
| Persistence | `sessionStorage` key: `quickActions-expanded` |
| State format | JSON array of case IDs |
| Accessibility | Keyboard navigable, ARIA labels |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/cases/CaseManagement.tsx` | Add imports, state, toggle handler, replace Quick Actions JSX |

---

## Testing Checklist

1. Page loads with Quick Actions collapsed for all cases
2. Click header expands to show all buttons
3. Click header again collapses the section
4. Chevron rotates smoothly on expand/collapse
5. Count displays correct number of available actions
6. Clicking a button opens the form modal (unchanged)
7. Clicking card elsewhere doesn't toggle Quick Actions
8. Expand state persists on page navigation within session
9. Mobile/tablet: Buttons stack/wrap appropriately
10. Cases with 0 forms show "No forms available" message when expanded
