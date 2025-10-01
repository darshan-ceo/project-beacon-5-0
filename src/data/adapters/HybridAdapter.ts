/**
 * Hybrid Storage Adapter
 * Local-first architecture: IndexedDB for immediate operations + cloud sync in background
 */

import { StoragePort, VersionedEntity } from '../ports/StoragePort';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { SimulatedApiAdapter } from './SimulatedApiAdapter';
import { syncQueueService } from '@/services/syncQueueService';
import { eventBusService } from '@/services/eventBusService';

export interface HybridConfig {
  localAdapter: IndexedDBAdapter;
  cloudAdapter: SimulatedApiAdapter;
  syncMode: 'immediate' | 'batched' | 'manual';
  batchInterval: number;
  enableRealtime: boolean;
}

export class HybridAdapter implements StoragePort {
  private local: IndexedDBAdapter;
  private cloud: SimulatedApiAdapter;
  private config: HybridConfig;
  private syncBatchTimeout?: NodeJS.Timeout;
  private pendingBatch: Map<string, Set<string>> = new Map();

  constructor(config: HybridConfig) {
    this.local = config.localAdapter;
    this.cloud = config.cloudAdapter;
    this.config = config;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBusService.on('sync:completed', ({ item }) => {
      console.log(`✅ Hybrid: Sync completed for ${item.entity_type}/${item.entity_id}`);
    });

    eventBusService.on('sync:failed', ({ item, error }) => {
      console.error(`❌ Hybrid: Sync failed for ${item.entity_type}/${item.entity_id}:`, error);
    });
  }

  async initialize(): Promise<void> {
    console.log('🔄 Initializing Hybrid Adapter (local-first)');
    
    await this.local.initialize();
    
    try {
      await this.cloud.initialize();
      console.log('✅ Hybrid: Both local and cloud storage ready');
    } catch (error) {
      console.warn('⚠️ Hybrid: Cloud unavailable, running in local-only mode', error);
    }

    if (this.config.syncMode === 'batched') {
      this.startBatchSync();
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; errors: string[] }> {
    const localHealth = await this.local.healthCheck();
    const cloudHealth = await this.cloud.healthCheck().catch(() => ({ 
      healthy: false, 
      errors: ['Cloud unavailable'] 
    }));

    return {
      healthy: localHealth.healthy,
      errors: [
        ...localHealth.errors,
        ...cloudHealth.errors.map(e => `Cloud: ${e}`),
      ],
    };
  }

  async create<T extends { id: string }>(collection: string, data: T): Promise<T> {
    const result = await this.local.create(collection, data);
    this.queueSync(collection, data.id, 'create', result);
    console.log(`💾 Hybrid: Created ${collection}/${data.id} locally, queued for sync`);
    return result;
  }

  async getById<T>(collection: string, id: string): Promise<T | null> {
    return this.local.getById<T>(collection, id);
  }

  async update<T extends { id: string }>(collection: string, id: string, data: Partial<T>): Promise<T> {
    const result = await this.local.update(collection, id, data);
    this.queueSync(collection, id, 'update', result);
    console.log(`💾 Hybrid: Updated ${collection}/${id} locally, queued for sync`);
    return result;
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.local.delete(collection, id);
    this.queueSync(collection, id, 'delete', { id });
    console.log(`💾 Hybrid: Deleted ${collection}/${id} locally, queued for sync`);
  }

  async getAll<T>(collection: string): Promise<T[]> {
    return this.local.getAll<T>(collection);
  }

  async bulkCreate<T extends { id: string }>(collection: string, items: T[]): Promise<T[]> {
    const results = await this.local.bulkCreate(collection, items);
    
    for (const item of results) {
      this.queueSync(collection, item.id, 'create', item);
    }
    
    console.log(`💾 Hybrid: Bulk created ${items.length} items in ${collection}, queued for sync`);
    return results;
  }

  async bulkUpdate<T extends { id: string }>(collection: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    const results = await this.local.bulkUpdate(collection, updates);
    
    for (const item of results) {
      this.queueSync(collection, item.id, 'update', item);
    }
    
    console.log(`💾 Hybrid: Bulk updated ${updates.length} items in ${collection}, queued for sync`);
    return results;
  }

  async bulkDelete(collection: string, ids: string[]): Promise<void> {
    await this.local.bulkDelete(collection, ids);
    
    for (const id of ids) {
      this.queueSync(collection, id, 'delete', { id });
    }
    
    console.log(`💾 Hybrid: Bulk deleted ${ids.length} items in ${collection}, queued for sync`);
  }

  async query<T>(collection: string, filter?: (item: T) => boolean): Promise<T[]> {
    return this.local.query(collection, filter);
  }

  async queryByField<T>(collection: string, field: string, value: any): Promise<T[]> {
    return this.local.queryByField(collection, field, value);
  }

  async transaction<T>(tables: string[], operation: () => Promise<T>): Promise<T> {
    return this.local.transaction(tables, operation);
  }

  async clear(collection: string): Promise<void> {
    await this.local.clear(collection);
    
    await syncQueueService.enqueue(
      collection,
      'all',
      'delete',
      { clearAll: true },
      'low'
    );
    
    console.log(`💾 Hybrid: Cleared ${collection} locally, queued for sync`);
  }

  async clearAll(): Promise<void> {
    await this.local.clearAll();
    
    await syncQueueService.enqueue(
      'all',
      'all',
      'delete',
      { clearAll: true },
      'low'
    );
    
    console.log('💾 Hybrid: Cleared all data locally, queued for sync');
  }

  async exportAll(): Promise<Record<string, any[]>> {
    return this.local.exportAll();
  }

  async importAll(data: Record<string, any[]>): Promise<void> {
    await this.local.importAll(data);
    console.log('💾 Hybrid: Imported data locally, queuing for sync');
    
    // Queue sync for all imported data
    for (const [collection, items] of Object.entries(data)) {
      for (const item of items) {
        if (item.id) {
          this.queueSync(collection, item.id, 'create', item);
        }
      }
    }
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    return this.local.getStorageInfo();
  }

  async getVersion(table: string, id: string): Promise<number> {
    return this.local.getVersion(table, id);
  }

  compareVersions(v1: number, v2: number): 'equal' | 'before' | 'after' {
    return this.local.compareVersions(v1, v2);
  }

  bumpVersion<T extends VersionedEntity>(entity: T, userId?: string): T {
    return this.local.bumpVersion(entity, userId);
  }

  async destroy(): Promise<void> {
    if (this.syncBatchTimeout) {
      clearTimeout(this.syncBatchTimeout);
    }
    await this.local.destroy();
    await this.cloud.destroy();
  }

  // Sync queue management
  private queueSync(
    collection: string,
    id: string,
    operation: 'create' | 'update' | 'delete',
    payload: any
  ): void {
    if (this.config.syncMode === 'manual') {
      return;
    }

    if (this.config.syncMode === 'immediate') {
      syncQueueService.enqueue(collection, id, operation, payload, 'high');
    } else if (this.config.syncMode === 'batched') {
      if (!this.pendingBatch.has(collection)) {
        this.pendingBatch.set(collection, new Set());
      }
      this.pendingBatch.get(collection)!.add(id);
    }
  }

  private startBatchSync(): void {
    this.syncBatchTimeout = setInterval(() => {
      this.flushBatch();
    }, this.config.batchInterval);
  }

  private async flushBatch(): Promise<void> {
    if (this.pendingBatch.size === 0) return;

    console.log(`🔄 Hybrid: Flushing batch sync (${this.pendingBatch.size} collections)`);

    for (const [collection, ids] of this.pendingBatch.entries()) {
      for (const id of ids) {
        const item = await this.local.getById(collection, id);
        if (item) {
          await syncQueueService.enqueue(collection, id, 'update', item, 'medium');
        }
      }
    }

    this.pendingBatch.clear();
  }

  async syncNow(): Promise<void> {
    console.log('🔄 Hybrid: Manual sync triggered');
    await this.flushBatch();
    await syncQueueService.processQueue();
  }

  async pullFromCloud(collection: string): Promise<void> {
    console.log(`⬇️ Hybrid: Pulling ${collection} from cloud`);
    
    try {
      const cloudItems = await this.cloud.getAll(collection);
      const localItems = await this.local.getAll(collection);
      
      const localMap = new Map(localItems.map((item: any) => [item.id, item]));
      
      for (const cloudItem of cloudItems) {
        const localItem = localMap.get((cloudItem as any).id);
        
        if (!localItem) {
          await this.local.create(collection, cloudItem as any);
        } else {
          const cloudTime = new Date((cloudItem as any).updated_at || 0).getTime();
          const localTime = new Date((localItem as any).updated_at || 0).getTime();
          
          if (cloudTime > localTime) {
            await this.local.update(collection, (cloudItem as any).id, cloudItem as any);
          }
        }
      }
      
      console.log(`✅ Hybrid: Pulled ${cloudItems.length} items from cloud`);
    } catch (error) {
      console.error(`❌ Hybrid: Failed to pull from cloud:`, error);
      throw error;
    }
  }

  updateConfig(config: Partial<HybridConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.batchInterval && this.config.syncMode === 'batched') {
      if (this.syncBatchTimeout) {
        clearInterval(this.syncBatchTimeout);
      }
      this.startBatchSync();
    }
  }

  getConfig(): HybridConfig {
    return { ...this.config };
  }

  async getSyncStatus() {
    return syncQueueService.getQueueStatus();
  }
}
