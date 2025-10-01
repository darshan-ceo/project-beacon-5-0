/**
 * Simulated API Adapter
 * Mimics a remote cloud API using localStorage with network delays
 * Can be replaced with actual API calls later
 */

import { StoragePort, VersionedEntity } from '../ports/StoragePort';

export interface SimulatedApiConfig {
  baseDelay: number; // Simulated network latency in ms
  failureRate: number; // 0-1 probability of simulated failures
  enabled: boolean;
}

export class SimulatedApiAdapter implements StoragePort {
  private namespace: string;
  private config: SimulatedApiConfig;
  private storageKey: string;

  constructor(namespace: string = 'api_cloud', config?: Partial<SimulatedApiConfig>) {
    this.namespace = namespace;
    this.storageKey = `${namespace}_data`;
    this.config = {
      baseDelay: 300,
      failureRate: 0.05,
      enabled: true,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    console.log('🌐 Simulated API Adapter initialized');
    await this.simulateNetworkDelay();
    
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify({}));
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; errors: string[] }> {
    await this.simulateNetworkDelay();
    
    if (!this.config.enabled) {
      return { healthy: false, errors: ['API adapter disabled'] };
    }

    try {
      const data = localStorage.getItem(this.storageKey);
      if (data === null) {
        return { healthy: false, errors: ['Cloud storage not initialized'] };
      }
      return { healthy: true, errors: [] };
    } catch (error) {
      return { healthy: false, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  private async simulateNetworkDelay(): Promise<void> {
    if (!this.config.enabled) return;
    
    const delay = this.config.baseDelay + (Math.random() * 100 - 50);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (Math.random() < this.config.failureRate) {
      throw new Error('Simulated network error');
    }
  }

  private getCloudData(): Record<string, any[]> {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : {};
  }

  private setCloudData(data: Record<string, any[]>): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  async create<T extends { id: string }>(collection: string, data: T): Promise<T> {
    await this.simulateNetworkDelay();
    
    const cloudData = this.getCloudData();
    if (!cloudData[collection]) {
      cloudData[collection] = [];
    }

    const timestamp = new Date().toISOString();
    const item = {
      ...data,
      created_at: (data as any).created_at || timestamp,
      updated_at: timestamp,
      synced_at: timestamp,
    };

    cloudData[collection].push(item);
    this.setCloudData(cloudData);

    console.log(`🌐 API: Created ${collection}/${data.id}`);
    return item as T;
  }

  async getById<T>(collection: string, id: string): Promise<T | null> {
    await this.simulateNetworkDelay();
    
    const cloudData = this.getCloudData();
    const items = cloudData[collection] || [];
    const item = items.find((i: any) => i.id === id);
    
    return item ? (item as T) : null;
  }

  async update<T extends { id: string }>(collection: string, id: string, data: Partial<T>): Promise<T> {
    await this.simulateNetworkDelay();
    
    const cloudData = this.getCloudData();
    const items = cloudData[collection] || [];
    const index = items.findIndex((i: any) => i.id === id);

    if (index === -1) {
      throw new Error(`Item ${id} not found in collection ${collection}`);
    }

    const updated = {
      ...items[index],
      ...data,
      updated_at: new Date().toISOString(),
      synced_at: new Date().toISOString(),
    };

    items[index] = updated;
    cloudData[collection] = items;
    this.setCloudData(cloudData);

    console.log(`🌐 API: Updated ${collection}/${id}`);
    return updated as T;
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.simulateNetworkDelay();
    
    const cloudData = this.getCloudData();
    const items = cloudData[collection] || [];
    const filtered = items.filter((i: any) => i.id !== id);

    cloudData[collection] = filtered;
    this.setCloudData(cloudData);

    console.log(`🌐 API: Deleted ${collection}/${id}`);
  }

  async getAll<T>(collection: string): Promise<T[]> {
    await this.simulateNetworkDelay();
    
    const cloudData = this.getCloudData();
    return (cloudData[collection] || []) as T[];
  }

  async bulkCreate<T extends { id: string }>(collection: string, items: T[]): Promise<T[]> {
    await this.simulateNetworkDelay();
    
    const cloudData = this.getCloudData();
    if (!cloudData[collection]) {
      cloudData[collection] = [];
    }

    const timestamp = new Date().toISOString();
    const newItems = items.map(item => ({
      ...item,
      created_at: (item as any).created_at || timestamp,
      updated_at: timestamp,
      synced_at: timestamp,
    }));

    cloudData[collection].push(...newItems);
    this.setCloudData(cloudData);

    console.log(`🌐 API: Bulk created ${items.length} items in ${collection}`);
    return newItems as T[];
  }

  async bulkUpdate<T extends { id: string }>(collection: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    await this.simulateNetworkDelay();
    
    const cloudData = this.getCloudData();
    const items = cloudData[collection] || [];
    const updated: T[] = [];

    for (const { id, data } of updates) {
      const index = items.findIndex((i: any) => i.id === id);
      if (index !== -1) {
        items[index] = {
          ...items[index],
          ...data,
          updated_at: new Date().toISOString(),
          synced_at: new Date().toISOString(),
        };
        updated.push(items[index] as T);
      }
    }

    cloudData[collection] = items;
    this.setCloudData(cloudData);

    console.log(`🌐 API: Bulk updated ${updated.length} items in ${collection}`);
    return updated;
  }

  async bulkDelete(collection: string, ids: string[]): Promise<void> {
    await this.simulateNetworkDelay();
    
    const cloudData = this.getCloudData();
    const items = cloudData[collection] || [];
    const filtered = items.filter((i: any) => !ids.includes(i.id));

    cloudData[collection] = filtered;
    this.setCloudData(cloudData);

    console.log(`🌐 API: Bulk deleted ${ids.length} items in ${collection}`);
  }

  async query<T>(collection: string, filter?: (item: T) => boolean): Promise<T[]> {
    const all = await this.getAll<T>(collection);
    return filter ? all.filter(filter) : all;
  }

  async queryByField<T>(collection: string, field: string, value: any): Promise<T[]> {
    const all = await this.getAll<T>(collection);
    return all.filter((item: any) => item[field] === value);
  }

  async transaction<T>(tables: string[], operation: () => Promise<T>): Promise<T> {
    // Simple implementation - just execute the operation
    return operation();
  }

  async clear(collection: string): Promise<void> {
    await this.simulateNetworkDelay();
    
    const cloudData = this.getCloudData();
    cloudData[collection] = [];
    this.setCloudData(cloudData);

    console.log(`🌐 API: Cleared ${collection}`);
  }

  async clearAll(): Promise<void> {
    await this.simulateNetworkDelay();
    
    localStorage.setItem(this.storageKey, JSON.stringify({}));
    console.log('🌐 API: Cleared all data');
  }

  async exportAll(): Promise<Record<string, any[]>> {
    await this.simulateNetworkDelay();
    return this.getCloudData();
  }

  async importAll(data: Record<string, any[]>): Promise<void> {
    await this.simulateNetworkDelay();
    this.setCloudData(data);
    console.log('🌐 API: Imported all data');
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    const data = localStorage.getItem(this.storageKey);
    const used = data ? data.length : 0;
    return { used, available: 0, quota: 0 };
  }

  async getVersion(table: string, id: string): Promise<number> {
    const item = await this.getById<any>(table, id);
    return item?.version || 0;
  }

  compareVersions(v1: number, v2: number): 'equal' | 'before' | 'after' {
    if (v1 === v2) return 'equal';
    return v1 < v2 ? 'before' : 'after';
  }

  bumpVersion<T extends VersionedEntity>(entity: T, userId?: string): T {
    const currentVersion = entity.version || 0;
    return {
      ...entity,
      version: currentVersion + 1,
      last_modified_at: new Date().toISOString(),
      last_modified_by: userId,
      sync_status: 'pending',
    };
  }

  async destroy(): Promise<void> {
    console.log('🌐 API: Adapter destroyed');
  }

  updateConfig(config: Partial<SimulatedApiConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): SimulatedApiConfig {
    return { ...this.config };
  }
}
