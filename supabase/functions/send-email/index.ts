import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    console.log('[send-email] Email sent successfully:', emailResponse);

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
