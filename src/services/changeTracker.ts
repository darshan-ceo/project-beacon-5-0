/**
 * Change Tracker Service
 * Tracks entity modifications for future API sync
 */

import { STORAGE_KEYS, EntityType } from '@/constants/StorageKeys';
import { ChangeEntry, DirtyEntity, EntityVersion } from '@/types/persistence';
import { storageManager } from '@/data/StorageManager';

class ChangeTrackerService {
  private dirtyEntities: Map<string, DirtyEntity> = new Map();
  private entityVersions: Map<string, EntityVersion> = new Map();
  private changeLog: ChangeEntry[] = [];

  /**
   * Mark an entity as dirty (needs sync)
   */
  markDirty(
    entityType: EntityType,
    entityId: string,
    operation: 'create' | 'update' | 'delete'
  ): void {
    const key = `${entityType}:${entityId}`;
    
    const dirtyEntity: DirtyEntity = {
      entityType,
      entityId,
      lastModified: new Date().toISOString(),
      operation,
    };
    
    this.dirtyEntities.set(key, dirtyEntity);
    
    // Persist to localStorage for recovery
    this.persistDirtyEntities();
    
    console.log(`[ChangeTracker] Marked ${key} as dirty (${operation})`);
  }

  /**
   * Mark an entity as clean (synced)
   */
  markClean(entityType: EntityType, entityId: string): void {
    const key = `${entityType}:${entityId}`;
    this.dirtyEntities.delete(key);
    this.persistDirtyEntities();
    
    console.log(`[ChangeTracker] Marked ${key} as clean`);
  }

  /**
   * Get all dirty entities
   */
  getDirtyEntities(): DirtyEntity[] {
    return Array.from(this.dirtyEntities.values());
  }

  /**
   * Check if entity is dirty
   */
  isDirty(entityType: EntityType, entityId: string): boolean {
    const key = `${entityType}:${entityId}`;
    return this.dirtyEntities.has(key);
  }

  /**
   * Update entity version
   */
  updateVersion(
    entityType: EntityType,
    entityId: string,
    version: number,
    checksum?: string
  ): void {
    const key = `${entityType}:${entityId}`;
    
    const versionInfo: EntityVersion = {
      entityType,
      entityId,
      version,
      lastUpdated: new Date().toISOString(),
      checksum,
    };
    
    this.entityVersions.set(key, versionInfo);
    this.persistVersions();
  }

  /**
   * Get entity version
   */
  getVersion(entityType: EntityType, entityId: string): EntityVersion | undefined {
    const key = `${entityType}:${entityId}`;
    return this.entityVersions.get(key);
  }

  /**
   * Log a change for audit trail
   */
  logChange(
    entityType: EntityType,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    userId?: string
  ): void {
    const version = this.getVersion(entityType, entityId);
    
    const change: ChangeEntry = {
      entityType,
      entityId,
      operation,
      timestamp: new Date().toISOString(),
      version: version?.version || 1,
      userId,
      synced: false,
    };
    
    this.changeLog.push(change);
    
    // Keep only last 1000 changes in memory
    if (this.changeLog.length > 1000) {
      this.changeLog.shift();
    }
  }

  /**
   * Get change log
   */
  getChangeLog(): ChangeEntry[] {
    return [...this.changeLog];
  }

  /**
   * Get changes since a specific timestamp
   */
  getChangesSince(timestamp: string): ChangeEntry[] {
    return this.changeLog.filter(c => c.timestamp > timestamp);
  }

  /**
   * Get unsynced changes
   */
  getUnsyncedChanges(): ChangeEntry[] {
    return this.changeLog.filter(c => !c.synced);
  }

  /**
   * Mark changes as synced
   */
  markChangesSynced(entityIds: string[]): void {
    const idSet = new Set(entityIds);
    
    this.changeLog.forEach(change => {
      if (idSet.has(change.entityId)) {
        change.synced = true;
      }
    });
  }

  /**
   * Clear all tracked changes
   */
  clearAll(): void {
    this.dirtyEntities.clear();
    this.entityVersions.clear();
    this.changeLog = [];
    
    localStorage.removeItem(STORAGE_KEYS.DIRTY_ENTITIES);
    localStorage.removeItem(STORAGE_KEYS.ENTITY_VERSIONS);
  }

  /**
   * Load persisted state
   */
  async initialize(): Promise<void> {
    try {
      // Load dirty entities
      const dirtyJson = localStorage.getItem(STORAGE_KEYS.DIRTY_ENTITIES);
      if (dirtyJson) {
        const dirtyArray: DirtyEntity[] = JSON.parse(dirtyJson);
        dirtyArray.forEach(d => {
          const key = `${d.entityType}:${d.entityId}`;
          this.dirtyEntities.set(key, d);
        });
      }

      // Load entity versions
      const versionsJson = localStorage.getItem(STORAGE_KEYS.ENTITY_VERSIONS);
      if (versionsJson) {
        const versionsArray: EntityVersion[] = JSON.parse(versionsJson);
        versionsArray.forEach(v => {
          const key = `${v.entityType}:${v.entityId}`;
          this.entityVersions.set(key, v);
        });
      }

      console.log(`[ChangeTracker] Initialized with ${this.dirtyEntities.size} dirty entities`);
    } catch (error) {
      console.error('[ChangeTracker] Failed to initialize:', error);
    }
  }

  /**
   * Persist dirty entities to localStorage
   */
  private persistDirtyEntities(): void {
    try {
      const dirtyArray = Array.from(this.dirtyEntities.values());
      localStorage.setItem(STORAGE_KEYS.DIRTY_ENTITIES, JSON.stringify(dirtyArray));
    } catch (error) {
      console.warn('[ChangeTracker] Failed to persist dirty entities:', error);
    }
  }

  /**
   * Persist versions to localStorage
   */
  private persistVersions(): void {
    try {
      const versionsArray = Array.from(this.entityVersions.values());
      localStorage.setItem(STORAGE_KEYS.ENTITY_VERSIONS, JSON.stringify(versionsArray));
    } catch (error) {
      console.warn('[ChangeTracker] Failed to persist versions:', error);
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    dirtyCount: number;
    unsyncedCount: number;
    totalVersions: number;
    changeLogSize: number;
  } {
    return {
      dirtyCount: this.dirtyEntities.size,
      unsyncedCount: this.getUnsyncedChanges().length,
      totalVersions: this.entityVersions.size,
      changeLogSize: this.changeLog.length,
    };
  }
}

export const changeTracker = new ChangeTrackerService();
