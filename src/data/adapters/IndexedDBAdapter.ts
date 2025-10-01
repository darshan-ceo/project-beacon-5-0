/**
 * IndexedDB Adapter using Dexie
 * Primary storage implementation for the application
 */

import { StoragePort } from '../ports/StoragePort';
import { db, initializeDatabase, generateId } from '../db';
import { Table } from 'dexie';

export class IndexedDBAdapter implements StoragePort {
  private initialized = false;
  
  // Table name mapping for entity keys to database table names
  private tableMapping: Record<string, string> = {
    'userRoles': 'user_roles',
    'policyAudit': 'policy_audit',
    'taskBundles': 'task_bundles',
    // Add other mappings as needed
    // Default: entity key matches table name
  };

  constructor() {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await initializeDatabase();
      this.initialized = true;
      console.log('✅ IndexedDBAdapter initialized');
    } catch (error) {
      console.error('❌ Failed to initialize IndexedDBAdapter:', error);
      throw error;
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('IndexedDBAdapter not initialized. Call initialize() first.');
    }
  }

  private getActualTableName(entityKey: string): string {
    return this.tableMapping[entityKey] || entityKey;
  }

  private getTable(entityKey: string): Table<any, string> {
    const actualTableName = this.getActualTableName(entityKey);
    const table = (db as any)[actualTableName];
    if (!table) {
      throw new Error(`Table '${actualTableName}' not found in database schema for entity '${entityKey}'`);
    }
    return table;
  }

  async create<T extends { id: string }>(entityKey: string, data: T): Promise<T> {
    this.ensureInitialized();
    
    const table = this.getTable(entityKey);
    const dataWithId = { 
      ...data, 
      id: data.id || generateId(),
      created_at: (data as any).created_at || new Date()
    } as T;
    
    await table.add(dataWithId);
    return dataWithId;
  }

  async update<T extends { id: string }>(entityKey: string, id: string, updates: Partial<T>): Promise<T> {
    this.ensureInitialized();
    
    const table = this.getTable(entityKey);
    const existing = await table.get(id);
    
    if (!existing) {
      throw new Error(`Record with id '${id}' not found in table '${entityKey}'`);
    }

    const updatedData = { 
      ...existing, 
      ...updates, 
      updated_at: new Date() 
    };
    
    await table.update(id, updatedData);
    return updatedData as T;
  }

  async delete(entityKey: string, id: string): Promise<void> {
    this.ensureInitialized();
    
    const table = this.getTable(entityKey);
    const count = await table.where('id').equals(id).delete();
    
    if (count === 0) {
      throw new Error(`Record with id '${id}' not found in table '${entityKey}'`);
    }
  }

  async getById<T>(entityKey: string, id: string): Promise<T | null> {
    this.ensureInitialized();
    
    const table = this.getTable(entityKey);
    const result = await table.get(id);
    return result || null;
  }

  async getAll<T>(entityKey: string): Promise<T[]> {
    this.ensureInitialized();
    
    const table = this.getTable(entityKey);
    return await table.toArray();
  }

  async query<T>(entityKey: string, filter?: (item: T) => boolean): Promise<T[]> {
    this.ensureInitialized();
    
    const table = this.getTable(entityKey);
    let collection = table.toCollection();
    
    if (filter) {
      collection = collection.filter(filter);
    }
    
    return collection.toArray();
  }

  async bulkCreate<T extends { id: string }>(entityKey: string, items: T[]): Promise<T[]> {
    this.ensureInitialized();
    
    const table = this.getTable(entityKey);
    const itemsWithId = items.map(item => ({
      ...item,
      id: item.id || generateId(),
      created_at: (item as any).created_at || new Date()
    }));
    
    await table.bulkAdd(itemsWithId);
    return itemsWithId as T[];
  }

  async bulkUpdate<T extends { id: string }>(entityKey: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    this.ensureInitialized();
    
    const table = this.getTable(entityKey);
    const results: T[] = [];
    
    for (const update of updates) {
      const existing = await table.get(update.id);
      if (existing) {
        const updatedItem = {
          ...existing,
          ...update.data,
          updated_at: new Date()
        };
        await table.update(update.id, updatedItem);
        results.push(updatedItem as T);
      }
    }
    
    return results;
  }

  async queryByField<T>(entityKey: string, field: string, value: any): Promise<T[]> {
    this.ensureInitialized();
    
    const table = this.getTable(entityKey);
    return table.where(field).equals(value).toArray();
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();
    
    // Clear all tables
    const tables = Object.keys(db.tables);
    await Promise.all(tables.map(tableName => db.table(tableName).clear()));
  }

  async exportAll(): Promise<Record<string, any[]>> {
    this.ensureInitialized();
    
    const data: Record<string, any[]> = {};
    const entityKeys = [
      'clients', 'cases', 'tasks', 'hearings', 'documents', 
      'judges', 'courts', 'employees', 'folders',
      'roles', 'permissions', 'userRoles', 'policyAudit'
    ];
    
    for (const entityKey of entityKeys) {
      try {
        data[entityKey] = await this.getAll(entityKey);
      } catch (error) {
        data[entityKey] = [];
      }
    }
    
    return data;
  }

  async importAll(data: Record<string, any[]>): Promise<void> {
    this.ensureInitialized();
    
    for (const [entityKey, items] of Object.entries(data)) {
      if (items && items.length > 0) {
        await this.clear(entityKey);
        await this.bulkCreate(entityKey, items);
      }
    }
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0),
          quota: estimate.quota || 0
        };
      }
    } catch (error) {
      console.warn('Could not get storage info:', error);
    }
    
    return { used: 0, available: 0, quota: 0 };
  }

  async destroy(): Promise<void> {
    this.ensureInitialized();
    
    try {
      await db.close();
      await db.delete();
      this.initialized = false;
      console.log('✅ Database destroyed successfully');
    } catch (error) {
      console.error('❌ Failed to destroy database:', error);
      throw error;
    }
  }

  async bulkDelete(entityKey: string, ids: string[]): Promise<void> {
    this.ensureInitialized();
    
    const table = this.getTable(entityKey);
    await table.bulkDelete(ids);
  }

  async count(entityKey: string): Promise<number> {
    this.ensureInitialized();
    
    const table = this.getTable(entityKey);
    return await table.count();
  }

  async clear(entityKey: string): Promise<void> {
    this.ensureInitialized();
    
    const table = this.getTable(entityKey);
    await table.clear();
  }

  async healthCheck(): Promise<{ healthy: boolean; errors: string[] }> {
    try {
      if (!this.initialized) {
        return {
          healthy: false,
          errors: ['IndexedDBAdapter not initialized']
        };
      }

      // Test database connectivity
      const testTable = this.getTable('clients');
      await testTable.limit(1).toArray();

      return {
        healthy: true,
        errors: []
      };
    } catch (error) {
      return {
        healthy: false,
        errors: [`Database health check failed: ${error}`]
      };
    }
  }

  async transaction<T>(entityKeys: string[], callback: () => Promise<T>): Promise<T> {
    this.ensureInitialized();
    
    const actualTableNames = entityKeys.map(key => this.getActualTableName(key));
    return db.transaction('rw', actualTableNames, callback);
  }

  // Statistics and debugging
  async getStats(): Promise<{ [table: string]: number }> {
    this.ensureInitialized();
    
    const stats: { [table: string]: number } = {};
    
    try {
      // Count all major entities
      const entityKeys = [
        'clients', 'cases', 'tasks', 'hearings', 'documents', 
        'judges', 'courts', 'employees', 'folders',
        'roles', 'permissions', 'userRoles', 'policyAudit'
      ];
      
      for (const entityKey of entityKeys) {
        try {
          const count = await this.count(entityKey);
          stats[entityKey] = count;
        } catch (error) {
          // Table might not exist, set to 0
          stats[entityKey] = 0;
        }
      }
    } catch (error) {
      console.warn('Failed to collect storage stats:', error);
    }
    
    return stats;
  }

  // Development helpers
  async dumpData(entityKey: string): Promise<any[]> {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('dumpData is only available in development mode');
    }
    
    this.ensureInitialized();
    return this.getAll(entityKey);
  }

  async importData(entityKey: string, data: any[]): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('importData is only available in development mode');
    }
    
    this.ensureInitialized();
    await this.clear(entityKey);
    await this.bulkCreate(entityKey, data);
  }

  // Version control methods
  async getVersion(table: string, id: string): Promise<number> {
    this.ensureInitialized();
    const item = await this.getById<any>(table, id);
    return item?.version || 0;
  }

  compareVersions(v1: number, v2: number): 'equal' | 'before' | 'after' {
    if (v1 === v2) return 'equal';
    return v1 < v2 ? 'before' : 'after';
  }

  bumpVersion<T extends import('../ports/StoragePort').VersionedEntity>(entity: T, userId?: string): T {
    const currentVersion = entity.version || 0;
    return {
      ...entity,
      version: currentVersion + 1,
      last_modified_at: new Date().toISOString(),
      last_modified_by: userId,
      sync_status: 'pending',
    };
  }
}