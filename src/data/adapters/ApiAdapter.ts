/**
 * API Storage Adapter - Stub for future Postgres API
 * This will handle remote persistence when ready
 */

import { StoragePort, StorageConfig } from '../ports/StoragePort';

export class ApiAdapter implements StoragePort {
  private initialized = false;
  private baseUrl: string;

  constructor(private config: StorageConfig & { apiBaseUrl?: string }) {
    this.baseUrl = config.apiBaseUrl || 'http://localhost:3001/api';
  }

  async initialize(): Promise<void> {
    // Feature flag check - if API mode is not enabled, throw error
    const isApiModeEnabled = process.env.DEV_MODE === 'api';
    
    if (!isApiModeEnabled) {
      throw new Error('API mode not enabled. Set DEV_MODE=api to use ApiAdapter');
    }
    
    // TODO: Implement API health check and authentication
    // await this.authenticateWithAPI();
    // await this.validateAPIConnection();
    
    this.initialized = true;
    console.log('✅ ApiAdapter initialized (stub mode)');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('ApiAdapter not initialized. Call initialize() first.');
    }
  }

  async create<T extends { id: string }>(table: string, data: T): Promise<T> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    // const response = await fetch(`${this.baseUrl}/${table}`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });
    // return response.json();
    
    throw new Error('ApiAdapter.create not yet implemented');
  }

  async update<T extends { id: string }>(table: string, id: string, updates: Partial<T>): Promise<T> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    throw new Error('ApiAdapter.update not yet implemented');
  }

  async delete(table: string, id: string): Promise<void> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    throw new Error('ApiAdapter.delete not yet implemented');
  }

  async getById<T>(table: string, id: string): Promise<T | null> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    throw new Error('ApiAdapter.getById not yet implemented');
  }

  async getAll<T>(table: string): Promise<T[]> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    throw new Error('ApiAdapter.getAll not yet implemented');
  }

  async bulkCreate<T extends { id: string }>(table: string, items: T[]): Promise<T[]> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    throw new Error('ApiAdapter.bulkCreate not yet implemented');
  }

  async bulkUpdate<T extends { id: string }>(table: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    throw new Error('ApiAdapter.bulkUpdate not yet implemented');
  }

  async bulkDelete(table: string, ids: string[]): Promise<void> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    throw new Error('ApiAdapter.bulkDelete not yet implemented');
  }

  async query<T>(table: string, filter?: (item: T) => boolean): Promise<T[]> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call with query parameters
    throw new Error('ApiAdapter.query not yet implemented');
  }

  async queryByField<T>(table: string, field: string, value: any): Promise<T[]> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    throw new Error('ApiAdapter.queryByField not yet implemented');
  }

  async transaction<T>(tables: string[], operation: () => Promise<T>): Promise<T> {
    this.ensureInitialized();
    
    // TODO: Implement API transaction support
    throw new Error('ApiAdapter.transaction not yet implemented');
  }

  async clear(table: string): Promise<void> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    throw new Error('ApiAdapter.clear not yet implemented');
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    throw new Error('ApiAdapter.clearAll not yet implemented');
  }

  async exportAll(): Promise<Record<string, any[]>> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    throw new Error('ApiAdapter.exportAll not yet implemented');
  }

  async importAll(data: Record<string, any[]>): Promise<void> {
    this.ensureInitialized();
    
    // TODO: Implement actual API call
    throw new Error('ApiAdapter.importAll not yet implemented');
  }

  async healthCheck(): Promise<{ healthy: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // TODO: Implement actual API health check
      // const response = await fetch(`${this.baseUrl}/health`);
      // if (!response.ok) {
      //   errors.push(`API health check failed: ${response.status}`);
      // }
      
    } catch (error) {
      errors.push(`API health check failed: ${error.message}`);
    }
    
    return { 
      healthy: errors.length === 0, 
      errors 
    };
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    // TODO: Get storage info from API
    return { 
      used: 0, 
      available: Number.MAX_SAFE_INTEGER, 
      quota: Number.MAX_SAFE_INTEGER 
    };
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    console.log('✅ ApiAdapter destroyed');
  }
}