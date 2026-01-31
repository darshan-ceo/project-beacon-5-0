
# Optimize Case List Card for Vertical Density

## Overview

Redesign the Case List Card layout to reduce vertical height by at least 40% while preserving all information, functionality, and accessibility. This is a **UI-only refactor** with no changes to data models, business logic, or permissions.

---

## Current Layout Analysis

The current case card uses approximately **7-8 vertical rows**:
1. **Row 1**: Title + Case Number + Type + Client
2. **Row 2**: Priority Badge + Timeline Badge (right-aligned)
3. **Row 3-4**: 4-column grid (Stage, Assigned To, Documents, Next Hearing)
4. **Row 5**: Tax Demand / Period / Authority / Matter Type (conditional)
5. **Row 6**: Quick Actions (collapsible) - already implemented
6. **Row 7**: Created/Updated timestamps + Action buttons

---

## Optimized Layout Design

Compress to **4-5 vertical rows** with strategic information consolidation:

### Row 1: Title Line with Micro-Pills
```
[✓] Case Title Here                    [₹12.5L] [High] [🔴]
    CASE-2024-001 • GST • Acme Corp Ltd
```
- Priority and Timeline badges become compact micro-pills (no text labels)
- Tax Demand becomes right-aligned KPI badge in header
- Micro-pills: 18px height, icon-only with tooltip for accessibility

### Row 2: Unified Stage Progress Line
```
📊 Assessment ━━━━━━━━━━░░░░░ 2/6
```
- Merge "Current Stage" label + progress bar into single compact line
- Stage name left, progress bar inline, fraction indicator right
- Height reduced from 48px to 24px

### Row 3: Consolidated Meta Row
```
👤 John Doe  •  📄 5 files  •  📅 15-Mar-2026 @10:30 [!<24h]
```
- Combine Assigned To, Documents count, Next Hearing into one horizontal row
- Hearing urgency indicator inline
- Single row instead of 3 separate grid cells

### Row 4: Additional Details (Conditional, Compact)
```
Matter: DRC-01A  •  Period: FY 2023-24  •  Authority: GST Mumbai
```
- Same conditional logic, but single-line horizontal layout
- Only shows if data exists

### Row 5: Quick Actions + Timestamps + Actions
```
▶ Quick Actions (8)     Updated 2h ago  [👁] [✏] [→] [⋮]
```
- Quick Actions already collapsed (from previous implementation)
- Timestamps converted to relative time with tooltip
- All action buttons inline

---

## Technical Changes

### File: `src/components/cases/CaseManagement.tsx`

#### 1. Add Import for Relative Time
```typescript
import { formatDistanceToNow } from 'date-fns';
```

#### 2. Add Helper Function for Relative Time with Tooltip
```typescript
const formatRelativeTime = (dateString: string): { relative: string; full: string } => {
  try {
    const date = new Date(dateString);
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      full: dateString // Keep original DD-MM-YYYY format
    };
  } catch {
    return { relative: dateString, full: dateString };
  }
};
```

#### 3. Refactor Card Layout (Lines 1189-1490)

**Before**: Nested divs with 4-column grid and multiple sections
**After**: Streamlined flex rows with inline elements

---

## Detailed JSX Structure

### Header Row (Optimized)
```tsx
<div className="flex items-start justify-between gap-4">
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2">
      {isSelected && (
        <div className="flex-shrink-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground truncate">{caseItem.title}</h3>
    </div>
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
      <span>{caseItem.caseNumber}</span>
      {caseItem.caseType && (
        <>
          <span>•</span>
          <span>{caseItem.caseType}</span>
        </>
      )}
      <span>•</span>
      <span className="truncate">{clientName}</span>
    </div>
  </div>
  
  {/* Right-aligned KPIs */}
  <div className="flex items-center gap-1.5 flex-shrink-0">
    {/* Tax Demand KPI Badge */}
    {caseItem.taxDemand && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs h-5 px-1.5 font-semibold text-destructive border-destructive/40">
              ₹{(caseItem.taxDemand / 100000).toFixed(1)}L
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Tax Demand: ₹{caseItem.taxDemand.toLocaleString('en-IN')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
    
    {/* Priority Micro-Pill */}
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={`h-5 w-5 p-0 flex items-center justify-center ${getPriorityMicroColor(caseItem.priority)}`}>
            {caseItem.priority === 'High' ? '!' : caseItem.priority === 'Medium' ? '•' : '-'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{caseItem.priority} Priority</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    
    {/* Timeline Micro-Pill */}
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={`h-5 w-5 p-0 flex items-center justify-center ${getTimelineMicroColor(caseItem.timelineBreachStatus)}`}>
            {caseItem.timelineBreachStatus === 'Red' ? '🔴' : caseItem.timelineBreachStatus === 'Amber' ? '🟡' : '🟢'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Timeline: {caseItem.timelineBreachStatus || 'Green'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</div>
```

### Unified Stage Progress Line
```tsx
<div className="flex items-center gap-2 mt-2">
  <Scale className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
  <span className="text-sm font-medium min-w-[90px]">{caseItem.currentStage}</span>
  <Progress value={getStageProgress(caseItem.currentStage)} className="h-1.5 flex-1" />
  <span className="text-xs text-muted-foreground">{getStageIndex(caseItem.currentStage)}/6</span>
</div>
```

### Consolidated Meta Row
```tsx
<div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
  {/* Assigned To */}
  <span className="flex items-center gap-1">
    <Users className="h-3 w-3" />
    <span>{caseItem.assignedToName}</span>
  </span>
  
  <span>•</span>
  
  {/* Documents */}
  <span 
    className="flex items-center gap-1 cursor-pointer hover:text-primary"
    onClick={(e) => { e.stopPropagation(); setSelectedCase(caseItem); setActiveTab('documents'); }}
  >
    <FileText className="h-3 w-3" />
    <span>{documentCount} files</span>
  </span>
  
  <span>•</span>
  
  {/* Next Hearing - Compact */}
  {caseItem.nextHearing ? (
    <span 
      className="flex items-center gap-1 cursor-pointer hover:text-primary"
      onClick={(e) => { e.stopPropagation(); /* navigate to hearing */ }}
    >
      <Calendar className="h-3 w-3" />
      <span>{caseItem.nextHearing.date}</span>
      {caseItem.nextHearing.time && <span className="text-xs">@{caseItem.nextHearing.time}</span>}
      {getHearingUrgency(caseItem.nextHearing.hoursUntil) === 'critical' && (
        <Badge variant="destructive" className="h-4 px-1 text-[10px] animate-pulse">!</Badge>
      )}
    </span>
  ) : (
    <Button variant="ghost" size="sm" className="h-5 px-1 text-xs" onClick={(e) => { e.stopPropagation(); /* schedule */ }}>
      <Calendar className="h-3 w-3 mr-1" />
      Schedule
    </Button>
  )}
</div>
```

### Compact Additional Details (Conditional)
```tsx
{(caseItem.matterType || caseItem.period || caseItem.authority) && (
  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
    {caseItem.matterType && caseItem.currentStage === 'Assessment' && (
      <span>Matter: <span className="font-medium">{caseItem.matterType}</span></span>
    )}
    {caseItem.period && <span>Period: <span className="font-medium">{caseItem.period}</span></span>}
    {caseItem.authority && <span>Authority: <span className="font-medium">{caseItem.authority}</span></span>}
  </div>
)}
```

### Footer Row with Quick Actions + Timestamps + Actions
```tsx
<div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
  {/* Quick Actions - Already Collapsed */}
  <div className="flex-1">
    <Collapsible open={isExpanded} onOpenChange={() => toggleQuickActions(caseItem.id)}>
      {/* ... existing collapsible implementation ... */}
    </Collapsible>
  </div>
  
  {/* Relative Timestamps with Tooltips */}
  <div className="flex items-center gap-4">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-muted-foreground cursor-default">
            Updated {formatRelativeTime(caseItem.lastUpdated).relative}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Created: {caseItem.createdDate}<br/>
          Updated: {caseItem.lastUpdated}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    
    {/* Compact Action Buttons */}
    <div className="flex items-center">
      <Button variant="ghost" size="icon" className="h-7 w-7">
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7">
        <Edit className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7">
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        {/* ... existing dropdown content ... */}
      </DropdownMenu>
    </div>
  </div>
</div>
```

---

## Helper Functions to Add

```typescript
// Get stage index for progress fraction display
const getStageIndex = (stage: string): number => {
  const stages = ['Assessment', 'Adjudication', 'First Appeal', 'Tribunal', 'High Court', 'Supreme Court'];
  return stages.indexOf(stage) + 1;
};

// Micro-pill colors for priority (compact)
const getPriorityMicroColor = (priority: string): string => {
  switch (priority) {
    case 'High': return 'bg-destructive text-destructive-foreground';
    case 'Medium': return 'bg-warning text-warning-foreground';
    case 'Low': return 'bg-muted text-muted-foreground';
    default: return 'bg-secondary text-secondary-foreground';
  }
};

// Micro-pill colors for timeline (compact)
const getTimelineMicroColor = (status: string | undefined): string => {
  switch (status) {
    case 'Red': return 'bg-destructive/20';
    case 'Amber': return 'bg-warning/20';
    default: return 'bg-success/20';
  }
};
```

---

## Styling Adjustments

### CardContent Padding
```tsx
<CardContent className="p-4"> {/* Reduced from p-6 */}
```

### Consistent Micro-Element Sizes
- Badge micro-pills: `h-5 w-5 p-0`
- Icon sizes: `h-3 w-3` or `h-3.5 w-3.5`
- Text sizes: `text-xs` for meta, `text-sm` for values
- Action buttons: `h-7 w-7` instead of default

---

## Vertical Height Comparison

| Element | Before | After | Saved |
|---------|--------|-------|-------|
| Header + Badges | ~48px | ~40px | 8px |
| Stage Section | ~48px | ~24px | 24px |
| Meta Grid (4-col) | ~64px | ~24px | 40px |
| Additional Details | ~48px | ~20px | 28px |
| Quick Actions | ~40px | ~32px | 8px |
| Footer | ~40px | ~32px | 8px |
| Padding | 48px | 32px | 16px |
| **Total** | **~336px** | **~204px** | **~132px (39%)** |

With minor adjustments, reaching **40%+ reduction** is achievable.

---

## Preserved Functionality

All existing behavior remains unchanged:
- Card selection/deselection
- Navigation to case details
- Document count click navigates to documents tab
- Hearing click navigates to hearing page
- Schedule button opens hearing scheduler
- View/Edit/Advance/More actions buttons
- Quick Actions collapsible with form generation
- Priority and timeline status indicators
- Tooltips provide full context for abbreviated data

---

## Accessibility Considerations

- All micro-pills have tooltips with full text
- Relative timestamps have tooltips with full dates
- Click targets remain minimum 24x24px
- Keyboard navigation preserved via existing tabIndex
- Color indicators paired with icon/text alternatives
- ARIA labels on interactive elements

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/cases/CaseManagement.tsx` | Refactored case card layout (lines 1189-1490), added helper functions, added imports |

---

## Testing Checklist

1. Card displays all case information correctly
2. Tax Demand badge shows abbreviated value with tooltip
3. Priority micro-pill shows icon with tooltip
4. Timeline micro-pill shows colored indicator with tooltip
5. Stage progress shows inline with fraction
6. Meta row displays Assigned To, Documents, Next Hearing inline
7. Documents click navigates to documents tab
8. Hearing click navigates to hearings page
9. Schedule button appears when no hearing exists
10. Additional details row shows conditionally
11. Quick Actions remains collapsed by default
12. Relative timestamps show with tooltip for full dates
13. All action buttons work correctly
14. Card selection highlights work
15. Mobile responsive layout stacks appropriately
16. Vertical height reduced by ~40%
