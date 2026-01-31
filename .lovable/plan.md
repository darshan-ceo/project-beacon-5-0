
# Fix Tooltip and Hover State Readability Issues

## Problem Analysis

Based on the screenshots and code review, users are experiencing **poor readability** when hovering over interactive elements on the Case List cards:

### Issue 1: Schedule Button Hover State
- **File**: `src/components/cases/CaseManagement.tsx` (line 1351-1364)
- **Cause**: The "Schedule" button uses `variant="ghost"` with `text-muted-foreground` class
- **Problem**: Ghost variant hover changes background to dark accent (`--accent: 243 75% 43%` - Indigo) but the `text-muted-foreground` class isn't overridden, causing low contrast

### Issue 2: Tax Demand Badge Tooltip
- **File**: `src/components/cases/CaseManagement.tsx` (line 1255-1265)
- **Observation**: Tooltip shows "Tax Demand: ₹84,80,478" - this is working but the presentation could be enhanced with better formatting

### Issue 3: Priority/Timeline Micro-Pill Tooltips
- **File**: `src/components/cases/CaseManagement.tsx` (lines 1269-1290)
- **Current**: Plain text like "Medium Priority" or "Timeline: Green"
- **Opportunity**: Enhance with better visual indicators and consistent styling

---

## Solution Overview

### Technical Approach

1. **Fix Schedule Button Hover Contrast** - Ensure text remains readable by using a consistent hover pattern that doesn't rely on conflicting color classes

2. **Standardize Tooltip Presentation** - Add consistent styling and formatting across all micro-pill tooltips with proper visual hierarchy

3. **Improve Button Hover States** - Use explicit color classes that work well with the ghost variant

---

## Detailed Changes

### File: `src/components/cases/CaseManagement.tsx`

#### Change 1: Fix Schedule Button Hover State (Lines 1351-1364)

**Current Code:**
```tsx
<Button 
  variant="ghost" 
  size="sm" 
  className="h-5 px-1.5 text-xs text-muted-foreground hover:text-primary" 
  onClick={...}
>
  <Calendar className="h-3 w-3 mr-1" />
  Schedule
</Button>
```

**Updated Code:**
```tsx
<Button 
  variant="ghost" 
  size="sm" 
  className="h-5 px-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" 
  onClick={...}
>
  <Calendar className="h-3 w-3 mr-1" />
  Schedule
</Button>
```

**Why**: Changing to `hover:bg-muted hover:text-foreground` provides a light gray background on hover with dark text, ensuring high contrast and readability.

---

#### Change 2: Enhance Tax Demand Tooltip (Lines 1255-1265)

**Current Code:**
```tsx
<TooltipContent>Tax Demand: ₹{caseItem.taxDemand.toLocaleString('en-IN')}</TooltipContent>
```

**Updated Code:**
```tsx
<TooltipContent>
  <span className="font-medium">Tax Demand</span>
  <br />
  <span className="text-base font-semibold">₹{caseItem.taxDemand.toLocaleString('en-IN')}</span>
</TooltipContent>
```

**Why**: Two-line format with label and prominent value improves readability.

---

#### Change 3: Enhance Priority Micro-Pill Tooltip (Lines 1269-1278)

**Current Code:**
```tsx
<TooltipContent>{caseItem.priority} Priority</TooltipContent>
```

**Updated Code:**
```tsx
<TooltipContent>
  <div className="flex items-center gap-2">
    <span className={`w-2 h-2 rounded-full ${
      caseItem.priority === 'High' ? 'bg-destructive' : 
      caseItem.priority === 'Medium' ? 'bg-warning' : 'bg-muted-foreground'
    }`} />
    <span>{caseItem.priority} Priority</span>
  </div>
</TooltipContent>
```

**Why**: Color-coded dot in tooltip reinforces the meaning and improves accessibility.

---

#### Change 4: Enhance Timeline Micro-Pill Tooltip (Lines 1281-1290)

**Current Code:**
```tsx
<TooltipContent>Timeline: {caseItem.timelineBreachStatus || 'Green'}</TooltipContent>
```

**Updated Code:**
```tsx
<TooltipContent>
  <div className="flex items-center gap-2">
    <span className={`w-2 h-2 rounded-full ${
      caseItem.timelineBreachStatus === 'Red' ? 'bg-destructive' : 
      caseItem.timelineBreachStatus === 'Amber' ? 'bg-warning' : 'bg-success'
    }`} />
    <span>Timeline: {caseItem.timelineBreachStatus || 'Green'}</span>
  </div>
</TooltipContent>
```

**Why**: Color-coded dot matches the emoji indicator and provides clearer context.

---

#### Change 5: Add Tooltip to Hearing Links (Lines 1328-1349)

Wrap the hearing date display in a tooltip to provide additional context:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span 
        className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
        onClick={(e) => { ... }}
      >
        <Calendar className="h-3 w-3" />
        <span>{caseItem.nextHearing.date}</span>
        {/* ... time and urgency badge ... */}
      </span>
    </TooltipTrigger>
    <TooltipContent>
      <span className="font-medium">Next Hearing</span>
      <br />
      <span>{caseItem.nextHearing.date} {caseItem.nextHearing.time && `at ${caseItem.nextHearing.time}`}</span>
      <br />
      <span className="text-xs text-muted-foreground">Click to view hearing details</span>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

#### Change 6: Fix Documents Link Hover Consistency (Lines 1313-1323)

Ensure consistent hover behavior matching the Schedule button fix:

```tsx
<span 
  className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
  onClick={(e) => { ... }}
>
  <FileText className="h-3 w-3" />
  <span>{state.documents?.filter(doc => doc.caseId === caseItem.id).length || 0} files</span>
</span>
```

---

## Visual Comparison

| Element | Before Hover | After Hover (Fixed) |
|---------|-------------|---------------------|
| Schedule Button | Dark blue bg, muted text (unreadable) | Light gray bg, dark text (readable) |
| Documents Link | Primary blue text | Foreground color (consistent) |
| Tax Demand Badge | Plain tooltip | Structured two-line tooltip |
| Priority Pill | Text only | Text with color indicator |
| Timeline Pill | Text only | Text with color indicator |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/cases/CaseManagement.tsx` | Update hover states, enhance tooltip content (6 changes in lines 1250-1365) |

---

## Testing Checklist

1. Hover over "Schedule" button - text should remain readable with light gray background
2. Hover over Tax Demand badge (₹1.2L) - tooltip shows formatted two-line content
3. Hover over Priority micro-pill - tooltip shows colored dot with label
4. Hover over Timeline micro-pill - tooltip shows colored dot with status
5. Hover over Documents count - text remains readable
6. Hover over Next Hearing date - tooltip shows full details
7. All tooltips appear with proper z-index above other elements
8. Keyboard focus triggers tooltips correctly
9. Tooltips dismiss when moving away
10. Mobile: Touch interactions work correctly

---

## Accessibility Improvements

- All hover states maintain WCAG 2.1 AA contrast ratio (4.5:1 minimum)
- Color indicators in tooltips are paired with text labels
- Interactive elements have visible focus states
- Tooltips provide additional context for icon-only indicators
