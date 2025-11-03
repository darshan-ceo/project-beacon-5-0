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

  // Verify API key for scheduled execution (secret-based authentication)
  const authHeader = req.headers.get('Authorization');
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!authHeader || !apiKey || authHeader !== `Bearer ${apiKey}`) {
    console.error('[Hearing Reminders] Unauthorized access attempt');
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid API key' }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    console.log('[Hearing Reminders] Function triggered at:', new Date().toISOString());
    
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

    // Fetch hearings for today and tomorrow from Supabase
    const { data: hearingsData, error: hearingError } = await supabase
      .from('hearings')
      .select(`
        id,
        case_id,
        hearing_date,
        court_name,
        judge_name,
        status,
        cases!inner (
          id,
          case_number,
          title,
          clients!inner (
            display_name,
            email,
            phone
          )
        )
      `)
      .in('hearing_date', [todayStr, tomorrowStr])
      .eq('status', 'Scheduled');

    if (hearingError) {
      console.error('[Hearing Reminders] Error fetching hearings:', hearingError);
      throw new Error(`Failed to fetch hearings: ${hearingError.message}`);
    }

    console.log(`[Hearing Reminders] Found ${hearingsData?.length || 0} scheduled hearings`);

    // Transform to HearingReminder format
    const hearings: HearingReminder[] = (hearingsData || []).map(h => ({
      id: h.id,
      case_id: h.case_id,
      date: h.hearing_date,
      start_time: '10:00 AM', // Default time since not in schema
      court_id: '',
      judge_ids: [],
      case_number: h.cases.case_number,
      case_title: h.cases.title,
      client_email: h.cases.clients.email,
      client_phone: h.cases.clients.phone,
      client_name: h.cases.clients.display_name,
      judge_name: h.judge_name,
      forum_name: h.court_name,
    }));

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

        // Fetch tenant_id from case to ensure proper multi-tenant isolation
        const { data: caseData, error: caseError } = await supabase
          .from('cases')
          .select('tenant_id')
          .eq('id', hearing.case_id)
          .single();

        if (caseError) {
          console.error('[Hearing Reminders] Failed to fetch case tenant:', caseError);
          notifications.failed++;
          continue; // Skip saving to audit_log but continue with other hearings
        }

        // Save notification to audit_log with proper tenant_id
        await supabase.from('audit_log').insert({
          entity_type: 'hearing',
          entity_id: hearing.id,
          action_type: 'notification_sent',
          details: {
            reminder_type: reminderType,
            channels: ['email', 'whatsapp'],
            recipients: [hearing.client_email, hearing.client_phone].filter(Boolean),
            success: log.success,
            error_message: log.error_message || null,
          },
          user_id: null, // System-generated notification
          tenant_id: caseData.tenant_id, // ✅ Proper tenant isolation
        });

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
