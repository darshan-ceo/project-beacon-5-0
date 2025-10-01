/**
 * Change Tracking Service
 * Tracks field-level changes with diff generation and version bumping
 */

import { eventBusService } from './eventBusService';

export interface EntityChange {
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  before?: Record<string, any>;
  after?: Record<string, any>;
  diff?: Record<string, { old: any; new: any }>;
  version: number;
  timestamp: string;
  userId?: string;
}

class ChangeTrackingService {
  /**
   * Track a change to an entity
   */
  trackChange(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    before?: any,
    after?: any,
    userId?: string
  ): EntityChange {
    const change: EntityChange = {
      entityType,
      entityId,
      operation,
      before,
      after,
      version: after?.version || 1,
      timestamp: new Date().toISOString(),
      userId,
    };

    // Generate diff for updates
    if (operation === 'update' && before && after) {
      change.diff = this.generateDiff(before, after);
    }

    // Emit change event
    eventBusService.emit(`entity:${operation}`, {
      entityType,
      entityId,
      change,
    });

    return change;
  }

  /**
   * Generate field-level diff between two objects
   */
  generateDiff(
    before: Record<string, any>,
    after: Record<string, any>
  ): Record<string, { old: any; new: any }> {
    const diff: Record<string, { old: any; new: any }> = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      // Skip version and metadata fields
      if (
        key === 'version' ||
        key === 'last_modified_at' ||
        key === 'last_modified_by' ||
        key === 'sync_status' ||
        key === 'conflict_data'
      ) {
        continue;
      }

      const oldValue = before[key];
      const newValue = after[key];

      // Deep comparison for objects and arrays
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        diff[key] = {
          old: oldValue,
          new: newValue,
        };
      }
    }

    return diff;
  }

  /**
   * Bump version number for an entity
   */
  bumpVersion(entity: any, userId?: string): any {
    const currentVersion = entity.version || 0;
    
    return {
      ...entity,
      version: currentVersion + 1,
      last_modified_at: new Date().toISOString(),
      last_modified_by: userId,
      sync_status: 'pending',
    };
  }

  /**
   * Get change history for an entity (placeholder for future audit log integration)
   */
  async getChangeHistory(
    entityType: string,
    entityId: string
  ): Promise<EntityChange[]> {
    // This will integrate with AuditService in the future
    // For now, return empty array
    console.log('getChangeHistory called for', entityType, entityId);
    return [];
  }

  /**
   * Check if entity has pending changes
   */
  hasPendingChanges(entity: any): boolean {
    return entity.sync_status === 'pending';
  }

  /**
   * Mark entity as synced
   */
  markAsSynced(entity: any): any {
    return {
      ...entity,
      sync_status: 'synced',
    };
  }

  /**
   * Mark entity as conflicted
   */
  markAsConflicted(entity: any, conflictData: any): any {
    return {
      ...entity,
      sync_status: 'conflict',
      conflict_data: conflictData,
    };
  }

  /**
   * Get summary of changes
   */
  getChangeSummary(diff: Record<string, { old: any; new: any }>): {
    fieldCount: number;
    fields: string[];
    summary: string;
  } {
    const fields = Object.keys(diff);
    const fieldCount = fields.length;

    let summary = '';
    if (fieldCount === 0) {
      summary = 'No changes';
    } else if (fieldCount === 1) {
      summary = `Changed ${fields[0]}`;
    } else {
      summary = `Changed ${fieldCount} fields: ${fields.slice(0, 3).join(', ')}${
        fieldCount > 3 ? '...' : ''
      }`;
    }

    return {
      fieldCount,
      fields,
      summary,
    };
  }
}

export const changeTrackingService = new ChangeTrackingService();
