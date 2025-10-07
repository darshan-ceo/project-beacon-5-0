/**
 * Enhanced Task Bundle Repository
 * Extends base repository with enhanced task bundle functionality
 */

import { TaskBundleRepository, CreateTaskBundleData, TaskBundleWithItems } from './TaskBundleRepository';
import { EnhancedTaskBundle, EnhancedTaskBundleWithItems, CreateEnhancedTaskBundleData } from '@/types/enhancedTaskBundle';
import { StoragePort } from '../ports/StoragePort';
import { AuditService } from '../services/AuditService';

export class EnhancedTaskBundleRepository extends TaskBundleRepository {
  constructor(storage: StoragePort, auditService?: AuditService) {
    super(storage, auditService);
  }

  /**
   * Create enhanced bundle with full feature support
   */
  async createEnhanced(data: CreateEnhancedTaskBundleData): Promise<EnhancedTaskBundleWithItems> {
    // Convert to base format for storage
    const baseData: CreateTaskBundleData = {
      name: data.name,
      stage_code: data.stage_code,
      trigger: data.trigger,
      active: data.active ?? true,
      description: data.description,
      items: data.items?.map(item => ({
        title: item.title,
        description: item.description,
        priority: item.priority,
        estimated_hours: item.estimated_hours,
        dependencies: item.dependencies,
        order_index: item.order_index ?? 0
      }))
    };

    const result = await this.createWithItems(baseData);
    
    // Update with enhanced fields
    const enhancedBundle = await this.storage.update(this.tableName, result.id, {
      stages: data.stages,
      execution_mode: data.execution_mode || 'Sequential',
      version: 1,
      usage_count: 0,
      automation_flags: data.automation_flags,
      conditions: data.conditions,
      bundle_code: data.bundle_code,
      linked_module: data.linked_module,
      status: data.status || 'Draft',
      default_priority: data.default_priority || 'Medium',
      updated_at: new Date()
    } as any);

    // Update items with enhanced fields
    if (data.items) {
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const resultItem = result.items[i];
        
        if (resultItem) {
          await this.storage.update('task_bundle_items', resultItem.id, {
            assigned_role: item.assigned_role,
            category: item.category,
            due_offset: item.due_offset,
            automation_flags: item.automation_flags,
            conditions: item.conditions,
            template_id: item.template_id,
            stage: item.stage,
            assigned_user: item.assigned_user,
            trigger_type: item.trigger_type || 'Manual',
            trigger_event: item.trigger_event,
            checklist: item.checklist
          } as any);
        }
      }
    }

    return this.getEnhanced(result.id) as Promise<EnhancedTaskBundleWithItems>;
  }

  /**
   * Get enhanced bundle with full feature data
   */
  async getEnhanced(id: string): Promise<EnhancedTaskBundleWithItems | null> {
    const bundle = await this.getWithItems(id);
    if (!bundle) return null;

    return this.convertToEnhanced(bundle);
  }

  /**
   * Get all enhanced bundles
   */
  async getAllEnhanced(): Promise<EnhancedTaskBundleWithItems[]> {
    const bundles = await this.getAllWithItems();
    return bundles.map(bundle => this.convertToEnhanced(bundle));
  }

  /**
   * Update enhanced bundle
   */
  async updateEnhanced(id: string, updates: Partial<CreateEnhancedTaskBundleData>): Promise<EnhancedTaskBundleWithItems> {
    // Convert to base format for storage
    const baseUpdates: Partial<CreateTaskBundleData> = {
      name: updates.name,
      stage_code: updates.stage_code,
      trigger: updates.trigger,
      active: updates.active,
      description: updates.description,
      items: updates.items?.map(item => ({
        title: item.title,
        description: item.description,
        priority: item.priority,
        estimated_hours: item.estimated_hours,
        dependencies: item.dependencies,
        order_index: item.order_index ?? 0
      }))
    };

    const result = await this.updateWithItems(id, baseUpdates);
    
    // Update enhanced fields
    await this.storage.update(this.tableName, id, {
      stages: updates.stages,
      execution_mode: updates.execution_mode,
      automation_flags: updates.automation_flags,
      conditions: updates.conditions,
      updated_at: new Date()
    } as any);

    // Update items with enhanced fields if provided
    if (updates.items) {
      for (let i = 0; i < updates.items.length; i++) {
        const item = updates.items[i];
        const resultItem = result.items[i];
        
        if (resultItem) {
          await this.storage.update('task_bundle_items', resultItem.id, {
            assigned_role: item.assigned_role,
            category: item.category,
            due_offset: item.due_offset,
            automation_flags: item.automation_flags,
            conditions: item.conditions,
            template_id: item.template_id
          } as any);
        }
      }
    }

    return this.getEnhanced(id) as Promise<EnhancedTaskBundleWithItems>;
  }

  /**
   * Get bundles by enhanced criteria
   */
  async getBundlesByEnhancedTrigger(
    trigger: string, 
    stages?: string[]
  ): Promise<EnhancedTaskBundleWithItems[]> {
    const bundles = await this.query(bundle => {
      if (!bundle.active || bundle.trigger !== trigger) return false;
      
      if (stages && stages.length > 0) {
        const bundleStages = (bundle as any).stages || [bundle.stage_code];
        if (!bundleStages.includes('Any Stage')) {
          return stages.some(stage => bundleStages.includes(stage));
        }
      }
      
      return true;
    });

    const enhancedBundles: EnhancedTaskBundleWithItems[] = [];
    for (const bundle of bundles) {
      const enhanced = await this.getEnhanced(bundle.id);
      if (enhanced) {
        enhancedBundles.push(enhanced);
      }
    }

    return enhancedBundles;
  }

  /**
   * Increment usage count
   */
  async incrementUsage(id: string): Promise<void> {
    const bundle = await this.getById(id);
    if (bundle) {
      await this.update(id, {
        usage_count: ((bundle as any).usage_count || 0) + 1,
        updated_at: new Date()
      });
    }
  }

  /**
   * Get bundle analytics
   */
  async getBundleAnalytics(): Promise<{
    totalBundles: number;
    activeBundles: number;
    averageUsage: number;
    byTrigger: Record<string, number>;
    byStage: Record<string, number>;
  }> {
    const bundles = await this.getAll();
    const activeBundles = bundles.filter(b => b.active);
    
    const totalUsage = bundles.reduce((sum, b) => sum + ((b as any).usage_count || 0), 0);
    const averageUsage = bundles.length > 0 ? totalUsage / bundles.length : 0;

    const byTrigger: Record<string, number> = {};
    const byStage: Record<string, number> = {};

    bundles.forEach(bundle => {
      byTrigger[bundle.trigger] = (byTrigger[bundle.trigger] || 0) + 1;
      
      const stages = (bundle as any).stages || [bundle.stage_code];
      stages.forEach((stage: string) => {
        if (stage) {
          byStage[stage] = (byStage[stage] || 0) + 1;
        }
      });
    });

    return {
      totalBundles: bundles.length,
      activeBundles: activeBundles.length,
      averageUsage,
      byTrigger,
      byStage
    };
  }

  /**
   * Convert base bundle to enhanced format
   */
  private convertToEnhanced(bundle: TaskBundleWithItems): EnhancedTaskBundleWithItems {
    const enhanced = bundle as any;
    
    return {
      ...enhanced,
      stages: enhanced.stages || [bundle.stage_code || 'Any Stage'],
      execution_mode: enhanced.execution_mode || 'Sequential',
      version: enhanced.version || 1,
      usage_count: enhanced.usage_count || 0,
      automation_flags: enhanced.automation_flags,
      conditions: enhanced.conditions,
      bundle_code: enhanced.bundle_code || '',
      linked_module: enhanced.linked_module || '',
      status: enhanced.status || 'Active',
      default_priority: enhanced.default_priority || 'Medium',
      items: bundle.items.map(item => ({
        ...item,
        priority: item.priority as 'Critical' | 'High' | 'Medium' | 'Low',
        assigned_role: (item as any).assigned_role || 'Associate',
        category: (item as any).category || 'General',
        due_offset: (item as any).due_offset,
        automation_flags: (item as any).automation_flags,
        conditions: (item as any).conditions,
        stage: (item as any).stage,
        assigned_user: (item as any).assigned_user,
        trigger_type: (item as any).trigger_type || 'Manual',
        trigger_event: (item as any).trigger_event,
        checklist: (item as any).checklist || []
      }))
    };
  }
}