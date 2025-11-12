import { supabase } from '@/integrations/supabase/client';
import { timelineService } from './timelineService';
import { storageManager } from '@/data/StorageManager';

export interface BackfillResult {
  tasksCreated: number;
  tasksCompleted: number;
  casesCreated: number;
  casesAssigned: number;
  errors: string[];
}

class TimelineBackfillService {
  /**
   * Backfill timeline entries for historical data
   */
  async backfillTimeline(): Promise<BackfillResult> {
    console.log('[TimelineBackfill] Starting backfill process...');
    
    const result: BackfillResult = {
      tasksCreated: 0,
      tasksCompleted: 0,
      casesCreated: 0,
      casesAssigned: 0,
      errors: []
    };

    try {
      // Get authenticated user and tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      const tenantId = profile.tenant_id;
      const storage = storageManager.getStorage();

      // Backfill task_created entries
      await this.backfillTaskCreated(storage, tenantId, result);

      // Backfill task_completed entries
      await this.backfillTaskCompleted(storage, tenantId, result);

      // Backfill case_created entries
      await this.backfillCaseCreated(storage, tenantId, result);

      // Backfill case_assigned entries
      await this.backfillCaseAssigned(storage, tenantId, result);

      console.log('[TimelineBackfill] ✅ Backfill completed:', result);
      return result;
    } catch (error) {
      console.error('[TimelineBackfill] ❌ Backfill failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Backfill task_created entries
   */
  private async backfillTaskCreated(storage: any, tenantId: string, result: BackfillResult): Promise<void> {
    try {
      // Get all existing timeline entries for this tenant
      const { data: existingEntries } = await supabase
        .from('timeline_entries')
        .select('metadata')
        .eq('tenant_id', tenantId)
        .eq('type', 'task_created');

      const existingTaskIds = new Set(
        (existingEntries || [])
          .map(e => {
            const metadata = e.metadata as any;
            return metadata?.taskId;
          })
          .filter(Boolean)
      );

      // Get all tasks
      const tasks = await storage.getAll('tasks');

      for (const task of tasks) {
        // Skip if already has timeline entry
        if (existingTaskIds.has(task.id)) continue;

        // Skip if no case association
        if (!task.case_id && !task.caseId) continue;

        try {
          await timelineService.addEntry({
            caseId: task.case_id || task.caseId,
            type: 'task_created',
            title: 'Task Created',
            description: `Task "${task.title}" created (backfilled)`,
            createdBy: 'System',
            metadata: {
              taskId: task.id,
              priority: task.priority,
              status: task.status,
              dueDate: task.due_date || task.dueDate,
              assignedTo: task.assigned_to_id || task.assignedToId,
              backfilled: true
            }
          });
          result.tasksCreated++;
        } catch (error) {
          console.error(`[TimelineBackfill] Error backfilling task ${task.id}:`, error);
          result.errors.push(`Task ${task.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('[TimelineBackfill] Error in backfillTaskCreated:', error);
      result.errors.push(`Task created backfill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Backfill task_completed entries
   */
  private async backfillTaskCompleted(storage: any, tenantId: string, result: BackfillResult): Promise<void> {
    try {
      // Get all existing timeline entries for this tenant
      const { data: existingEntries } = await supabase
        .from('timeline_entries')
        .select('metadata')
        .eq('tenant_id', tenantId)
        .eq('type', 'task_completed');

      const existingTaskIds = new Set(
        (existingEntries || [])
          .map(e => {
            const metadata = e.metadata as any;
            return metadata?.taskId;
          })
          .filter(Boolean)
      );

      // Get all completed tasks
      const tasks = await storage.getAll('tasks');
      const completedTasks = tasks.filter((t: any) => 
        t.status === 'Completed' || t.status === 'Done'
      );

      for (const task of completedTasks) {
        // Skip if already has timeline entry
        if (existingTaskIds.has(task.id)) continue;

        // Skip if no case association
        if (!task.case_id && !task.caseId) continue;

        try {
          await timelineService.addEntry({
            caseId: task.case_id || task.caseId,
            type: 'task_completed',
            title: 'Task Completed',
            description: `Task "${task.title}" marked as completed (backfilled)`,
            createdBy: 'System',
            metadata: {
              taskId: task.id,
              completedBy: task.assigned_to_id || task.assignedToId,
              backfilled: true
            }
          });
          result.tasksCompleted++;
        } catch (error) {
          console.error(`[TimelineBackfill] Error backfilling completed task ${task.id}:`, error);
          result.errors.push(`Task completed ${task.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('[TimelineBackfill] Error in backfillTaskCompleted:', error);
      result.errors.push(`Task completed backfill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Backfill case_created entries
   */
  private async backfillCaseCreated(storage: any, tenantId: string, result: BackfillResult): Promise<void> {
    try {
      // Get all existing timeline entries for this tenant
      const { data: existingEntries } = await supabase
        .from('timeline_entries')
        .select('metadata')
        .eq('tenant_id', tenantId)
        .eq('type', 'case_created');

      const existingCaseNumbers = new Set(
        (existingEntries || [])
          .map(e => {
            const metadata = e.metadata as any;
            return metadata?.caseNumber;
          })
          .filter(Boolean)
      );

      // Get all cases
      const cases = await storage.getAll('cases');

      for (const caseItem of cases) {
        const caseNumber = caseItem.case_number || caseItem.caseNumber;
        
        // Skip if already has timeline entry
        if (existingCaseNumbers.has(caseNumber)) continue;

        try {
          await timelineService.addEntry({
            caseId: caseItem.id,
            type: 'case_created',
            title: 'Case Created',
            description: `Case ${caseNumber} created (backfilled)`,
            createdBy: 'System',
            metadata: {
              caseNumber,
              stage: caseItem.stage_code || caseItem.stageCode,
              priority: caseItem.priority,
              backfilled: true
            }
          });
          result.casesCreated++;
        } catch (error) {
          console.error(`[TimelineBackfill] Error backfilling case ${caseItem.id}:`, error);
          result.errors.push(`Case ${caseItem.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('[TimelineBackfill] Error in backfillCaseCreated:', error);
      result.errors.push(`Case created backfill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Backfill case_assigned entries (for cases with current assignee)
   */
  private async backfillCaseAssigned(storage: any, tenantId: string, result: BackfillResult): Promise<void> {
    try {
      // Get all existing timeline entries for this tenant
      const { data: existingEntries } = await supabase
        .from('timeline_entries')
        .select('case_id, metadata')
        .eq('tenant_id', tenantId)
        .eq('type', 'case_assigned');

      const existingCaseIds = new Set(
        (existingEntries || []).map(e => e.case_id).filter(Boolean)
      );

      // Get all cases with assignees
      const cases = await storage.getAll('cases');
      const assignedCases = cases.filter((c: any) => c.assigned_to || c.assignedTo);

      for (const caseItem of assignedCases) {
        // Skip if already has timeline entry
        if (existingCaseIds.has(caseItem.id)) continue;

        try {
          await timelineService.addEntry({
            caseId: caseItem.id,
            type: 'case_assigned',
            title: 'Case Assigned',
            description: `Case assigned (current assignee - backfilled)`,
            createdBy: 'System',
            metadata: {
              assignedTo: caseItem.assigned_to || caseItem.assignedTo,
              backfilled: true
            }
          });
          result.casesAssigned++;
        } catch (error) {
          console.error(`[TimelineBackfill] Error backfilling assignment for case ${caseItem.id}:`, error);
          result.errors.push(`Case assignment ${caseItem.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('[TimelineBackfill] Error in backfillCaseAssigned:', error);
      result.errors.push(`Case assigned backfill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const timelineBackfillService = new TimelineBackfillService();
