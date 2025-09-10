/**
 * Task Template Types for Stage-Based Automation
 * Enhanced with GST stage scope and automation triggers
 */

import { GSTStage, GSTNoticeType, ClientTier } from '../../config/appConfig';

export interface TaskTemplateConditions {
  noticeType?: GSTNoticeType[];
  clientTier?: ClientTier[];
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  assignedRole: string;
  category: string;
  
  // Phase 2 enhancements - backward compatible
  stageScope: GSTStage[];
  suggestOnStageChange: boolean;
  autoCreateOnStageChange: boolean;
  conditions?: TaskTemplateConditions;
  
  // Existing fields maintained for compatibility
  dependencies?: string[];
  isActive: boolean;
  usageCount: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}

export interface TaskCreationFootprint {
  caseId: string;
  templateId: string;
  stage: string;
  createdAt: string;
  taskId: string;
}

export interface StageTransitionSuggestion {
  template: TaskTemplate;
  matches: {
    stageScope: boolean;
    conditions: boolean;
  };
  reason: string;
}

export interface StageTransitionResult {
  suggestedTasks: StageTransitionSuggestion[];
  createdTasks: TaskCreationFootprint[];
  skippedTasks: Array<{
    template: TaskTemplate;
    reason: string;
  }>;
}

// Default template for new creations
export const createDefaultTaskTemplate = (overrides: Partial<TaskTemplate> = {}): TaskTemplate => ({
  id: `template-${Date.now()}`,
  title: '',
  description: '',
  estimatedHours: 8,
  priority: 'Medium',
  assignedRole: 'Associate',
  category: 'General',
  stageScope: ['Any Stage'],
  suggestOnStageChange: false,
  autoCreateOnStageChange: false,
  isActive: true,
  usageCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'current-user',
  version: 1,
  ...overrides
});

// Template validation
export const validateTaskTemplate = (template: Partial<TaskTemplate>): string[] => {
  const errors: string[] = [];
  
  if (!template.title?.trim()) {
    errors.push('Title is required');
  }
  
  if (!template.description?.trim()) {
    errors.push('Description is required');
  }
  
  if (!template.estimatedHours || template.estimatedHours <= 0) {
    errors.push('Estimated hours must be greater than 0');
  }
  
  if (!template.assignedRole?.trim()) {
    errors.push('Assigned role is required');
  }
  
  if (!template.stageScope?.length) {
    errors.push('At least one stage scope is required');
  }
  
  return errors;
};
