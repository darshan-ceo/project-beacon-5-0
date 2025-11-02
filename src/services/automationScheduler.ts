import { slaMonitor } from './slaMonitor';

class AutomationScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  start(): void {
    if (this.isRunning) {
      console.log('[AutomationScheduler] Already running');
      return;
    }

    console.log('[AutomationScheduler] Starting background jobs');
    this.isRunning = true;

    // Start SLA monitoring (every 15 minutes)
    slaMonitor.startMonitoring(15);

    // Schedule overdue task checks (every 15 minutes)
    this.scheduleOverdueChecks();

    // Schedule deadline reminders (every hour)
    this.scheduleDeadlineReminders();
  }

  stop(): void {
    if (!this.isRunning) return;

    console.log('[AutomationScheduler] Stopping background jobs');
    
    // Stop SLA monitor
    slaMonitor.stopMonitoring();

    // Clear all intervals
    this.intervals.forEach(timer => clearInterval(timer));
    this.intervals.clear();
    
    this.isRunning = false;
  }

  private scheduleOverdueChecks(): void {
    const timer = setInterval(async () => {
      try {
        console.log('[AutomationScheduler] Running overdue task check');
        // The overdue checking is handled by SLA monitor
        // This is a placeholder for additional overdue-specific logic
      } catch (error) {
        console.error('[AutomationScheduler] Overdue check failed:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    this.intervals.set('overdue_checks', timer);
  }

  private scheduleDeadlineReminders(): void {
    const timer = setInterval(async () => {
      try {
        console.log('[AutomationScheduler] Running deadline reminder check');
        // Deadline reminder logic would go here
        // Could check for tasks due within 24 hours and send reminders
      } catch (error) {
        console.error('[AutomationScheduler] Deadline reminder failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    this.intervals.set('deadline_reminders', timer);
  }

  getStatus(): { running: boolean; jobs: string[] } {
    return {
      running: this.isRunning,
      jobs: Array.from(this.intervals.keys())
    };
  }
}

// Export singleton instance
export const automationScheduler = new AutomationScheduler();
