
# Fix Help Entry Cards - Make Them Functional

## Problem Summary
The help entry cards in the Discover tab (like "Save Template", "Preview", "Generate Code") don't respond to clicks. These are tooltip documentation entries from the Template Builder 2.0 module that should either navigate users to the actual feature or display detailed help information.

## Root Causes Identified

1. **Missing click handler for tooltip entries**: The `HelpEntryCard.tsx` component only handles `article` and `tour` sources - tooltips have no action
2. **Missing UI location mapping**: The `template_builder_2_0` module isn't mapped in `_resolveUILocation()` so "View in App" doesn't work
3. **No detail view for tooltips**: Unlike articles which open a page, tooltips have no expanded view

## Solution Approach

### Task 1: Add UI Location Mapping for Template Builder

**File**: `src/services/helpDiscoveryService.ts`

Add `template_builder_2_0` to the `moduleLocations` mapping so the "View in App" button works:

```typescript
// In _resolveUILocation method
const moduleLocations: Record<string, string> = {
  // ... existing mappings ...
  'template_builder_2_0': '/documents?tab=templates&openTemplateBuilder=1',
  'template-builder': '/documents?tab=templates&openTemplateBuilder=1',
};
```

### Task 2: Implement Click Handler for Tooltip Entries

**File**: `src/components/help/HelpEntryCard.tsx`

Enhance the `handleClick` function to handle tooltips:

```typescript
const handleClick = () => {
  if (onSelect) {
    onSelect(entry);
  } else if (entry.source === 'article' && entry.uiLocation?.path) {
    navigate(entry.uiLocation.path);
  } else if (entry.source === 'tour') {
    // Trigger tour start
    console.log('[HelpEntry] Start tour:', entry.id);
  } else if (entry.source === 'tooltip' || entry.source === 'operations') {
    // For tooltips: navigate to the feature location if available
    if (entry.uiLocation?.path) {
      navigateAndHighlight({
        path: entry.uiLocation.path,
        tab: entry.uiLocation.tab,
        element: entry.uiLocation.element
      });
    } else {
      // Show a toast or dialog with the tooltip content
      toast.info(entry.title, {
        description: entry.description,
        duration: 5000
      });
    }
  }
};
```

### Task 3: Add Help Detail Dialog for Non-Navigable Entries

**File**: `src/components/help/HelpEntryCard.tsx`

Add a dialog to show detailed help when navigation isn't possible:

- Import Dialog components
- Add state for showing detail dialog
- Display entry title, description, content, tags, and related info
- Add "Go to Feature" button when path is available

### Task 4: Update HelpDiscoveryHub to Pass onSelect Handler

**File**: `src/components/help/HelpDiscoveryHub.tsx`

Add an `onSelect` handler to show help details:

```typescript
const [selectedEntry, setSelectedEntry] = useState<HelpEntry | null>(null);

// In the render:
<HelpEntryCard 
  key={entry.id} 
  entry={entry} 
  onSelect={setSelectedEntry}
/>

// Add a HelpDetailDialog component
{selectedEntry && (
  <HelpDetailDialog
    entry={selectedEntry}
    onClose={() => setSelectedEntry(null)}
  />
)}
```

### Task 5: Create HelpDetailDialog Component

**File**: `src/components/help/HelpDetailDialog.tsx` (new file)

Create a new dialog component that displays:
- Entry title and source badge
- Full description
- Module and category
- Tags
- "Learn More" link if available
- "View in App" button with navigation

## Implementation Order

1. **Task 1**: Add UI location mapping (quick fix, enables "View in App")
2. **Task 5**: Create HelpDetailDialog component
3. **Task 4**: Update HelpDiscoveryHub with onSelect and dialog
4. **Task 2**: Update HelpEntryCard click handler
5. **Task 3**: Test end-to-end functionality

## Files to Modify/Create

| File | Action | Purpose |
|------|--------|---------|
| `src/services/helpDiscoveryService.ts` | Modify | Add template_builder_2_0 to moduleLocations |
| `src/components/help/HelpDetailDialog.tsx` | Create | New dialog for help entry details |
| `src/components/help/HelpDiscoveryHub.tsx` | Modify | Add onSelect handler and dialog |
| `src/components/help/HelpEntryCard.tsx` | Modify | Enhance click handler for all entry types |

## Expected Outcome

After implementation:
- Clicking any help entry card will open a detail dialog showing full help content
- "View in App" button will navigate to Template Builder 2.0 and highlight the relevant element
- Users can access tooltip explanations without needing to find the actual feature first
- All 247+ help entries become interactive and useful

## Technical Notes

- The Template Builder 2.0 is opened via `/documents?tab=templates&openTemplateBuilder=1` URL parameter
- Element highlighting uses `data-help-id` attributes for precise targeting
- The solution follows existing patterns from article navigation
