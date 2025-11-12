/**
 * Timeline Backfill Service
 * Retroactively creates missing timeline entries for historical data
 * Idempotent - safe to run multiple times
 */

import { storageManager } from '@/data/StorageManager';
import { timelineService } from '@/services/timelineService';

export interface BackfillResult {
  taskCreatedCount: number;
  taskCompletedCount: number;
  caseCreatedCount: number;
  caseAssignedCount: number;
  totalCreated: number;
  errors: string[];
}

class TimelineBackfillService {
  private storage = storageManager.getStorage();

  /**
   * Check if a timeline entry already exists for a specific event
   */
  private async entryExists(
    caseId: string, 
    type: string, 
    metadata: any
  ): Promise<boolean> {
    try {
      const entries = await this.storage.getAll('timeline_entries');
      return entries.some((entry: any) => 
        entry.case_id === caseId && 
        entry.type === type &&
        JSON.stringify(entry.metadata) === JSON.stringify(metadata)
      );
    } catch (error) {
      console.error('[Backfill] Error checking entry existence:', error);
      return false;
    }
  }

  /**
   * Backfill task_created entries for existing tasks
   */
  private async backfillTaskCreated(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      const tasks = await this.storage.getAll('tasks');
      console.log(`[Backfill] Processing ${tasks.length} tasks for task_created entries...`);

      for (const task of tasks) {
        const t = task as any;
        if (!t.case_id) continue; // Skip tasks without case association

        const metadata = {
          taskId: t.id,
          priority: t.priority,
          status: t.status,
          dueDate: t.due_date,
          assignedTo: t.assigned_to,
          assignedToName: t.assigned_to_name
        };

        // Check if entry already exists
        const exists = await this.entryExists(t.case_id, 'task_created', metadata);
        if (exists) {
          console.log(`[Backfill] Skipping task_created for task ${t.id} (already exists)`);
          continue;
        }

        // Create timeline entry
        try {
          await timelineService.addEntry({
            caseId: t.case_id,
            type: 'task_created',
            title: `Task Created: ${t.title}`,
            description: `Assigned to ${t.assigned_to_name || 'unassigned'}`,
            createdBy: 'System',
            metadata
          });
          count++;
        } catch (error) {
          errors.push(`Failed to create task_created entry for task ${t.id}: ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch tasks: ${error.message}`);
    }

    return { count, errors };
  }

  /**
   * Backfill task_completed entries for completed tasks
   */
  private async backfillTaskCompleted(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      const tasks = await this.storage.getAll('tasks');
      const completedTasks = tasks.filter((t: any) => 
        (t.status === 'Completed' || t.status === 'Done') && t.case_id
      );
      
      console.log(`[Backfill] Processing ${completedTasks.length} completed tasks...`);

      for (const task of completedTasks) {
        const t = task as any;

        const metadata = {
          taskId: t.id,
          completedBy: t.assigned_to_name || 'Unknown'
        };

        // Check if entry already exists
        const exists = await this.entryExists(t.case_id, 'task_completed', metadata);
        if (exists) {
          console.log(`[Backfill] Skipping task_completed for task ${t.id} (already exists)`);
          continue;
        }

        // Create timeline entry with updated_at as timestamp
        try {
          await timelineService.addEntry({
            caseId: t.case_id,
            type: 'task_completed',
            title: `Task Completed: ${t.title}`,
            description: `${t.assigned_to_name || 'Assignee'} marked task as completed`,
            createdBy: 'System',
            metadata
          });
          count++;
        } catch (error) {
          errors.push(`Failed to create task_completed entry for task ${t.id}: ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch tasks: ${error.message}`);
    }

    return { count, errors };
  }

  /**
   * Backfill case_created entries for existing cases
   */
  private async backfillCaseCreated(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      const cases = await this.storage.getAll('cases');
      console.log(`[Backfill] Processing ${cases.length} cases for case_created entries...`);

      for (const caseData of cases) {
        const c = caseData as any;

        const metadata = {
          caseNumber: c.case_number,
          stage: c.stage_code,
          priority: c.priority
        };

        // Check if entry already exists
        const exists = await this.entryExists(c.id, 'case_created', metadata);
        if (exists) {
          console.log(`[Backfill] Skipping case_created for case ${c.id} (already exists)`);
          continue;
        }

        // Create timeline entry
        try {
          await timelineService.addEntry({
            caseId: c.id,
            type: 'case_created',
            title: `Case Created: ${c.case_number}`,
            description: c.title || 'New case',
            createdBy: 'System',
            metadata
          });
          count++;
        } catch (error) {
          errors.push(`Failed to create case_created entry for case ${c.id}: ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch cases: ${error.message}`);
    }

    return { count, errors };
  }

  /**
   * Backfill case_assigned entries for cases with assignees
   */
  private async backfillCaseAssigned(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      const cases = await this.storage.getAll('cases');
      const assignedCases = cases.filter((c: any) => c.assigned_to);
      
      console.log(`[Backfill] Processing ${assignedCases.length} assigned cases...`);

      for (const caseData of assignedCases) {
        const c = caseData as any;

        const metadata = {
          assignedTo: c.assigned_to,
          assignedToName: c.assigned_to_name || 'Unknown'
        };

        // Check if any case_assigned entry exists for this case
        const entries = await this.storage.getAll('timeline_entries');
        const hasAssignedEntry = entries.some((entry: any) => 
          entry.case_id === c.id && entry.type === 'case_assigned'
        );

        if (hasAssignedEntry) {
          console.log(`[Backfill] Skipping case_assigned for case ${c.id} (already exists)`);
          continue;
        }

        // Create timeline entry
        try {
          await timelineService.addEntry({
            caseId: c.id,
            type: 'case_assigned',
            title: 'Case Assigned',
            description: `Assigned to ${c.assigned_to_name || 'team member'}`,
            createdBy: 'System',
            metadata
          });
          count++;
        } catch (error) {
          errors.push(`Failed to create case_assigned entry for case ${c.id}: ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch cases: ${error.message}`);
    }

    return { count, errors };
  }

  /**
   * Run complete backfill process
   * Safe to run multiple times - idempotent
   */
  async runBackfill(): Promise<BackfillResult> {
    console.log('[Backfill] Starting timeline backfill process...');
    
    const taskCreated = await this.backfillTaskCreated();
    const taskCompleted = await this.backfillTaskCompleted();
    const caseCreated = await this.backfillCaseCreated();
    const caseAssigned = await this.backfillCaseAssigned();

    const result: BackfillResult = {
      taskCreatedCount: taskCreated.count,
      taskCompletedCount: taskCompleted.count,
      caseCreatedCount: caseCreated.count,
      caseAssignedCount: caseAssigned.count,
      totalCreated: taskCreated.count + taskCompleted.count + caseCreated.count + caseAssigned.count,
      errors: [
        ...taskCreated.errors,
        ...taskCompleted.errors,
        ...caseCreated.errors,
        ...caseAssigned.errors
      ]
    };

    console.log('[Backfill] ✅ Backfill complete:', result);
    return result;
  }
}

export const timelineBackfillService = new TimelineBackfillService();
