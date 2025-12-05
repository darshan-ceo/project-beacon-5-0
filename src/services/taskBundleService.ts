/**
 * Task Bundle Service for Stage-Based Task Automation
 * Handles automatic task creation on stage transitions
 */

import { Task } from '@/contexts/AppStateContext';
import { StageInstance, TransitionType } from '@/types/lifecycle';
import { featureFlagService } from '@/services/featureFlagService';
import { generateStageDefaults, CASE_STAGES } from '@/utils/stageUtils';
import { tasksService } from '@/services/tasksService';
import type { AppAction } from '@/contexts/AppStateContext';
import { persistenceService } from '@/services/persistenceService';
import { storageManager } from '@/data/StorageManager';

export type TaskTrigger = 'OnStageEnter' | 'OnHearingScheduled' | 'OnHearingCompleted' | 'OnRemand' | 'OnSendBack';

export interface TaskBundle {
  id: string;
  name: string;
  trigger: TaskTrigger;
  stageKey: string;
  tasks: TaskTemplate[];
  isActive: boolean;
}

export interface TaskTemplate {
  title: string;
  description: string;
  priority: Task['priority'];
  estimatedHours: number;
  isMandatory: boolean;
  dependencies?: string[]; // Other task titles this depends on
}

class TaskBundleService {
  private bundles: TaskBundle[] = [];
  private customBundles: TaskBundle[] = [];
  private initializationPromise: Promise<void>;
  private isInitialized = false;

  constructor() {
    this.initializeDefaultBundles();
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize the service with proper async setup
   */
  private async initialize(): Promise<void> {
    try {
      await this.ensureDatabaseSchema();
      await this.loadCustomBundles();
      this.isInitialized = true;
      console.log('TaskBundleService initialized with', this.customBundles.length, 'custom bundles');
    } catch (error) {
      console.error('TaskBundleService initialization failed:', error);
      this.isInitialized = true; // Set to true to prevent hanging
    }
  }

  /**
   * Ensure database schema exists before any operations
   */
  private async ensureDatabaseSchema(): Promise<void> {
    try {
      const { openDB } = await import('idb');
      await openDB('AppData', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('taskBundles')) {
            console.log('Creating taskBundles object store');
            db.createObjectStore('taskBundles', { keyPath: 'id' });
          }
        }
      });
    } catch (error) {
      console.error('Failed to ensure database schema:', error);
      throw error;
    }
  }

  /**
   * Load custom bundles from IndexedDB
   */
  private async loadCustomBundles(): Promise<void> {
    try {
      const { openDB } = await import('idb');
      const db = await openDB('AppData', 1);
      const customBundles = await db.getAll('taskBundles') || [];
      this.customBundles = customBundles;
      console.log('Loaded', customBundles.length, 'custom bundles from database');
    } catch (error) {
      console.error('Failed to load custom bundles:', error);
      this.customBundles = []; // Ensure it's always an array
    }
  }

  /**
   * Wait for service to be fully initialized
   */
  async waitForInitialization(): Promise<void> {
    if (this.isInitialized) return;
    await this.initializationPromise;
  }

  /**
   * Initialize default task bundles for all stages
   */
  private initializeDefaultBundles() {
    const stages = CASE_STAGES;
    
    stages.forEach(stage => {
      const stageDefaults = generateStageDefaults(stage);
      
      // OnStageEnter bundle
      this.bundles.push({
        id: `bundle_${stage.toLowerCase()}_enter`,
        name: `${stage} - Entry Tasks`,
        trigger: 'OnStageEnter',
        stageKey: stage,
        tasks: stageDefaults.suggestedTasks.map((task, index) => ({
          title: task,
          description: `Auto-generated task for ${stage} stage`,
          priority: index === 0 ? 'High' : 'Medium',
          estimatedHours: Math.ceil(stageDefaults.estimatedDuration / stageDefaults.suggestedTasks.length),
          isMandatory: index < 2 // First 2 tasks are mandatory
        })),
        isActive: true
      });

      // OnRemand bundle (for handling remands)
      if (stage !== 'Assessment') { // Assessment can't be remanded from
        this.bundles.push({
          id: `bundle_${stage.toLowerCase()}_remand`,
          name: `${stage} - Remand Tasks`,
          trigger: 'OnRemand',
          stageKey: stage,
          tasks: [
            {
              title: 'Review remand order',
              description: 'Analyze the reasons for remand and plan corrective actions',
              priority: 'High',
              estimatedHours: 4,
              isMandatory: true
            },
            {
              title: 'Address remand issues',
              description: 'Take corrective actions based on remand order',
              priority: 'High', 
              estimatedHours: 8,
              isMandatory: true,
              dependencies: ['Review remand order']
            },
            {
              title: 'Prepare revised submission',
              description: 'Prepare documents/submissions addressing remand concerns',
              priority: 'Medium',
              estimatedHours: 6,
              isMandatory: false,
              dependencies: ['Address remand issues']
            }
          ],
          isActive: true
        });
      }
    });

    // Add hearing-specific bundles for stages that require hearings
    const hearingStages = ['Adjudication', 'Appeals', 'HC', 'SC'];
    hearingStages.forEach(stage => {
      this.bundles.push({
        id: `bundle_${stage.toLowerCase()}_hearing`,
        name: `${stage} - Hearing Preparation`,
        trigger: 'OnHearingScheduled',
        stageKey: stage,
        tasks: [
          {
            title: 'Prepare hearing notes',
            description: 'Compile case notes and arguments for hearing',
            priority: 'High',
            estimatedHours: 4,
            isMandatory: true
          },
          {
            title: 'Review case documents',
            description: 'Final review of all case documents before hearing',
            priority: 'High',
            estimatedHours: 2,
            isMandatory: true
          },
          {
            title: 'Coordinate with client',
            description: 'Brief client on hearing process and expectations',
            priority: 'Medium',
            estimatedHours: 1,
            isMandatory: false
          }
        ],
        isActive: true
      });
    });

    // Add ASMT-10 specific task bundle
    this.bundles.push({
      id: 'bundle_asmt10_notice_intake',
      name: 'ASMT-10 Notice Intake Tasks',
      trigger: 'OnStageEnter',
      stageKey: 'Assessment',
      tasks: [
        {
          title: 'Acknowledge Receipt of ASMT-10',
          description: 'File acknowledgment of assessment notice receipt with the department',
          priority: 'High',
          estimatedHours: 2,
          isMandatory: true
        },
        {
          title: 'Reconciliation Analysis',
          description: 'Analyze assessment against books and identify discrepancies',
          priority: 'High',
          estimatedHours: 8,
          isMandatory: true,
          dependencies: ['Acknowledge Receipt of ASMT-10']
        },
        {
          title: 'Draft ASMT-11 Reply',
          description: 'Prepare response to assessment order addressing identified issues',
          priority: 'Medium',
          estimatedHours: 12,
          isMandatory: false,
          dependencies: ['Reconciliation Analysis']
        }
      ],
      isActive: true
    });
  }

  /**
   * Trigger task bundle creation based on stage transition
   */
  async triggerTaskBundle(
    trigger: TaskTrigger,
    stageInstance: StageInstance,
    caseData: {
      id: string;
      caseNumber: string;
      clientId: string;
      assignedToId: string;
      assignedToName: string;
    },
    dispatch?: React.Dispatch<AppAction>
  ): Promise<Task[]> {
    // Check if task automation is enabled
    if (!featureFlagService.isEnabled('stage_task_automation_v1')) {
      return [];
    }

    const applicableBundles = this.bundles.filter(
      bundle => 
        bundle.trigger === trigger && 
        bundle.stageKey === stageInstance.stageKey &&
        bundle.isActive
    );

    const createdTasks: Task[] = [];

    for (const bundle of applicableBundles) {
      for (const template of bundle.tasks) {
        try {
          // Use tasksService with new API (no userId parameter)
          const task = await tasksService.create({
            title: `${template.title} (C${stageInstance.cycleNo})`,
            description: template.description,
            caseId: caseData.id,
            clientId: caseData.clientId,
            caseNumber: caseData.caseNumber,
            stage: stageInstance.stageKey,
            priority: template.priority,
            status: 'Not Started',
            assignedToId: caseData.assignedToId,
            assignedToName: caseData.assignedToName,
            dueDate: this.calculateDueDate(template.estimatedHours),
            estimatedHours: template.estimatedHours
          }, dispatch);

          const finalTask = { ...task, isAutoGenerated: true, bundleId: bundle.id } as Task;
          try {
            const storage = storageManager.getStorage();
            await storage.create('tasks', finalTask);
          } catch (e) {
            console.warn('[TaskBundleService] Failed to persist task to unified storage, continuing', e);
          }
          if (dispatch) {
            (dispatch as React.Dispatch<AppAction>)({ type: 'ADD_TASK', payload: finalTask });
          }

          createdTasks.push(finalTask);
        } catch (error) {
          console.error('Failed to create automated task:', error);
        }
      }
    }

    return createdTasks;
  }

  /**
   * Make previous cycle tasks read-only
   */
  async archivePreviousCycleTasks(caseId: string, stageKey: string, currentCycle: number, dispatch?: any): Promise<void> {
    try {
      // Query tasks from Redux state (assuming dispatch provides access to state)
      // Since we don't have direct access to state here, skip archiving for now
      // This can be implemented when we refactor to use proper state access
      console.log('[TaskBundleService] Archiving previous cycle tasks skipped - requires state access');
    } catch (error) {
      console.error('Failed to archive previous cycle tasks:', error);
    }
  }

  /**
   * Get task bundles for a specific trigger and stage
   */
  getBundlesForTrigger(trigger: TaskTrigger, stageKey: string): TaskBundle[] {
    return this.bundles.filter(
      bundle => bundle.trigger === trigger && bundle.stageKey === stageKey
    );
  }

  /**
   * Get all available task bundles (default + custom)
   */
  async getAllBundles(): Promise<TaskBundle[]> {
    await this.waitForInitialization();
    const allBundles = [...this.bundles, ...this.customBundles];
    console.log('getAllBundles returning', allBundles.length, 'bundles');
    return allBundles;
  }

  /**
   * Create a new custom task bundle
   */
  async createBundle(bundle: Omit<TaskBundle, 'id'>): Promise<TaskBundle> {
    await this.waitForInitialization();
    
    try {
      const newBundle: TaskBundle = {
        ...bundle,
        id: `custom_bundle_${Date.now()}`
      };

      console.log('Creating new bundle:', newBundle.name);
      
      const { openDB } = await import('idb');
      const db = await openDB('AppData', 1);
      await db.put('taskBundles', newBundle);
      
      this.customBundles.push(newBundle);
      console.log('Bundle saved successfully. Total custom bundles:', this.customBundles.length);
      
      return newBundle;
    } catch (error) {
      console.error('Failed to create bundle:', error);
      throw new Error('Failed to save task bundle');
    }
  }

  /**
   * Update task bundle configuration
   */
  async updateBundle(bundleId: string, updates: Partial<TaskBundle>): Promise<boolean> {
    await this.waitForInitialization();
    
    // Check default bundles first
    const defaultIndex = this.bundles.findIndex(b => b.id === bundleId);
    if (defaultIndex !== -1) {
      this.bundles[defaultIndex] = { ...this.bundles[defaultIndex], ...updates };
      console.log('Updated default bundle:', bundleId);
      return true;
    }

    // Check custom bundles
    const customIndex = this.customBundles.findIndex(b => b.id === bundleId);
    if (customIndex === -1) {
      console.log('Bundle not found for update:', bundleId);
      return false;
    }

    try {
      const updatedBundle = { ...this.customBundles[customIndex], ...updates };
      
      const { openDB } = await import('idb');
      const db = await openDB('AppData', 1);
      await db.put('taskBundles', updatedBundle);
      
      this.customBundles[customIndex] = updatedBundle;
      console.log('Updated custom bundle:', bundleId);
      return true;
    } catch (error) {
      console.error('Failed to update bundle:', error);
      return false;
    }
  }

  /**
   * Delete a custom task bundle
   */
  async deleteBundle(bundleId: string): Promise<boolean> {
    const customIndex = this.customBundles.findIndex(b => b.id === bundleId);
    if (customIndex === -1) return false;

    try {
      const { openDB } = await import('idb');
      const db = await openDB('AppData', 1);
      await db.delete('taskBundles', bundleId);
      
      this.customBundles.splice(customIndex, 1);
      return true;
    } catch (error) {
      console.error('Failed to delete bundle:', error);
      return false;
    }
  }

  /**
   * Calculate due date based on estimated hours
   */
  private calculateDueDate(estimatedHours: number): string {
    const daysToAdd = Math.ceil(estimatedHours / 8); // Assuming 8 hours per work day
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    return dueDate.toISOString().split('T')[0];
  }
}

export const taskBundleService = new TaskBundleService();