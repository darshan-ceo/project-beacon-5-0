import { Task } from '@/contexts/AppStateContext';
import { isPast, isToday, parseISO } from 'date-fns';

export class FollowUpReminderService {
  private static checkIntervalId: NodeJS.Timeout | null = null;
  private static lastCheckDate: string | null = null;
  
  static startMonitoring(tasks: Task[], onOverdue: (tasks: Task[]) => void) {
    // Check immediately on start
    this.checkAndNotify(tasks, onOverdue);
    
    // Check every 5 minutes
    this.checkIntervalId = setInterval(() => {
      this.checkAndNotify(tasks, onOverdue);
    }, 5 * 60 * 1000);
  }
  
  private static checkAndNotify(tasks: Task[], onOverdue: (tasks: Task[]) => void) {
    const today = new Date().toDateString();
    
    // Only notify once per day
    if (this.lastCheckDate === today) {
      return;
    }
    
    const overdue = this.getOverdueFollowUps(tasks);
    if (overdue.length > 0) {
      this.lastCheckDate = today;
      onOverdue(overdue);
    }
  }
  
  static stopMonitoring() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }
  
  static getOverdueFollowUps(tasks: Task[]): Task[] {
    return tasks.filter(task => {
      if (!task.currentFollowUpDate) return false;
      try {
        const dueDate = parseISO(task.currentFollowUpDate);
        return isPast(dueDate) && !isToday(dueDate);
      } catch {
        return false;
      }
    });
  }
  
  static getTodayFollowUps(tasks: Task[]): Task[] {
    return tasks.filter(task => {
      if (!task.currentFollowUpDate) return false;
      try {
        return isToday(parseISO(task.currentFollowUpDate));
      } catch {
        return false;
      }
    });
  }
  
  static getAllDueFollowUps(tasks: Task[]): Task[] {
    return tasks.filter(task => {
      if (!task.currentFollowUpDate) return false;
      try {
        const dueDate = parseISO(task.currentFollowUpDate);
        return isToday(dueDate) || isPast(dueDate);
      } catch {
        return false;
      }
    });
  }
}
