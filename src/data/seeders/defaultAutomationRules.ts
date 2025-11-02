import { AutomationRule } from '@/types/automation';

export const DEFAULT_AUTOMATION_RULES: Omit<AutomationRule, 'id' | 'executionCount' | 'successCount' | 'failureCount' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'GST Appeal Deadline Tracker',
    description: 'Automatically create appeal filing tasks when a case moves to Appeal stage',
    isActive: true,
    trigger: {
      event: 'case_stage_changed',
      conditions: {
        stageTo: 'Appeal Order (APL-05)'
      }
    },
    actions: {
      createTaskBundle: {
        bundleId: 'appeal-filing-bundle'
      },
      sendNotification: {
        channels: ['in_app', 'email'],
        recipients: ['assignee', 'manager'],
        template: 'stage_changed'
      }
    },
    createdBy: 'system'
  },
  
  {
    name: 'Hearing Preparation Automation',
    description: 'Create preparation tasks and send notifications when a hearing is scheduled',
    isActive: true,
    trigger: {
      event: 'hearing_scheduled'
    },
    actions: {
      createTaskBundle: {
        bundleId: 'hearing-prep-bundle'
      },
      sendNotification: {
        channels: ['in_app', 'email'],
        recipients: ['assignee', 'team'],
        template: 'hearing_scheduled'
      }
    },
    createdBy: 'system'
  },

  {
    name: 'Assessment Response Automation',
    description: 'Trigger response preparation tasks when case enters Assessment stage',
    isActive: true,
    trigger: {
      event: 'case_stage_changed',
      conditions: {
        stageTo: 'ASMT-10 Notice Received'
      }
    },
    actions: {
      createTaskBundle: {
        bundleId: 'assessment-response-bundle'
      },
      sendNotification: {
        channels: ['in_app', 'email'],
        recipients: ['assignee'],
        template: 'task_assigned'
      }
    },
    createdBy: 'system'
  },

  {
    name: 'Overdue Task Escalation - High Priority',
    description: 'Escalate high and critical priority tasks that are overdue by more than 24 hours',
    isActive: true,
    trigger: {
      event: 'task_overdue',
      conditions: {
        priority: ['High', 'Critical'],
        daysOverdue: 1
      }
    },
    actions: {
      escalate: {
        toRole: 'Manager',
        slaThreshold: 24
      },
      sendNotification: {
        channels: ['in_app', 'email', 'sms'],
        recipients: ['manager', 'assignee'],
        template: 'escalation_alert'
      }
    },
    createdBy: 'system'
  },

  {
    name: 'Document Upload Follow-up',
    description: 'Create review tasks when important documents are uploaded',
    isActive: true,
    trigger: {
      event: 'document_uploaded',
      conditions: {
        documentType: 'Order'
      }
    },
    actions: {
      sendNotification: {
        channels: ['in_app', 'email'],
        recipients: ['assignee', 'manager'],
        template: 'document_uploaded'
      }
    },
    createdBy: 'system'
  },

  {
    name: 'Notice Response Automation',
    description: 'Create response tasks when case receives notice',
    isActive: true,
    trigger: {
      event: 'case_stage_changed',
      conditions: {
        stageTo: 'ASMT-10 Notice Received'
      }
    },
    actions: {
      createTaskBundle: {
        bundleId: 'notice-response-bundle'
      },
      sendNotification: {
        channels: ['in_app', 'email'],
        recipients: ['assignee'],
        template: 'stage_changed'
      }
    },
    createdBy: 'system'
  },

  {
    name: 'Case Created - Initial Setup',
    description: 'Create initial assessment tasks when a new case is created',
    isActive: true,
    trigger: {
      event: 'case_created'
    },
    actions: {
      createTaskBundle: {
        bundleId: 'initial-assessment-bundle'
      },
      sendNotification: {
        channels: ['in_app', 'email'],
        recipients: ['assignee', 'manager'],
        template: 'task_bundle_created'
      }
    },
    createdBy: 'system'
  }
];

export async function seedDefaultAutomationRules(
  createRule: (rule: Omit<AutomationRule, 'id' | 'executionCount' | 'successCount' | 'failureCount' | 'createdAt' | 'updatedAt'>) => Promise<AutomationRule>
): Promise<AutomationRule[]> {
  console.log('[SeedAutomationRules] Seeding default automation rules');
  
  const createdRules: AutomationRule[] = [];
  
  for (const rule of DEFAULT_AUTOMATION_RULES) {
    try {
      const created = await createRule(rule);
      createdRules.push(created);
      console.log(`[SeedAutomationRules] Created rule: ${rule.name}`);
    } catch (error) {
      console.error(`[SeedAutomationRules] Failed to create rule ${rule.name}:`, error);
    }
  }
  
  console.log(`[SeedAutomationRules] Seeded ${createdRules.length} rules`);
  return createdRules;
}
