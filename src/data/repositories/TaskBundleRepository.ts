/**
 * Task Bundle Repository
 * Handles CRUD operations for task bundles and their items
 */

import { BaseRepository } from './BaseRepository';
import { TaskBundle, TaskBundleItem } from '../db';
import { StoragePort } from '../ports/StoragePort';
import { AuditService } from '../services/AuditService';

export interface CreateTaskBundleData {
  name: string;
  stage_code?: string;
  trigger: string;
  is_active?: boolean;
  description?: string;
  items?: CreateTaskBundleItemData[];
}

export interface CreateTaskBundleItemData {
  title: string;
  description?: string;
  priority: string;
  estimated_hours?: number;
  dependencies?: string[];
  order_index?: number;
}

export interface TaskBundleWithItems extends TaskBundle {
  items: TaskBundleItem[];
}

export class TaskBundleRepository extends BaseRepository<TaskBundle> {
  constructor(storage: StoragePort, auditService?: AuditService) {
    super(storage, 'task_bundles', auditService);
  }

  async createWithItems(data: CreateTaskBundleData): Promise<TaskBundleWithItems> {
    return await this.storage.transaction(['task_bundles', 'task_bundle_items', 'audit_logs'], async () => {
      const now = new Date();
      
      // Build backend-safe payload
      const dbBundle: any = {
        id: crypto.randomUUID(),
        name: data.name,
        trigger_event: data.trigger,
        stage_codes: (data as any).stages ?? (data.stage_code ? [data.stage_code] : null),
        is_active: data.is_active ?? true,
        description: data.description,
        is_default: false,
        created_at: now,
        updated_at: now
      };

      const createdBundle = await this.storage.create('task_bundles', dbBundle);

      // Create the items with backend-safe fields only
      const items: TaskBundleItem[] = [];
      if (data.items && data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          const itemData = data.items[i];
          const dbItem: any = {
            id: crypto.randomUUID(),
            bundle_id: createdBundle.id,
            title: itemData.title,
            description: itemData.description,
            priority: itemData.priority,
            order_index: itemData.order_index ?? i,
            due_days: itemData.estimated_hours ? Math.max(1, Math.ceil(itemData.estimated_hours / 8)) : 7,
            created_at: now
          };

          const createdItem = await this.storage.create('task_bundle_items', dbItem);
          items.push(createdItem);
        }
      }

      // Normalize for return (add legacy field support)
      return {
        ...createdBundle,
        trigger: (createdBundle as any).trigger_event,
        stage_code: (createdBundle as any).stage_codes?.[0] || null,
        items: items.map(item => ({
          ...item,
          estimated_hours: (item as any).due_days * 8
        }))
      };
    });
  }

  async getWithItems(id: string): Promise<TaskBundleWithItems | null> {
    const bundle = await this.getById(id);
    if (!bundle) return null;

    const items = await this.storage.queryByField<TaskBundleItem>('task_bundle_items', 'bundle_id', id);
    
    // Sort items by order_index
    items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    return {
      ...bundle,
      items
    };
  }

  async getAllWithItems(): Promise<TaskBundleWithItems[]> {
    const bundles = await this.getAll();
    const allItems = await this.storage.getAll<TaskBundleItem>('task_bundle_items');

    // Group items by bundle_id
    const itemsByBundleId = new Map<string, TaskBundleItem[]>();
    allItems.forEach(item => {
      if (!itemsByBundleId.has(item.bundle_id)) {
        itemsByBundleId.set(item.bundle_id, []);
      }
      itemsByBundleId.get(item.bundle_id)!.push(item);
    });

    // Sort items within each bundle
    itemsByBundleId.forEach(items => {
      items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    });

    return bundles.map(bundle => ({
      ...bundle,
      items: itemsByBundleId.get(bundle.id) || []
    }));
  }

  async updateWithItems(id: string, updates: Partial<CreateTaskBundleData>): Promise<TaskBundleWithItems> {
    return await this.storage.transaction(['task_bundles', 'task_bundle_items', 'audit_logs'], async () => {
      const now = new Date();
      
      // Build backend-safe updates
      const bundleUpdates: any = {
        updated_at: now
      };
      
      if (updates.name !== undefined) bundleUpdates.name = updates.name;
      if (updates.trigger !== undefined) bundleUpdates.trigger_event = updates.trigger;
      if ((updates as any).stages !== undefined || updates.stage_code !== undefined) {
        bundleUpdates.stage_codes = (updates as any).stages ?? (updates.stage_code ? [updates.stage_code] : null);
      }
      if (updates.is_active !== undefined) bundleUpdates.is_active = updates.is_active;
      if (updates.description !== undefined) bundleUpdates.description = updates.description;

      const updatedBundle = await this.update(id, bundleUpdates);

      // Handle items update if provided
      if (updates.items !== undefined) {
        // Delete existing items
        const existingItems = await this.storage.queryByField<TaskBundleItem>('task_bundle_items', 'bundle_id', id);
        for (const item of existingItems) {
          await this.storage.delete('task_bundle_items', item.id);
        }

        // Create new items with backend-safe fields
        const newItems: TaskBundleItem[] = [];
        for (let i = 0; i < updates.items.length; i++) {
          const itemData = updates.items[i];
          const dbItem: any = {
            id: crypto.randomUUID(),
            bundle_id: id,
            title: itemData.title,
            description: itemData.description,
            priority: itemData.priority,
            order_index: itemData.order_index ?? i,
            due_days: itemData.estimated_hours ? Math.max(1, Math.ceil(itemData.estimated_hours / 8)) : 7,
            created_at: now
          };

          const createdItem = await this.storage.create('task_bundle_items', dbItem);
          newItems.push(createdItem);
        }

        return {
          ...updatedBundle,
          trigger: (updatedBundle as any).trigger_event,
          stage_code: (updatedBundle as any).stage_codes?.[0] || null,
          items: newItems.map(item => ({
            ...item,
            estimated_hours: (item as any).due_days * 8
          }))
        };
      } else {
        // Just return with existing items
        const items = await this.storage.queryByField<TaskBundleItem>('task_bundle_items', 'bundle_id', id);
        items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        return {
          ...updatedBundle,
          trigger: (updatedBundle as any).trigger_event,
          stage_code: (updatedBundle as any).stage_codes?.[0] || null,
          items: items.map(item => ({
            ...item,
            estimated_hours: (item as any).due_days * 8
          }))
        };
      }
    });
  }

  async delete(id: string): Promise<void> {
    return await this.storage.transaction(['task_bundles', 'task_bundle_items', 'tasks', 'audit_logs'], async () => {
      // Delete all items first
      const items = await this.storage.queryByField<TaskBundleItem>('task_bundle_items', 'bundle_id', id);
      for (const item of items) {
        await this.storage.delete('task_bundle_items', item.id);
      }

      // Delete the bundle
      await super.delete(id);
    });
  }

  // Get bundles by trigger and stage
  async getBundlesByTrigger(trigger: string, stageCode?: string): Promise<TaskBundleWithItems[]> {
    // Normalize stage for flexible matching
    const normalizeStage = (stage: string | undefined) => 
      stage?.trim().toLowerCase().replace(/\s+/g, '-') || '';
    
    const normalizedStageCode = normalizeStage(stageCode);
    
    const bundles = await this.query(bundle => {
      // Normalize trigger reading (support both legacy and backend)
      const bundleTrigger = (bundle as any).trigger ?? (bundle as any).trigger_event;
      if (!bundle.is_active || bundleTrigger !== trigger) {
        return false;
      }
      
      // If no stage filter provided, return all bundles with this trigger
      if (!stageCode) {
        return true;
      }
      
      // Read stages from either stage_codes (array) or stage_code (string)
      const stages = (bundle as any).stage_codes ?? [bundle.stage_code];
      
      // If bundle has no stages or includes "Any Stage", include it
      if (!stages || stages.length === 0 || stages.includes('Any Stage') || stages.includes(null)) {
        return true;
      }
      
      // Check if any stage matches
      return stages.some((stage: string) => {
        const normalizedBundleStage = normalizeStage(stage);
        return stage === stageCode || normalizedBundleStage === normalizedStageCode;
      });
    });

    // Get items for each bundle
    const bundlesWithItems: TaskBundleWithItems[] = [];
    for (const bundle of bundles) {
      const items = await this.storage.queryByField<TaskBundleItem>('task_bundle_items', 'bundle_id', bundle.id);
      items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      
      // Normalize bundle for return
      bundlesWithItems.push({
        ...bundle,
        trigger: (bundle as any).trigger_event ?? (bundle as any).trigger,
        stage_code: (bundle as any).stage_codes?.[0] ?? bundle.stage_code,
        items: items.map(item => ({
          ...item,
          estimated_hours: (item as any).due_days ? (item as any).due_days * 8 : item.estimated_hours
        }))
      });
    }

    return bundlesWithItems;
  }

  // Get default bundles
  async getDefaultBundles(): Promise<TaskBundleWithItems[]> {
    const bundles = await this.query(bundle => bundle.is_default === true);
    
    const bundlesWithItems: TaskBundleWithItems[] = [];
    for (const bundle of bundles) {
      const items = await this.storage.queryByField<TaskBundleItem>('task_bundle_items', 'bundle_id', bundle.id);
      items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      
      bundlesWithItems.push({
        ...bundle,
        items
      });
    }

    return bundlesWithItems;
  }

  // Get custom bundles (non-default)
  async getCustomBundles(): Promise<TaskBundleWithItems[]> {
    const bundles = await this.query(bundle => bundle.is_default !== true);
    
    const bundlesWithItems: TaskBundleWithItems[] = [];
    for (const bundle of bundles) {
      const items = await this.storage.queryByField<TaskBundleItem>('task_bundle_items', 'bundle_id', bundle.id);
      items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      
      bundlesWithItems.push({
        ...bundle,
        items
      });
    }

    return bundlesWithItems;
  }

  protected async checkDependencies(id: string): Promise<void> {
    // Check if any tasks reference this bundle
    const relatedTasks = await this.storage.queryByField('tasks', 'bundle_id', id);
    if (relatedTasks.length > 0) {
      throw new Error(`Cannot delete task bundle: ${relatedTasks.length} tasks are using this bundle`);
    }
  }
}