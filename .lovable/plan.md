
# Plan: Fix Timeline Tracker Issues

## Problems Identified

1. **Export Report Error** - Clicking "Export Report" fails with "Failed to export timeline breach report"
2. **Form-wise Timeline Performance blank** - Shows no data because it relies on `generatedForms` array which doesn't exist in the database
3. **RAG Status Matrix incorrect counts** - Displays hardcoded values (89, 23, 8) instead of calculating from actual case data

---

## Root Cause Analysis

### Issue 1: Export Report Failure
The export uses `exportRows()` with `moduleKey: 'cases'` but passes custom-mapped objects that don't match the expected `Case` type structure. The exporter expects specific column configurations from `CASE_EXPORT_COLUMNS` but the data being passed has different field names like `caseTitle` vs `title`.

**Location:** `TimelineBreachTracker.tsx` lines 450-467

### Issue 2: Form-wise Timeline Performance Empty
The `getFormTimelineReport()` function (line 763 of reportsService.ts) iterates through `caseItem.generatedForms`:
```typescript
if (caseItem.generatedForms && caseItem.generatedForms.length > 0) {
  caseItem.generatedForms.forEach((form) => { ... });
}
```
However:
- There is no `generated_forms` column in the `cases` table (only `form_type` exists)
- The `SupabaseAdapter.transformCaseFields()` doesn't include `generatedForms`
- The `DataInitializer` defaults to empty array: `generatedForms: c.generated_forms || c.generatedForms || []`

Since no case has `generatedForms` data, the result is always empty.

**Solution approach:** Refactor `getFormTimelineReport` to use the existing `form_type` column instead of the non-existent `generatedForms` array, and calculate compliance based on case dates and timeline breach status.

### Issue 3: Hardcoded RAG Matrix Counts
The RAG Status Matrix section (lines 397-422) contains hardcoded values:
```tsx
<h3 className="text-2xl font-bold text-success">89</h3>  // Line 401
<h3 className="text-2xl font-bold text-warning">23</h3>  // Line 410
<h3 className="text-2xl font-bold text-destructive">8</h3> // Line 419
```
These should be calculated dynamically from the `cases` prop.

---

## Implementation Plan

### 1. Fix RAG Status Matrix to Use Real Data

**File:** `src/components/cases/TimelineBreachTracker.tsx`

Add a `useMemo` hook to calculate actual counts from the cases prop:

```typescript
const ragCounts = useMemo(() => {
  const activeCases = cases.filter(c => (c as any).status !== 'Completed');
  return {
    green: activeCases.filter(c => 
      !c.timelineBreachStatus || c.timelineBreachStatus === 'Green'
    ).length,
    amber: activeCases.filter(c => c.timelineBreachStatus === 'Amber').length,
    red: activeCases.filter(c => c.timelineBreachStatus === 'Red').length,
  };
}, [cases]);
```

Replace hardcoded values with `ragCounts.green`, `ragCounts.amber`, `ragCounts.red`.

### 2. Fix Form-wise Timeline Performance

**File:** `src/services/reportsService.ts`

Refactor `getFormTimelineReport` to use `form_type` column instead of `generatedForms`:

```typescript
// Current (broken):
if (caseItem.generatedForms && caseItem.generatedForms.length > 0) {
  caseItem.generatedForms.forEach((form) => { ... });
}

// Fix: Group cases by form_type and calculate metrics
const formTypeGroups = new Map<string, any[]>();
filteredCases.forEach((caseItem) => {
  const formType = caseItem.form_type || caseItem.formType || 'Unknown';
  if (!formTypeGroups.has(formType)) {
    formTypeGroups.set(formType, []);
  }
  formTypeGroups.get(formType).push(caseItem);
});

// Calculate metrics per form type
formTypeGroups.forEach((casesInGroup, formType) => {
  const onTime = casesInGroup.filter(c => 
    (c.timeline_breach_status || c.timelineBreachStatus) === 'Green'
  ).length;
  const delayed = casesInGroup.filter(c => 
    (c.timeline_breach_status || c.timelineBreachStatus) === 'Red'
  ).length;
  
  reportData.push({
    formCode: formType,
    formTitle: formType,
    totalCases: casesInGroup.length,
    onTime,
    delayed,
    status: onTime > delayed ? 'On Time' : 'Delayed',
    ragStatus: delayed > 0 ? 'Red' : onTime < casesInGroup.length ? 'Amber' : 'Green'
  });
});
```

Also update the filter in `TimelineBreachTracker.tsx` to include actual form types from the database (like ASMT-10, DRC-01, DRC-1A) instead of the non-existent `ASMT10_REPLY` codes.

### 3. Fix Export Report Error

**File:** `src/components/cases/TimelineBreachTracker.tsx`

The issue is using `exportRows()` with `moduleKey: 'cases'` which expects the full Case type. Instead, we should:

Option A: Create a direct Excel export using XLSX library without the module configs:

```typescript
onClick={async () => {
  setIsExporting(true);
  try {
    const result = await getTimelineBreachReport({});
    
    if (!result.data || result.data.length === 0) {
      toast({ title: "No Data", description: "No timeline breach data to export" });
      return;
    }
    
    // Direct Excel export without module configs
    const XLSX = await import('xlsx');
    const wsData = [
      ['Case Number', 'Title', 'Client', 'Stage', 'Due Date', 'Aging (Days)', 'RAG Status', 'Owner', 'Breached'],
      ...result.data.map((item: any) => [
        item.caseNumber || item.caseId,
        item.caseTitle,
        item.client,
        item.stage,
        item.timelineDue,
        item.agingDays,
        item.ragStatus,
        item.owner,
        item.breached ? 'Yes' : 'No'
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timeline Breach Report');
    XLSX.writeFile(wb, `timeline-breach-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast({ title: "Export Complete" });
  } catch (error) {
    console.error('Export error:', error);
    toast({ title: "Export Failed", variant: "destructive" });
  } finally {
    setIsExporting(false);
  }
}}
```

### 4. Update Overview Statistics Cards

The header cards (Overall Timeline 87.5%, Critical Cases 8, etc.) at lines 214-265 are also hardcoded. These should be calculated dynamically:

```typescript
const overviewStats = useMemo(() => {
  const activeCases = cases.filter(c => (c as any).status !== 'Completed');
  const total = activeCases.length;
  const onTimeCount = activeCases.filter(c => 
    !c.timelineBreachStatus || c.timelineBreachStatus === 'Green'
  ).length;
  const criticalCount = activeCases.filter(c => c.timelineBreachStatus === 'Red').length;
  
  return {
    overallCompliance: total > 0 ? Math.round((onTimeCount / total) * 100) : 0,
    criticalCases: criticalCount,
    onTimeDelivery: total > 0 ? Math.round((onTimeCount / total) * 100) : 0,
  };
}, [cases]);
```

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/cases/TimelineBreachTracker.tsx` | Modify | Replace hardcoded RAG counts with dynamic calculation; fix export button; update overview cards |
| `src/services/reportsService.ts` | Modify | Rewrite `getFormTimelineReport()` to use `form_type` column instead of `generatedForms` |

---

## Testing Checklist

1. **RAG Status Matrix**
   - Open Timeline Tracker tab
   - Verify Green/Amber/Red counts match the actual case distribution
   - Check counts match the console log: "8 cases with Active status"

2. **Form-wise Timeline Performance**
   - Verify section shows form types from database (ASMT-10, DRC-01, etc.)
   - Verify compliance percentages are calculated correctly
   - Check progress bars reflect on-time vs delayed ratios

3. **Export Report**
   - Click "Export Report" button
   - Verify Excel file downloads without error
   - Open file and confirm columns and data match displayed data

4. **Overview Statistics**
   - Verify "Overall Timeline" percentage reflects actual compliance
   - Verify "Critical Cases" count matches Red status count
