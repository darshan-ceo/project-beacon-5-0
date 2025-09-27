/**
 * Enhanced Task Bundle Types with uniform functionality
 * Matches Task Template capabilities for consistency
 */

import { GSTStage, ClientTier, GSTNoticeType } from '../../config/appConfig';

export interface TaskConditions {
  noticeType?: GSTNoticeType[];
  clientTier?: ClientTier[];
  caseValue?: {
    min?: number;
    max?: number;
  };
}

export interface AutomationFlags {
  auto_assign: boolean;
  notify_assignee: boolean;
  require_completion_proof: boolean;
  suggest_on_trigger: boolean;
  auto_create_on_trigger: boolean;
}

export interface EnhancedTaskBundleItem {
  id: string;
  bundle_id: string;
  title: string;
  description?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  estimated_hours?: number;
  assigned_role: string;           // NEW - matches TaskTemplate
  category: string;               // NEW - matches TaskTemplate
  dependencies?: string[];        // Enhanced with validation
  conditions?: TaskConditions;    // NEW - conditional triggering
  order_index: number;
  template_id?: string;           // Reference to source template
  created_at: Date;
  automation_flags?: AutomationFlags; // NEW - automation settings
  due_offset?: string;            // e.g., "+2d", "+1w"
}

export interface EnhancedTaskBundle {
  id: string;
  name: string;
  stage_code?: string;
  stages?: string[];              // NEW - multi-stage support
  trigger: string;
  active: boolean;
  created_at: Date;
  updated_at?: Date;
  description?: string;
  is_default?: boolean;
  execution_mode: 'Sequential' | 'Parallel'; // NEW
  conditions?: TaskConditions;    // NEW - bundle-level conditions
  automation_flags?: AutomationFlags; // NEW
  version: number;                // NEW - for versioning
  created_by?: string;
  usage_count: number;            // NEW - track usage
}

export interface EnhancedTaskBundleWithItems extends EnhancedTaskBundle {
  items: EnhancedTaskBundleItem[];
}

export interface CreateEnhancedTaskBundleData {
  name: string;
  stage_code?: string;
  stages?: string[];
  trigger: string;
  active?: boolean;
  description?: string;
  execution_mode?: 'Sequential' | 'Parallel';
  conditions?: TaskConditions;
  automation_flags?: AutomationFlags;
  items?: CreateEnhancedTaskBundleItemData[];
}

export interface CreateEnhancedTaskBundleItemData {
  title: string;
  description?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  estimated_hours?: number;
  assigned_role: string;
  category: string;
  dependencies?: string[];
  conditions?: TaskConditions;
  order_index?: number;
  template_id?: string;
  automation_flags?: AutomationFlags;
  due_offset?: string;
}

// Bundle validation
export const validateTaskBundle = (bundle: Partial<EnhancedTaskBundle>): string[] => {
  const errors: string[] = [];
  
  if (!bundle.name?.trim()) {
    errors.push('Bundle name is required');
  }
  
  if (!bundle.trigger?.trim()) {
    errors.push('Trigger is required');
  }
  
  if (bundle.stages && bundle.stages.length === 0 && !bundle.stage_code) {
    errors.push('At least one stage must be specified');
  }
  
  return errors;
};

// Task item validation
export const validateTaskBundleItem = (item: Partial<EnhancedTaskBundleItem>): string[] => {
  const errors: string[] = [];
  
  if (!item.title?.trim()) {
    errors.push('Task title is required');
  }
  
  if (!item.assigned_role?.trim()) {
    errors.push('Assigned role is required');
  }
  
  if (!item.category?.trim()) {
    errors.push('Category is required');
  }
  
  if (item.estimated_hours && item.estimated_hours <= 0) {
    errors.push('Estimated hours must be greater than 0');
  }
  
  return errors;
};

// Default values
export const createDefaultTaskBundleItem = (overrides: Partial<EnhancedTaskBundleItem> = {}): Omit<EnhancedTaskBundleItem, 'id' | 'bundle_id' | 'created_at'> => ({
  title: '',
  description: '',
  priority: 'Medium',
  estimated_hours: 8,
  assigned_role: 'Associate',
  category: 'General',
  dependencies: [],
  order_index: 0,
  automation_flags: {
    auto_assign: true,
    notify_assignee: true,
    require_completion_proof: false,
    suggest_on_trigger: false,
    auto_create_on_trigger: false
  },
  due_offset: '+1d',
  ...overrides
});

export const createDefaultTaskBundle = (overrides: Partial<EnhancedTaskBundle> = {}): Omit<EnhancedTaskBundle, 'id' | 'created_at'> => ({
  name: '',
  stages: ['Any Stage'],
  trigger: 'OnStageEnter',
  active: true,
  description: '',
  is_default: false,
  execution_mode: 'Sequential',
  version: 1,
  usage_count: 0,
  automation_flags: {
    auto_assign: true,
    notify_assignee: true,
    require_completion_proof: false,
    suggest_on_trigger: false,
    auto_create_on_trigger: false
  },
  ...overrides
});