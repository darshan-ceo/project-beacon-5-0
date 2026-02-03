
# Full-Screen Template Builder - Complete Layout Overhaul

## Problem Summary

The Custom Template Builder (Document Management > Custom Templates) currently shows:
1. **Insert Variables sidebar** has internal scrolling when it should fit the full height
2. **Content editor** doesn't extend to the full available height
3. **Blank space** exists between content areas and the Save button
4. All tabs (Design, Fields, Branding, Output, Import/Export) have similar issues

The goal is to make all content fill the entire vertical space from the header to the Save button with zero wasted space.

## Current Layout Analysis

From the screenshots, the current structure has these issues:

| Component | Current State | Issue |
|-----------|--------------|-------|
| Dialog | `h-[98vh]` | Good, but content areas don't fill it |
| Variables Sidebar | `w-72` with `overflow-y-auto` | Still shows scroll when content could fit |
| Editor | `min-h-[450px]` hardcoded in prose class | Doesn't flex to fill available space |
| Tab Content | `flex-1` but competes with internal fixed heights | Content gets compressed |
| Footer | `py-3` | OK |

**Root Cause**: The editor component has a hardcoded `min-h-[450px]` in its prose class styling, and the flex layout isn't properly propagating through all nested containers to allow content to truly fill the available space.

## Solution: True Full-Height Layout

### Key Changes

1. **Remove hardcoded editor min-height** - Let flexbox determine height
2. **Use CSS calc() for precise height allocation** - Subtract header/footer from viewport
3. **Make all tab content areas use identical flex patterns** - Consistent behavior across tabs
4. **Ensure every nested flex container has min-h-0** - Critical for proper flex overflow behavior

### Technical Details

#### 1. Editor Prose Class Fix (Line 244)
Remove the fixed `min-h-[450px]` that prevents flexible sizing:

```typescript
// Before
class: 'prose prose-sm max-w-none focus:outline-none min-h-[450px] p-6 bg-background',

// After - Remove min-height, let parent container control size
class: 'prose prose-sm max-w-none focus:outline-none h-full p-6 bg-background',
```

#### 2. Design Tab - Variables Sidebar (Lines 662-707)
The sidebar should expand to fill available height without internal scroll unless truly needed:

```tsx
// Current
<div className="w-72 flex flex-col border rounded-lg overflow-hidden min-h-0">
  // ... header, search ...
  <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">

// After - Remove artificial height constraints, let it grow
<div className="w-64 flex flex-col border rounded-lg overflow-hidden h-full">
  // ... header, search (shrink-0) ...
  <div className="flex-1 overflow-y-auto p-2 space-y-1">
```

#### 3. Design Tab - Editor Panel (Lines 709-824)
Ensure the editor truly fills all available height:

```tsx
// Current ScrollArea wrapper
<ScrollArea className="flex-1 border border-t-0 rounded-b-lg min-h-0">

// After - Make it fill container height
<ScrollArea className="flex-1 border border-t-0 rounded-b-lg h-full">
  <EditorContent editor={editor} className="h-full" />
</ScrollArea>
```

#### 4. Fields Tab Layout (Lines 828-911)
Both the Field Library and Selected Fields panels should fill height:

```tsx
// Left panel - Field Library
<div className="w-1/3 flex flex-col border rounded-lg overflow-hidden h-full">
  // ... header (shrink-0) ...
  <div className="flex-1 overflow-y-auto p-2 space-y-1">

// Right panel - Selected Fields  
<div className="w-2/3 flex flex-col border rounded-lg overflow-hidden h-full">
  // ... header (shrink-0) ...
  <ScrollArea className="flex-1">
```

#### 5. Branding/Output/Import Tabs
These tabs already use `overflow-auto` but should also ensure full height usage with `h-full` on content containers.

#### 6. Tab Content Container (Line 660)
All TabsContent should have consistent height allocation:

```tsx
// Before
<TabsContent value="design" className="flex-1 flex gap-4 px-6 pb-3 overflow-hidden mt-2 min-h-0">

// After - Add h-full to ensure children can calculate height
<TabsContent value="design" className="flex-1 flex gap-4 px-6 pb-3 overflow-hidden mt-2 h-full">
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/documents/UnifiedTemplateBuilder.tsx` | Remove hardcoded heights, add h-full to flex containers, ensure proper flex inheritance |

## Height Distribution After Changes

On a 1080p screen (960px viewport height at 98vh):

| Component | Height |
|-----------|--------|
| Dialog total | 940px |
| Header with metadata | ~90px |
| Tab list | 48px |
| Tab content padding | 20px |
| **Available for content** | **~730px** |
| Footer | ~52px |

The Variables sidebar and Editor will both get the full 730px height, showing all variables without scroll (unless there are truly more than fit).

## Visual Result

After implementation:
- **Design Tab**: Variables sidebar shows all items (Client, Case, Employee, Court, System categories) without scrolling. Editor fills from toolbar to preview toggle.
- **Fields Tab**: Field Library shows all fields. Selected Fields panel fills remaining width.
- **Branding/Output/Import**: Content extends to footer without gaps.
- **No blank space** between content and Save button.

## Testing Checklist

1. Open Template Builder at 1080p resolution
2. **Design Tab**:
   - All variable categories and items visible without sidebar scroll
   - Editor fills from toolbar to preview toggle row
   - No gap between preview toggle and footer
3. **Fields Tab**:
   - Field Library shows all fields without scrolling
   - Selected Fields panel fills right side
4. **Branding Tab**:
   - Form fields extend to footer area
   - No large empty space
5. **Output Tab**:
   - All output settings visible
   - No scrolling needed
6. **Import/Export Tab**:
   - DOCX upload and JSON sections visible
   - Content fills available space
7. Test at different resolutions (1440p, 768p) to ensure responsive behavior
