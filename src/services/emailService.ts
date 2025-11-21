import type { EmailSettings, EmailMessage, EmailTestResult } from '@/types/email';
import { validateEmail } from '@/utils/emailValidation';
import { supabase } from '@/integrations/supabase/client';

/**
 * Real Email Service using Resend via Supabase Edge Functions
 */

/**
 * Send email via Resend (real implementation)
 */
export async function sendEmail(
  message: EmailMessage,
  settings: EmailSettings
): Promise<EmailTestResult> {
  console.log('[Email Service] Sending email:', {
    to: message.to,
    subject: message.subject,
    mode: settings.mode,
    enabled: settings.enabled
  });

  // Check if email is enabled
  if (!settings.enabled) {
    return {
      success: false,
      error: 'Email notifications are disabled',
      details: 'Enable email in Global Parameters → Notifications',
      timestamp: new Date()
    };
  }

  // Validate recipient
  const recipients = Array.isArray(message.to) ? message.to : [message.to];
  for (const recipient of recipients) {
    if (!validateEmail(recipient)) {
      return {
        success: false,
        error: 'Invalid recipient email',
        details: `The email address "${recipient}" is not valid`,
        timestamp: new Date()
      };
    }
  }

  try {
    // Call send-email edge function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: message.to,
        subject: message.subject,
        body: message.body,
        html: message.html,
        replyTo: message.replyTo,
        cc: message.cc,
        bcc: message.bcc,
      }
    });

    if (error) {
      console.error('[Email Service] Edge function error:', error);
      
      // Try to parse error response body for better error messages
      let errorDetails = error.message || 'An error occurred while sending email';
      let errorTitle = 'Failed to send email';
      
      // If error has context with a non-2xx response, try to extract the edge function's JSON response
      if (error.message && error.message.includes('Edge function returned')) {
        try {
          // Extract JSON from error message if present
          const jsonMatch = error.message.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedError = JSON.parse(jsonMatch[0]);
            if (parsedError.error) {
              errorTitle = parsedError.error;
            }
            if (parsedError.details) {
              errorDetails = parsedError.details;
            }
          }
        } catch (parseError) {
          console.warn('[Email Service] Could not parse edge function error response:', parseError);
        }
      }
      
      return {
        success: false,
        error: errorTitle,
        details: errorDetails,
        timestamp: new Date()
      };
    }

    if (!data.success) {
      console.error('[Email Service] Email sending failed:', data);
      return {
        success: false,
        error: data.error || 'Email sending failed',
        details: data.details || 'Unknown error',
        timestamp: new Date()
      };
    }

    console.log('[Email Service] Email sent successfully:', data);

    return {
      success: true,
      messageId: data.messageId,
      details: data.details || `Email sent successfully to ${Array.isArray(message.to) ? message.to.join(', ') : message.to}`,
      timestamp: new Date()
    };
  } catch (error: any) {
    console.error('[Email Service] Unexpected error:', error);
    return {
      success: false,
      error: 'Unexpected error',
      details: error.message || 'An unexpected error occurred while sending email',
      timestamp: new Date()
    };
  }
}

/**
 * Send test email
 */
export async function sendTestEmail(
  recipientEmail: string,
  settings: EmailSettings
): Promise<EmailTestResult> {
  console.log('[Email Service] Sending test email to:', recipientEmail);

  const testMessage: EmailMessage = {
    to: recipientEmail,
    subject: 'Test Email from Law Firm Case Management',
    body: `This is a test email sent at ${new Date().toLocaleString()}.\n\nIf you received this message, your email configuration is working correctly.\n\nEmail Mode: ${settings.mode === 'provider' ? 'Provider SMTP' : 'Client SMTP'}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">✅ Test Email Successful</h2>
        <p>This is a test email sent at <strong>${new Date().toLocaleString()}</strong>.</p>
        <p style="background: #E0E7FF; padding: 15px; border-radius: 8px; border-left: 4px solid #4F46E5;">
          <strong>✓ Success!</strong> If you're reading this, your email configuration is working correctly and emails are being delivered via Resend.
        </p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;" />
        <p><strong>Configuration Details:</strong></p>
        <ul style="line-height: 1.8;">
          <li>Email Mode: ${settings.mode === 'provider' ? 'Provider SMTP' : 'Client SMTP'}</li>
          <li>Status: Email enabled</li>
          <li>Delivery: via Resend API</li>
        </ul>
        <p style="color: #16A34A; font-size: 14px; margin-top: 20px; padding: 10px; background: #F0FDF4; border-radius: 6px;">
          ✉️ This is a real email delivered through Resend email service.
        </p>
      </div>
    `
  };

  return await sendEmail(testMessage, settings);
}

/**
 * Validate email configuration
 */
export async function validateEmailConfig(settings: EmailSettings): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!settings.enabled) {
    errors.push('Email notifications are not enabled');
  }

  if (settings.mode === 'provider') {
    const config = settings.providerConfig;
    if (!config) {
      errors.push('Provider configuration is missing');
    } else {
      if (!config.email) errors.push('Email address is required');
      if (!config.appPassword) errors.push('App password is required');
      if (config.email && !validateEmail(config.email)) {
        errors.push('Invalid email address');
      }
    }
  } else if (settings.mode === 'client') {
    const config = settings.clientConfig;
    if (!config) {
      errors.push('Client SMTP configuration is missing');
    } else {
      if (!config.host) errors.push('SMTP host is required');
      if (!config.port) errors.push('SMTP port is required');
      if (!config.username) errors.push('Username is required');
      if (!config.password) errors.push('Password is required');
      if (!config.fromAddress) errors.push('From address is required');
      if (config.fromAddress && !validateEmail(config.fromAddress)) {
        errors.push('Invalid from address');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get email service status
 */
export async function getEmailStatus(settings: EmailSettings): Promise<{
  configured: boolean;
  enabled: boolean;
  mode: string;
  ready: boolean;
}> {
  const validation = await validateEmailConfig(settings);
  
  return {
    configured: validation.valid,
    enabled: settings.enabled,
    mode: settings.mode,
    ready: settings.enabled && validation.valid
  };
}
