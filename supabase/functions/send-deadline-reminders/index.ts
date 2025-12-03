/**
 * Deadline Reminders Edge Function
 * Sends Email reminders for upcoming statutory deadlines
 * 
 * Triggers:
 * - T-7 Days: 7 days before deadline
 * - T-3 Days: 3 days before deadline
 * - T-1 Day: 1 day before deadline
 * - Same-Day: On deadline day
 * 
 * Schedule with pg_cron:
 * SELECT cron.schedule(
 *   'send-deadline-reminders',
 *   '0 8 * * *',
 *   $$ SELECT net.http_post(
 *     url:='https://myncxddatwvtyiioqekh.supabase.co/functions/v1/send-deadline-reminders',
 *     headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
 *   ); $$
 * );
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeadlineReminder {
  id: string;
  case_id: string;
  deadline_date: string;
  event_type_name: string;
  event_type_code: string;
  days_remaining: number;
  case_number: string;
  case_title: string;
  client_name: string;
  client_email: string;
  assigned_to_name: string;
  assigned_to_email: string;
  tenant_id: string;
}

// Reminder days configuration
const REMINDER_DAYS = [7, 3, 1, 0];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verify API key for scheduled execution
  const authHeader = req.headers.get('Authorization');
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!authHeader || !apiKey || authHeader !== `Bearer ${apiKey}`) {
    console.error('[Deadline Reminders] Unauthorized access attempt');
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid API key' }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    console.log('[Deadline Reminders] Function triggered at:', new Date().toISOString());
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate target dates for reminders
    const targetDates = REMINDER_DAYS.map(days => {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      return {
        days,
        date: targetDate.toISOString().split('T')[0],
        label: days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
      };
    });

    console.log('[Deadline Reminders] Checking deadlines for dates:', targetDates.map(d => d.date));

    // Fetch pending deadlines matching reminder days
    const { data: deadlinesData, error: deadlineError } = await supabase
      .from('case_statutory_deadlines')
      .select(`
        id,
        case_id,
        calculated_deadline,
        status,
        tenant_id,
        statutory_event_types!inner (
          name,
          code
        ),
        cases!inner (
          id,
          case_number,
          title,
          assigned_to,
          clients!inner (
            display_name,
            email
          )
        )
      `)
      .in('calculated_deadline', targetDates.map(d => d.date))
      .eq('status', 'pending');

    if (deadlineError) {
      console.error('[Deadline Reminders] Error fetching deadlines:', deadlineError);
      throw new Error(`Failed to fetch deadlines: ${deadlineError.message}`);
    }

    console.log(`[Deadline Reminders] Found ${deadlinesData?.length || 0} pending deadlines`);

    // Fetch assigned user details
    const assignedUserIds = [...new Set((deadlinesData || [])
      .map(d => d.cases?.assigned_to)
      .filter(Boolean))];

    let userMap: Record<string, { full_name: string; email: string }> = {};
    
    if (assignedUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', assignedUserIds);
      
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, official_email, email')
        .in('id', assignedUserIds);

      (usersData || []).forEach(u => {
        const employee = employeesData?.find(e => e.id === u.id);
        userMap[u.id] = {
          full_name: u.full_name || 'Assigned User',
          email: employee?.official_email || employee?.email || ''
        };
      });
    }

    // Transform to DeadlineReminder format
    const deadlines: DeadlineReminder[] = (deadlinesData || []).map(d => {
      const deadlineDate = new Date(d.calculated_deadline);
      const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const assignedUser = d.cases?.assigned_to ? userMap[d.cases.assigned_to] : null;

      return {
        id: d.id,
        case_id: d.case_id,
        deadline_date: d.calculated_deadline,
        event_type_name: d.statutory_event_types?.name || 'Deadline',
        event_type_code: d.statutory_event_types?.code || '',
        days_remaining: daysRemaining,
        case_number: d.cases?.case_number || '',
        case_title: d.cases?.title || '',
        client_name: d.cases?.clients?.display_name || '',
        client_email: d.cases?.clients?.email || '',
        assigned_to_name: assignedUser?.full_name || '',
        assigned_to_email: assignedUser?.email || '',
        tenant_id: d.tenant_id,
      };
    });

    const notifications = {
      sent: 0,
      failed: 0,
      skipped: 0,
      logs: [] as any[],
    };

    for (const deadline of deadlines) {
      try {
        // Check if notification was already sent for this deadline today
        const { data: existingLog } = await supabase
          .from('audit_log')
          .select('id')
          .eq('entity_type', 'deadline')
          .eq('entity_id', deadline.id)
          .eq('action_type', 'reminder_sent')
          .gte('timestamp', today.toISOString())
          .limit(1);

        if (existingLog && existingLog.length > 0) {
          console.log(`[Deadline Reminders] Skipping ${deadline.id} - already notified today`);
          notifications.skipped++;
          continue;
        }

        const reminderType = getReminderType(deadline.days_remaining);
        const recipients: string[] = [];

        // Collect recipient emails
        if (deadline.client_email) recipients.push(deadline.client_email);
        if (deadline.assigned_to_email) recipients.push(deadline.assigned_to_email);

        if (recipients.length === 0) {
          console.log(`[Deadline Reminders] No recipients for deadline ${deadline.id}`);
          notifications.skipped++;
          continue;
        }

        // Send email notification
        const emailResult = await sendEmailReminder(deadline, reminderType, resend);

        const log = {
          deadline_id: deadline.id,
          case_id: deadline.case_id,
          type: `statutory_deadline_${reminderType}`,
          channels: ['email'],
          recipients,
          sent_at: new Date().toISOString(),
          success: emailResult.success,
          error_message: emailResult.error || null,
        };

        notifications.logs.push(log);

        if (log.success) {
          notifications.sent++;
        } else {
          notifications.failed++;
        }

        // Log to audit_log
        await supabase.from('audit_log').insert({
          entity_type: 'deadline',
          entity_id: deadline.id,
          action_type: 'reminder_sent',
          details: {
            reminder_type: reminderType,
            days_remaining: deadline.days_remaining,
            channels: ['email'],
            recipients,
            success: log.success,
            error_message: log.error_message,
          },
          user_id: null,
          tenant_id: deadline.tenant_id,
        });

        console.log(`[Deadline Reminders] Reminder sent for deadline ${deadline.id}:`, log);
      } catch (error) {
        console.error(`[Deadline Reminders] Failed to process deadline ${deadline.id}:`, error);
        notifications.failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: notifications.sent,
        failed: notifications.failed,
        skipped: notifications.skipped,
        total: deadlines.length,
        logs: notifications.logs,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Deadline Reminders] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Determine reminder type based on days remaining
 */
function getReminderType(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'today';
  if (daysRemaining === 1) return 'tomorrow';
  if (daysRemaining <= 3) return 'approaching';
  return 'upcoming';
}

/**
 * Get urgency label for email
 */
function getUrgencyLabel(daysRemaining: number): string {
  if (daysRemaining <= 0) return '🚨 DUE TODAY';
  if (daysRemaining === 1) return '⚠️ DUE TOMORROW';
  if (daysRemaining <= 3) return '⏰ APPROACHING';
  return '📅 UPCOMING';
}

/**
 * Send email reminder via Resend
 */
async function sendEmailReminder(
  deadline: DeadlineReminder,
  reminderType: string,
  resend: Resend | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const urgencyLabel = getUrgencyLabel(deadline.days_remaining);
    const daysText = deadline.days_remaining === 0 
      ? 'today' 
      : deadline.days_remaining === 1 
        ? 'tomorrow' 
        : `in ${deadline.days_remaining} days`;

    const subject = `${urgencyLabel} - ${deadline.event_type_name}: ${deadline.case_number}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${deadline.days_remaining <= 0 ? '#dc2626' : deadline.days_remaining <= 1 ? '#ea580c' : '#2563eb'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: 600; width: 140px; color: #6b7280; }
          .detail-value { flex: 1; }
          .urgency-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 14px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">${urgencyLabel}</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Statutory Deadline Reminder</p>
          </div>
          <div class="content">
            <p>A statutory deadline requires your attention:</p>
            
            <div class="detail-row">
              <span class="detail-label">Deadline Type:</span>
              <span class="detail-value"><strong>${deadline.event_type_name}</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Due Date:</span>
              <span class="detail-value"><strong>${new Date(deadline.deadline_date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</strong> (${daysText})</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Case Number:</span>
              <span class="detail-value">${deadline.case_number}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Case Title:</span>
              <span class="detail-value">${deadline.case_title}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Client:</span>
              <span class="detail-value">${deadline.client_name}</span>
            </div>
            ${deadline.assigned_to_name ? `
            <div class="detail-row">
              <span class="detail-label">Assigned To:</span>
              <span class="detail-value">${deadline.assigned_to_name}</span>
            </div>
            ` : ''}
            
            <p style="margin-top: 20px;">Please ensure all necessary actions are completed before the deadline.</p>
            
            <div class="footer">
              <p>This is an automated reminder from Beacon Legal Case Management System.</p>
              <p>If you have any questions, please contact your administrator.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Collect all recipients
    const recipients: string[] = [];
    if (deadline.client_email) recipients.push(deadline.client_email);
    if (deadline.assigned_to_email && deadline.assigned_to_email !== deadline.client_email) {
      recipients.push(deadline.assigned_to_email);
    }

    if (recipients.length === 0) {
      return { success: false, error: 'No valid email recipients' };
    }

    if (resend) {
      // Send via Resend
      const emailResponse = await resend.emails.send({
        from: 'Beacon Legal <onboarding@resend.dev>',
        to: recipients,
        subject,
        html: htmlBody,
      });

      console.log('[Deadline Reminders] Email sent via Resend:', emailResponse);
      return { success: true };
    } else {
      // Log email when Resend is not configured
      console.log('[Deadline Reminders] Email would be sent (Resend not configured):');
      console.log('To:', recipients);
      console.log('Subject:', subject);
      return { success: true };
    }
  } catch (error) {
    console.error('[Deadline Reminders] Email error:', error);
    return { success: false, error: error.message };
  }
}