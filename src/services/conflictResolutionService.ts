/**
 * Conflict Resolution Service
 * Handles concurrent modification detection and resolution strategies
 */

export interface ConflictData {
  conflictedAt: string;
  localVersion: number;
  remoteVersion: number;
  localChanges: Record<string, any>;
  remoteChanges: Record<string, any>;
  resolutionStrategy?: 'last-write-wins' | 'manual' | 'field-level-merge';
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface VersionedEntity {
  id: string;
  version: number;
  last_modified_by?: string;
  last_modified_at?: string;
  conflict_data?: ConflictData;
  sync_status?: 'synced' | 'pending' | 'conflict';
}

export type MergeStrategy = 'last-write-wins' | 'manual' | 'field-level-merge';

class ConflictResolutionService {
  /**
   * Detect if there's a conflict between local and remote versions
   */
  detectConflict(
    localEntity: VersionedEntity,
    remoteEntity: VersionedEntity
  ): boolean {
    // If versions are the same, no conflict
    if (localEntity.version === remoteEntity.version) {
      return false;
    }

    // If local version is higher, local changes haven't been synced yet
    if (localEntity.version > remoteEntity.version) {
      return false;
    }

    // If remote version is higher and local has pending changes, conflict exists
    if (
      remoteEntity.version > localEntity.version &&
      localEntity.sync_status === 'pending'
    ) {
      return true;
    }

    return false;
  }

  /**
   * Compare versions using vector clock logic
   */
  compareVersions(
    version1: number,
    version2: number
  ): 'equal' | 'before' | 'after' | 'concurrent' {
    if (version1 === version2) return 'equal';
    if (version1 < version2) return 'before';
    if (version1 > version2) return 'after';
    return 'concurrent';
  }

  /**
   * Resolve conflict using specified strategy
   */
  resolveConflict<T extends VersionedEntity>(
    localEntity: T,
    remoteEntity: T,
    strategy: MergeStrategy = 'last-write-wins',
    userId?: string
  ): T {
    switch (strategy) {
      case 'last-write-wins':
        return this.lastWriteWins(localEntity, remoteEntity);
      
      case 'field-level-merge':
        return this.fieldLevelMerge(localEntity, remoteEntity, userId);
      
      case 'manual':
        // Return local with conflict data for manual resolution
        return {
          ...localEntity,
          sync_status: 'conflict',
          conflict_data: this.buildConflictData(localEntity, remoteEntity),
        };
      
      default:
        return this.lastWriteWins(localEntity, remoteEntity);
    }
  }

  /**
   * Last-write-wins strategy: Use the entity with the latest timestamp
   */
  private lastWriteWins<T extends VersionedEntity>(
    localEntity: T,
    remoteEntity: T
  ): T {
    const localTime = new Date(localEntity.last_modified_at || 0).getTime();
    const remoteTime = new Date(remoteEntity.last_modified_at || 0).getTime();

    const winner = remoteTime > localTime ? remoteEntity : localEntity;
    
    return {
      ...winner,
      sync_status: 'synced',
      conflict_data: undefined,
    };
  }

  /**
   * Field-level merge: Merge non-conflicting fields
   */
  private fieldLevelMerge<T extends VersionedEntity>(
    localEntity: T,
    remoteEntity: T,
    userId?: string
  ): T {
    const merged = { ...remoteEntity };
    const localChanges: Record<string, any> = {};
    const remoteChanges: Record<string, any> = {};

    // Compare each field
    for (const key in localEntity) {
      if (
        key === 'version' ||
        key === 'conflict_data' ||
        key === 'sync_status'
      ) {
        continue;
      }

      const localValue = localEntity[key];
      const remoteValue = remoteEntity[key];

      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        localChanges[key] = localValue;
        remoteChanges[key] = remoteValue;

        // For now, prefer remote changes
        // In a real implementation, you'd have more sophisticated logic
        merged[key] = remoteValue;
      }
    }

    // If there were conflicting fields, mark as resolved
    const hasConflicts = Object.keys(localChanges).length > 0;

    return {
      ...merged,
      version: Math.max(localEntity.version, remoteEntity.version) + 1,
      last_modified_by: userId,
      last_modified_at: new Date().toISOString(),
      sync_status: 'synced',
      conflict_data: hasConflicts
        ? {
            conflictedAt: new Date().toISOString(),
            localVersion: localEntity.version,
            remoteVersion: remoteEntity.version,
            localChanges,
            remoteChanges,
            resolutionStrategy: 'field-level-merge',
            resolvedBy: userId,
            resolvedAt: new Date().toISOString(),
          }
        : undefined,
    };
  }

  /**
   * Build conflict data for manual resolution
   */
  private buildConflictData(
    localEntity: VersionedEntity,
    remoteEntity: VersionedEntity
  ): ConflictData {
    const localChanges: Record<string, any> = {};
    const remoteChanges: Record<string, any> = {};

    for (const key in localEntity) {
      if (
        key === 'version' ||
        key === 'conflict_data' ||
        key === 'sync_status'
      ) {
        continue;
      }

      const localValue = (localEntity as any)[key];
      const remoteValue = (remoteEntity as any)[key];

      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        localChanges[key] = localValue;
        remoteChanges[key] = remoteValue;
      }
    }

    return {
      conflictedAt: new Date().toISOString(),
      localVersion: localEntity.version,
      remoteVersion: remoteEntity.version,
      localChanges,
      remoteChanges,
      resolutionStrategy: 'manual',
    };
  }

  /**
   * Get conflict summary for UI display
   */
  getConflictSummary(conflictData: ConflictData): {
    fieldCount: number;
    fields: string[];
    requiresManualResolution: boolean;
  } {
    const fields = Object.keys(conflictData.localChanges);
    
    return {
      fieldCount: fields.length,
      fields,
      requiresManualResolution: conflictData.resolutionStrategy === 'manual',
    };
  }
}

export const conflictResolutionService = new ConflictResolutionService();
