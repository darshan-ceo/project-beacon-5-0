/**
 * Audit Service
 * Tracks all data changes for audit trail and conflict resolution
 */

import { StoragePort } from '../ports/StoragePort';
import { changeTrackingService, EntityChange } from '../../services/changeTrackingService';

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  user_id?: string;
  timestamp: string;
  changes_json?: any;
  diff_json?: any;
  version?: number;
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
    // Track the change
    const change = changeTrackingService.trackChange(
      entityType,
      entityId,
      operation,
      before,
      after,
      userId
    );

    // Create audit log entry
    const auditLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity_type: entityType,
      entity_id: entityId,
      operation,
      user_id: userId,
      timestamp: change.timestamp,
      changes_json: { before, after },
      diff_json: change.diff,
      version: change.version,
    };

    // Store in audit_logs table
    await this.storage.create('audit_logs', auditLog);

    return auditLog;
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
      (log) => log.operation === operation
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
