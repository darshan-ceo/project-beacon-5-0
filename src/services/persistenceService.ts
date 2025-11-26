/**
 * PersistenceService - DEPRECATED
 * App now uses Supabase exclusively via StorageManager and usePersistentDispatch
 * This service is kept for backward compatibility but all methods are no-ops
 */

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
 * DEPRECATED: This service is no longer used
 * All persistence operations now go through Supabase via:
 * - StorageManager.getInstance().getStorage()
 * - usePersistentDispatch hook
 * - Individual entity services (casesService, clientsService, etc.)
 */
class PersistenceService {
  private operationQueue: EntityOperation[] = [];
  private isProcessing = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.warn('[PersistenceService] DEPRECATED - Use Supabase services instead');
  }

  // Health monitoring with adaptive frequency
  private startHealthMonitoring() {
    // No-op: health monitoring handled by Supabase
  }

  private restartHealthMonitoring(newFrequency: number) {
    // No-op
  }

  async checkStorageHealth(): Promise<StorageHealth> {
    console.warn('[PersistenceService] checkStorageHealth called - use Supabase health checks instead');
    return {
      isHealthy: true,
      used: 0,
      available: 0,
      errors: [],
      quotaWarning: false
    };
  }

  async create<T extends { id: string }>(entity: EntityType, data: T): Promise<T> {
    console.warn('[PersistenceService] create called - use entity services (casesService, clientsService, etc.) instead');
    throw new Error('PersistenceService is deprecated - use Supabase entity services');
  }

  async update<T extends { id: string }>(entity: EntityType, id: string, updates: Partial<T>): Promise<T> {
    console.warn('[PersistenceService] update called - use entity services instead');
    throw new Error('PersistenceService is deprecated - use Supabase entity services');
  }

  async delete(entity: EntityType, id: string): Promise<void> {
    console.warn('[PersistenceService] delete called - use entity services instead');
    throw new Error('PersistenceService is deprecated - use Supabase entity services');
  }

  async getById<T>(entity: EntityType, id: string): Promise<T | null> {
    console.warn('[PersistenceService] getById called - use Supabase queries instead');
    return null;
  }

  async getAll<T>(entity: EntityType): Promise<T[]> {
    console.warn('[PersistenceService] getAll called - use Supabase queries instead');
    return [];
  }

  async checkDependencies(entity: EntityType, id: string): Promise<void> {
    // No-op
  }

  async logOperation(type: EntityOperation['type'], entity: EntityType, id: string, data?: any): Promise<void> {
    // No-op: operations logged in Supabase audit_log table
  }

  async bulkCreate<T extends { id: string }>(entity: EntityType, items: T[]): Promise<T[]> {
    console.warn('[PersistenceService] bulkCreate called - use StorageManager.getStorage().bulkCreate() instead');
    throw new Error('PersistenceService is deprecated - use Supabase services');
  }

  async exportAllData(): Promise<AppState> {
    console.warn('[PersistenceService] exportAllData called - use Supabase export instead');
    throw new Error('PersistenceService is deprecated');
  }

  async importAllData(data: Partial<AppState>): Promise<void> {
    console.warn('[PersistenceService] importAllData called - use Supabase import instead');
    throw new Error('PersistenceService is deprecated');
  }

  async clearAllData(): Promise<void> {
    console.warn('[PersistenceService] clearAllData called - use Supabase clear operations instead');
    throw new Error('PersistenceService is deprecated');
  }

  async getOperationHistory(): Promise<EntityOperation[]> {
    console.warn('[PersistenceService] getOperationHistory called - use Supabase audit_log table instead');
    return [];
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export const persistenceService = new PersistenceService();
