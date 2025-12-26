import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/contexts/AppStateContext';
import { notificationService } from './notificationService';

export interface EscalationRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  trigger: 'task_overdue' | 'critical_sla' | 'client_deadline' | 'manual';
  conditions: {
    hoursOverdue?: number;
    priority?: Task['priority'][];
    taskTypes?: string[];
  };
  actions: {
    notifyUsers?: string[];
    escalateToRole?: string;
    createReminder?: boolean;
    emailTemplate?: string;
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EscalationEvent {
  id: string;
  tenantId: string;
  ruleId: string;
  taskId: string;
  triggeredAt: string;
  status: 'pending' | 'contacted' | 'resolved' | 'escalated';
  assignedTo?: string;
  escalatedTo?: string;
  currentLevel?: number;
  notes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  // Joined fields
  task?: {
    title: string;
    caseNumber?: string;
    priority?: string;
    dueDate?: string;
  };
  rule?: {
    name: string;
    actions?: EscalationRule['actions'];
  };
  escalatedEmployee?: {
    id: string;
    fullName: string;
  };
}

// Default rules for new tenants
const DEFAULT_RULES: Omit<EscalationRule, 'id' | 'tenantId'>[] = [
  {
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

class EscalationService {
  private tenantId: string | null = null;

  private async getTenantId(): Promise<string> {
    if (this.tenantId) return this.tenantId;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.tenant_id) throw new Error('Tenant not found');
    this.tenantId = profile.tenant_id;
    return this.tenantId;
  }

  async getRules(): Promise<EscalationRule[]> {
    try {
      const tenantId = await this.getTenantId();
      
      const { data, error } = await supabase
        .from('escalation_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[EscalationService] Error fetching rules:', error);
        throw error;
      }

      // If no rules exist, create default rules
      if (!data || data.length === 0) {
        console.log('[EscalationService] No rules found, creating defaults');
        await this.createDefaultRules(tenantId);
        return this.getRules();
      }

      return data.map(rule => ({
        id: rule.id,
        tenantId: rule.tenant_id,
        name: rule.name,
        description: rule.description || '',
        trigger: rule.trigger as EscalationRule['trigger'],
        conditions: rule.conditions as EscalationRule['conditions'] || {},
        actions: rule.actions as EscalationRule['actions'] || {},
        isActive: rule.is_active,
        createdAt: rule.created_at,
        updatedAt: rule.updated_at
      }));
    } catch (error) {
      console.error('[EscalationService] getRules error:', error);
      return [];
    }
  }

  private async createDefaultRules(tenantId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    for (const rule of DEFAULT_RULES) {
      await supabase.from('escalation_rules').insert({
        tenant_id: tenantId,
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        conditions: rule.conditions,
        actions: rule.actions,
        is_active: rule.isActive,
        created_by: user?.id
      });
    }
  }

  async saveRules(rules: EscalationRule[]): Promise<void> {
    const tenantId = await this.getTenantId();
    
    for (const rule of rules) {
      const { error } = await supabase
        .from('escalation_rules')
        .upsert({
          id: rule.id,
          tenant_id: tenantId,
          name: rule.name,
          description: rule.description,
          trigger: rule.trigger,
          conditions: rule.conditions,
          actions: rule.actions,
          is_active: rule.isActive
        });

      if (error) {
        console.error('[EscalationService] Error saving rule:', error);
        throw error;
      }
    }
    console.log('[EscalationService] Rules saved');
  }

  async getRule(id: string): Promise<EscalationRule | null> {
    const { data, error } = await supabase
      .from('escalation_rules')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      description: data.description || '',
      trigger: data.trigger as EscalationRule['trigger'],
      conditions: data.conditions as EscalationRule['conditions'] || {},
      actions: data.actions as EscalationRule['actions'] || {},
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  async updateRule(id: string, updates: Partial<EscalationRule>): Promise<EscalationRule> {
    const { data, error } = await supabase
      .from('escalation_rules')
      .update({
        name: updates.name,
        description: updates.description,
        trigger: updates.trigger,
        conditions: updates.conditions,
        actions: updates.actions,
        is_active: updates.isActive
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      description: data.description || '',
      trigger: data.trigger as EscalationRule['trigger'],
      conditions: data.conditions as EscalationRule['conditions'] || {},
      actions: data.actions as EscalationRule['actions'] || {},
      isActive: data.is_active
    };
  }

  async getEvents(limit: number = 50): Promise<EscalationEvent[]> {
    try {
      const tenantId = await this.getTenantId();
      
      const { data, error } = await supabase
        .from('escalation_events')
        .select(`
          *,
          tasks:task_id (title, case_number, priority, due_date),
          escalation_rules:rule_id (name, actions),
          escalated_employee:employees!escalation_events_escalated_to_fkey (id, full_name)
        `)
        .eq('tenant_id', tenantId)
        .order('triggered_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[EscalationService] Error fetching events:', error);
        throw error;
      }

      return (data || []).map(event => ({
        id: event.id,
        tenantId: event.tenant_id,
        ruleId: event.rule_id,
        taskId: event.task_id,
        triggeredAt: event.triggered_at,
        status: event.status as EscalationEvent['status'],
        assignedTo: event.assigned_to,
        escalatedTo: event.escalated_to,
        currentLevel: event.current_level,
        notes: event.notes,
        resolvedAt: event.resolved_at,
        resolvedBy: event.resolved_by,
        task: event.tasks ? {
          title: (event.tasks as any).title,
          caseNumber: (event.tasks as any).case_number,
          priority: (event.tasks as any).priority,
          dueDate: (event.tasks as any).due_date
        } : undefined,
        rule: event.escalation_rules ? {
          name: (event.escalation_rules as any).name,
          actions: (event.escalation_rules as any).actions
        } : undefined,
        escalatedEmployee: event.escalated_employee ? {
          id: (event.escalated_employee as any).id,
          fullName: (event.escalated_employee as any).full_name
        } : undefined
      }));
    } catch (error) {
      console.error('[EscalationService] getEvents error:', error);
      return [];
    }
  }

  async resolve(eventId: string, notes?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('escalation_events')
      .update({
        status: 'resolved',
        notes,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id
      })
      .eq('id', eventId);

    if (error) {
      console.error('[EscalationService] Error resolving event:', error);
      throw error;
    }
    console.log('[EscalationService] Event resolved:', eventId);
  }

  async markContacted(eventId: string, notes?: string): Promise<void> {
    const { error } = await supabase
      .from('escalation_events')
      .update({
        status: 'contacted',
        notes
      })
      .eq('id', eventId);

    if (error) {
      console.error('[EscalationService] Error marking contacted:', error);
      throw error;
    }
    console.log('[EscalationService] Event marked as contacted:', eventId);
  }

  async createEvent(ruleId: string, taskId: string, taskDetails?: { title: string; caseNumber?: string }): Promise<EscalationEvent> {
    const tenantId = await this.getTenantId();
    const rule = await this.getRule(ruleId);
    
    // Resolve who to escalate to based on rule and task assignee
    let escalatedToId: string | null = null;
    
    if (rule?.actions?.escalateToRole) {
      const targetRole = rule.actions.escalateToRole.toLowerCase();
      
      // Get task details including assignee
      const { data: task } = await supabase
        .from('tasks')
        .select('assigned_to')
        .eq('id', taskId)
        .maybeSingle();
      
      if (task?.assigned_to) {
        // Get assignee's reporting manager
        const { data: assignee } = await supabase
          .from('employees')
          .select('reporting_to')
          .eq('id', task.assigned_to)
          .maybeSingle();
        
        if (assignee?.reporting_to) {
          // Check if manager matches target role
          const { data: manager } = await supabase
            .from('employees')
            .select('id, role')
            .eq('id', assignee.reporting_to)
            .maybeSingle();
          
          if (manager && manager.role.toLowerCase().includes(targetRole)) {
            escalatedToId = manager.id;
          }
        }
      }
      
      // Fallback: Find any employee with the target role in tenant
      if (!escalatedToId) {
        const { data: roleEmployee } = await supabase
          .from('employees')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'Active')
          .ilike('role', `%${targetRole}%`)
          .limit(1)
          .maybeSingle();
        
        if (roleEmployee) {
          escalatedToId = roleEmployee.id;
        }
      }
    }
    
    const { data, error } = await supabase
      .from('escalation_events')
      .insert({
        tenant_id: tenantId,
        rule_id: ruleId,
        task_id: taskId,
        status: 'pending',
        current_level: 1,
        escalated_to: escalatedToId
      })
      .select()
      .single();

    if (error) {
      console.error('[EscalationService] Error creating event:', error);
      throw error;
    }

    const event: EscalationEvent = {
      id: data.id,
      tenantId: data.tenant_id,
      ruleId: data.rule_id,
      taskId: data.task_id,
      triggeredAt: data.triggered_at,
      status: data.status as EscalationEvent['status'],
      currentLevel: data.current_level,
      escalatedTo: data.escalated_to
    };

    // Send notifications
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
            taskTitle: taskDetails?.title || 'Task',
            caseNumber: taskDetails?.caseNumber || ''
          }
        });
        console.log('[EscalationService] Notifications sent for event:', event.id);
      } catch (err) {
        console.error('[EscalationService] Failed to send notifications:', err);
      }
    }

    return event;
  }

  async triggerAutomatedEscalation(
    taskId: string,
    ruleId: string,
    reason: string,
    taskDetails?: { title: string; caseNumber?: string }
  ): Promise<EscalationEvent> {
    console.log(`[EscalationService] Triggering automated escalation for task ${taskId}: ${reason}`);
    return await this.createEvent(ruleId, taskId, taskDetails);
  }

  // Check overdue tasks and create escalation events
  async checkAndEscalateOverdueTasks(): Promise<number> {
    try {
      const tenantId = await this.getTenantId();
      const rules = await this.getRules();
      const overdueRules = rules.filter(r => r.isActive && r.trigger === 'task_overdue');
      
      if (overdueRules.length === 0) {
        console.log('[EscalationService] No active overdue rules');
        return 0;
      }

      // Get overdue tasks that don't already have pending escalations
      const { data: overdueTasks, error } = await supabase
        .from('tasks')
        .select('id, title, due_date, priority, case_number, status')
        .eq('tenant_id', tenantId)
        .not('status', 'in', '(Completed,Cancelled)')
        .lt('due_date', new Date().toISOString());

      if (error || !overdueTasks) {
        console.error('[EscalationService] Error fetching overdue tasks:', error);
        return 0;
      }

      let escalatedCount = 0;

      for (const task of overdueTasks) {
        // Check if task already has pending escalation
        const { data: existingEvent } = await supabase
          .from('escalation_events')
          .select('id')
          .eq('task_id', task.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingEvent) continue;

        // Find matching rule
        const hoursOverdue = (Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60);
        
        for (const rule of overdueRules) {
          const meetsHoursCriteria = !rule.conditions.hoursOverdue || hoursOverdue >= rule.conditions.hoursOverdue;
          const meetsPriorityCriteria = !rule.conditions.priority?.length || 
            rule.conditions.priority.includes(task.priority as any);

          if (meetsHoursCriteria && meetsPriorityCriteria) {
            await this.createEvent(rule.id, task.id, { 
              title: task.title, 
              caseNumber: task.case_number 
            });
            escalatedCount++;
            break;
          }
        }
      }

      console.log(`[EscalationService] Escalated ${escalatedCount} tasks`);
      return escalatedCount;
    } catch (error) {
      console.error('[EscalationService] checkAndEscalateOverdueTasks error:', error);
      return 0;
    }
  }
}

export const escalationService = new EscalationService();
