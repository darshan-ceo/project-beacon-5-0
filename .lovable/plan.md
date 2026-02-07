

# Fix Activity Description Truncation - Implementation Plan

## Problem Identified

The Activity Timeline in the Inquiry Details drawer truncates long activity descriptions to 2 lines using `line-clamp-2`. There is **no way to view the complete content** of an activity entry.

**Current Behavior:**
```
zoom meeting schedule to discuss litigation cases with partner
agenda Allowed "Modify database" Done! The database constraint has...  ← TRUNCATED
```

## Solution

Add click-to-expand functionality for activity items, allowing users to view the full description without leaving the timeline view.

---

## Implementation Options

### Option A: Inline Expansion (Recommended)
- Click on a truncated activity to expand it in place
- "Show less" button to collapse back
- Minimal UI disruption, keeps context visible

### Option B: Activity Detail Dialog
- Click on activity opens a modal with full details
- Shows all fields: Subject, Description, Outcome, Next Action
- More consistent with app's modal patterns

---

## Technical Implementation (Option A - Inline Expansion)

### Changes to `LeadActivityTimeline.tsx`

**1. Add Expandable State**

Track which activity items are expanded using component state:
```typescript
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

const toggleExpand = (id: string) => {
  setExpandedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};
```

**2. Update Description Rendering**

Replace static `line-clamp-2` with conditional expansion:
```tsx
{activity.description && (
  <div>
    <p className={cn(
      "text-sm text-muted-foreground mt-1",
      !expandedIds.has(activity.id) && "line-clamp-2"
    )}>
      {activity.description}
    </p>
    {activity.description.length > 100 && (
      <button
        onClick={() => toggleExpand(activity.id)}
        className="text-xs text-primary hover:underline mt-1"
      >
        {expandedIds.has(activity.id) ? 'Show less' : 'Show more'}
      </button>
    )}
  </div>
)}
```

**3. Make Activity Item Clickable**

Add cursor pointer and click handler to the content area for better UX.

---

## Alternative Implementation (Option B - Detail Dialog)

If the team prefers a modal approach:

### New Component: `ActivityDetailDialog.tsx`

A simple dialog that displays all activity fields:

| Field | Display |
|-------|---------|
| Type | Icon + Label (Call/Email/Meeting/Note/Task) |
| Subject | Full text, bold |
| Description | Full text, wrapped |
| Outcome | Full text |
| Next Action | With due date if present |
| Logged by | Name + timestamp |

### Integration

- Add state to `LeadActivityTimeline`: `selectedActivity`
- Clicking any activity item opens the dialog
- Dialog has "Edit" button (future enhancement)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/crm/LeadActivityTimeline.tsx` | Add expand/collapse for descriptions |

### Optional (if Option B chosen)

| File | Change |
|------|--------|
| `src/components/crm/ActivityDetailDialog.tsx` | **NEW** - Full activity detail view |

---

## Recommended Approach

**Option A (Inline Expansion)** is recommended because:
- Faster to implement
- Keeps user in context (no modal opening/closing)
- Works naturally within the scroll area
- Less cognitive load for users

---

## Expected Outcome

**Before:**
```
zoom meeting schedule to discuss litigation cases with partner
agenda Allowed "Modify database" Done! The database constraint has...
```

**After (expanded):**
```
zoom meeting schedule to discuss litigation cases with partner
agenda Allowed "Modify database" Done! The database constraint has been updated 
to allow the new inquiry statuses (follow_up, converted, not_proceeding). The 
status buttons should now work correctly.
                                                    [Show less]
```

---

## Summary

| Criterion | Implementation |
|-----------|----------------|
| View full activity content | Click to expand inline OR click to open dialog |
| Minimal UI change | Inline expand preferred |
| Files impacted | 1 file (LeadActivityTimeline.tsx) |
| Backward compatible | Yes, no data changes needed |

