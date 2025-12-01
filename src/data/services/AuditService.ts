/**
 * Audit Service
 * Tracks all data changes for audit trail and conflict resolution
 */

import { StoragePort } from '../ports/StoragePort';
import { changeTrackingService, EntityChange } from '../../services/changeTrackingService';

export interface AuditLog {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string | null;
  action_type: string;
  user_id?: string;
  timestamp: string;
  details?: any;
  user_agent?: string;
}

export class AuditService {
  constructor(private storage: StoragePort) {}

  /**
   * Log an audit entry (alias for logAudit)
   */
  async log(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    userId?: string,
    before?: any,
    after?: any
  ): Promise<AuditLog> {
    return this.logAudit(entityType, entityId, operation, userId, before, after);
  }

  /**
   * Log an audit entry
   */
  async logAudit(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    userId?: string,
    before?: any,
    after?: any
  ): Promise<AuditLog> {
    try {
      // Track the change
      const change = changeTrackingService.trackChange(
        entityType,
        entityId,
        operation,
        before,
        after,
        userId
      );

      // Get tenant_id from storage adapter
      const tenantId = (this.storage as any).getTenantId?.() || null;
      if (!tenantId) {
        console.warn('⚠️ Audit log skipped: tenant_id not available');
        return this.createEmptyAuditLog(entityType, entityId, operation);
      }

      // Validate entity_id is UUID or convert to null
      const validEntityId = this.isValidUUID(entityId) ? entityId : null;
      if (!validEntityId) {
        console.warn(`⚠️ Non-UUID entity_id "${entityId}" converted to null for audit log`);
      }

      // Create audit log entry matching database schema
      const auditLog: AuditLog = {
        id: crypto.randomUUID(), // Generate proper UUID
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: validEntityId,
        action_type: operation, // Map operation -> action_type
        user_id: userId,
        timestamp: change.timestamp,
        details: { // Combine changes_json and diff_json into details
          before,
          after,
          diff: change.diff,
          version: change.version
        },
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      };

      // Store in audit_log table (mapped from audit_logs)
      await this.storage.create('audit_logs', auditLog);

      return auditLog;
    } catch (error) {
      // Make audit logging fault-tolerant - log warning but don't throw
      console.warn('⚠️ Audit logging failed (non-fatal):', error);
      return this.createEmptyAuditLog(entityType, entityId, operation);
    }
  }

  /**
   * Create empty audit log for fallback
   */
  private createEmptyAuditLog(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete'
  ): AuditLog {
    return {
      id: crypto.randomUUID(),
      tenant_id: '',
      entity_type: entityType,
      entity_id: null,
      action_type: operation,
      timestamp: new Date().toISOString(),
      details: {}
    };
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Get audit history for an entity
   */
  async getAuditHistory(
    entityType: string,
    entityId: string,
    limit?: number
  ): Promise<AuditLog[]> {
    const allLogs = await this.storage.query<AuditLog>(
      'audit_logs',
      (log) => log.entity_type === entityType && log.entity_id === entityId
    );

    // Sort by timestamp descending
    const sorted = allLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get recent audit logs
   */
  async getRecentAudits(limit: number = 50): Promise<AuditLog[]> {
    const allLogs = await this.storage.getAll<AuditLog>('audit_logs');
    
    return allLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get audit logs by user
   */
  async getAuditsByUser(userId: string, limit?: number): Promise<AuditLog[]> {
    const logs = await this.storage.query<AuditLog>(
      'audit_logs',
      (log) => log.user_id === userId
    );

    const sorted = logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get audit logs by operation type
   */
  async getAuditsByOperation(
    operation: 'create' | 'update' | 'delete',
    limit?: number
  ): Promise<AuditLog[]> {
    const logs = await this.storage.query<AuditLog>(
      'audit_logs',
      (log) => (log as any).action_type === operation
    );

    const sorted = logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Clear old audit logs (keep last N days)
   */
  async clearOldAudits(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTime = cutoffDate.toISOString();

    const oldLogs = await this.storage.query<AuditLog>(
      'audit_logs',
      (log) => log.timestamp < cutoffTime
    );

    const ids = oldLogs.map(log => log.id);
    await this.storage.bulkDelete('audit_logs', ids);

    console.log(`🧹 Cleared ${ids.length} old audit logs (older than ${daysToKeep} days)`);
    return ids.length;
  }
}
