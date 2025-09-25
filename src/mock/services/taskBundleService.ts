/**
 * Task Bundle Service - DEMO mode implementation with write-through pattern
 */

import { unifiedStore } from '@/persistence/unifiedStore';
import type { Task } from '@/contexts/AppStateContext';
import type { TaskBundle, TaskTemplate } from '@/persistence/unifiedStore';
import type { 
  TaskBundleService, 
  CreateTaskBundleData, 
  UpdateTaskBundleData, 
  ApiResponse 
} from '@/mock/apiContracts';
import { demoConfig } from '@/config/demoConfig';
import { taskService } from './taskService';

class TaskBundleServiceImpl implements TaskBundleService {
  async create(data: CreateTaskBundleData): Promise<ApiResponse<TaskBundle>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();
      
      // Generate task template IDs
      const tasksWithIds: TaskTemplate[] = data.tasks.map(task => ({
        ...task,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));

      const newBundle: TaskBundle = {
        id: `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        tasks: tasksWithIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await unifiedStore.taskBundles.create(newBundle);

      return {
        success: true,
        data: newBundle,
        message: 'Task bundle created successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Create Task Bundle');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async update(id: string, data: UpdateTaskBundleData): Promise<ApiResponse<TaskBundle>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const updates: any = data;
      updates.updatedAt = new Date().toISOString();

      // Handle task updates with proper typing
      if (data.tasks) {
        const tasksWithIds: TaskTemplate[] = data.tasks.map(task => ({
          ...task,
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }));
        updates.tasks = tasksWithIds;
      }

      const updatedBundle = await unifiedStore.taskBundles.update(id, updates);

      return {
        success: true,
        data: updatedBundle,
        message: 'Task bundle updated successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Update Task Bundle');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      await unifiedStore.taskBundles.delete(id);

      return {
        success: true,
        message: 'Task bundle deleted successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Delete Task Bundle');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getById(id: string): Promise<ApiResponse<TaskBundle>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const bundle = await unifiedStore.taskBundles.getById(id);
      if (!bundle) {
        return {
          success: false,
          error: 'Task bundle not found'
        };
      }

      return {
        success: true,
        data: bundle
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Task Bundle');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getAll(): Promise<ApiResponse<TaskBundle[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const bundles = await unifiedStore.taskBundles.getAll();

      return {
        success: true,
        data: bundles
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get All Task Bundles');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getByStage(stageKey: string): Promise<ApiResponse<TaskBundle[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const bundles = await unifiedStore.taskBundles.query((bundle) => 
        bundle.stageKey === stageKey || bundle.stageKey === 'Any Stage'
      );

      return {
        success: true,
        data: bundles
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Task Bundles by Stage');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async execute(bundleId: string, caseId: string, stageKey: string): Promise<ApiResponse<Task[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      // Check if bundle already executed for this case and stage
      const footprintExists = await unifiedStore.stageFootprints.exists(caseId, bundleId, stageKey);
      if (footprintExists) {
        return {
          success: false,
          error: 'Bundle already executed for this case and stage'
        };
      }

      // Get bundle
      const bundle = await unifiedStore.taskBundles.getById(bundleId);
      if (!bundle) {
        return {
          success: false,
          error: 'Task bundle not found'
        };
      }

      if (!bundle.isActive) {
        return {
          success: false,
          error: 'Task bundle is not active'
        };
      }

      // Get case data for context
      const caseData = await unifiedStore.cases.getById(caseId);
      if (!caseData) {
        return {
          success: false,
          error: 'Case not found'
        };
      }

      // Create tasks from templates
      const tasksToCreate = bundle.tasks.map(template => ({
        title: template.title,
        description: template.description,
        caseId,
        stage: stageKey,
        priority: template.priority,
        assignedToId: this.resolveAssignee(template, caseData),
        assignedToName: this.resolveAssigneeName(template, caseData),
        assignedById: 'system',
        assignedByName: 'Task Automation',
        dueDate: this.calculateDueDate(template.estimatedHours),
        estimatedHours: template.estimatedHours,
        isAutoGenerated: true,
        bundleId
      }));

      // Create tasks using task service
      const createResult = await taskService.bulkCreate(tasksToCreate);
      if (!createResult.success || !createResult.data) {
        throw new Error('Failed to create tasks from bundle');
      }

      // Create stage footprint to prevent duplicate execution
      await unifiedStore.stageFootprints.create({
        id: `footprint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        caseId,
        bundleId,
        stageKey,
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        data: createResult.data,
        message: `Created ${createResult.data.length} tasks from bundle`
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Execute Task Bundle');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private resolveAssignee(template: TaskTemplate, caseData: any): string {
    switch (template.assigneeRule) {
      case 'case_owner':
        return caseData.assignedToId;
      case 'specific':
        return template.specificAssigneeId || caseData.assignedToId;
      case 'stage_owner':
      case 'auto':
      default:
        return caseData.assignedToId;
    }
  }

  private resolveAssigneeName(template: TaskTemplate, caseData: any): string {
    switch (template.assigneeRule) {
      case 'case_owner':
        return caseData.assignedToName;
      case 'specific':
        // In a real implementation, we'd look up the employee name
        return template.specificAssigneeId ? 'Specific Assignee' : caseData.assignedToName;
      case 'stage_owner':
      case 'auto':
      default:
        return caseData.assignedToName;
    }
  }

  private calculateDueDate(estimatedHours: number): string {
    const now = new Date();
    const daysToAdd = Math.ceil(estimatedHours / 8); // Assuming 8 hours per day
    now.setDate(now.getDate() + daysToAdd);
    return now.toISOString().split('T')[0];
  }
}

export const taskBundleService = new TaskBundleServiceImpl();