import { Task } from '@/contexts/AppStateContext';
import { automationEventEmitter } from './automationEventEmitter';
import { differenceInHours, differenceInDays, parseISO } from 'date-fns';

export interface SLAThreshold {
  priority: string;
  warningHours: number;
  criticalHours: number;
}

const DEFAULT_SLA_THRESHOLDS: SLAThreshold[] = [
  { priority: 'Critical', warningHours: 4, criticalHours: 8 },
  { priority: 'High', warningHours: 24, criticalHours: 48 },
  { priority: 'Medium', warningHours: 72, criticalHours: 120 },
  { priority: 'Low', warningHours: 168, criticalHours: 240 }
];

class SLAMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private thresholds: SLAThreshold[] = DEFAULT_SLA_THRESHOLDS;

  startMonitoring(intervalMinutes: number = 15): void {
    if (this.isMonitoring) {
      console.log('[SLAMonitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    console.log(`[SLAMonitor] Starting monitoring with ${intervalMinutes} minute interval`);

    // Run immediately
    this.checkSLACompliance();

    // Then run on interval
    this.monitoringInterval = setInterval(
      () => this.checkSLACompliance(),
      intervalMinutes * 60 * 1000
    );
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('[SLAMonitor] Stopped monitoring');
  }

  private async checkSLACompliance(): Promise<void> {
    try {
      const tasks = await this.getInProgressTasks();
      const now = new Date();

      for (const task of tasks) {
        const dueDate = this.parseDueDate(task.dueDate);
        if (!dueDate) continue;

        const hoursUntilDue = differenceInHours(dueDate, now);
        const daysOverdue = hoursUntilDue < 0 ? Math.abs(differenceInDays(now, dueDate)) : 0;

        // Check if task is overdue
        if (hoursUntilDue < 0 && task.status !== 'Overdue') {
          console.log(`[SLAMonitor] Task ${task.id} is overdue by ${daysOverdue} days`);
          await automationEventEmitter.emitTaskOverdue(
            task.id,
            task.caseId || '',
            daysOverdue,
            task
          );
        }

        // Check SLA thresholds
        const threshold = this.getSLAThreshold(task.priority);
        if (threshold) {
          // Warning threshold
          if (hoursUntilDue > 0 && hoursUntilDue <= threshold.warningHours) {
            console.log(`[SLAMonitor] Task ${task.id} approaching SLA warning threshold`);
            // Could emit a warning event here
          }

          // Critical threshold
          if (hoursUntilDue > 0 && hoursUntilDue <= threshold.criticalHours) {
            console.log(`[SLAMonitor] Task ${task.id} approaching SLA critical threshold`);
            // Could emit a critical event here
          }
        }
      }
    } catch (error) {
      console.error('[SLAMonitor] Error checking SLA compliance:', error);
    }
  }

  private async getInProgressTasks(): Promise<Task[]> {
    try {
      // In a real implementation, this would query the database
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      console.error('[SLAMonitor] Error fetching tasks:', error);
      return [];
    }
  }

  private parseDueDate(dueDate: string | Date | undefined): Date | null {
    if (!dueDate) return null;

    try {
      if (dueDate instanceof Date) {
        return dueDate;
      }

      // Try parsing DD-MM-YYYY format
      if (typeof dueDate === 'string') {
        const parts = dueDate.split('-');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }

        // Try ISO format
        return parseISO(dueDate);
      }

      return null;
    } catch (error) {
      console.error('[SLAMonitor] Error parsing due date:', dueDate, error);
      return null;
    }
  }

  private getSLAThreshold(priority: string): SLAThreshold | undefined {
    return this.thresholds.find(t => t.priority === priority);
  }

  updateThresholds(thresholds: SLAThreshold[]): void {
    this.thresholds = thresholds;
    console.log('[SLAMonitor] Updated SLA thresholds');
  }

  getStatus(): { monitoring: boolean; thresholds: SLAThreshold[] } {
    return {
      monitoring: this.isMonitoring,
      thresholds: this.thresholds
    };
  }
}

// Export singleton instance
export const slaMonitor = new SLAMonitor();
