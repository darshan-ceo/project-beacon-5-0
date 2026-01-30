

# Fix: Export Timeline and Generate Report Buttons Not Downloading Files

## Problem Identified

The **"Export Timeline"** and **"Generate Report"** buttons in the Case Management → Timeline section show success toasts but **don't actually download any files**.

### Root Cause

In `src/components/cases/CaseTimeline.tsx` (lines 265-287), both buttons only display toast messages without calling any export logic:

```javascript
// Current code - ONLY shows toast, no actual download
onClick={() => {
  toast({
    title: "Export Timeline",
    description: "Timeline data exported successfully",
  });
}}
```

---

## Solution Overview

Replace the placeholder toast handlers with real export functionality that:
1. **Export Timeline** → Downloads case timeline events as Excel (.xlsx)
2. **Generate Report** → Downloads a formatted PDF report

---

## Technical Implementation

### Files to Modify

| File | Change |
|------|--------|
| `src/config/reportColumns.ts` | Add CASE_TIMELINE_COLUMNS definition |
| `src/utils/reportExporter.ts` | Add `exportCaseTimelineReport()` function |
| `src/components/cases/CaseTimeline.tsx` | Wire buttons to real export functions |

---

### Step 1: Add Timeline Event Column Definitions

**File:** `src/config/reportColumns.ts`

Add new column definition for case timeline events:

```typescript
export const CASE_TIMELINE_COLUMNS: ReportColumn[] = [
  { key: 'date', header: 'Date', type: 'date', format: 'dd-MM-yyyy', 
    get: (row) => row.timestamp || row.createdAt || row.date || '' },
  { key: 'time', header: 'Time', type: 'string', 
    get: (row) => {
      const ts = row.timestamp || row.createdAt;
      if (!ts) return '';
      return new Date(ts).toLocaleTimeString('en-IN', { 
        hour: '2-digit', minute: '2-digit' 
      });
    }
  },
  { key: 'type', header: 'Event Type', type: 'string', 
    get: (row) => row.type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '' },
  { key: 'title', header: 'Title', type: 'string', 
    get: (row) => row.title || '' },
  { key: 'description', header: 'Description', type: 'string', 
    get: (row) => row.description || '' },
  { key: 'user', header: 'Actor', type: 'string', 
    get: (row) => row.user?.name || row.createdByName || row.createdBy || '' },
  { key: 'stage', header: 'Stage', type: 'string', 
    get: (row) => row.metadata?.stage || '' },
];
```

---

### Step 2: Add Timeline Export Function

**File:** `src/utils/reportExporter.ts`

Add new export function for case timeline:

```typescript
import { CASE_TIMELINE_COLUMNS } from '@/config/reportColumns';

/**
 * Export Case Timeline Report (for individual case audit trail)
 */
export async function exportCaseTimelineReport(
  data: any[],
  format: 'xlsx' | 'pdf',
  caseNumber?: string
): Promise<void> {
  const prefix = caseNumber 
    ? `Case-Timeline-${caseNumber}` 
    : 'Case-Timeline-Report';
  const filename = generateFilename(prefix, format);
  const title = caseNumber 
    ? `Case Timeline: ${caseNumber}` 
    : 'Case Timeline Report';
  
  if (format === 'pdf') {
    await exportReportToPDF(data, CASE_TIMELINE_COLUMNS, filename, title);
  } else {
    await exportReportToExcel(data, CASE_TIMELINE_COLUMNS, filename, 'Timeline');
  }
}
```

---

### Step 3: Wire Buttons to Export Functions

**File:** `src/components/cases/CaseTimeline.tsx`

#### 3a. Add imports

```typescript
import { exportCaseTimelineReport } from '@/utils/reportExporter';
```

#### 3b. Add loading state for export

```typescript
const [isExporting, setIsExporting] = useState(false);
```

#### 3c. Replace "Export Timeline" button handler (lines 265-274)

```typescript
<Button 
  variant="outline" 
  size="sm"
  disabled={isExporting || timelineEvents.length === 0}
  onClick={async () => {
    if (timelineEvents.length === 0) {
      toast({
        title: "No Timeline Data",
        description: "There are no timeline events to export.",
        variant: "destructive"
      });
      return;
    }
    
    setIsExporting(true);
    try {
      await exportCaseTimelineReport(
        timelineEvents, 
        'xlsx', 
        selectedCase?.caseNumber
      );
      toast({
        title: "Export Successful",
        description: `Timeline exported as Excel with ${timelineEvents.length} events.`,
      });
    } catch (error) {
      console.error('Timeline export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export timeline. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }}
>
  {isExporting ? (
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  ) : (
    <Download className="mr-2 h-4 w-4" />
  )}
  Export Timeline
</Button>
```

#### 3d. Replace "Generate Report" button handler (lines 275-287)

```typescript
<Button 
  variant="outline" 
  size="sm"
  disabled={isExporting || timelineEvents.length === 0}
  onClick={async () => {
    if (timelineEvents.length === 0) {
      toast({
        title: "No Timeline Data",
        description: "There are no timeline events to generate a report from.",
        variant: "destructive"
      });
      return;
    }
    
    setIsExporting(true);
    toast({
      title: "Generating PDF...",
      description: "Please wait while we prepare your report.",
    });
    
    try {
      await exportCaseTimelineReport(
        timelineEvents, 
        'pdf', 
        selectedCase?.caseNumber
      );
      toast({
        title: "Report Generated",
        description: "PDF report downloaded successfully.",
      });
    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }}
>
  {isExporting ? (
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  ) : (
    <FileText className="mr-2 h-4 w-4" />
  )}
  Generate Report
</Button>
```

#### 3e. Add Loader2 icon import

```typescript
import { Loader2 } from 'lucide-react';
```

---

## Expected Behavior After Fix

| Action | Before | After |
|--------|--------|-------|
| Click "Export Timeline" | Toast only, no download | Downloads `.xlsx` file with timeline events |
| Click "Generate Report" | Toast only, no download | Downloads formatted `.pdf` report |
| No timeline events | Toast says "success" | Toast shows "No Timeline Data" error |
| During export | Button clickable | Button disabled with loading spinner |

---

## Testing Checklist

1. Open a case with timeline events
2. Click "Export Timeline" → Verify Excel file downloads with correct data
3. Click "Generate Report" → Verify PDF file downloads with formatted content
4. Open a case with NO timeline events → Both buttons should show "No Timeline Data" error
5. Click export while another export is in progress → Button should be disabled
6. Verify downloaded files contain correct date format (dd-MM-yyyy)
7. Verify actor names display correctly in exported files

