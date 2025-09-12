/**
 * Task Bundle Service for Stage-Based Task Automation
 * Handles automatic task creation on stage transitions
 */

import { Task } from '@/contexts/AppStateContext';
import { StageInstance, TransitionType } from '@/types/lifecycle';
import { featureFlagService } from '@/services/featureFlagService';
import { generateStageDefaults } from '@/utils/stageUtils';
import { tasksService } from '@/services/tasksService';

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

  constructor() {
    this.initializeDefaultBundles();
  }

  /**
   * Initialize default task bundles for all stages
   */
  private initializeDefaultBundles() {
    const stages = ['Scrutiny', 'Demand', 'Adjudication', 'Appeals', 'GSTAT', 'HC', 'SC'];
    
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
      if (stage !== 'Scrutiny') { // Scrutiny can't be remanded from
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
      stageKey: 'Scrutiny',
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
    }
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
            assignedById: 'system',
            assignedByName: 'Task Automation',
            dueDate: this.calculateDueDate(template.estimatedHours),
            estimatedHours: template.estimatedHours
          });

          createdTasks.push(task);
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
  async archivePreviousCycleTasks(caseId: string, stageKey: string, currentCycle: number): Promise<void> {
    try {
      const allTasks = await tasksService.getByCase(caseId);
      const previousCycleTasks = allTasks.filter(
        task => 
          task.stage === stageKey && 
          task.title.includes(`(C${currentCycle - 1})`)
      );

      // Mark previous cycle tasks as archived/read-only
      for (const task of previousCycleTasks) {
        await tasksService.update({
          id: task.id,
          title: `[ARCHIVED] ${task.title}`,
          status: task.status === 'Completed' ? 'Completed' : 'Overdue'
        });
      }
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
   * Get all available task bundles
   */
  getAllBundles(): TaskBundle[] {
    return [...this.bundles];
  }

  /**
   * Update task bundle configuration
   */
  updateBundle(bundleId: string, updates: Partial<TaskBundle>): boolean {
    const index = this.bundles.findIndex(b => b.id === bundleId);
    if (index === -1) return false;

    this.bundles[index] = { ...this.bundles[index], ...updates };
    return true;
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