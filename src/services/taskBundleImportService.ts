/**
 * Task Bundle Import Service
 * Validates and transforms external JSON format to internal database schema
 */

import { z } from 'zod';
import type { TaskBundle, TaskBundleItem } from '@/data/db';
import type { CreateTaskBundleData } from '@/data/repositories/TaskBundleRepository';
import { userLookupService } from './userLookupService';

// Validation schema for external JSON format
const ExternalTaskItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Task title is required'),
  stage: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  assignedRole: z.string().optional(),
  assignedUserEmail: z.string().email().optional(),
  triggerType: z.enum(['Auto', 'Manual']).optional(),
  triggerEvent: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  checklist: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
});

const ExternalBundleSchema = z.object({
  id: z.string().optional(),
  bundleName: z.string().min(1, 'Bundle name is required'),
  trigger: z.string().min(1, 'Trigger is required'),
  stageScope: z.string(),
  bundleCode: z.string().optional(),
  linkedModule: z.string().optional(),
  defaultPriority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  status: z.enum(['Draft', 'Active', 'Archived']).optional(),
  bundleDescription: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const ExternalBundleWithTasksSchema = z.object({
  bundle: ExternalBundleSchema,
  tasks: z.array(ExternalTaskItemSchema),
});

export type ExternalTaskItem = z.infer<typeof ExternalTaskItemSchema>;
export type ExternalBundle = z.infer<typeof ExternalBundleSchema>;
export type ExternalBundleWithTasks = z.infer<typeof ExternalBundleWithTasksSchema>;

export interface ImportResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  transformedData?: CreateTaskBundleData;
  userLookupResults?: {
    foundCount: number;
    notFoundCount: number;
    notFoundEmails: string[];
  };
}

class TaskBundleImportService {
  /**
   * Validate external JSON format
   */
  validateJSON(jsonData: unknown): ImportResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Parse and validate
      const parsed = ExternalBundleWithTasksSchema.parse(jsonData);
      
      // Additional business logic validation
      if (parsed.tasks.length === 0) {
        warnings.push('Bundle has no tasks');
      }

      if (parsed.tasks.length > 50) {
        warnings.push('Bundle has more than 50 tasks - consider splitting');
      }

      // Check for duplicate task IDs
      const taskIds = parsed.tasks.map(t => t.id).filter(Boolean);
      const uniqueIds = new Set(taskIds);
      if (taskIds.length !== uniqueIds.size) {
        errors.push('Duplicate task IDs found');
      }

      return {
        success: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          warnings,
        };
      }

      return {
        success: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
      };
    }
  }

  /**
   * Transform external format to internal database schema
   * Note: Email-to-ID resolution happens during import, not here
   */
  transformToInternalFormat(jsonData: ExternalBundleWithTasks): CreateTaskBundleData {
    const { bundle, tasks } = jsonData;

    // Transform bundle data (camelCase → snake_case)
    const transformedBundle: Partial<TaskBundle> = {
      name: bundle.bundleName,
      trigger: bundle.trigger,
      stage_code: bundle.stageScope === 'Any' ? '' : bundle.stageScope,
      is_active: bundle.status === 'Active',
      description: bundle.bundleDescription || '',
      is_default: false,
      execution_mode: 'Sequential',
      version: 1,
      usage_count: 0,
    };

    // Transform task items
    const transformedItems = tasks.map((task, index) => {
      const item: any = {
        title: task.title,
        description: task.description || '',
        priority: task.priority.toLowerCase(),
        estimated_hours: task.estimatedHours,
        order_index: index,
        
        // Map camelCase → snake_case
        assigned_role: task.assignedRole || '',
        category: task.category || 'General',
        
        // Handle stage mapping
        stage: task.stage || '',
        
        // Transform trigger fields
        trigger_type: task.triggerType || 'Manual',
        trigger_event: task.triggerEvent || '',
        
        // User assignment (note: email → ID mapping needs to be done separately)
        assigned_user: task.assignedUserEmail || '',
        
        // Arrays
        checklist: task.checklist || [],
        dependencies: task.dependencies || [],
      };

      return item;
    });

    return {
      ...transformedBundle,
      items: transformedItems,
    } as CreateTaskBundleData;
  }

  /**
   * Import and validate JSON file with user email resolution
   */
  async importFromJSON(jsonData: unknown, resolveEmails: boolean = true): Promise<ImportResult> {
    // First validate
    const validation = this.validateJSON(jsonData);
    
    if (!validation.success) {
      return validation;
    }

    try {
      // Transform to internal format
      const parsed = ExternalBundleWithTasksSchema.parse(jsonData);
      const transformedData = this.transformToInternalFormat(parsed);

      // Resolve email addresses to user IDs if requested
      const warnings = [...validation.warnings];
      let userLookupResults: ImportResult['userLookupResults'];

      if (resolveEmails && transformedData.items) {
        const emailsToResolve = transformedData.items
          .map((item: any) => item.assigned_user)
          .filter(Boolean);

        if (emailsToResolve.length > 0) {
          const lookupResult = await userLookupService.lookupBatch(emailsToResolve);
          
          userLookupResults = {
            foundCount: lookupResult.foundCount,
            notFoundCount: lookupResult.notFoundCount,
            notFoundEmails: lookupResult.notFoundEmails,
          };

          // Replace emails with user IDs where found
          for (const item of transformedData.items as any[]) {
            if (item.assigned_user) {
              const result = lookupResult.results.find(
                (r) => r.email === item.assigned_user
              );
              
              if (result?.found && result.userId) {
                item.assigned_user = result.userId;
              } else {
                warnings.push(
                  `User email "${item.assigned_user}" not found for task "${item.title}"`
                );
                // Keep email as-is for manual resolution
              }
            }
          }

          if (lookupResult.notFoundCount > 0) {
            warnings.push(
              `${lookupResult.notFoundCount} email(s) could not be resolved to user IDs`
            );
          }
        }
      }

      return {
        success: true,
        errors: [],
        warnings,
        transformedData,
        userLookupResults,
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: validation.warnings,
      };
    }
  }

  /**
   * Export bundle to external JSON format
   */
  exportToJSON(bundle: TaskBundle, items: TaskBundleItem[]): ExternalBundleWithTasks {
    const externalBundle: ExternalBundle = {
      id: bundle.id,
      bundleName: bundle.name,
      trigger: bundle.trigger,
      stageScope: bundle.stage_code || 'Any',
      bundleCode: bundle.id.substring(0, 10),
      linkedModule: 'Case Management',
      defaultPriority: 'Medium',
      status: bundle.is_active ? 'Active' : 'Draft',
      bundleDescription: bundle.description,
      createdAt: bundle.created_at.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const externalTasks: ExternalTaskItem[] = items.map(item => ({
      id: item.id,
      title: item.title,
      stage: (item as any).stage || '',
      priority: item.priority.charAt(0).toUpperCase() + item.priority.slice(1) as any,
      assignedRole: item.assigned_role || '',
      assignedUserEmail: (item as any).assigned_user || '',
      triggerType: ((item as any).trigger_type || 'Manual') as any,
      triggerEvent: (item as any).trigger_event || '',
      estimatedHours: item.estimated_hours,
      category: item.category || 'General',
      description: item.description || '',
      checklist: (item as any).checklist || [],
      dependencies: item.dependencies || [],
    }));

    return {
      bundle: externalBundle,
      tasks: externalTasks,
    };
  }

  /**
   * Generate example JSON template
   */
  generateTemplate(): ExternalBundleWithTasks {
    return {
      bundle: {
        bundleName: 'Sample Task Bundle',
        trigger: 'onCaseCreated',
        stageScope: 'Any',
        bundleCode: 'SAMPLE001',
        linkedModule: 'Case Management',
        defaultPriority: 'Medium',
        status: 'Draft',
        bundleDescription: 'Sample task bundle for demonstration',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      tasks: [
        {
          title: 'Sample Task 1',
          stage: 'Notice Received',
          priority: 'High',
          assignedRole: 'Associate',
          triggerType: 'Auto',
          triggerEvent: 'onNoticeUpload',
          estimatedHours: 2,
          category: 'Assessment',
          description: 'This is a sample task',
          checklist: [
            'Step 1',
            'Step 2',
            'Step 3',
          ],
        },
        {
          title: 'Sample Task 2',
          stage: 'Reply Drafting',
          priority: 'Medium',
          assignedRole: 'Senior Associate',
          triggerType: 'Manual',
          estimatedHours: 4,
          category: 'Drafting',
          description: 'Another sample task',
          checklist: [],
        },
      ],
    };
  }
}

export const taskBundleImportService = new TaskBundleImportService();
