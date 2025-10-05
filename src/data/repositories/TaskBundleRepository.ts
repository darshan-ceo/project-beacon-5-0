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
  active?: boolean;
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
      // Create the bundle
      const bundle: TaskBundle = {
        id: crypto.randomUUID(),
        name: data.name,
        stage_code: data.stage_code,
        trigger: data.trigger,
        active: data.active ?? true,
        description: data.description,
        is_default: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      const createdBundle = await this.create(bundle);

      // Create the items
      const items: TaskBundleItem[] = [];
      if (data.items && data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          const itemData = data.items[i];
          const item: TaskBundleItem = {
            id: crypto.randomUUID(),
            bundle_id: createdBundle.id,
            title: itemData.title,
            description: itemData.description,
            priority: itemData.priority,
            estimated_hours: itemData.estimated_hours,
            dependencies: itemData.dependencies,
            order_index: itemData.order_index ?? i,
            created_at: new Date()
          };

          const createdItem = await this.storage.create('task_bundle_items', item);
          items.push(createdItem);
        }
      }

      return {
        ...createdBundle,
        items
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
      // Update the bundle
      const bundleUpdates: Partial<TaskBundle> = {
        name: updates.name,
        stage_code: updates.stage_code,
        trigger: updates.trigger,
        active: updates.active,
        description: updates.description,
        updated_at: new Date()
      };

      const updatedBundle = await this.update(id, bundleUpdates);

      // Handle items update if provided
      if (updates.items !== undefined) {
        // Delete existing items
        const existingItems = await this.storage.queryByField<TaskBundleItem>('task_bundle_items', 'bundle_id', id);
        for (const item of existingItems) {
          await this.storage.delete('task_bundle_items', item.id);
        }

        // Create new items
        const newItems: TaskBundleItem[] = [];
        for (let i = 0; i < updates.items.length; i++) {
          const itemData = updates.items[i];
          const item: TaskBundleItem = {
            id: crypto.randomUUID(),
            bundle_id: id,
            title: itemData.title,
            description: itemData.description,
            priority: itemData.priority,
            estimated_hours: itemData.estimated_hours,
            dependencies: itemData.dependencies,
            order_index: itemData.order_index ?? i,
            created_at: new Date()
          };

          const createdItem = await this.storage.create('task_bundle_items', item);
          newItems.push(createdItem);
        }

        return {
          ...updatedBundle,
          items: newItems
        };
      } else {
        // Just return with existing items
        const items = await this.storage.queryByField<TaskBundleItem>('task_bundle_items', 'bundle_id', id);
        items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        return {
          ...updatedBundle,
          items
        };
      }
    });
  }

  async delete(id: string): Promise<void> {
    return await this.storage.transaction(['task_bundles', 'task_bundle_items', 'audit_logs'], async () => {
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
    const bundles = await this.query(bundle => 
      bundle.active && 
      bundle.trigger === trigger && 
      (!stageCode || !bundle.stage_code || bundle.stage_code === stageCode || bundle.stage_code === 'Any Stage')
    );

    // Get items for each bundle
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