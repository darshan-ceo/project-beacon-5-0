/**
 * Hearing Reminders Edge Function
 * Sends Email and WhatsApp reminders for upcoming hearings
 * 
 * Triggers:
 * - T-1 Day Reminder: 8 AM (1 day before hearing)
 * - Same-Day Reminder: 8 AM (on hearing day)
 * 
 * Schedule with pg_cron:
 * SELECT cron.schedule(
 *   'send-hearing-reminders',
 *   '0 8 * * *',
 *   $$ SELECT net.http_post(
 *     url:='https://[project-ref].supabase.co/functions/v1/send-hearing-reminders',
 *     headers:='{"Authorization": "Bearer [anon-key]"}'::jsonb
 *   ); $$
 * );
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HearingReminder {
  id: string;
  case_id: string;
  date: string;
  start_time: string;
  court_id: string;
  authority_id?: string;
  forum_id?: string;
  judge_ids: string[];
  case_number?: string;
  case_title?: string;
  client_email?: string;
  client_phone?: string;
  client_name?: string;
  forum_name?: string;
  authority_name?: string;
  judge_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log('Checking for hearings on:', todayStr, 'and', tomorrowStr);

    // Fetch hearings for today and tomorrow
    // Note: In production, this would query from actual Supabase tables
    // For now, we'll simulate the response structure
    
    const hearings: HearingReminder[] = [
      // This would be replaced with actual Supabase query:
      // const { data: hearings } = await supabase
      //   .from('hearings')
      //   .select(`
      //     *,
      //     case:cases(id, case_number, title, client_id),
      //     authority:courts!authority_id(name),
      //     forum:courts!forum_id(name, city),
      //     judge:judges(name)
      //   `)
      //   .in('date', [todayStr, tomorrowStr])
      //   .eq('status', 'scheduled');
    ];

    const notifications = {
      sent: 0,
      failed: 0,
      logs: [] as any[],
    };

    for (const hearing of hearings) {
      const reminderType = hearing.date === todayStr ? 'same-day' : 't-1';
      
      try {
        // Send Email Notification
        const emailResult = await sendEmailReminder(hearing, reminderType);
        
        // Send WhatsApp Notification
        const whatsappResult = await sendWhatsAppReminder(hearing, reminderType);
        
        // Log notification attempt
        const log = {
          hearing_id: hearing.id,
          case_id: hearing.case_id,
          type: 'hearing_reminder',
          reminder_type: reminderType,
          channels: ['email', 'whatsapp'],
          recipients: [hearing.client_email, hearing.client_phone].filter(Boolean),
          sent_at: new Date().toISOString(),
          success: emailResult.success && whatsappResult.success,
          error_message: [emailResult.error, whatsappResult.error].filter(Boolean).join('; '),
        };

        notifications.logs.push(log);
        
        if (log.success) {
          notifications.sent++;
        } else {
          notifications.failed++;
        }

        // In production, save to notification_log table:
        // await supabase.from('notification_log').insert(log);

        console.log(`Reminder sent for hearing ${hearing.id}:`, log);
      } catch (error) {
        console.error(`Failed to send reminder for hearing ${hearing.id}:`, error);
        notifications.failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: notifications.sent,
        failed: notifications.failed,
        total: hearings.length,
        logs: notifications.logs,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-hearing-reminders:', error);
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
 * Send email reminder
 */
async function sendEmailReminder(
  hearing: HearingReminder,
  reminderType: 't-1' | 'same-day'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!hearing.client_email) {
      return { success: false, error: 'No email address' };
    }

    const subject = `Hearing Reminder: ${hearing.case_number || 'Case'} - ${reminderType === 'same-day' ? 'Today' : 'Tomorrow'}`;
    const body = `
      Dear ${hearing.client_name || 'Client'},
      
      This is a reminder about your upcoming hearing:
      
      Case: ${hearing.case_number} - ${hearing.case_title}
      Date: ${new Date(hearing.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}
      Time: ${hearing.start_time}
      
      Venue: ${hearing.forum_name || 'Court'}
      Authority: ${hearing.authority_name || 'N/A'}
      Judge: ${hearing.judge_name || 'To be assigned'}
      
      Please ensure all necessary documents are prepared.
      
      Best regards,
      Beacon Legal Team
    `;

    // In production, use actual email service (Resend, SendGrid, etc.)
    console.log('Email would be sent to:', hearing.client_email);
    console.log('Subject:', subject);
    console.log('Body:', body);

    // Simulate email sending
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send WhatsApp reminder
 */
async function sendWhatsAppReminder(
  hearing: HearingReminder,
  reminderType: 't-1' | 'same-day'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!hearing.client_phone) {
      return { success: false, error: 'No phone number' };
    }

    const message = `🔔 Hearing Reminder: ${hearing.case_number} on ${new Date(hearing.date).toLocaleDateString('en-IN')} at ${hearing.start_time}. Venue: ${hearing.forum_name}. - Beacon Legal`;

    // In production, integrate with WhatsApp Business API or service like Twilio
    console.log('WhatsApp would be sent to:', hearing.client_phone);
    console.log('Message:', message);

    // Simulate WhatsApp sending
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
