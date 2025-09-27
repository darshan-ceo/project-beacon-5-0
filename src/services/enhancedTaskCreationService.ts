/**
 * Enhanced Task Creation Service
 * Unified service for creating tasks from both templates and bundles
 * with consistent metadata and automation features
 */

import { taskCreationService, TaskCreationRequest } from './taskCreationService';
import { storageManager } from '@/data/StorageManager';
import { EnhancedTaskBundleItem, TaskConditions } from '@/types/enhancedTaskBundle';
import { TaskBundleItem } from '@/data/db';
import { TaskTemplate } from '@/types/taskTemplate';
import type { AppAction, Task } from '@/contexts/AppStateContext';
import { GSTStage } from '../../config/appConfig';

interface EnhancedTaskCreationRequest extends TaskCreationRequest {
  category: string;
  conditions?: TaskConditions;
  automationFlags?: {
    auto_assign: boolean;
    notify_assignee: boolean;
    require_completion_proof: boolean;
    suggest_on_trigger: boolean;
    auto_create_on_trigger: boolean;
  };
  templateId?: string;
  dueOffset?: string;
}

interface BundleTaskCreationContext {
  bundleId: string;
  bundleName: string;
  caseId: string;
  clientId: string;
  caseNumber: string;
  stage: GSTStage;
  triggerEvent: string;
}

interface TemplateTaskCreationContext {
  templateId: string;
  templateName: string;
  caseId: string;
  clientId: string;
  caseNumber: string;
  stage: GSTStage;
  triggerEvent: string;
}

class EnhancedTaskCreationService {
  
  /**
   * Create tasks from a task bundle
   */
  async createTasksFromBundle(
    context: BundleTaskCreationContext,
    dispatch?: React.Dispatch<AppAction>
  ): Promise<Task[]> {
    try {
      const repo = storageManager.getTaskBundleRepository();
      const bundle = await repo.getWithItems(context.bundleId);
      
      if (!bundle) {
        throw new Error(`Task bundle not found: ${context.bundleId}`);
      }

      const createdTasks: Task[] = [];
      
      // Process items based on execution mode
      if (bundle.execution_mode === 'Sequential') {
        // Create tasks sequentially with dependencies
        for (const item of bundle.items) {
          const enhancedItem = this.convertToEnhancedItem(item);
          const task = await this.createTaskFromBundleItem(enhancedItem, context, createdTasks);
          if (task) {
            createdTasks.push(task);
          }
        }
      } else {
        // Create all tasks in parallel
        const taskPromises = bundle.items.map(item => {
          const enhancedItem = this.convertToEnhancedItem(item);
          return this.createTaskFromBundleItem(enhancedItem, context, []);
        });
        const tasks = await Promise.all(taskPromises);
        createdTasks.push(...tasks.filter(Boolean) as Task[]);
      }

      // Update bundle usage count
      try {
        await repo.update(context.bundleId, {
          usage_count: (bundle.usage_count || 0) + 1,
          updated_at: new Date()
        });
      } catch (error) {
        console.warn('Failed to update bundle usage count:', error);
      }

      // Add all tasks to state
      if (dispatch) {
        createdTasks.forEach(task => {
          dispatch({ type: 'ADD_TASK', payload: task });
        });
      }

      return createdTasks;
      
    } catch (error) {
      console.error('[EnhancedTaskCreation] Failed to create tasks from bundle:', error);
      throw error;
    }
  }

  /**
   * Create a single task from a bundle item
   */
  private async createTaskFromBundleItem(
    item: EnhancedTaskBundleItem,
    context: BundleTaskCreationContext,
    existingTasks: Task[]
  ): Promise<Task | null> {
    try {
      // Check conditions if present
      if (item.conditions && !this.evaluateConditions(item.conditions, context)) {
        console.log(`[EnhancedTaskCreation] Skipping task ${item.title} - conditions not met`);
        return null;
      }

      const request: EnhancedTaskCreationRequest = {
        title: item.title,
        description: item.description || '',
        caseId: context.caseId,
        clientId: context.clientId,
        caseNumber: context.caseNumber,
        stage: context.stage,
        priority: item.priority,
        assignedToId: this.resolveAssigneeId(item.assigned_role || 'Associate'),
        assignedToName: item.assigned_role || 'Associate',
        estimatedHours: item.estimated_hours || 8,
        source: 'bundle',
        sourceId: context.bundleId,
        sourceName: context.bundleName,
        category: item.category || 'General',
        conditions: item.conditions,
        automationFlags: item.automation_flags,
        templateId: item.template_id,
        dueOffset: item.due_offset
      };

      const result = await taskCreationService.createTask(request);
      return result.task;
      
    } catch (error) {
      console.error(`[EnhancedTaskCreation] Failed to create task from item ${item.title}:`, error);
      return null;
    }
  }

  /**
   * Create task from template
   */
  async createTaskFromTemplate(
    template: TaskTemplate,
    context: TemplateTaskCreationContext,
    dispatch?: React.Dispatch<AppAction>
  ): Promise<Task | null> {
    try {
      // Check conditions if present
      if (template.conditions && !this.evaluateTemplateConditions(template.conditions, context)) {
        console.log(`[EnhancedTaskCreation] Skipping template ${template.title} - conditions not met`);
        return null;
      }

      const request: EnhancedTaskCreationRequest = {
        title: template.title,
        description: template.description,
        caseId: context.caseId,
        clientId: context.clientId,
        caseNumber: context.caseNumber,
        stage: context.stage,
        priority: template.priority,
        assignedToId: this.resolveAssigneeId(template.assignedRole),
        assignedToName: template.assignedRole,
        estimatedHours: template.estimatedHours,
        source: 'template',
        sourceId: template.id,
        sourceName: template.title,
        category: template.category,
        conditions: template.conditions,
        automationFlags: {
          auto_assign: true,
          notify_assignee: template.suggestOnStageChange,
          require_completion_proof: false,
          suggest_on_trigger: template.suggestOnStageChange,
          auto_create_on_trigger: template.autoCreateOnStageChange
        }
      };

      const result = await taskCreationService.createTask(request, dispatch);
      return result.task;
      
    } catch (error) {
      console.error(`[EnhancedTaskCreation] Failed to create task from template ${template.title}:`, error);
      return null;
    }
  }

  /**
   * Evaluate bundle item conditions
   */
  private evaluateConditions(conditions: TaskConditions, context: BundleTaskCreationContext): boolean {
    // For now, return true - implement condition evaluation logic as needed
    // This could check case value, notice types, client tier, etc.
    return true;
  }

  /**
   * Evaluate template conditions
   */
  private evaluateTemplateConditions(conditions: any, context: TemplateTaskCreationContext): boolean {
    // For now, return true - implement condition evaluation logic as needed
    return true;
  }

  /**
   * Resolve assignee ID from role name
   */
  private resolveAssigneeId(role: string): string {
    // This should integrate with the employee/user management system
    // For now, return a system-generated ID
    return `role-${role.toLowerCase().replace(/\s+/g, '-')}`;
  }

  /**
   * Calculate due date from offset
   */
  private calculateDueDateFromOffset(offset: string, baseDate: Date = new Date()): string {
    const match = offset.match(/^([+-]?)(\d+)([dwm])$/);
    if (!match) {
      console.warn(`Invalid due offset format: ${offset}`);
      return new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const [, sign, amount, unit] = match;
    const days = parseInt(amount);
    const multiplier = sign === '-' ? -1 : 1;

    let daysToAdd = days * multiplier;
    if (unit === 'w') daysToAdd *= 7;
    if (unit === 'm') daysToAdd *= 30;

    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    
    return dueDate.toISOString().split('T')[0];
  }

  /**
   * Convert TaskBundleItem to EnhancedTaskBundleItem for compatibility
   */
  private convertToEnhancedItem(item: TaskBundleItem): EnhancedTaskBundleItem {
    return {
      ...item,
      priority: item.priority as 'Critical' | 'High' | 'Medium' | 'Low',
      assigned_role: item.assigned_role || 'Associate',
      category: item.category || 'General',
      automation_flags: item.automation_flags || {
        auto_assign: true,
        notify_assignee: true,
        require_completion_proof: false,
        suggest_on_trigger: false,
        auto_create_on_trigger: false
      }
    };
  }

  /**
   * Get creation analytics
   */
  getCreationAnalytics(): {
    totalCreated: number;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
    automationRate: number;
  } {
    // This would typically pull from audit logs or analytics service
    return {
      totalCreated: 0,
      bySource: {},
      byCategory: {},
      automationRate: 0
    };
  }
}

export const enhancedTaskCreationService = new EnhancedTaskCreationService();