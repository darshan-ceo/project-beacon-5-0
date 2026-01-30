

# Unify Task Status Values Across Application

## Problem Identified

There are **three inconsistent status models** being used across the application:

| Component | Status Values | Issue |
|-----------|---------------|-------|
| **Task Interface** (core model) | Not Started, In Progress, Review, Completed, Overdue | Source of truth |
| **Filter Dropdown** | Pending, In Progress, Completed, Overdue, Review, Not Started | "Pending" doesn't exist in task model |
| **Follow-up Status** | Not Started, In Progress, Need Info, On Hold, Completed, Cancelled | Different set - includes extra statuses |
| **Bulk Actions** | Not Started, In Progress, Review, Completed | Missing Overdue |

**Database Reality**: Tasks only have `Not Started` (214), `In Progress` (2), `Completed` (5) - no "Pending", "Review", or "Overdue" statuses stored.

This makes filtering impossible because:
- Selecting "Pending" in filters matches 0 tasks (status doesn't exist)
- "Overdue" is a calculated status based on due date, not a stored value
- Follow-up status changes use "Need Info", "On Hold", "Cancelled" which don't match core model

---

## Solution: Unify Status Definitions

### Step 1: Create Unified Status Constants

Create a single source of truth for all task statuses:

**File**: `src/constants/taskStatuses.ts` (new file)

```typescript
// Core task statuses - stored in database
export const CORE_TASK_STATUSES = [
  'Not Started',
  'In Progress', 
  'Need Info',
  'On Hold',
  'Review',
  'Completed',
  'Cancelled'
] as const;

export type CoreTaskStatus = typeof CORE_TASK_STATUSES[number];

// Virtual/calculated statuses (not stored, derived from data)
export const VIRTUAL_STATUSES = ['Overdue'] as const;

// All statuses for UI display (core + virtual)
export const ALL_TASK_STATUSES = [...CORE_TASK_STATUSES, ...VIRTUAL_STATUSES] as const;

// Status configuration with colors and labels
export const TASK_STATUS_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  'Not Started': { 
    label: 'Not Started', 
    color: 'bg-muted text-muted-foreground',
    description: 'Task created but work not begun'
  },
  'In Progress': { 
    label: 'In Progress', 
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    description: 'Work actively being done'
  },
  'Need Info': { 
    label: 'Need Info', 
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    description: 'Waiting for information to proceed'
  },
  'On Hold': { 
    label: 'On Hold', 
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    description: 'Temporarily paused'
  },
  'Review': { 
    label: 'Review', 
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    description: 'Work complete, awaiting approval'
  },
  'Completed': { 
    label: 'Completed', 
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    description: 'Task finished successfully'
  },
  'Cancelled': { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    description: 'Task no longer needed'
  },
  'Overdue': { 
    label: 'Overdue', 
    color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    description: 'Past due date (calculated, not stored)'
  }
};
```

---

### Step 2: Update Task Interface

Update the Task interface to use the expanded status type:

**File**: `src/contexts/AppStateContext.tsx`

```typescript
// Line 116: Update status type
status: 'Not Started' | 'In Progress' | 'Need Info' | 'On Hold' | 'Review' | 'Completed' | 'Cancelled';
```

Note: "Overdue" is NOT included here because it's a **virtual status** calculated from `dueDate`, not stored in the database.

---

### Step 3: Update Filter Options

Update the filter dropdown to match the unified statuses:

**File**: `src/components/tasks/UnifiedTaskSearch.tsx`

```typescript
// Lines 44-51: Update status filter options
{
  id: 'status',
  label: 'Status',
  type: 'dropdown',
  icon: CheckSquare,
  options: [
    { label: 'Not Started', value: 'Not Started' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Need Info', value: 'Need Info' },
    { label: 'On Hold', value: 'On Hold' },
    { label: 'Review', value: 'Review' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Cancelled', value: 'Cancelled' },
    { label: 'Overdue', value: 'Overdue' }  // Virtual - calculated filter
  ]
}
```

---

### Step 4: Update Follow-up Status Options

Update `taskMessages.ts` to use the unified statuses:

**File**: `src/types/taskMessages.ts`

```typescript
// Lines 25-31: Keep existing (already correct)
export type TaskStatusUpdate = 
  | 'Not Started' 
  | 'In Progress' 
  | 'Need Info' 
  | 'On Hold'
  | 'Review'      // ADD THIS
  | 'Completed' 
  | 'Cancelled';

// Lines 53-60: Update TASK_STATUS_OPTIONS to include Review
export const TASK_STATUS_OPTIONS: { value: TaskStatusUpdate; label: string; color: string }[] = [
  { value: 'Not Started', label: 'Not Started', color: 'bg-muted text-muted-foreground' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'Need Info', label: 'Need Info', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { value: 'On Hold', label: 'On Hold', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  { value: 'Review', label: 'Review', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'Completed', label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
];
```

---

### Step 5: Update Bulk Actions Status Options

**File**: `src/components/tasks/TasksBulkActions.tsx`

```typescript
// Line 57: Update STATUS_OPTIONS
const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Need Info', 'On Hold', 'Review', 'Completed', 'Cancelled'];
```

---

### Step 6: Update Filter Logic for Virtual "Overdue" Status

Update the filtering logic to handle "Overdue" as a calculated filter:

**File**: `src/components/tasks/TaskManagement.tsx`

```typescript
// Around lines 374-379: Update matchesStatus logic
if (activeFilters.status === 'Overdue') {
  // Use date-based overdue calculation
  matchesStatus = isTaskOverdue(task);
} else if (Array.isArray(activeFilters.status)) {
  matchesStatus = activeFilters.status.includes(task.status);
} else {
  matchesStatus = !activeFilters.status || task.status === activeFilters.status;
}
```

---

### Step 7: Update URL Parameter Validation

**File**: `src/components/tasks/TaskManagement.tsx`

```typescript
// Line 162: Update valid status list
if (statusParam && ['Not Started', 'In Progress', 'Need Info', 'On Hold', 'Review', 'Completed', 'Cancelled', 'Overdue'].includes(statusParam)) {
  setActiveFilters(prev => ({ ...prev, status: statusParam }));
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/constants/taskStatuses.ts` | NEW - Create unified status constants |
| `src/contexts/AppStateContext.tsx` | Update Task status type |
| `src/types/taskMessages.ts` | Add 'Review' to TaskStatusUpdate, update TASK_STATUS_OPTIONS |
| `src/components/tasks/UnifiedTaskSearch.tsx` | Update filter status options |
| `src/components/tasks/TasksBulkActions.tsx` | Update STATUS_OPTIONS array |
| `src/components/tasks/TaskManagement.tsx` | Handle Overdue as virtual filter, update URL validation |

---

## Unified Status Model After Fix

| Status | Stored in DB | Filter | Follow-up | Bulk Actions | Description |
|--------|:------------:|:------:|:---------:|:------------:|-------------|
| Not Started | Yes | Yes | Yes | Yes | Task created but not begun |
| In Progress | Yes | Yes | Yes | Yes | Work actively happening |
| Need Info | Yes | Yes | Yes | Yes | Waiting for information |
| On Hold | Yes | Yes | Yes | Yes | Temporarily paused |
| Review | Yes | Yes | Yes | Yes | Awaiting approval |
| Completed | Yes | Yes | Yes | Yes | Task finished |
| Cancelled | Yes | Yes | Yes | Yes | Task no longer needed |
| Overdue | No (calculated) | Yes | No | No | Past due date (virtual) |

---

## Testing Checklist

1. Filter by each status → Verify correct tasks are shown
2. Change status via follow-up → Verify task status updates
3. Bulk change status → Verify all new options work
4. Navigate to /tasks?status=Need%20Info → Verify filter applies
5. Verify "Overdue" filter shows tasks with past due dates
6. Verify color coding is consistent across all views

