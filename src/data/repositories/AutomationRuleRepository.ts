import { AutomationRule, AutomationLog } from '@/types/automation';
import { BaseRepository } from './BaseRepository';
import { StoragePort } from '../ports/StoragePort';
import { AuditService } from '../services/AuditService';

export class AutomationRuleRepository extends BaseRepository<AutomationRule> {
  constructor(storage: StoragePort, auditService?: AuditService) {
    super(storage, 'automation_rules', auditService);
  }

  async getActiveRules(): Promise<AutomationRule[]> {
    const all = await this.getAll();
    return all.filter(rule => rule.isActive);
  }

  async getRulesByEvent(event: string): Promise<AutomationRule[]> {
    const active = await this.getActiveRules();
    return active.filter(rule => {
      // Support both nested trigger.event and flat trigger_type
      const triggerEvent = rule.trigger?.event || (rule as any).trigger_type;
      return triggerEvent === event;
    });
  }

  async incrementExecutionCount(id: string, success: boolean): Promise<void> {
    const rule = await this.getById(id);
    if (rule) {
      await this.update(id, {
        executionCount: rule.executionCount + 1,
        successCount: success ? rule.successCount + 1 : rule.successCount,
        failureCount: success ? rule.failureCount : rule.failureCount + 1,
        lastTriggered: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  async updateLastTriggered(id: string): Promise<void> {
    await this.update(id, {
      lastTriggered: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
}

export class AutomationLogRepository extends BaseRepository<AutomationLog> {
  constructor(storage: StoragePort, auditService?: AuditService) {
    super(storage, 'automation_logs', auditService);
  }

  async getLogsByRule(ruleId: string, limit: number = 50): Promise<AutomationLog[]> {
    const all = await this.getAll();
    return all
      .filter(log => log.ruleId === ruleId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getRecentLogs(limit: number = 100): Promise<AutomationLog[]> {
    const all = await this.getAll();
    return all
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getLogsByStatus(status: 'success' | 'partial' | 'failed', limit: number = 50): Promise<AutomationLog[]> {
    const all = await this.getAll();
    return all
      .filter(log => log.status === status)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getLogsByCaseId(caseId: string, limit: number = 50): Promise<AutomationLog[]> {
    const all = await this.getAll();
    return all
      .filter(log => log.metadata.caseId === caseId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

