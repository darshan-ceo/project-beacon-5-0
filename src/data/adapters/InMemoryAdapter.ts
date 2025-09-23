/**
 * In-Memory Storage Adapter
 * Used for testing and development
 */

import { StoragePort } from '../ports/StoragePort';
import { generateId } from '../db';

export class InMemoryAdapter implements StoragePort {
  private storage: Map<string, Map<string, any>> = new Map();
  private initialized = false;

  constructor() {}

  async initialize(): Promise<void> {
    this.initialized = true;
    console.log('✅ InMemoryAdapter initialized');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('InMemoryAdapter not initialized. Call initialize() first.');
    }
  }

  private getTable(tableName: string): Map<string, any> {
    if (!this.storage.has(tableName)) {
      this.storage.set(tableName, new Map());
    }
    return this.storage.get(tableName)!;
  }

  async create<T extends { id: string }>(table: string, data: T): Promise<T> {
    this.ensureInitialized();
    
    const tableMap = this.getTable(table);
    const dataWithId = { 
      ...data, 
      id: data.id || generateId(),
      created_at: (data as any).created_at || new Date()
    } as T;
    
    tableMap.set(dataWithId.id, dataWithId);
    return dataWithId;
  }

  async update<T extends { id: string }>(table: string, id: string, updates: Partial<T>): Promise<T> {
    this.ensureInitialized();
    
    const tableMap = this.getTable(table);
    const existing = tableMap.get(id);
    
    if (!existing) {
      throw new Error(`Record with id '${id}' not found in table '${table}'`);
    }

    const updatedData = { 
      ...existing, 
      ...updates, 
      updated_at: new Date() 
    };
    
    tableMap.set(id, updatedData);
    return updatedData;
  }

  async delete(table: string, id: string): Promise<void> {
    this.ensureInitialized();
    
    const tableMap = this.getTable(table);
    const deleted = tableMap.delete(id);
    
    if (!deleted) {
      throw new Error(`Record with id '${id}' not found in table '${table}'`);
    }
  }

  async getById<T>(table: string, id: string): Promise<T | null> {
    this.ensureInitialized();
    
    const tableMap = this.getTable(table);
    return tableMap.get(id) || null;
  }

  async getAll<T>(table: string): Promise<T[]> {
    this.ensureInitialized();
    
    const tableMap = this.getTable(table);
    return Array.from(tableMap.values());
  }

  async bulkCreate<T extends { id: string }>(table: string, items: T[]): Promise<T[]> {
    this.ensureInitialized();
    
    const tableMap = this.getTable(table);
    const itemsWithId = items.map(item => ({
      ...item,
      id: item.id || generateId(),
      created_at: (item as any).created_at || new Date()
    })) as T[];
    
    itemsWithId.forEach(item => tableMap.set(item.id, item));
    return itemsWithId;
  }

  async bulkUpdate<T extends { id: string }>(table: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    this.ensureInitialized();
    
    const tableMap = this.getTable(table);
    const results: T[] = [];
    
    for (const update of updates) {
      const existing = tableMap.get(update.id);
      if (existing) {
        const updatedData = { 
          ...existing, 
          ...update.data, 
          updated_at: new Date() 
        };
        tableMap.set(update.id, updatedData);
        results.push(updatedData);
      }
    }
    
    return results;
  }

  async bulkDelete(table: string, ids: string[]): Promise<void> {
    this.ensureInitialized();
    
    const tableMap = this.getTable(table);
    ids.forEach(id => tableMap.delete(id));
  }

  async query<T>(table: string, filter?: (item: T) => boolean): Promise<T[]> {
    this.ensureInitialized();
    
    const tableMap = this.getTable(table);
    let items = Array.from(tableMap.values());
    
    if (filter) {
      items = items.filter(filter);
    }
    
    return items;
  }

  async queryByField<T>(table: string, field: string, value: any): Promise<T[]> {
    this.ensureInitialized();
    
    const tableMap = this.getTable(table);
    return Array.from(tableMap.values()).filter(item => item[field] === value);
  }

  async transaction<T>(tables: string[], operation: () => Promise<T>): Promise<T> {
    this.ensureInitialized();
    
    // In-memory doesn't need real transactions, just execute the operation
    return await operation();
  }

  async clear(table: string): Promise<void> {
    this.ensureInitialized();
    
    const tableMap = this.getTable(table);
    tableMap.clear();
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();
    
    this.storage.clear();
  }

  async exportAll(): Promise<Record<string, any[]>> {
    this.ensureInitialized();
    
    const result: Record<string, any[]> = {};
    
    for (const [tableName, tableMap] of this.storage.entries()) {
      result[tableName] = Array.from(tableMap.values());
    }
    
    return result;
  }

  async importAll(data: Record<string, any[]>): Promise<void> {
    this.ensureInitialized();
    
    this.storage.clear();
    
    for (const [tableName, records] of Object.entries(data)) {
      const tableMap = this.getTable(tableName);
      records.forEach(record => tableMap.set(record.id, record));
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Test write/read/delete cycle
      const testId = `health-test-${Date.now()}`;
      const testData = { 
        id: testId, 
        key: 'health-check', 
        value: { testId, timestamp: Date.now() },
        created_at: new Date()
      };
      
      // Write test
      await this.create('settings', testData);
      
      // Read test
      const retrieved = await this.getById('settings', testId);
      if (!retrieved || (retrieved as any).value?.testId !== testId) {
        errors.push('Read/write test failed - data integrity issue');
      }
      
      // Delete test
      await this.delete('settings', testId);
      
      // Verify deletion
      const shouldBeGone = await this.getById('settings', testId);
      if (shouldBeGone) {
        errors.push('Delete test failed - record still exists');
      }
      
    } catch (error) {
      errors.push(`Health check failed: ${error.message}`);
    }
    
    return { 
      healthy: errors.length === 0, 
      errors 
    };
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    // Estimate memory usage
    const jsonString = JSON.stringify(Array.from(this.storage.entries()));
    const used = new Blob([jsonString]).size;
    
    return { 
      used, 
      available: 100 * 1024 * 1024, // 100MB available for in-memory
      quota: 100 * 1024 * 1024 
    };
  }

  async destroy(): Promise<void> {
    this.storage.clear();
    this.initialized = false;
    console.log('✅ InMemoryAdapter destroyed');
  }
}