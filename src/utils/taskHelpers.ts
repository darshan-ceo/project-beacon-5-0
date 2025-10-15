import { addDays, isBefore, isWithinInterval } from 'date-fns';
import { Task } from '@/contexts/AppStateContext';

export type FollowUpStatus = 'overdue' | 'soon' | 'upcoming' | null;

/**
 * Determines the follow-up status based on the follow-up date
 */
export const getFollowUpStatus = (followUpDate: Date | string | null | undefined): FollowUpStatus => {
  if (!followUpDate) return null;
  
  const date = new Date(followUpDate);
  const now = new Date();
  const threeDaysFromNow = addDays(now, 3);
  
  if (isBefore(date, now)) return 'overdue';
  if (isWithinInterval(date, { start: now, end: threeDaysFromNow })) return 'soon';
  return 'upcoming';
};

/**
 * Returns the appropriate badge variant for the follow-up status
 */
export const getFollowUpBadgeVariant = (followUpDate: Date | string | null | undefined): 'destructive' | 'default' | 'secondary' => {
  const status = getFollowUpStatus(followUpDate);
  
  switch (status) {
    case 'overdue': return 'destructive';
    case 'soon': return 'default'; // Will be styled as warning/yellow
    default: return 'secondary';
  }
};

/**
 * Filters tasks that have follow-ups within the specified number of days
 */
export const filterTasksByFollowUp = (tasks: Task[], daysAhead: number = 7): Task[] => {
  const now = new Date();
  const cutoff = addDays(now, daysAhead);
  
  return tasks.filter(task => 
    task.followUpDate && 
    new Date(task.followUpDate) <= cutoff
  );
};
