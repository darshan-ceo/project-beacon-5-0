/**
 * Deadline Notification Service
 * Handles scheduling and sending statutory deadline reminders
 */

import { supabase } from '@/integrations/supabase/client';
import { notificationSystemService } from './notificationSystemService';
import { renderTemplate } from '@/config/notificationTemplates';
import { toast } from '@/hooks/use-toast';
import { format, differenceInDays, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

const isDev = import.meta.env.DEV;

const log = (level: 'info' | 'success' | 'error', action: string, details?: any) => {
  if (!isDev) return;
  const color = level === 'success' ? 'color: green' : level === 'error' ? 'color: red' : 'color: blue';
  console.log(`%c[DeadlineNotification] ${action} ${level}`, color, details);
};

export interface DeadlineNotificationConfig {
  reminderDays: number[]; // Days before deadline to send reminders (e.g., [7, 3, 1, 0])
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  inAppEnabled: boolean;
}

export interface PendingDeadline {
  caseId: string;
  caseNumber: string;
  clientName: string;
  dueDate: string;
  noticeDate: string;
  actName: string;
  eventTypeName: string;
  assignedToId?: string;
  assignedToName?: string;
  assignedToEmail?: string;
  daysRemaining: number;
  status: 'upcoming' | 'today' | 'tomorrow' | 'breached';
}

const DEFAULT_CONFIG: DeadlineNotificationConfig = {
  reminderDays: [7, 3, 1, 0], // 7 days, 3 days, 1 day (tomorrow), and same day
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  inAppEnabled: true,
};

class DeadlineNotificationService {
  private config: DeadlineNotificationConfig = DEFAULT_CONFIG;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Update notification configuration
   */
  setConfig(config: Partial<DeadlineNotificationConfig>): void {
    this.config = { ...this.config, ...config };
    log('info', 'configUpdated', this.config);
  }

  /**
   * Get pending deadlines for a tenant
   */
  async getPendingDeadlines(tenantId: string): Promise<PendingDeadline[]> {
    try {
      // Get cases with reply_due_date
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select(`
          id,
          case_number,
          reply_due_date,
          notice_date,
          assigned_to,
          client_id,
          clients(display_name)
        `)
        .eq('tenant_id', tenantId)
        .not('reply_due_date', 'is', null)
        .order('reply_due_date', { ascending: true });

      if (casesError) {
        log('error', 'fetchCases', casesError);
        return [];
      }

      // Get assigned employees
      const { data: employees } = await supabase
        .from('employees')
        .select('id, full_name, email')
        .eq('tenant_id', tenantId);

      const employeeMap = new Map(employees?.map(e => [e.id, e]) || []);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pendingDeadlines: PendingDeadline[] = (cases || [])
        .filter(c => c.reply_due_date)
        .map(c => {
          const dueDate = parseISO(c.reply_due_date!);
          const daysRemaining = differenceInDays(dueDate, today);
          const employee = c.assigned_to ? employeeMap.get(c.assigned_to) : null;

          let status: PendingDeadline['status'] = 'upcoming';
          if (isPast(dueDate) && !isToday(dueDate)) {
            status = 'breached';
          } else if (isToday(dueDate)) {
            status = 'today';
          } else if (isTomorrow(dueDate)) {
            status = 'tomorrow';
          }

          return {
            caseId: c.id,
            caseNumber: c.case_number,
            clientName: (c.clients as any)?.display_name || 'Unknown Client',
            dueDate: c.reply_due_date!,
            noticeDate: c.notice_date || '',
            actName: 'GST Act', // Default, can be enhanced with statutory_event_types lookup
            eventTypeName: 'Reply to Notice',
            assignedToId: c.assigned_to || undefined,
            assignedToName: employee?.full_name,
            assignedToEmail: employee?.email,
            daysRemaining,
            status,
          };
        });

      log('success', 'getPendingDeadlines', { count: pendingDeadlines.length });
      return pendingDeadlines;
    } catch (error) {
      log('error', 'getPendingDeadlines', error);
      return [];
    }
  }

  /**
   * Get deadlines needing notification today
   */
  async getDeadlinesNeedingNotification(tenantId: string): Promise<PendingDeadline[]> {
    const allDeadlines = await this.getPendingDeadlines(tenantId);
    
    return allDeadlines.filter(d => {
      // Check if days remaining matches any reminder day
      if (d.status === 'breached') return true; // Always notify breached
      if (d.status === 'today') return true; // Always notify same-day
      if (d.status === 'tomorrow') return this.config.reminderDays.includes(1);
      
      return this.config.reminderDays.includes(d.daysRemaining);
    });
  }

  /**
   * Send notification for a deadline
   */
  async sendDeadlineNotification(
    deadline: PendingDeadline,
    userId: string
  ): Promise<{ success: boolean; emailSkipped: boolean; emailReason?: string }> {
    try {
      // Determine template based on status
      let templateKey: string;
      switch (deadline.status) {
        case 'breached':
          templateKey = 'statutory_deadline_breached';
          break;
        case 'today':
          templateKey = 'statutory_deadline_today';
          break;
        case 'tomorrow':
          templateKey = 'statutory_deadline_tomorrow';
          break;
        default:
          templateKey = 'statutory_deadline_approaching';
      }

      // Render template
      const template = renderTemplate(templateKey, {
        caseNumber: deadline.caseNumber,
        dueDate: format(parseISO(deadline.dueDate), 'dd MMM yyyy'),
        noticeDate: deadline.noticeDate ? format(parseISO(deadline.noticeDate), 'dd MMM yyyy') : 'N/A',
        actName: deadline.actName,
        daysRemaining: Math.abs(deadline.daysRemaining),
        daysOverdue: Math.abs(deadline.daysRemaining),
        clientName: deadline.clientName,
      });

      // Create in-app notification
      if (this.config.inAppEnabled) {
        await notificationSystemService.createNotification(
          'task_due',
          template.title,
          template.body,
          userId,
          {
            relatedEntityType: 'case',
            relatedEntityId: deadline.caseId,
            channels: ['in_app'],
            metadata: {
              deadlineType: 'statutory',
              daysRemaining: deadline.daysRemaining,
              status: deadline.status,
            },
          }
        );
      }

      // Send email notification (non-blocking - in-app notification is primary)
      let emailResult: { success: boolean; skipped: boolean; reason?: string } = { success: false, skipped: true, reason: 'Email disabled' };
      if (this.config.emailEnabled && deadline.assignedToEmail) {
        emailResult = await this.sendEmailNotification(deadline, template);
      }

      // Log the notification
      await notificationSystemService.logNotification({
        case_id: deadline.caseId,
        type: 'task_due',
        reminder_type: deadline.status === 'today' ? 'same-day' : 't-1',
        channels: this.getActiveChannels(),
        recipients: [userId],
        sent_at: new Date().toISOString(),
        success: true,
        metadata: {
          deadlineType: 'statutory',
          templateKey,
          daysRemaining: deadline.daysRemaining,
          emailSkipped: emailResult.skipped,
          emailSkipReason: emailResult.reason,
        },
      });

      log('success', 'sendDeadlineNotification', { 
        caseNumber: deadline.caseNumber, 
        status: deadline.status,
        emailSent: emailResult.success,
        emailSkipped: emailResult.skipped,
      });
      
      // Return detailed result for aggregation
      return { success: true, emailSkipped: emailResult.skipped, emailReason: emailResult.reason };
    } catch (error) {
      log('error', 'sendDeadlineNotification', error);
      return { success: false, emailSkipped: true, emailReason: 'Notification failed' };
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Send email notification via edge function
   */
  private async sendEmailNotification(
    deadline: PendingDeadline,
    template: { title: string; body: string }
  ): Promise<{ success: boolean; skipped: boolean; reason?: string }> {
    try {
      if (!deadline.assignedToEmail) {
        log('info', 'skipEmail', 'No email address');
        return { success: false, skipped: true, reason: 'No email address' };
      }

      // Validate email format
      if (!this.isValidEmail(deadline.assignedToEmail)) {
        log('info', 'skipEmail', `Invalid email format: ${deadline.assignedToEmail}`);
        return { success: false, skipped: true, reason: 'Invalid email format' };
      }

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: deadline.assignedToEmail,
          subject: template.title,
          body: template.body,
          html: this.generateEmailHtml(deadline, template),
        },
      });

      if (error) {
        // Check if this is a Resend domain verification error
        const errorMsg = error.message || JSON.stringify(error);
        if (errorMsg.includes('only send testing emails') || errorMsg.includes('verify a domain')) {
          log('info', 'emailSkipped', 'Resend domain not verified - email logged only');
          return { success: false, skipped: true, reason: 'Resend domain not verified' };
        }
        log('error', 'sendEmail', error);
        return { success: false, skipped: false, reason: errorMsg };
      }

      // Check response for Resend errors
      if (data && !data.success && data.error) {
        const errorMsg = data.error || data.details || '';
        if (errorMsg.includes('only send testing emails') || errorMsg.includes('verify a domain')) {
          log('info', 'emailSkipped', 'Resend domain not verified - email logged only');
          return { success: false, skipped: true, reason: 'Resend domain not verified' };
        }
        if (errorMsg.includes('Invalid `to` field')) {
          log('info', 'skipEmail', `Invalid email rejected by Resend: ${deadline.assignedToEmail}`);
          return { success: false, skipped: true, reason: 'Invalid email format' };
        }
        return { success: false, skipped: false, reason: errorMsg };
      }

      log('success', 'sendEmail', { to: deadline.assignedToEmail });
      return { success: true, skipped: false };
    } catch (error) {
      log('error', 'sendEmail', error);
      return { success: false, skipped: false, reason: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Generate HTML email content
   */
  private generateEmailHtml(
    deadline: PendingDeadline,
    template: { title: string; body: string }
  ): string {
    const urgencyColor = deadline.status === 'breached' ? '#dc2626' 
      : deadline.status === 'today' ? '#ea580c'
      : deadline.status === 'tomorrow' ? '#f59e0b'
      : '#3b82f6';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">${template.title}</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 16px 0;">${template.body}</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Case Number:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${deadline.caseNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Client:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${deadline.clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Due Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${format(parseISO(deadline.dueDate), 'dd MMM yyyy')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Status:</strong></td>
              <td style="padding: 8px 0;">
                <span style="background: ${urgencyColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px;">
                  ${deadline.status.toUpperCase()}
                </span>
              </td>
            </tr>
          </table>

          <p style="margin: 16px 0 0 0; font-size: 14px; color: #6b7280;">
            This is an automated notification from Beacon Essential.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get active notification channels
   */
  private getActiveChannels(): ('email' | 'sms' | 'whatsapp' | 'in_app')[] {
    const channels: ('email' | 'sms' | 'whatsapp' | 'in_app')[] = [];
    if (this.config.inAppEnabled) channels.push('in_app');
    if (this.config.emailEnabled) channels.push('email');
    if (this.config.smsEnabled) channels.push('sms');
    if (this.config.whatsappEnabled) channels.push('whatsapp');
    return channels;
  }

  /**
   * Process all pending deadline notifications
   */
  async processDeadlineNotifications(tenantId: string, userId: string): Promise<{
    processed: number;
    success: number;
    failed: number;
    emailsSkipped: number;
  }> {
    const deadlines = await this.getDeadlinesNeedingNotification(tenantId);
    let success = 0;
    let failed = 0;
    let emailsSkipped = 0;
    let domainNotVerified = false;

    for (const deadline of deadlines) {
      const result = await this.sendDeadlineNotification(deadline, userId);
      if (result.success) {
        success++;
        if (result.emailSkipped) {
          emailsSkipped++;
          if (result.emailReason?.includes('domain not verified') || result.emailReason?.includes('Resend')) {
            domainNotVerified = true;
          }
        }
      } else {
        failed++;
      }
    }

    log('success', 'processDeadlineNotifications', { processed: deadlines.length, success, failed, emailsSkipped });

    if (deadlines.length > 0) {
      // Build description based on what happened
      let description = `${success} in-app notification(s) created.`;
      if (emailsSkipped > 0) {
        if (domainNotVerified) {
          description += ` Emails skipped (verify domain at resend.com/domains to enable).`;
        } else {
          description += ` ${emailsSkipped} email(s) skipped.`;
        }
      }
      
      toast({
        title: 'Deadline Reminders Processed',
        description,
      });
    } else {
      toast({
        title: 'No Pending Reminders',
        description: 'All deadlines are up to date.',
      });
    }

    return { processed: deadlines.length, success, failed, emailsSkipped };
  }

  /**
   * Start automatic notification checking
   */
  startAutoCheck(tenantId: string, userId: string, intervalMs: number = 3600000): void {
    // Default: check every hour
    if (this.checkInterval) {
      this.stopAutoCheck();
    }

    this.checkInterval = setInterval(() => {
      this.processDeadlineNotifications(tenantId, userId);
    }, intervalMs);

    log('info', 'autoCheckStarted', { intervalMs });
  }

  /**
   * Stop automatic notification checking
   */
  stopAutoCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      log('info', 'autoCheckStopped');
    }
  }

  /**
   * Get deadline statistics
   */
  async getDeadlineStats(tenantId: string): Promise<{
    total: number;
    breached: number;
    today: number;
    tomorrow: number;
    thisWeek: number;
    upcoming: number;
  }> {
    const deadlines = await this.getPendingDeadlines(tenantId);
    
    return {
      total: deadlines.length,
      breached: deadlines.filter(d => d.status === 'breached').length,
      today: deadlines.filter(d => d.status === 'today').length,
      tomorrow: deadlines.filter(d => d.status === 'tomorrow').length,
      thisWeek: deadlines.filter(d => d.daysRemaining > 0 && d.daysRemaining <= 7).length,
      upcoming: deadlines.filter(d => d.daysRemaining > 7).length,
    };
  }
}

export const deadlineNotificationService = new DeadlineNotificationService();
