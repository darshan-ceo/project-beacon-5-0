import { Task } from '@/contexts/AppStateContext';
import { notificationService } from './notificationService';

export interface EscalationRule {
  id: string;
  name: string;
  description: string;
  trigger: 'task_overdue' | 'critical_sla' | 'client_deadline' | 'manual';
  conditions: {
    hoursOverdue?: number;
    priority?: Task['priority'][];
    taskTypes?: string[];
  };
  actions: {
    notifyUsers: string[];
    escalateToRole?: string;
    createReminder?: boolean;
    emailTemplate?: string;
  };
  isActive: boolean;
}

export interface EscalationEvent {
  id: string;
  ruleId: string;
  taskId: string;
  triggeredAt: string;
  status: 'pending' | 'contacted' | 'resolved' | 'escalated';
  assignedTo?: string;
  notes?: string;
}

class EscalationService {
  private rules: EscalationRule[] = [
    {
      id: 'rule-1',
      name: 'Task Overdue - 24 Hours',
      description: 'Escalate when task is overdue by 24 hours',
      trigger: 'task_overdue',
      conditions: {
        hoursOverdue: 24,
        priority: ['High', 'Critical']
      },
      actions: {
        notifyUsers: ['manager', 'assignee'],
        escalateToRole: 'Manager',
        createReminder: true
      },
      isActive: true
    },
    {
      id: 'rule-2', 
      name: 'Critical SLA Breach',
      description: 'Immediate escalation for critical SLA breaches',
      trigger: 'critical_sla',
      conditions: {
        priority: ['Critical']
      },
      actions: {
        notifyUsers: ['partner', 'manager', 'assignee'],
        escalateToRole: 'Partner',
        createReminder: true,
        emailTemplate: 'critical_sla_breach'
      },
      isActive: true
    },
    {
      id: 'rule-3',
      name: 'Client Deadline Warning',
      description: 'Notify when approaching client deadlines',
      trigger: 'client_deadline',
      conditions: {
        hoursOverdue: 48
      },
      actions: {
        notifyUsers: ['manager', 'assignee'],
        createReminder: true
      },
      isActive: true
    }
  ];

  private events: EscalationEvent[] = [
    {
      id: 'event-1',
      ruleId: 'rule-1',
      taskId: '1',
      triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      assignedTo: 'manager-1'
    },
    {
      id: 'event-2',
      ruleId: 'rule-2',
      taskId: '2',
      triggeredAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      status: 'contacted',
      assignedTo: 'partner-1'
    }
  ];

  async getRules(): Promise<EscalationRule[]> {
    return [...this.rules];
  }

  async saveRules(rules: EscalationRule[]): Promise<void> {
    this.rules = [...rules];
    console.log('Escalation rules saved:', rules);
  }

  async getRule(id: string): Promise<EscalationRule | null> {
    return this.rules.find(rule => rule.id === id) || null;
  }

  async updateRule(id: string, updates: Partial<EscalationRule>): Promise<EscalationRule> {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index === -1) {
      throw new Error('Rule not found');
    }

    this.rules[index] = { ...this.rules[index], ...updates };
    return this.rules[index];
  }

  async getEvents(limit: number = 50): Promise<EscalationEvent[]> {
    return this.events
      .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())
      .slice(0, limit);
  }

  async resolve(eventId: string, notes?: string): Promise<void> {
    const index = this.events.findIndex(event => event.id === eventId);
    if (index !== -1) {
      this.events[index].status = 'resolved';
      this.events[index].notes = notes;
    }
  }

  async markContacted(eventId: string, notes?: string): Promise<void> {
    const index = this.events.findIndex(event => event.id === eventId);
    if (index !== -1) {
      this.events[index].status = 'contacted';
      this.events[index].notes = notes;
    }
  }

  async createEvent(ruleId: string, taskId: string): Promise<EscalationEvent> {
    const rule = await this.getRule(ruleId);
    
    const newEvent: EscalationEvent = {
      id: `event-${Date.now()}`,
      ruleId,
      taskId,
      triggeredAt: new Date().toISOString(),
      status: 'pending'
    };

    this.events.push(newEvent);

    // Send notifications using the notification service
    if (rule) {
      try {
        await notificationService.send({
          type: 'escalation',
          recipients: rule.actions.notifyUsers,
          channels: ['in_app', 'email'],
          template: 'escalation_alert',
          context: {
            taskId,
            ruleName: rule.name,
            taskTitle: 'Task',
            caseNumber: 'Case'
          }
        });
        console.log('[EscalationService] Notifications sent for escalation event:', newEvent.id);
      } catch (error) {
        console.error('[EscalationService] Failed to send notifications:', error);
      }
    }

    return newEvent;
  }

  async triggerAutomatedEscalation(
    taskId: string,
    ruleId: string,
    reason: string
  ): Promise<EscalationEvent> {
    console.log(`[EscalationService] Triggering automated escalation for task ${taskId}`);
    return await this.createEvent(ruleId, taskId);
  }
}

export const escalationService = new EscalationService();