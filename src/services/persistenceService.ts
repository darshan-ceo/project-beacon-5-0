import { AppState, Case, Client, ClientGroup, Court, Judge, Employee, Hearing, Task, Document, Folder } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';

// Entity types for type-safe operations
export type EntityType = 'cases' | 'clients' | 'courts' | 'judges' | 'employees' | 'hearings' | 'tasks' | 'task_notes' | 'task_followups' | 'documents' | 'folders' | 'timeline_entries';

export interface EntityOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: EntityType;
  data?: any;
  timestamp: string;
}

export interface StorageHealth {
  isHealthy: boolean;
  used: number;
  available: number;
  errors: string[];
  quotaWarning: boolean;
}

/**
 * PersistenceService - DEPRECATED in Supabase-only architecture
 * All methods stubbed to prevent IndexedDB usage
 * Use Supabase StorageManager instead
 */
class PersistenceService {
  private operationQueue: EntityOperation[] = [];
  private isProcessing = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('[PersistenceService] DEPRECATED: Use Supabase StorageManager instead');
  }

  // Health monitoring stubbed
  private startHealthMonitoring() {
    // No-op: Supabase-only mode
  }

  async checkStorageHealth(): Promise<StorageHealth> {
    return {
      isHealthy: true,
      used: 0,
      available: 0,
      errors: ['IndexedDB not supported in Supabase-only mode'],
      quotaWarning: false
    };
  }

  // Generic CRUD operations - all stubbed
  async create<T extends { id: string }>(entity: EntityType, data: T): Promise<T> {
    console.warn('[PersistenceService] create() not supported in Supabase-only mode');
    throw new Error('IndexedDB persistence not supported. Use Supabase StorageManager.');
  }

  async update<T extends { id: string }>(entity: EntityType, id: string, updates: Partial<T>): Promise<T> {
    console.warn('[PersistenceService] update() not supported in Supabase-only mode');
    throw new Error('IndexedDB persistence not supported. Use Supabase StorageManager.');
  }

  async delete(entity: EntityType, id: string): Promise<void> {
    console.warn('[PersistenceService] delete() not supported in Supabase-only mode');
    throw new Error('IndexedDB persistence not supported. Use Supabase StorageManager.');
  }

  async getById<T>(entity: EntityType, id: string): Promise<T | null> {
    console.warn('[PersistenceService] getById() not supported in Supabase-only mode');
    return null;
  }

  async getAll<T>(entity: EntityType): Promise<T[]> {
    console.warn('[PersistenceService] getAll() not supported in Supabase-only mode');
    return [];
  }

  async bulkCreate<T extends { id: string }>(entity: EntityType, items: T[]): Promise<T[]> {
    console.warn('[PersistenceService] bulkCreate() not supported in Supabase-only mode');
    throw new Error('IndexedDB persistence not supported. Use Supabase StorageManager.');
  }

  // Data export/import - stubbed
  async exportAllData(): Promise<AppState> {
    console.warn('[PersistenceService] exportAllData() not supported in Supabase-only mode');
    throw new Error('IndexedDB persistence not supported. Use Supabase StorageManager.');
  }

  async importAllData(data: Partial<AppState>): Promise<void> {
    console.warn('[PersistenceService] importAllData() not supported in Supabase-only mode');
    throw new Error('IndexedDB persistence not supported. Use Supabase StorageManager.');
  }

  async clearAllData(): Promise<void> {
    console.warn('[PersistenceService] clearAllData() not supported in Supabase-only mode');
    // No-op: nothing to clear in Supabase-only mode
  }

  async getOperationHistory(): Promise<EntityOperation[]> {
    console.warn('[PersistenceService] getOperationHistory() not supported in Supabase-only mode');
    return [];
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Export singleton instance
export const persistenceService = new PersistenceService();
