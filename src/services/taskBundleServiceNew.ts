/**
 * Updated Task Bundle Service using unified storage
 * This replaces the old taskBundleService.ts
 */

import { storageManager } from '@/data/StorageManager';
import type { TaskBundleWithItems, CreateTaskBundleData } from '@/data/repositories/TaskBundleRepository';
import type { Task } from '@/contexts/AppStateContext';
import type { AppAction } from '@/contexts/AppStateContext';

export type TaskTrigger = 'OnStageEnter' | 'OnHearingScheduled' | 'OnHearingCompleted' | 'OnRemand' | 'OnSendBack';

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  estimatedHours?: number;
  dependencies?: string[];
}

class TaskBundleServiceNew {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await storageManager.initialize();
      await this.seedDefaultBundles();
      this.isInitialized = true;
      console.log('✅ TaskBundleService initialized with unified storage');
    } catch (error) {
      console.error('❌ TaskBundleService initialization failed:', error);
      throw error;
    }
  }

  private async seedDefaultBundles(): Promise<void> {
    const repo = storageManager.getTaskBundleRepository();
    const existing = await repo.getDefaultBundles();
    
    if (existing.length > 0) return;
    
    console.log('🌱 Seeding default task bundles...');
    
    const defaultBundle: CreateTaskBundleData = {
      name: 'Notice Entry Tasks',
      trigger: 'OnStageEnter',
      stage_code: 'notice_received',
      active: true,
      description: 'Default tasks for notice entry stage',
      items: [
        {
          title: 'Review Notice',
          description: 'Analyze the received notice',
          priority: 'High',
          estimated_hours: 2
        },
        {
          title: 'Prepare Initial Response',
          description: 'Draft initial response strategy',
          priority: 'Medium',
          estimated_hours: 4
        }
      ]
    };

    await repo.createWithItems(defaultBundle);
  }

  async getAllBundles(): Promise<TaskBundleWithItems[]> {
    await this.ensureInitialized();
    const repo = storageManager.getTaskBundleRepository();
    return await repo.getAllWithItems();
  }

  async createBundle(data: CreateTaskBundleData): Promise<TaskBundleWithItems> {
    await this.ensureInitialized();
    const repo = storageManager.getTaskBundleRepository();
    return await repo.createWithItems(data);
  }

  async updateBundle(id: string, updates: Partial<CreateTaskBundleData>): Promise<TaskBundleWithItems | null> {
    await this.ensureInitialized();
    const repo = storageManager.getTaskBundleRepository();
    try {
      return await repo.updateWithItems(id, updates);
    } catch (error) {
      console.error('Failed to update bundle:', error);
      return null;
    }
  }

  async deleteBundle(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const repo = storageManager.getTaskBundleRepository();
    try {
      await repo.delete(id);
      return true;
    } catch (error) {
      console.error('Failed to delete bundle:', error);
      return false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

export const taskBundleServiceNew = new TaskBundleServiceNew();