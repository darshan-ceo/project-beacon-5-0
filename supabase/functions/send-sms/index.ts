import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  message: string;
  dltTemplateId?: string;
  tenantId: string;
  templateId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

interface SMS24Response {
  ErrorCode: string;
  ErrorMessage: string;
  JobId?: string;
  MessageData?: Array<{
    Number: string;
    MessageId: string;
  }>;
}

// Validate Indian phone number format
function validatePhoneNumber(phone: string): { valid: boolean; formatted: string; error?: string } {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid Indian mobile number
  if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
    return { valid: true, formatted: `91${cleaned}` };
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('91') && /^91[6-9]\d{9}$/.test(cleaned)) {
    return { valid: true, formatted: cleaned };
  }
  
  return { 
    valid: false, 
    formatted: cleaned,
    error: 'Invalid Indian mobile number. Must be 10 digits starting with 6-9.'
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, dltTemplateId, tenantId, templateId, relatedEntityType, relatedEntityId } = await req.json() as SMSRequest;

    // Get SMS configuration from environment
    const smsProvider = Deno.env.get('SMS_PROVIDER') || 'sms24';
    const smsApiKey = Deno.env.get('SMS_API_KEY');
    const smsSenderId = Deno.env.get('SMS_SENDER_ID');
    const smsDltEntityId = Deno.env.get('SMS_DLT_ENTITY_ID');

    // Validate required credentials
    if (!smsApiKey || !smsSenderId) {
      console.error('[send-sms] Missing SMS credentials');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS gateway not configured. Contact administrator.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: phoneValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-sms] Sending SMS to ${phoneValidation.formatted} via ${smsProvider}`);

    // Build SMS24 API URL
    // SMS24/MSG24 API: http://mysms.msg24.in/api/mt/SendSMS
    const sms24Url = new URL('http://mysms.msg24.in/api/mt/SendSMS');
    sms24Url.searchParams.set('APIKey', smsApiKey);
    sms24Url.searchParams.set('senderid', smsSenderId);
    sms24Url.searchParams.set('channel', '2'); // Trans channel for transactional SMS
    sms24Url.searchParams.set('DCS', '0'); // 0 for GSM, 8 for Unicode
    sms24Url.searchParams.set('flashsms', '0');
    sms24Url.searchParams.set('number', phoneValidation.formatted);
    sms24Url.searchParams.set('text', message);
    sms24Url.searchParams.set('route', '1'); // 1 for transactional

    // Add DLT parameters if configured
    if (smsDltEntityId) {
      sms24Url.searchParams.set('peid', smsDltEntityId);
    }
    if (dltTemplateId) {
      sms24Url.searchParams.set('templateid', dltTemplateId);
    }

    console.log(`[send-sms] Calling SMS24 API...`);

    // Call SMS24 API
    const smsResponse = await fetch(sms24Url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const responseText = await smsResponse.text();
    console.log(`[send-sms] SMS24 Response: ${responseText}`);

    let sms24Data: SMS24Response;
    try {
      sms24Data = JSON.parse(responseText);
    } catch {
      // Some SMS APIs return simple text responses
      sms24Data = {
        ErrorCode: smsResponse.ok ? '000' : '999',
        ErrorMessage: responseText
      };
    }

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine success based on SMS24 response - ONLY check ErrorCode, not HTTP status
    // SMS24 returns HTTP 200 even for API errors like "Invalid template text"
    const isSuccess = sms24Data.ErrorCode === '000';
    const messageId = sms24Data.JobId || sms24Data.MessageData?.[0]?.MessageId || null;

    // Log delivery attempt
    const logEntry = {
      tenant_id: tenantId,
      template_id: templateId || null,
      recipient_phone: phoneValidation.formatted,
      message_text: message,
      dlt_template_id: dltTemplateId || null,
      status: isSuccess ? 'sent' : 'failed',
      provider_message_id: messageId,
      delivery_timestamp: isSuccess ? new Date().toISOString() : null,
      error_message: isSuccess ? null : (sms24Data.ErrorMessage || 'Unknown error'),
      credits_used: isSuccess ? Math.ceil(message.length / 160) : 0,
      related_entity_type: relatedEntityType || null,
      related_entity_id: relatedEntityId || null
    };

    const { error: logError } = await supabase
      .from('sms_delivery_logs')
      .insert(logEntry);

    if (logError) {
      console.error('[send-sms] Failed to log delivery:', logError);
    }

    if (isSuccess) {
      console.log(`[send-sms] SMS sent successfully. MessageId: ${messageId}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId,
          credits: Math.ceil(message.length / 160)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error(`[send-sms] SMS failed: ${sms24Data.ErrorMessage}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: sms24Data.ErrorMessage || 'Failed to send SMS',
          errorCode: sms24Data.ErrorCode
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[send-sms] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
