/**
 * Stage Transition Service
 * Handles task automation on stage changes with idempotent creation
 */

import { TaskTemplate, TaskCreationFootprint, StageTransitionSuggestion, StageTransitionResult } from '@/types/taskTemplate';
import { GSTStage, GSTNoticeType, ClientTier } from '../../config/appConfig';
import { taskTemplatesService } from './taskTemplatesService';
import { tasksService, CreateTaskData } from './tasksService';
import { idbStorage } from '@/utils/idb';
import { toast } from 'sonner';

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

class StageTransitionService {
  private readonly FOOTPRINTS_KEY = 'task-creation-footprints';

  async processStageTransition(
    caseData: CaseData,
    oldStage: string,
    newStage: GSTStage
  ): Promise<StageTransitionResult> {
    console.log(`[StageTransition] Processing ${caseData.caseNumber}: ${oldStage} → ${newStage}`);
    
    try {
      const applicableTemplates = await taskTemplatesService.getByStageScope(newStage);
      const suggestedTasks: StageTransitionSuggestion[] = [];
      const autoCreateTasks: TaskTemplate[] = [];
      
      for (const template of applicableTemplates) {
        const matches = this.evaluateTemplateConditions(template, caseData);
        
        if (matches.stageScope && matches.conditions) {
          if (template.suggestOnStageChange) {
            suggestedTasks.push({
              template,
              matches,
              reason: this.buildMatchReason(template, newStage, matches)
            });
          }
          
          if (template.autoCreateOnStageChange) {
            autoCreateTasks.push(template);
          }
        }
      }
      
      const createdTasks = await this.createTasksIdempotently(caseData, newStage, autoCreateTasks);
      
      return {
        suggestedTasks,
        createdTasks,
        skippedTasks: []
      };
    } catch (error) {
      console.error('[StageTransition] Failed to process stage transition:', error);
      throw error;
    }
  }

  private async createTasksIdempotently(
    caseData: CaseData,
    stage: GSTStage,
    templates: TaskTemplate[]
  ): Promise<TaskCreationFootprint[]> {
    const footprints = await this.getFootprints();
    const createdTasks: TaskCreationFootprint[] = [];

    for (const template of templates) {
      const existingFootprint = footprints.find(f => 
        f.caseId === caseData.id && 
        f.templateId === template.id && 
        f.stage === stage
      );

      if (existingFootprint) {
        console.log(`[StageTransition] Skipping duplicate task creation: ${template.title}`);
        continue;
      }

      try {
        const task = await tasksService.create({
          title: template.title,
          description: `${template.description}\n\n[Auto-created on stage change to ${stage}]`,
          caseId: caseData.id,
          clientId: caseData.clientId,
          caseNumber: caseData.caseNumber,
          stage: stage,
          priority: template.priority,
          status: 'Not Started',
          assignedToId: caseData.assignedToId,
          assignedToName: caseData.assignedToName,
          assignedById: 'system',
          assignedByName: 'Stage Automation',
          dueDate: this.calculateDueDate(template.estimatedHours),
          estimatedHours: template.estimatedHours
        } as CreateTaskData);

        const footprint: TaskCreationFootprint = {
          caseId: caseData.id,
          templateId: template.id,
          stage: stage,
          createdAt: new Date().toISOString(),
          taskId: task.id
        };

        footprints.push(footprint);
        createdTasks.push(footprint);
        
        await taskTemplatesService.incrementUsage(template.id);

      } catch (error) {
        console.error(`[StageTransition] Failed to create task ${template.title}:`, error);
      }
    }

    await this.saveFootprints(footprints);

    if (createdTasks.length > 0) {
      toast.success(`Created ${createdTasks.length} automated task(s) for stage transition`);
    }

    return createdTasks;
  }

  private evaluateTemplateConditions(template: TaskTemplate, caseData: CaseData): {
    stageScope: boolean;
    conditions: boolean;
  } {
    const stageScope = template.stageScope.includes('Any Stage') || 
                      template.stageScope.includes(caseData.currentStage as GSTStage);

    let conditions = true;
    if (template.conditions) {
      if (template.conditions.noticeType && caseData.noticeType) {
        conditions = conditions && template.conditions.noticeType.includes(caseData.noticeType);
      }
      
      if (template.conditions.clientTier && caseData.clientTier) {
        conditions = conditions && template.conditions.clientTier.includes(caseData.clientTier);
      }
    }

    return { stageScope, conditions };
  }

  private buildMatchReason(template: TaskTemplate, stage: GSTStage, matches: any): string {
    const reasons = [];
    
    if (template.stageScope.includes(stage)) {
      reasons.push(`Required for ${stage} stage`);
    } else if (template.stageScope.includes('Any Stage')) {
      reasons.push('Applicable to any stage');
    }
    
    return reasons.join('; ');
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

  private async getFootprints(): Promise<TaskCreationFootprint[]> {
    try {
      const footprints = await idbStorage.get(this.FOOTPRINTS_KEY);
      return Array.isArray(footprints) ? footprints : [];
    } catch (error) {
      console.error('Failed to load task footprints:', error);
      return [];
    }
  }

  private async saveFootprints(footprints: TaskCreationFootprint[]): Promise<void> {
    try {
      await idbStorage.set(this.FOOTPRINTS_KEY, footprints);
    } catch (error) {
      console.error('Failed to save task footprints:', error);
    }
  }
}

export const stageTransitionService = new StageTransitionService();