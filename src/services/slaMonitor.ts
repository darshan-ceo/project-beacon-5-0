import { supabase } from '@/integrations/supabase/client';
import { automationEventEmitter } from './automationEventEmitter';
import { escalationService } from './escalationService';
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

interface DBTask {
  id: string;
  title: string;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  case_id: string | null;
  assigned_to: string | null;
  case_number: string | null;
}

// Minimal task info for automation events
interface TaskEventData {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  caseId?: string;
  caseNumber?: string;
}

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
      
      console.log(`[SLAMonitor] Checking ${tasks.length} tasks for SLA compliance`);

      let overdueCount = 0;
      let warningCount = 0;
      let criticalCount = 0;

      for (const task of tasks) {
        const dueDate = this.parseDueDate(task.due_date);
        if (!dueDate) continue;

        const hoursUntilDue = differenceInHours(dueDate, now);
        const daysOverdue = hoursUntilDue < 0 ? Math.abs(differenceInDays(now, dueDate)) : 0;

        // Check if task is overdue
        if (hoursUntilDue < 0 && task.status !== 'Overdue') {
          overdueCount++;
          console.log(`[SLAMonitor] Task ${task.id} "${task.title}" is overdue by ${daysOverdue} days`);
          
          await automationEventEmitter.emitTaskOverdue(
            task.id,
            task.case_id || '',
            daysOverdue,
            this.mapDBTaskToEventData(task) as any
          );

          // Trigger escalation for overdue tasks
          try {
            await escalationService.checkAndEscalateOverdueTasks();
          } catch (err) {
            console.error('[SLAMonitor] Escalation check failed:', err);
          }
        }

        // Check SLA thresholds
        const threshold = this.getSLAThreshold(task.priority || 'Medium');
        if (threshold && hoursUntilDue > 0) {
          // Warning threshold
          if (hoursUntilDue <= threshold.warningHours) {
            warningCount++;
            console.log(`[SLAMonitor] Task ${task.id} "${task.title}" approaching SLA warning (${hoursUntilDue.toFixed(1)}h remaining)`);
          }

          // Critical threshold
          if (hoursUntilDue <= threshold.criticalHours * 0.25) {
            criticalCount++;
            console.log(`[SLAMonitor] Task ${task.id} "${task.title}" at SLA critical threshold (${hoursUntilDue.toFixed(1)}h remaining)`);
          }
        }
      }

      console.log(`[SLAMonitor] Compliance check complete: ${overdueCount} overdue, ${warningCount} warnings, ${criticalCount} critical`);
    } catch (error) {
      console.error('[SLAMonitor] Error checking SLA compliance:', error);
    }
  }

  private async getInProgressTasks(): Promise<DBTask[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[SLAMonitor] No authenticated user');
        return [];
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.tenant_id) {
        console.log('[SLAMonitor] No tenant found');
        return [];
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, due_date, priority, status, case_id, assigned_to, case_number')
        .eq('tenant_id', profile.tenant_id)
        .not('status', 'in', '(Completed,Cancelled)')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('[SLAMonitor] Error fetching tasks:', error);
        return [];
      }

      console.log(`[SLAMonitor] Fetched ${data?.length || 0} tasks to monitor`);
      return data || [];
    } catch (error) {
      console.error('[SLAMonitor] Error fetching tasks:', error);
      return [];
    }
  }

  private mapDBTaskToEventData(dbTask: DBTask): TaskEventData {
    return {
      id: dbTask.id,
      title: dbTask.title,
      status: dbTask.status || 'Not Started',
      priority: dbTask.priority || 'Medium',
      dueDate: dbTask.due_date || '',
      caseId: dbTask.case_id || undefined,
      caseNumber: dbTask.case_number || undefined
    };
  }

  private parseDueDate(dueDate: string | Date | null | undefined): Date | null {
    if (!dueDate) return null;

    try {
      if (dueDate instanceof Date) {
        return dueDate;
      }

      // Try parsing DD-MM-YYYY format
      if (typeof dueDate === 'string') {
        const parts = dueDate.split('-');
        if (parts.length === 3 && parts[0].length <= 2) {
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
