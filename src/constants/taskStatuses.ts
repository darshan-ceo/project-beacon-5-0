// Task Status Constants - Single source of truth for all task statuses

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

// Valid statuses for URL parameter validation (core + virtual)
export const VALID_STATUS_PARAMS = [...CORE_TASK_STATUSES, ...VIRTUAL_STATUSES] as const;
