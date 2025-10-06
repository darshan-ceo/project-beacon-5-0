/**
 * Date Utilities for Task Management
 * Timezone-safe date operations and due date filtering
 */

import { formatDateForDisplay, parseDateInput } from './dateFormatters';

export interface DateRange {
  from: Date;
  to: Date;
}

export type DueDateFilterType = 
  | 'today' 
  | 'tomorrow' 
  | '7d' 
  | '15d' 
  | '30d' 
  | 'overdue' 
  | 'custom';

export interface DueDateFilter {
  type: DueDateFilterType;
  range?: DateRange;
  label: string;
}

/**
 * Get start and end of day in local timezone
 */
export function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getEndOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Add work days (skip weekends)
 */
export function addWorkDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }
  
  return result;
}

/**
 * Check if date is overdue (past today)
 */
export function isOverdue(dueDate: string | Date): boolean {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const today = getStartOfDay(new Date());
  return due < today;
}

/**
 * Get predefined due date filters
 */
export function getDueDateFilters(): DueDateFilter[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);
  
  const in15Days = new Date(today);
  in15Days.setDate(today.getDate() + 15);
  
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  return [
    {
      type: 'today',
      range: { from: getStartOfDay(today), to: getEndOfDay(today) },
      label: 'Today'
    },
    {
      type: 'tomorrow',
      range: { from: getStartOfDay(tomorrow), to: getEndOfDay(tomorrow) },
      label: 'Tomorrow'
    },
    {
      type: '7d',
      range: { from: getStartOfDay(today), to: getEndOfDay(in7Days) },
      label: 'Next 7 days'
    },
    {
      type: '15d',
      range: { from: getStartOfDay(today), to: getEndOfDay(in15Days) },
      label: 'Next 15 days'
    },
    {
      type: '30d',
      range: { from: getStartOfDay(today), to: getEndOfDay(in30Days) },
      label: 'Next 30 days'
    },
    {
      type: 'overdue',
      range: { from: new Date('2000-01-01'), to: getStartOfDay(today) },
      label: 'Overdue'
    }
  ];
}

/**
 * Filter tasks by due date
 */
export function filterTasksByDueDate(tasks: any[], filter: DueDateFilter): any[] {
  if (!filter.range) return tasks;
  
  return tasks.filter(task => {
    if (!task.dueDate) return false;
    
    const taskDue = new Date(task.dueDate);
    
    if (filter.type === 'overdue') {
      return isOverdue(taskDue);
    }
    
    return taskDue >= filter.range!.from && taskDue <= filter.range!.to;
  });
}

/**
 * Parse due date filter from URL params
 */
export function parseDueDateFromUrl(params: URLSearchParams): DueDateFilter | null {
  const type = params.get('due') as DueDateFilterType;
  if (!type) return null;
  
  const predefined = getDueDateFilters().find(f => f.type === type);
  if (predefined) return predefined;
  
  // Handle custom range
  if (type === 'custom') {
    const from = params.get('from');
    const to = params.get('to');
    
    if (from && to) {
      return {
        type: 'custom',
        range: {
          from: new Date(from),
          to: new Date(to)
        },
        label: 'Custom range'
      };
    }
  }
  
  return null;
}

/**
 * Convert due date filter to URL params
 */
export function dueDateFilterToUrl(filter: DueDateFilter): URLSearchParams {
  const params = new URLSearchParams();
  params.set('due', filter.type);
  
  if (filter.type === 'custom' && filter.range) {
    params.set('from', filter.range.from.toISOString().split('T')[0]);
    params.set('to', filter.range.to.toISOString().split('T')[0]);
  }
  
  return params;
}

/**
 * Format relative date (e.g., "2 days ago", "in 3 days")
 */
export function formatRelativeDate(date: string | Date): string {
  const parsed = parseDateInput(date);
  if (!parsed) return '';

  const now = new Date();
  const today = getStartOfDay(now);
  const targetDate = getStartOfDay(parsed);

  const diffMs = targetDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  
  // Use DD-MM-YYYY format for dates beyond a week
  return formatDateForDisplay(parsed);
}

/**
 * Parse due offset (e.g., "+2d", "-1w") to actual date
 */
export function parseDueOffset(offset: string, baseDate: Date = new Date()): Date {
  const match = offset.match(/^([+-]?)(\d+)([dwmy])$/);
  if (!match) throw new Error(`Invalid due offset format: ${offset}`);
  
  const [, sign, amount, unit] = match;
  const days = parseInt(amount) * (sign === '-' ? -1 : 1);
  
  const result = new Date(baseDate);
  
  switch (unit) {
    case 'd': // days
      if (days > 0) {
        return addWorkDays(result, days);
      } else {
        result.setDate(result.getDate() + days);
        return result;
      }
    case 'w': // weeks
      result.setDate(result.getDate() + (days * 7));
      return result;
    case 'm': // months
      result.setMonth(result.getMonth() + days);
      return result;
    case 'y': // years
      result.setFullYear(result.getFullYear() + days);
      return result;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
}

/**
 * Validate due offset format
 */
export function validateDueOffset(offset: string): boolean {
  return /^[+-]?\d+[dwmy]$/.test(offset);
}