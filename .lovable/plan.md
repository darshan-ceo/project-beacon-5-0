
# Fix: Task Edit Sheet - Buttons Overlapping Form Fields

## Problem

In the Task Edit Sheet, the "Cancel" and "Save Changes" buttons appear in the middle of the screen, overlapping the form fields (specifically the Case and Stage fields). This makes these fields inaccessible to users.

## Root Cause

The current layout in `TaskEditSheet.tsx` uses `absolute bottom-0` for the footer inside a scrollable container with `overflow-y-auto`. This causes the footer to be positioned relative to the viewport instead of staying at the bottom of the sheet panel.

**Current problematic structure:**
```
SheetContent (overflow-y-auto)       <- Scrollable
  ├── SheetHeader
  ├── div.pb-20                       <- Form content with padding
  │     └── TaskForm
  └── div.absolute.bottom-0           <- Footer floats mid-screen!
        └── Buttons
```

## Solution

Restructure the layout using flexbox to create a proper header-body-footer pattern:

1. Remove `overflow-y-auto` from SheetContent
2. Add flexbox column layout to SheetContent
3. Make form area scrollable with `flex-1 overflow-y-auto`
4. Keep footer as a normal flex child (sticky at bottom)

**New structure:**
```
SheetContent (flex flex-col)          <- Flex container
  ├── SheetHeader                      <- Fixed header
  ├── div.flex-1.overflow-y-auto       <- Scrollable body
  │     └── TaskForm (all fields)
  └── div (border-t, sticky)           <- Footer always at bottom
        └── Buttons
```

---

## File to Modify

**`src/components/tasks/TaskEditSheet.tsx`**

### Changes

1. **Line 141-143**: Update SheetContent className
   - Remove: `overflow-y-auto`
   - Add: `flex flex-col` for proper layout

2. **Line 156**: Update form wrapper div
   - Change: `className="pb-20"` 
   - To: `className="flex-1 overflow-y-auto px-6 py-6"` (scrollable area with proper padding)

3. **Line 170**: Update footer div
   - Remove: `absolute bottom-0 left-0 right-0`
   - Keep: `border-t bg-background p-4 flex justify-end gap-3`
   - Add: `shrink-0` to prevent footer from shrinking

### Code Changes

**Before (lines 139-178):**
```tsx
return (
  <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <SheetContent 
      side="right" 
      className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto"
    >
      <SheetHeader className="border-b pb-4 mb-4">
        ...
      </SheetHeader>

      <div className="pb-20">
        <TaskForm ... />
      </div>

      {/* Sticky Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t bg-background p-4 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
);
```

**After:**
```tsx
return (
  <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <SheetContent 
      side="right" 
      className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col p-0"
    >
      <SheetHeader className="border-b px-6 py-4 shrink-0">
        ...
      </SheetHeader>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <TaskForm ... />
      </div>

      {/* Footer - Always at bottom */}
      <div className="shrink-0 border-t bg-background px-6 py-4 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
);
```

---

## Visual Comparison

| Aspect | Before | After |
|--------|--------|-------|
| Button position | Floating mid-screen | Fixed at sheet bottom |
| Case/Stage fields | Hidden behind buttons | Fully visible |
| Form scrolling | Entire sheet scrolls | Only form area scrolls |
| Header | Scrolls away | Stays visible |

---

## Testing Checklist

After implementation:
1. Open any task and click "Edit Task"
2. Verify all form sections are visible:
   - Task Information (Title, Description)
   - Case & Stage Context (Case selector, Stage dropdown)
   - Priority & Assignment (Priority, Status, Assignee, Hours, Due Date)
3. Buttons should appear at the very bottom of the sheet
4. Scroll the form content - header and footer should stay fixed
5. Test on different screen sizes (mobile, tablet, desktop)
6. Cancel button should close the sheet
7. Save Changes should submit and close
