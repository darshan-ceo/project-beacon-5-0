import { NotificationChannel } from '@/types/automation';

export interface NotificationTemplate {
  title: string;
  body: string;
  channels: NotificationChannel[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  task_assigned: {
    title: "New Task Assigned: {{taskTitle}}",
    body: "You've been assigned a new task for case {{caseNumber}}. Due: {{dueDate}}. Priority: {{priority}}",
    channels: ['in_app', 'email']
  },
  
  task_overdue: {
    title: "⚠️ Task Overdue: {{taskTitle}}",
    body: "Task is {{daysOverdue}} days overdue. Case: {{caseNumber}}. Please take immediate action.",
    channels: ['in_app', 'email', 'sms'],
    priority: 'high'
  },
  
  hearing_reminder: {
    title: "Hearing Tomorrow: {{caseNumber}}",
    body: "GST hearing scheduled for {{hearingDate}} at {{time}}. Location: {{location}}. Ensure all preparations are complete.",
    channels: ['in_app', 'email', 'sms', 'whatsapp'],
    priority: 'high'
  },
  
  hearing_scheduled: {
    title: "New Hearing Scheduled: {{caseNumber}}",
    body: "A GST hearing has been scheduled for {{hearingDate}} at {{time}}. Location: {{location}}",
    channels: ['in_app', 'email']
  },
  
  escalation_alert: {
    title: "🔴 Task Escalated: {{taskTitle}}",
    body: "Task has been escalated to you due to SLA breach. Case: {{caseNumber}}. Immediate action required.",
    channels: ['in_app', 'email', 'sms'],
    priority: 'critical'
  },
  
  stage_changed: {
    title: "Case Stage Updated: {{caseNumber}}",
    body: "Case has moved from {{stageFrom}} to {{stageTo}}. New tasks may have been created.",
    channels: ['in_app', 'email']
  },
  
  document_uploaded: {
    title: "New Document: {{caseNumber}}",
    body: "A new {{documentType}} document has been uploaded to case {{caseNumber}}. Review required.",
    channels: ['in_app', 'email']
  },
  
  task_bundle_created: {
    title: "Task Bundle Created: {{bundleName}}",
    body: "{{taskCount}} new tasks have been created for case {{caseNumber}} from automation rule.",
    channels: ['in_app', 'email']
  },
  
  sla_breach_warning: {
    title: "⚠️ SLA Breach Warning: {{taskTitle}}",
    body: "Task will breach SLA in {{hoursRemaining}} hours. Case: {{caseNumber}}. Priority: {{priority}}",
    channels: ['in_app', 'email', 'sms'],
    priority: 'high'
  },
  
  deadline_reminder: {
    title: "Deadline Reminder: {{taskTitle}}",
    body: "Task due {{dueDate}} for case {{caseNumber}}. Please ensure timely completion.",
    channels: ['in_app', 'email']
  },

  // Statutory Deadline Templates
  statutory_deadline_approaching: {
    title: "⏰ Statutory Deadline Approaching: {{caseNumber}}",
    body: "Reply deadline for {{caseNumber}} is {{dueDate}} ({{daysRemaining}} days remaining). Act: {{actName}}. Notice Date: {{noticeDate}}.",
    channels: ['in_app', 'email'],
    priority: 'medium'
  },

  statutory_deadline_tomorrow: {
    title: "🔔 Statutory Deadline Tomorrow: {{caseNumber}}",
    body: "URGENT: Reply deadline for {{caseNumber}} is TOMORROW ({{dueDate}}). Ensure submission is complete. Act: {{actName}}.",
    channels: ['in_app', 'email', 'sms'],
    priority: 'high'
  },

  statutory_deadline_today: {
    title: "🚨 Statutory Deadline TODAY: {{caseNumber}}",
    body: "CRITICAL: Reply deadline for {{caseNumber}} is TODAY ({{dueDate}}). Immediate action required. Act: {{actName}}.",
    channels: ['in_app', 'email', 'sms', 'whatsapp'],
    priority: 'critical'
  },

  statutory_deadline_breached: {
    title: "❌ Statutory Deadline Breached: {{caseNumber}}",
    body: "Reply deadline for {{caseNumber}} was {{dueDate}} ({{daysOverdue}} days ago). Act: {{actName}}. Consider requesting condonation of delay.",
    channels: ['in_app', 'email', 'sms'],
    priority: 'critical'
  },

  statutory_deadline_extended: {
    title: "📅 Deadline Extended: {{caseNumber}}",
    body: "Reply deadline for {{caseNumber}} has been extended to {{newDueDate}}. Previous deadline was {{oldDueDate}}. Reason: {{reason}}.",
    channels: ['in_app', 'email']
  },

  statutory_deadline_completed: {
    title: "✅ Deadline Met: {{caseNumber}}",
    body: "Reply for {{caseNumber}} was submitted on {{completedDate}}, meeting the deadline of {{dueDate}}. Act: {{actName}}.",
    channels: ['in_app']
  }
};

export function renderTemplate(templateKey: string, context: Record<string, any>): NotificationTemplate {
  const template = NOTIFICATION_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Template not found: ${templateKey}`);
  }

  const render = (text: string) => {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context[key]?.toString() || `{{${key}}}`;
    });
  };

  return {
    title: render(template.title),
    body: render(template.body),
    channels: template.channels,
    priority: template.priority
  };
}
