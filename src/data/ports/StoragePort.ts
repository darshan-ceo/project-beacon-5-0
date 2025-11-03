/**
 * Storage Port Interface - defines the contract for all storage operations
 * Supports IndexedDB, InMemory, and future API adapters
 */

export interface VersionedEntity {
  id: string;
  version?: number;
  last_modified_at?: string;
  last_modified_by?: string;
  sync_status?: 'synced' | 'pending' | 'conflict';
  conflict_data?: any;
}

export interface StoragePort {
  // Basic CRUD operations
  create<T extends { id: string }>(table: string, data: T): Promise<T>;
  update<T extends { id: string }>(table: string, id: string, updates: Partial<T>): Promise<T>;
  delete(table: string, id: string): Promise<void>;
  getById<T>(table: string, id: string): Promise<T | null>;
  getAll<T>(table: string): Promise<T[]>;
  
  // Bulk operations
  bulkCreate<T extends { id: string }>(table: string, items: T[]): Promise<T[]>;
  bulkUpdate<T extends { id: string }>(table: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]>;
  bulkDelete(table: string, ids: string[]): Promise<void>;
  
  // Query operations
  query<T>(table: string, filter?: (item: T) => boolean): Promise<T[]>;
  queryByField<T>(table: string, field: string, value: any): Promise<T[]>;
  
  // Transaction support
  transaction<T>(tables: string[], operation: () => Promise<T>): Promise<T>;
  
  // Storage management
  clear(table: string): Promise<void>;
  clearAll(): Promise<void>;
  exportAll(): Promise<Record<string, any[]>>;
  importAll(data: Record<string, any[]>): Promise<void>;
  
  // Health and diagnostics
  healthCheck(): Promise<{ healthy: boolean; errors: string[] }>;
  getStorageInfo(): Promise<{ used: number; available: number; quota: number }>;
  
  // Version control
  getVersion(table: string, id: string): Promise<number>;
  compareVersions(v1: number, v2: number): 'equal' | 'before' | 'after';
  bumpVersion<T extends VersionedEntity>(entity: T, userId?: string): T;
  
  // Lifecycle
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

export interface StorageConfig {
  databaseName: string;
  version: number;
  migrationMode?: 'auto' | 'manual';
}

export type EntityType = 
  | 'clients' | 'cases' | 'hearings' 
  | 'tasks' | 'task_notes' | 'task_followups' | 'task_bundles' | 'task_bundle_items' 
  | 'documents' | 'document_folders' | 'document_tags' | 'document_versions'
  | 'courts' | 'judges' | 'employees'
  | 'audit_log' | 'automation_rules' | 'automation_logs'
  | 'timeline_entries' | 'profiles';