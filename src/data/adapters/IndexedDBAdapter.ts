/**
 * IndexedDB Adapter using Dexie
 * Primary storage implementation for the application
 */

import { StoragePort } from '../ports/StoragePort';
import { db, initializeDatabase, generateId } from '../db';
import { Table } from 'dexie';

export class IndexedDBAdapter implements StoragePort {
  private initialized = false;

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

  private getTable(tableName: string): Table<any, string> {
    const table = (db as any)[tableName];
    if (!table) {
      throw new Error(`Table '${tableName}' not found in database schema`);
    }
    return table;
  }

  async create<T extends { id: string }>(table: string, data: T): Promise<T> {
    this.ensureInitialized();
    
    const tableRef = this.getTable(table);
    const dataWithId = { 
      ...data, 
      id: data.id || generateId(),
      created_at: (data as any).created_at || new Date()
    } as T;
    
    await tableRef.add(dataWithId);
    return dataWithId;
  }

  async update<T extends { id: string }>(table: string, id: string, updates: Partial<T>): Promise<T> {
    this.ensureInitialized();
    
    const tableRef = this.getTable(table);
    const existing = await tableRef.get(id);
    
    if (!existing) {
      throw new Error(`Record with id '${id}' not found in table '${table}'`);
    }

    const updatedData = { 
      ...existing, 
      ...updates, 
      updated_at: new Date() 
    };
    
    await tableRef.update(id, updatedData);
    return updatedData;
  }

  async delete(table: string, id: string): Promise<void> {
    this.ensureInitialized();
    
    const tableRef = this.getTable(table);
    const count = await tableRef.where('id').equals(id).delete();
    
    if (count === 0) {
      throw new Error(`Record with id '${id}' not found in table '${table}'`);
    }
  }

  async getById<T>(table: string, id: string): Promise<T | null> {
    this.ensureInitialized();
    
    const tableRef = this.getTable(table);
    const result = await tableRef.get(id);
    return result || null;
  }

  async getAll<T>(table: string): Promise<T[]> {
    this.ensureInitialized();
    
    const tableRef = this.getTable(table);
    return await tableRef.toArray();
  }

  async bulkCreate<T extends { id: string }>(table: string, items: T[]): Promise<T[]> {
    this.ensureInitialized();
    
    const tableRef = this.getTable(table);
    const itemsWithId = items.map(item => ({
      ...item,
      id: item.id || generateId(),
      created_at: (item as any).created_at || new Date()
    })) as T[];
    
    await tableRef.bulkAdd(itemsWithId);
    return itemsWithId;
  }

  async bulkUpdate<T extends { id: string }>(table: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    this.ensureInitialized();
    
    const tableRef = this.getTable(table);
    const results: T[] = [];
    
    await db.transaction('rw', tableRef, async () => {
      for (const update of updates) {
        const existing = await tableRef.get(update.id);
        if (existing) {
          const updatedData = { 
            ...existing, 
            ...update.data, 
            updated_at: new Date() 
          };
          await tableRef.update(update.id, updatedData);
          results.push(updatedData);
        }
      }
    });
    
    return results;
  }

  async bulkDelete(table: string, ids: string[]): Promise<void> {
    this.ensureInitialized();
    
    const tableRef = this.getTable(table);
    await tableRef.where('id').anyOf(ids).delete();
  }

  async query<T>(table: string, filter?: (item: T) => boolean): Promise<T[]> {
    this.ensureInitialized();
    
    const tableRef = this.getTable(table);
    let collection = tableRef.toCollection();
    
    if (filter) {
      collection = collection.filter(filter);
    }
    
    return await collection.toArray();
  }

  async queryByField<T>(table: string, field: string, value: any): Promise<T[]> {
    this.ensureInitialized();
    
    const tableRef = this.getTable(table);
    return await tableRef.where(field).equals(value).toArray();
  }

  async transaction<T>(tables: string[], operation: () => Promise<T>): Promise<T> {
    this.ensureInitialized();
    
    const tableRefs = tables.map(tableName => this.getTable(tableName));
    return await db.transaction('rw', tableRefs, operation);
  }

  async clear(table: string): Promise<void> {
    this.ensureInitialized();
    
    const tableRef = this.getTable(table);
    await tableRef.clear();
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();
    
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map(table => table.clear()));
    });
  }

  async exportAll(): Promise<Record<string, any[]>> {
    this.ensureInitialized();
    
    const result: Record<string, any[]> = {};
    
    for (const table of db.tables) {
      result[table.name] = await table.toArray();
    }
    
    return result;
  }

  async importAll(data: Record<string, any[]>): Promise<void> {
    this.ensureInitialized();
    
    await db.transaction('rw', db.tables, async () => {
      // Clear existing data
      await Promise.all(db.tables.map(table => table.clear()));
      
      // Import new data
      for (const [tableName, records] of Object.entries(data)) {
        const table = this.getTable(tableName);
        if (records && records.length > 0) {
          await table.bulkAdd(records);
        }
      }
    });
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
      await db.settings.add(testData);
      
      // Read test
      const retrieved = await db.settings.get(testId);
      if (!retrieved || retrieved.value.testId !== testId) {
        errors.push('Read/write test failed - data integrity issue');
      }
      
      // Delete test
      await db.settings.delete(testId);
      
      // Verify deletion
      const shouldBeGone = await db.settings.get(testId);
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
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const used = estimate.usage || 0;
        const available = quota - used;
        
        return { used, available, quota };
      }
    } catch (error) {
      console.warn('Failed to get storage estimate:', error);
    }
    
    return { used: 0, available: 0, quota: 0 };
  }

  async destroy(): Promise<void> {
    try {
      await db.close();
      this.initialized = false;
      console.log('✅ IndexedDBAdapter destroyed');
    } catch (error) {
      console.error('❌ Failed to destroy IndexedDBAdapter:', error);
      throw error;
    }
  }
}