

# Full-Screen Template Builder Layout Fix

## Problem Summary

The Custom Template Builder dialog has limited visible space for the "Insert Variables" sidebar, content editor, and Field Library sections. Users must scroll within these panels to see all available variables and content. The request is to make these sections use the full available screen height so all data is visible at once without internal scrolling.

## Current Layout Analysis

The dialog structure:
```
DialogContent (h-[95vh] = ~912px on 1080p)
├── DialogHeader (~140px)
│   ├── Title row
│   └── Metadata grid (3 columns with inputs)
├── Tabs Container (flex-1)
│   ├── TabsList (~48px)
│   └── TabsContent (flex-1 → gets ~680px)
│       ├── Variables Sidebar (w-56, contains ScrollArea)
│       └── Editor Panel (flex-1)
└── DialogFooter (~60px with Save/Cancel buttons)
```

**Issues identified:**
1. Dialog height `h-[95vh]` is good, but the header metadata takes significant space
2. The sidebar uses `ScrollArea` which clips content unnecessarily
3. On 1080p screens, the variable list only shows ~8-10 items before requiring scroll
4. The editor area is similarly compressed

## Solution Approach

Make the Template Builder dialog truly full-screen and maximize content area visibility:

### 1. Increase Dialog to Maximum Viewport Height
- Change from `h-[95vh]` to `h-[98vh]` for maximum screen utilization
- This provides an additional ~30px on 1080p screens

### 2. Compact Header Metadata
- Reduce the metadata grid vertical spacing (gap-3 → gap-2)
- Make inputs more compact (h-8 → h-7)
- Reduce header padding (pt-4 pb-3 → pt-3 pb-2)
- This saves approximately 30-40px

### 3. Optimize Tab Content Areas

**Design Tab:**
- Widen the variables sidebar from `w-56` to `w-64` to show more label text
- Remove `ScrollArea` wrapper from the variables sidebar; let the parent handle overflow only when truly needed
- Set `overflow-y-auto` on the sidebar container itself so it only scrolls if content exceeds available space
- Increase editor area to use remaining space

**Fields Tab:**
- Similar treatment: widen Field Library panel from `w-1/4` to `w-1/3`
- Remove unnecessary ScrollArea nesting

**Branding/Output/Import Tabs:**
- Already use `overflow-auto` on content; keep as-is

### 4. Make Footer More Compact
- Reduce footer padding from `py-4` to `py-3`
- This saves ~16px

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/documents/UnifiedTemplateBuilder.tsx` | (1) Increase dialog height, (2) Compact header, (3) Widen sidebars, (4) Remove unnecessary ScrollArea nesting, (5) Compact footer |

## Detailed Changes

### DialogContent (Line 559)
```tsx
// Before
className="max-w-[1100px] h-[95vh] flex flex-col p-0 overflow-hidden"

// After
className="max-w-[1200px] h-[98vh] flex flex-col p-0 overflow-hidden"
```

### DialogHeader (Line 560)
```tsx
// Before
className="px-6 pt-4 pb-3 border-b shrink-0"

// After
className="px-6 pt-3 pb-2 border-b shrink-0"
```

### Metadata Grid (Line 567)
```tsx
// Before
<div className="grid grid-cols-3 gap-3 mt-3 text-sm">

// After
<div className="grid grid-cols-3 gap-2 mt-2 text-sm">
```

### All Input Heights
```tsx
// Before: className="h-8 text-sm"
// After: className="h-7 text-sm"
```

### Design Tab Variables Sidebar (Lines 662-709)
```tsx
// Before
<div className="w-56 flex flex-col border rounded-lg overflow-hidden min-h-0">
  ...
  <ScrollArea className="flex-1 min-h-0">
    <div className="p-2 space-y-2">
      {categories.map(...)}
    </div>
  </ScrollArea>
</div>

// After - wider, overflow-y-auto directly on container
<div className="w-72 flex flex-col border rounded-lg overflow-hidden min-h-0">
  ...
  <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
    {categories.map(...)}
  </div>
</div>
```

### Fields Tab Field Library Panel (Lines 831-876)
```tsx
// Before
<div className="w-1/4 flex flex-col border rounded-lg overflow-hidden min-h-0">

// After - wider panel
<div className="w-1/3 flex flex-col border rounded-lg overflow-hidden min-h-0">
```

### DialogFooter (Line 1313)
```tsx
// Before
className="px-6 py-4 border-t flex justify-end gap-3"

// After
className="px-6 py-3 border-t flex justify-end gap-3"
```

## Height Calculation After Changes (1080p Screen)

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| Dialog Height | 95vh = 912px | 98vh = 940px | +28px |
| Header | ~140px | ~110px | +30px |
| Tab List | 48px | 48px | 0 |
| Footer | 60px | 52px | +8px |
| **Content Area** | ~664px | ~730px | **+66px** |

This provides approximately 10% more vertical space for content, making more variables visible without scrolling.

## Expected Outcome

After implementation:
1. **Design Tab**: The "Insert Variables" sidebar will show 15-18 variable items visible at once (up from ~10)
2. **Editor Area**: Taller editing space with the same width
3. **Fields Tab**: Field Library panel shows more items without scrolling
4. **All Tabs**: Footer buttons remain sticky at bottom
5. **Scroll Behavior**: Internal scrolling only activates when content truly exceeds available space

## Testing Checklist

1. Open Template Builder at 1080p resolution
2. Verify all variable items in "Insert Variables" sidebar are visible without scrolling (or minimal scrolling)
3. Verify editor area extends from toolbar to preview toggle row
4. Switch to Fields tab - verify Field Library shows more items
5. Verify Save & Publish and Cancel buttons remain visible at all times
6. Test at different resolutions to confirm responsive behavior

