/**
 * Persistence Types - Unified types for data persistence layer
 */

import { EntityType } from '@/constants/StorageKeys';

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
  mode: 'local' | 'remote' | 'hybrid';
  autoSave: {
    enabled: boolean;
    interval: number; // milliseconds
    debounceMs: number;
  };
  syncInterval: number; // milliseconds
  conflictResolution: 'local-wins' | 'remote-wins' | 'manual';
  enableChangeTracking: boolean;
  enableVersioning: boolean;
}

/**
 * Versioned entity base interface
 */
export interface VersionedEntity {
  id: string;
  version: number;
  updated_at: string;
  updated_by?: string;
}

/**
 * Change tracking entry
 */
export interface ChangeEntry {
  entityType: EntityType;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: string;
  version: number;
  userId?: string;
  synced: boolean;
}

/**
 * Dirty entity tracker
 */
export interface DirtyEntity {
  entityType: EntityType;
  entityId: string;
  lastModified: string;
  operation: 'create' | 'update' | 'delete';
}

/**
 * Entity version info
 */
export interface EntityVersion {
  entityType: EntityType;
  entityId: string;
  version: number;
  lastUpdated: string;
  checksum?: string;
}

/**
 * Storage health status
 */
export interface StorageHealth {
  healthy: boolean;
  errors: string[];
  info: {
    storage: {
      used: number;
      available: number;
      quota: number;
    };
    repositories: Record<string, boolean>;
  };
}

/**
 * Entity count summary
 */
export interface EntityCounts {
  clients: number;
  cases: number;
  tasks: number;
  task_bundles: number;
  documents: number;
  hearings: number;
  judges: number;
  courts: number;
  employees: number;
  folders: number;
  [key: string]: number;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  migratedIds: Record<string, string>; // old ID -> new UUID
  errors: string[];
  duration: number;
}

/**
 * Default persistence configuration
 */
export const DEFAULT_PERSISTENCE_CONFIG: PersistenceConfig = {
  mode: 'local',
  autoSave: {
    enabled: true,
    interval: 30000, // 30 seconds
    debounceMs: 1000, // 1 second debounce
  },
  syncInterval: 60000, // 1 minute
  conflictResolution: 'local-wins',
  enableChangeTracking: true,
  enableVersioning: true,
};
