import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppRequest {
  phone: string;
  message: string;
  tenantId?: string;
  templateId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

interface ENotifyResponse {
  success: boolean;
  message?: string;
  messageId?: string;
}

// Validate Indian phone number format
function validatePhoneNumber(phone: string): { valid: boolean; formatted: string; error?: string } {
  // Remove all spaces, dashes, and other characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Check if it's a valid Indian mobile number
  // Format: 10 digits starting with 6-9, or 12 digits starting with 91
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    // 10 digit format - add 91 prefix for WhatsApp
    return { valid: true, formatted: `91${cleaned}` };
  } else if (/^91[6-9]\d{9}$/.test(cleaned)) {
    // Already has 91 prefix
    return { valid: true, formatted: cleaned };
  } else if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    // Has +91 prefix - remove the +
    return { valid: true, formatted: cleaned.substring(1) };
  }
  
  return { 
    valid: false, 
    formatted: '', 
    error: 'Invalid phone number. Please provide a valid 10-digit Indian mobile number.' 
  };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get instance ID from environment
    const instanceId = Deno.env.get('WHATSAPP_INSTANCE_ID');
    if (!instanceId) {
      console.error('WHATSAPP_INSTANCE_ID not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'WhatsApp gateway not configured. Please set WHATSAPP_INSTANCE_ID.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { phone, message, tenantId, templateId, relatedEntityType, relatedEntityId }: WhatsAppRequest = await req.json();

    // Validate required fields
    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and format phone number
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: phoneValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedPhone = phoneValidation.formatted;

    console.log(`Sending WhatsApp message to ${formattedPhone}`);

    // Build eNotify API URL
    const encodedMessage = encodeURIComponent(message);
    const apiUrl = `https://enotify.app/api/sendText?token=${instanceId}&phone=${formattedPhone}&message=${encodedMessage}`;

    // Send WhatsApp message via eNotify API
    const response = await fetch(apiUrl, {
      method: 'GET',
    });

    let responseData: ENotifyResponse;
    const responseText = await response.text();
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // If response is not JSON, treat it based on HTTP status
      responseData = {
        success: response.ok,
        message: responseText
      };
    }

    console.log('eNotify API response:', responseData);

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseServiceKey && tenantId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Log delivery attempt
      const logData = {
        tenant_id: tenantId,
        template_id: templateId || null,
        recipient_phone: formattedPhone,
        message_text: message,
        status: response.ok && responseData.success !== false ? 'sent' : 'failed',
        provider_message_id: responseData.messageId || null,
        delivery_timestamp: response.ok && responseData.success !== false ? new Date().toISOString() : null,
        error_message: !response.ok || responseData.success === false ? (responseData.message || 'Unknown error') : null,
        related_entity_type: relatedEntityType || null,
        related_entity_id: relatedEntityId || null,
        credits_used: 1
      };

      const { error: logError } = await supabase
        .from('whatsapp_delivery_logs')
        .insert(logData);

      if (logError) {
        console.error('Failed to log WhatsApp delivery:', logError);
      }
    }

    if (response.ok && responseData.success !== false) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: responseData.messageId,
          message: 'WhatsApp message sent successfully' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.message || 'Failed to send WhatsApp message' 
        }),
        { status: response.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in send-whatsapp function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
