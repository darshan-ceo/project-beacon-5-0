
# Plan: Fix Timeline Tracker Issues (Critical Alerts, Task Creation, Export)

## Problem Summary

You've identified **three distinct issues** in the Timeline Tracker tab:

1. **Critical Timeline Breach Alerts shows dummy data** - The alerts list is hardcoded with sample data (CASE-2024-001, CASE-2024-005, etc.) instead of pulling from real database cases.

2. **"Create Task" button doesn't respond** - When clicking "Take Action" and filling out the form, the "Create Task" button appears unresponsive. Root cause: the modal passes a **dummy case ID** (e.g., "1", "2", "3") because the critical cases list is hardcoded. When `handleCreateTask()` tries to find the case via `state.cases.find(c => c.id === caseId)`, it returns `undefined` (the real cases have UUIDs like `case_xxx`), causing the function to exit silently at line 60.

3. **"Export Report" and "Schedule Report" show incorrect data** - The Export button calls `reportsService.exportCaseList([])` with an **empty array**, which produces a generic case list export instead of the actual timeline breach data. The Schedule button just shows a simple placeholder modal with no real scheduling functionality.

---

## Root Cause Analysis

### Issue 1: Hardcoded Critical Cases

```typescript
// src/components/cases/TimelineBreachTracker.tsx (lines 53-81)
const criticalCases = [
  {
    id: '1',  // Dummy ID
    caseNumber: 'CASE-2024-001',  // Fake case number
    title: 'Tax Assessment Appeal - Acme Corp',  // Sample data
    ...
  },
  ...
];
```

This static array is rendered directly without any database lookup.

### Issue 2: Task Creation Fails Silently

```typescript
// src/components/modals/ActionItemModal.tsx (line 59-60)
const caseData = state.cases.find(c => c.id === caseId);
if (!caseData) return;  // Silent exit when case not found
```

Since `caseId` comes from the dummy data ("1", "2", "3"), the lookup fails and the function returns without feedback.

### Issue 3: Export Uses Wrong Data

```typescript
// src/components/cases/TimelineBreachTracker.tsx (line 415)
await reportsService.exportCaseList([], 'excel');  // Empty array!
```

This passes an empty array to a generic case export function, not the specific timeline breach data.

---

## Implementation Plan

### 1. Replace Hardcoded Critical Cases with Real Database Data

**File:** `src/components/cases/TimelineBreachTracker.tsx`

**Changes:**
- Remove the static `criticalCases` constant
- Add state to hold real critical cases: `useState<CriticalCase[]>([])`
- In the existing `useEffect`, query cases with `timelineBreachStatus === 'Red'` or approaching breach (Amber + due soon)
- Calculate actual time remaining based on `reply_due_date` or last activity date
- Map real case data to the critical cases display format

**Technical approach:**
```typescript
// Load critical cases from real data
const [criticalCases, setCriticalCases] = useState<CriticalCase[]>([]);

useEffect(() => {
  const loadCriticalCases = async () => {
    const storage = storageManager.getStorage();
    const allCases = await storage.getAll('cases');
    
    // Filter for Red/Amber status cases
    const critical = allCases
      .filter(c => c.status === 'Active' && 
        (c.timeline_breach_status === 'Red' || c.timeline_breach_status === 'Amber'))
      .map(c => ({
        id: c.id,  // Real UUID
        caseNumber: c.case_number || c.caseNumber,
        title: c.title,
        form: c.current_form || 'N/A',
        timeRemaining: calculateTimeRemaining(c.reply_due_date),
        status: c.timeline_breach_status,
        urgency: c.timeline_breach_status === 'Red' ? 'Critical' : 'High'
      }));
    
    setCriticalCases(critical);
  };
  loadCriticalCases();
}, []);
```

### 2. Fix Task Creation to Use tasksService

**File:** `src/components/modals/ActionItemModal.tsx`

**Changes:**
- Replace direct `dispatch({ type: 'ADD_TASK' })` with `tasksService.create()`
- This ensures:
  - Task is persisted to database first
  - Server generates the UUID
  - Only after successful persistence is the UI updated
- Add error handling for case not found scenario (show toast instead of silent return)
- Make the function `async` to properly await the service call

**Technical approach:**
```typescript
const handleCreateTask = async () => {
  // Validation...
  
  const caseData = state.cases.find(c => c.id === caseId);
  if (!caseData) {
    toast({
      title: "Case Not Found",
      description: "The selected case could not be found.",
      variant: "destructive"
    });
    return;
  }
  
  try {
    await tasksService.create({
      title: formData.title,
      description: formData.description,
      // ... other fields
    }, dispatch);
    
    onClose();
  } catch (error) {
    // Error already handled by tasksService
  }
};
```

### 3. Fix Export to Use Timeline Breach Report Data

**File:** `src/components/cases/TimelineBreachTracker.tsx`

**Changes:**
- Replace `exportCaseList([])` with proper timeline breach report export
- Use `getTimelineBreachReport()` to fetch filtered data
- Export using the correct report exporter utility with timeline breach columns

**Technical approach:**
```typescript
onClick={async () => {
  try {
    const { getTimelineBreachReport } = await import('@/services/reportsService');
    const { exportRows } = await import('@/utils/exporter');
    
    const result = await getTimelineBreachReport({});
    
    await exportRows(
      result.data,
      'excel',
      'timeline-breach-report',
      [
        { key: 'caseId', label: 'Case ID' },
        { key: 'caseTitle', label: 'Case Title' },
        { key: 'client', label: 'Client' },
        { key: 'stage', label: 'Stage' },
        { key: 'timelineDue', label: 'Timeline Due' },
        { key: 'agingDays', label: 'Aging Days' },
        { key: 'ragStatus', label: 'RAG Status' },
        { key: 'owner', label: 'Owner' },
        { key: 'breached', label: 'Breached' }
      ]
    );
    
    toast({ title: "Export Complete" });
  } catch (error) {
    // Error handling
  }
}}
```

### 4. Enhance Schedule Report Modal (Optional Enhancement)

**File:** `src/components/cases/TimelineBreachTracker.tsx`

The current schedule modal is a placeholder. As part of this fix, we can either:
- A) Keep it as placeholder with clearer messaging that scheduling is "Coming Soon"
- B) Connect it to the existing report scheduling infrastructure

For now, we'll clarify it's a placeholder until proper scheduling is implemented.

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/cases/TimelineBreachTracker.tsx` | Modify | Replace hardcoded `criticalCases` with real database query; fix export button to use timeline breach data |
| `src/components/modals/ActionItemModal.tsx` | Modify | Use `tasksService.create()` instead of direct dispatch; add error handling |

---

## Testing Checklist

1. **Critical Alerts**
   - Open Timeline Tracker tab
   - Verify alerts show real cases with Red/Amber timeline status
   - Verify time remaining is calculated from actual due dates

2. **Task Creation**
   - Click "Take Action" on a real case alert
   - Fill in task form and click "Create Task"
   - Verify success toast appears
   - Verify task appears in Task Management module
   - Refresh page and confirm task persists

3. **Export Report**
   - Click "Export Report" button
   - Verify downloaded file contains timeline breach data (not generic case list)
   - Check that columns match: Case ID, Title, Client, Stage, Due Date, RAG Status, etc.

4. **Error Scenarios**
   - Test with missing required fields → should show validation error
   - Test when not logged in → should show authentication error
