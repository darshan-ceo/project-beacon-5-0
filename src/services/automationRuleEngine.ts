import {
  AutomationRule,
  AutomationEvent,
  AutomationLog,
  AutomationResult,
  AutomationActionResult,
  EventContext,
  AutomationStats
} from '@/types/automation';
import { AutomationRuleRepository, AutomationLogRepository } from '@/data/repositories/AutomationRuleRepository';
import { taskBundleTriggerService } from './taskBundleTriggerService';
import { notificationService } from './notificationService';
import { escalationService } from './escalationService';
import { storageManager } from '@/data/StorageManager';
import { Task } from '@/contexts/AppStateContext';

class AutomationRuleEngine {
  private ruleRepository: AutomationRuleRepository | null = null;
  private logRepository: AutomationLogRepository | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const storage = storageManager.getStorage();
      const auditService = storageManager.getAuditService();
      
      this.ruleRepository = new AutomationRuleRepository(storage, auditService);
      this.logRepository = new AutomationLogRepository(storage, auditService);
      
      // Test connectivity
      await this.ruleRepository.getAll();
      
      this.initialized = true;
      console.log('[AutomationRuleEngine] ✅ Initialized successfully');
    } catch (error) {
      console.error('[AutomationRuleEngine] ❌ Initialization failed:', error);
      throw new Error(`AutomationRuleEngine initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private ensureInitialized(): void {
    if (!this.ruleRepository || !this.logRepository) {
      throw new Error('AutomationRuleEngine not initialized');
    }
  }

  async createRule(rule: Omit<AutomationRule, 'id' | 'executionCount' | 'successCount' | 'failureCount' | 'createdAt' | 'updatedAt'>): Promise<AutomationRule> {
    this.ensureInitialized();

    const newRule: AutomationRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...rule,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.ruleRepository!.create(newRule);
    console.log('[AutomationRuleEngine] Created rule:', newRule.name);
    return newRule;
  }

  async updateRule(id: string, updates: Partial<AutomationRule>): Promise<void> {
    this.ensureInitialized();
    await this.ruleRepository!.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    console.log('[AutomationRuleEngine] Updated rule:', id);
  }

  async deleteRule(id: string): Promise<void> {
    this.ensureInitialized();
    await this.ruleRepository!.delete(id);
    console.log('[AutomationRuleEngine] Deleted rule:', id);
  }

  async getActiveRules(): Promise<AutomationRule[]> {
    this.ensureInitialized();
    return await this.ruleRepository!.getActiveRules();
  }

  async getAllRules(): Promise<AutomationRule[]> {
    this.ensureInitialized();
    return await this.ruleRepository!.getAll();
  }

  async getRule(id: string): Promise<AutomationRule | null> {
    this.ensureInitialized();
    return await this.ruleRepository!.getById(id);
  }

  async processEvent(event: AutomationEvent): Promise<AutomationResult> {
    this.ensureInitialized();

    console.log('[AutomationRuleEngine] Processing event:', event.type);

    const result: AutomationResult = {
      success: true,
      rulesMatched: 0,
      rulesExecuted: 0,
      actionsExecuted: 0,
      errors: [],
      logs: []
    };

    try {
      const rules = await this.ruleRepository!.getRulesByEvent(event.type);
      
      for (const rule of rules) {
        const matched = this.evaluateRuleConditions(rule, event);
        
        if (matched) {
          result.rulesMatched++;
          
          try {
            const context = this.buildEventContext(event);
            const actionResults = await this.executeRuleActions(rule, context);
            
            result.rulesExecuted++;
            result.actionsExecuted += actionResults.length;

            // Log the execution
            const log = await this.createExecutionLog(rule, event, true, actionResults, context);
            result.logs.push(log);

            // Update rule statistics
            await this.ruleRepository!.incrementExecutionCount(rule.id, true);
          } catch (error) {
            console.error(`[AutomationRuleEngine] Rule execution failed for ${rule.name}:`, error);
            result.errors.push(`Rule ${rule.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.success = false;

            // Log the failure
            const log = await this.createExecutionLog(rule, event, false, [], undefined, error);
            result.logs.push(log);

            // Update failure count
            await this.ruleRepository!.incrementExecutionCount(rule.id, false);
          }
        }
      }
    } catch (error) {
      console.error('[AutomationRuleEngine] Event processing failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  private evaluateRuleConditions(rule: AutomationRule, event: AutomationEvent): boolean {
    const conditions = rule.trigger.conditions;
    if (!conditions) return true;

    const { payload } = event;

    // Check stage transitions
    if (conditions.stageTo && payload.stageTo !== conditions.stageTo) {
      return false;
    }

    if (conditions.stageFrom && payload.stageFrom !== conditions.stageFrom) {
      return false;
    }

    // Check priority
    if (conditions.priority && conditions.priority.length > 0) {
      const taskPriority = payload.taskData?.priority || payload.caseData?.priority;
      if (taskPriority && !conditions.priority.includes(taskPriority)) {
        return false;
      }
    }

    // Check days overdue
    if (conditions.daysOverdue !== undefined) {
      const daysOverdue = payload.daysOverdue || 0;
      if (daysOverdue < conditions.daysOverdue) {
        return false;
      }
    }

    // Check document type
    if (conditions.documentType && payload.documentType !== conditions.documentType) {
      return false;
    }

    return true;
  }

  private buildEventContext(event: AutomationEvent): EventContext {
    return {
      caseId: event.payload.caseId,
      taskId: event.payload.taskId,
      hearingId: event.payload.hearingId,
      caseData: event.payload.caseData,
      taskData: event.payload.taskData,
      hearingData: event.payload.hearingData
    };
  }

  private async executeRuleActions(
    rule: AutomationRule,
    context: EventContext
  ): Promise<AutomationActionResult[]> {
    const results: AutomationActionResult[] = [];
    const { actions } = rule;

    // Execute task bundle creation
    if (actions.createTaskBundle && context.caseData) {
      const start = Date.now();
      try {
        const taskIds = await this.createTasksFromBundle(
          actions.createTaskBundle.bundleId,
          context.caseData
        );
        results.push({
          type: 'create_task_bundle',
          status: 'success',
          result: { taskIds, count: taskIds.length },
          duration_ms: Date.now() - start
        });
      } catch (error) {
        results.push({
          type: 'create_task_bundle',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration_ms: Date.now() - start
        });
      }
    }

    // Send notifications
    if (actions.sendNotification && context.caseId) {
      const start = Date.now();
      try {
        await this.sendNotifications(actions.sendNotification, context);
        results.push({
          type: 'send_notification',
          status: 'success',
          duration_ms: Date.now() - start
        });
      } catch (error) {
        results.push({
          type: 'send_notification',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration_ms: Date.now() - start
        });
      }
    }

    // Execute escalation
    if (actions.escalate && context.taskId) {
      const start = Date.now();
      try {
        await this.triggerEscalation(context.taskData as Task, actions.escalate.toRole);
        results.push({
          type: 'escalate',
          status: 'success',
          duration_ms: Date.now() - start
        });
      } catch (error) {
        results.push({
          type: 'escalate',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration_ms: Date.now() - start
        });
      }
    }

    return results;
  }

  private async createTasksFromBundle(bundleId: string, caseData: any): Promise<string[]> {
    // Use existing task bundle trigger service
    const result = await taskBundleTriggerService.triggerTaskBundles(
      caseData,
      'manual',
      caseData.currentStage || 'Any Stage'
    );

    // Extract task IDs from created tasks
    const taskIds: string[] = [];
    for (const footprint of result.createdTasks) {
      if (footprint.taskIds) {
        taskIds.push(...footprint.taskIds);
      }
    }
    return taskIds;
  }

  private async sendNotifications(config: any, context: EventContext): Promise<void> {
    const recipientIds = this.resolveRecipients(config.recipients, context);

    await notificationService.send({
      type: 'automation',
      recipients: recipientIds,
      channels: config.channels,
      template: config.template,
      context: {
        caseId: context.caseId,
        caseNumber: context.caseData?.caseNumber,
        taskTitle: context.taskData?.title,
        ...(context.caseData || {}),
        ...(context.taskData || {})
      }
    });
  }

  private resolveRecipients(recipientTypes: string[], context: EventContext): string[] {
    const recipients: string[] = [];

    for (const type of recipientTypes) {
      switch (type) {
        case 'assignee':
          if (context.taskData?.assignedToId) {
            recipients.push(context.taskData.assignedToId);
          }
          break;
        case 'creator':
          if (context.taskData?.assignedById) {
            recipients.push(context.taskData.assignedById);
          }
          break;
        case 'manager':
          // TODO: Implement manager resolution logic
          recipients.push('manager-id');
          break;
        case 'team':
          // TODO: Implement team member resolution
          recipients.push('team-lead-id');
          break;
        case 'client':
          if (context.caseData?.clientId) {
            recipients.push(context.caseData.clientId);
          }
          break;
      }
    }

    return [...new Set(recipients)]; // Remove duplicates
  }

  private async triggerEscalation(task: Task, toRole: string): Promise<void> {
    // Create escalation event using existing escalation service
    await escalationService.createEvent('sla-breach-rule', task.id);
  }

  private async createExecutionLog(
    rule: AutomationRule,
    event: AutomationEvent,
    success: boolean,
    actions: AutomationActionResult[],
    context?: EventContext,
    error?: any
  ): Promise<AutomationLog> {
    const log: AutomationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      timestamp: new Date().toISOString(),
      trigger: {
        event: event.type,
        payload: event.payload
      },
      evaluation: {
        matched: true,
        conditionResults: {}
      },
      actions,
      metadata: {
        caseId: context?.caseId,
        taskIds: actions
          .filter(a => a.type === 'create_task_bundle' && a.result?.taskIds)
          .flatMap(a => a.result?.taskIds || []),
        notificationIds: []
      },
      status: error ? 'failed' : actions.some(a => a.status === 'failed') ? 'partial' : 'success'
    };

    await this.logRepository!.create(log);
    return log;
  }

  async getExecutionLogs(ruleId?: string, limit: number = 100): Promise<AutomationLog[]> {
    this.ensureInitialized();
    
    if (ruleId) {
      return await this.logRepository!.getLogsByRule(ruleId, limit);
    }
    
    return await this.logRepository!.getRecentLogs(limit);
  }

  async getExecutionStats(): Promise<AutomationStats> {
    this.ensureInitialized();

    const rules = await this.getAllRules();
    const recentLogs = await this.logRepository!.getRecentLogs(100);

    const totalExecutions = recentLogs.length;
    const successfulExecutions = recentLogs.filter(l => l.status === 'success').length;
    
    const executionTimes = recentLogs.flatMap(log =>
      log.actions.map(action => action.duration_ms)
    );
    const avgExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0;

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      totalExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      averageExecutionTime: avgExecutionTime,
      recentExecutions: recentLogs.slice(0, 10)
    };
  }
}

// Export singleton instance
export const automationRuleEngine = new AutomationRuleEngine();
