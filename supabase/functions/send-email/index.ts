import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// Check if API key is configured
const apiKey = Deno.env.get("RESEND_API_KEY");
if (!apiKey) {
  console.error("[send-email] FATAL: RESEND_API_KEY is not configured in backend secrets");
}

const resend = new Resend(apiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string | string[];
  subject: string;
  body?: string;
  html?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Early check: API key must be configured
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Email backend not configured',
          details: 'RESEND_API_KEY is missing in backend secrets. Please configure it in Cloud → Secrets.',
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { to, subject, body, html, replyTo, cc, bcc }: SendEmailRequest = await req.json();

    console.log('[send-email] Processing email request:', { to, subject });

    // Validate required fields
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required fields: to and subject are required' 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Prepare email content (prefer HTML over plain text)
    const emailContent = html || (body ? `<div style="font-family: Arial, sans-serif; white-space: pre-wrap;">${body}</div>` : '');

    if (!emailContent) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Email body or html content is required' 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Law Firm <onboarding@resend.dev>", // TODO: Use configured from address
      to: Array.isArray(to) ? to : [to],
      subject,
      html: emailContent,
      ...(replyTo && { reply_to: replyTo }),
      ...(cc && { cc }),
      ...(bcc && { bcc }),
    });

    console.log('[send-email] Resend API response:', emailResponse);

    // Check if Resend returned an error
    if (emailResponse.error) {
      console.error('[send-email] Resend API error:', emailResponse.error);
      
      // Normalize common Resend errors into clearer messages
      let userFriendlyError = emailResponse.error.message || 'Resend API error';
      let userFriendlyDetails = '';
      
      if (emailResponse.error.message?.toLowerCase().includes('api key is invalid')) {
        userFriendlyError = 'Invalid Resend API Key';
        userFriendlyDetails = 'Your Resend API key is invalid or expired. Please:\n1. Go to https://resend.com/api-keys\n2. Create a new API key\n3. Update RESEND_API_KEY in Cloud → Secrets\n4. Make sure to copy the key starting with "re_"';
      } else if (emailResponse.error.message?.toLowerCase().includes('domain not verified')) {
        userFriendlyError = 'Domain Not Verified';
        userFriendlyDetails = 'Your sending domain is not verified in Resend. Verify it at https://resend.com/domains';
      } else if (emailResponse.error.message?.toLowerCase().includes('rate limit')) {
        userFriendlyError = 'Rate Limit Exceeded';
        userFriendlyDetails = 'Too many emails sent. Please wait a few minutes and try again, or upgrade your Resend plan.';
      } else {
        userFriendlyDetails = `Failed to send email: ${emailResponse.error.message}`;
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: userFriendlyError,
          details: userFriendlyDetails,
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    console.log('[send-email] Email sent successfully, message ID:', emailResponse.data?.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        messageId: emailResponse.data?.id,
        details: `Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}`,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('[send-email] Error sending email:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to send email',
        details: error.response?.body || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
