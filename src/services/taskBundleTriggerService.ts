/**
 * Task Bundle Trigger Service
 * Handles automated task creation from task bundles on various triggers
 */

import { TaskBundleRepository, TaskBundleWithItems } from '@/data/repositories/TaskBundleRepository';
import { StorageManager } from '@/data/StorageManager';
import { tasksService, CreateTaskData } from './tasksService';
import { persistenceService } from './persistenceService';
import { GSTStage, GSTNoticeType, ClientTier } from '../../config/appConfig';
import { toast } from 'sonner';
import type { AppAction } from '@/contexts/AppStateContext';

interface CaseData {
  id: string;
  caseNumber: string;
  clientId: string;
  assignedToId: string;
  assignedToName: string;
  currentStage: string;
  noticeType?: GSTNoticeType;
  clientTier?: ClientTier;
}

interface BundleCreationFootprint {
  caseId: string;
  bundleId: string;
  stage: string;
  trigger: string;
  createdAt: string;
  taskIds: string[];
}

interface BundleAutomationResult {
  createdTasks: BundleCreationFootprint[];
  skippedBundles: string[];
  totalTasksCreated: number;
}

class TaskBundleTriggerService {
  private repository: TaskBundleRepository | null = null;
  private readonly FOOTPRINTS_KEY = 'bundle-creation-footprints';

  private async getRepository(): Promise<TaskBundleRepository> {
    if (!this.repository) {
      await StorageManager.getInstance().initialize();
      this.repository = StorageManager.getInstance().getTaskBundleRepository();
      if (!this.repository) {
        throw new Error('TaskBundleRepository not available');
      }
    }
    return this.repository;
  }

  async triggerTaskBundles(
    caseData: CaseData,
    trigger: string,
    stage: GSTStage,
    dispatch?: React.Dispatch<AppAction>
  ): Promise<BundleAutomationResult> {
    console.log(`[BundleTrigger] Processing bundles for trigger: ${trigger}, stage: ${stage}`);
    
    try {
      const repository = await this.getRepository();
      const applicableBundles = await repository.getBundlesByTrigger(trigger, stage);
      
      console.log(`[BundleTrigger] Found ${applicableBundles.length} applicable bundle(s):`, {
        trigger,
        stage,
        bundles: applicableBundles.map(b => ({
          id: b.id,
          name: b.name,
          trigger: b.trigger,
          stage_code: b.stage_code,
          is_active: b.is_active,
          itemCount: b.items?.length || 0
        }))
      });
      
      const createdTasks: BundleCreationFootprint[] = [];
      const skippedBundles: string[] = [];
      let totalTasksCreated = 0;

      for (const bundle of applicableBundles) {
        const bundleResult = await this.processBundleIdempotently(
          caseData, 
          bundle, 
          stage, 
          trigger, 
          dispatch
        );
        
        if (bundleResult) {
          createdTasks.push(bundleResult);
          totalTasksCreated += bundleResult.taskIds.length;
        } else {
          skippedBundles.push(bundle.id);
        }
      }

      if (totalTasksCreated > 0) {
        toast.success(`Created ${totalTasksCreated} task(s) from ${createdTasks.length} bundle(s)`);
      }

      return {
        createdTasks,
        skippedBundles,
        totalTasksCreated
      };
    } catch (error) {
      console.error('[BundleTrigger] Failed to process task bundles:', error);
      throw error;
    }
  }

  private async processBundleIdempotently(
    caseData: CaseData,
    bundle: TaskBundleWithItems,
    stage: GSTStage,
    trigger: string,
    dispatch?: React.Dispatch<AppAction>
  ): Promise<BundleCreationFootprint | null> {
    const footprints = await this.getFootprints();
    
    // Check if this bundle was already processed for this case/stage/trigger
    const existingFootprint = footprints.find(f => 
      f.caseId === caseData.id && 
      f.bundleId === bundle.id && 
      f.stage === stage &&
      f.trigger === trigger
    );

    if (existingFootprint) {
      console.log(`[BundleTrigger] Skipping duplicate bundle: ${bundle.name}`);
      return null;
    }

    // Evaluate bundle conditions
    if (!this.evaluateBundleConditions(bundle, caseData)) {
      console.log(`[BundleTrigger] Bundle conditions not met: ${bundle.name}`);
      return null;
    }

    const createdTaskIds: string[] = [];

    // Create tasks from bundle items
    for (const item of bundle.items) {
      try {
        // Use tasksService with new API (no userId parameter)
        const task = await tasksService.create({
          title: item.title,
          description: `${item.description || ''}\n\n[Auto-created from bundle: ${bundle.name}]`,
          caseId: caseData.id,
          clientId: caseData.clientId,
          caseNumber: caseData.caseNumber,
          stage: stage,
          priority: item.priority as any,
          status: 'Not Started',
          assignedToId: caseData.assignedToId,
          assignedToName: caseData.assignedToName,
          dueDate: this.calculateDueDate(item.estimated_hours || 8),
          estimatedHours: item.estimated_hours || 8
        }, dispatch);

        // Persist to IndexedDB and update app state
        const finalTask = { ...task, isAutoGenerated: true, bundleId: bundle.id };
        try {
          await persistenceService.create('tasks', finalTask);
        } catch (e) {
          console.warn('[BundleTrigger] Failed to persist task to IndexedDB, continuing', e);
        }
        
        if (dispatch) {
          dispatch({ type: 'ADD_TASK', payload: finalTask as any });
        }

        createdTaskIds.push(task.id);
        
      } catch (error) {
        console.error(`[BundleTrigger] Failed to create task ${item.title}:`, error);
      }
    }

    if (createdTaskIds.length > 0) {
      const footprint: BundleCreationFootprint = {
        caseId: caseData.id,
        bundleId: bundle.id,
        stage: stage,
        trigger: trigger,
        createdAt: new Date().toISOString(),
        taskIds: createdTaskIds
      };

      footprints.push(footprint);
      await this.saveFootprints(footprints);

      return footprint;
    }

    return null;
  }

  private evaluateBundleConditions(bundle: TaskBundleWithItems, caseData: CaseData): boolean {
    // Normalize both stage codes for comparison
    const normalizeStage = (stage: string | undefined) => 
      stage?.trim().toLowerCase().replace(/\s+/g, '-') || '';
    
    const bundleStage = normalizeStage(bundle.stage_code);
    const caseStage = normalizeStage(caseData.currentStage);
    
    console.log(`[BundleTrigger] Evaluating conditions for "${bundle.name}":`, {
      bundleStage,
      caseStage,
      bundleStageRaw: bundle.stage_code,
      caseStageRaw: caseData.currentStage
    });
    
    // If bundle has stage_code specified, check if it matches
    if (bundle.stage_code && 
        bundle.stage_code !== 'Any Stage' && 
        bundleStage !== caseStage &&
        bundle.stage_code !== caseData.currentStage) {
      console.log(`[BundleTrigger] Stage mismatch - bundle: ${bundleStage}, case: ${caseStage}`);
      return false;
    }

    // Add more condition evaluation logic here as needed
    // For example: client tier, notice type, etc.
    
    return true;
  }

  private calculateDueDate(estimatedHours: number): string {
    const workDaysToAdd = Math.ceil(estimatedHours / 8);
    const dueDate = new Date();
    
    let addedDays = 0;
    while (addedDays < workDaysToAdd) {
      dueDate.setDate(dueDate.getDate() + 1);
      if (dueDate.getDay() !== 0 && dueDate.getDay() !== 6) {
        addedDays++;
      }
    }
    
    return dueDate.toISOString().split('T')[0];
  }

  private async getFootprints(): Promise<BundleCreationFootprint[]> {
    try {
      const footprints = await idbStorage.get(this.FOOTPRINTS_KEY);
      return Array.isArray(footprints) ? footprints : [];
    } catch (error) {
      console.error('Failed to load bundle footprints:', error);
      return [];
    }
  }

  private async saveFootprints(footprints: BundleCreationFootprint[]): Promise<void> {
    try {
      await idbStorage.set(this.FOOTPRINTS_KEY, footprints);
    } catch (error) {
      console.error('Failed to save bundle footprints:', error);
    }
  }

  // Get automation history for analytics
  async getAutomationHistory(caseId?: string): Promise<BundleCreationFootprint[]> {
    const footprints = await this.getFootprints();
    return caseId ? footprints.filter(f => f.caseId === caseId) : footprints;
  }

  // Clear automation history (for testing/cleanup)
  async clearAutomationHistory(): Promise<void> {
    await idbStorage.delete(this.FOOTPRINTS_KEY);
  }
}

export const taskBundleTriggerService = new TaskBundleTriggerService();