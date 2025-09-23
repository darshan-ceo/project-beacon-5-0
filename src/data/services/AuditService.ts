/**
 * Audit Service for logging all data changes
 */

import { StoragePort } from '../ports/StoragePort';
import { AuditLog } from '../db';

export interface AuditLogData {
  entity_type: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'import';
  at: Date;
  actor_user_id?: string;
  diff_json?: any;
  metadata_json?: any;
}

export class AuditService {
  constructor(private storage: StoragePort) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      const auditRecord: AuditLog = {
        id: crypto.randomUUID(),
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        action: data.action,
        at: data.at,
        actor_user_id: data.actor_user_id,
        diff_json: data.diff_json,
        metadata_json: data.metadata_json
      };

      await this.storage.create('audit_logs', auditRecord);
    } catch (error) {
      // Log audit failures to console but don't throw to avoid breaking main operations
      console.warn('Failed to write audit log:', error);
    }
  }

  async getAuditTrail(entityType: string, entityId: string): Promise<AuditLog[]> {
    const logs = await this.storage.query<AuditLog>('audit_logs', log => 
      log.entity_type === entityType && log.entity_id === entityId
    );
    
    // Sort by timestamp descending (newest first)
    return logs.sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  async getRecentActivity(limit: number = 50): Promise<AuditLog[]> {
    const allLogs = await this.storage.getAll<AuditLog>('audit_logs');
    
    // Sort by timestamp descending and take the limit
    return allLogs
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, limit);
  }

  async getActivityByUser(userId: string, limit: number = 50): Promise<AuditLog[]> {
    const logs = await this.storage.query<AuditLog>('audit_logs', log => 
      log.actor_user_id === userId
    );
    
    return logs
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, limit);
  }

  async getActivityByAction(action: AuditLogData['action'], limit: number = 50): Promise<AuditLog[]> {
    const logs = await this.storage.query<AuditLog>('audit_logs', log => 
      log.action === action
    );
    
    return logs
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, limit);
  }

  async deleteOldAuditLogs(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const oldLogs = await this.storage.query<AuditLog>('audit_logs', log => 
      log.at < cutoffDate
    );
    
    if (oldLogs.length > 0) {
      const ids = oldLogs.map(log => log.id);
      await this.storage.bulkDelete('audit_logs', ids);
    }
    
    return oldLogs.length;
  }

  async exportAuditLogs(startDate?: Date, endDate?: Date): Promise<AuditLog[]> {
    let logs = await this.storage.getAll<AuditLog>('audit_logs');
    
    if (startDate || endDate) {
      logs = logs.filter(log => {
        if (startDate && log.at < startDate) return false;
        if (endDate && log.at > endDate) return false;
        return true;
      });
    }
    
    return logs.sort((a, b) => a.at.getTime() - b.at.getTime());
  }
}