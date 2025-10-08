import type { EmailSettings, EmailMessage, EmailTestResult } from '@/types/email';
import { PROVIDER_CONFIGS } from '@/types/email';
import { validateEmail } from '@/utils/emailValidation';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock Email Service
 * Simulates realistic email sending behavior for demo purposes
 */

// Simulate network delay
const SEND_DELAY_MS = 1500;

// Success rate for realistic testing (90% success)
const SUCCESS_RATE = 0.9;

/**
 * Mock error scenarios for testing
 */
const MOCK_ERRORS = [
  { error: 'Authentication failed', details: 'Invalid username or password. Please check your credentials.' },
  { error: 'Connection timeout', details: 'Unable to reach SMTP server. Please verify host and port.' },
  { error: 'Invalid recipient', details: 'The recipient email address is not valid or does not exist.' },
  { error: 'Rate limit exceeded', details: 'Too many emails sent. Please try again later.' },
  { error: 'SSL/TLS error', details: 'Secure connection failed. Check your security settings.' }
];

/**
 * Simulate SMTP connection test
 */
async function simulateSmtpConnection(settings: EmailSettings): Promise<{ success: boolean; error?: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Validate configuration
  if (settings.mode === 'provider') {
    const config = settings.providerConfig;
    if (!config || !config.email || !config.appPassword) {
      return { success: false, error: 'Incomplete provider configuration' };
    }
    if (!validateEmail(config.email)) {
      return { success: false, error: 'Invalid email address' };
    }
  } else if (settings.mode === 'client') {
    const config = settings.clientConfig;
    if (!config || !config.host || !config.port || !config.username || !config.password) {
      return { success: false, error: 'Incomplete SMTP configuration' };
    }
    if (!validateEmail(config.fromAddress)) {
      return { success: false, error: 'Invalid from address' };
    }
  }
  
  // Simulate random success/failure for testing
  const shouldSucceed = Math.random() < SUCCESS_RATE;
  
  if (!shouldSucceed) {
    const randomError = MOCK_ERRORS[Math.floor(Math.random() * MOCK_ERRORS.length)];
    return { success: false, error: randomError.error };
  }
  
  return { success: true };
}

/**
 * Generate mock email ID
 */
function generateEmailId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `<${timestamp}.${random}@mock-smtp.local>`;
}

/**
 * Send email (mock implementation)
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

  // Simulate sending delay
  await new Promise(resolve => setTimeout(resolve, SEND_DELAY_MS));

  // Test SMTP connection
  const connectionResult = await simulateSmtpConnection(settings);
  if (!connectionResult.success) {
    const errorDetails = MOCK_ERRORS.find(e => e.error === connectionResult.error);
    return {
      success: false,
      error: connectionResult.error || 'Connection failed',
      details: errorDetails?.details || 'Unable to connect to SMTP server',
      timestamp: new Date()
    };
  }

  // Generate mock message ID
  const messageId = generateEmailId();

  console.log('[Email Service] Email sent successfully:', {
    messageId,
    to: message.to,
    timestamp: new Date().toISOString()
  });

  return {
    success: true,
    messageId,
    details: `Email sent successfully to ${Array.isArray(message.to) ? message.to.join(', ') : message.to}`,
    timestamp: new Date()
  };
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
    body: `This is a test email sent at ${new Date().toLocaleString()}.\n\nIf you received this message, your email configuration is working correctly.\n\nEmail Mode: ${settings.mode === 'provider' ? 'Provider SMTP' : 'Client SMTP'}\n\nThis is a demo/mock email service. No actual email was sent.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Test Email</h2>
        <p>This is a test email sent at <strong>${new Date().toLocaleString()}</strong>.</p>
        <p>If you received this message, your email configuration is working correctly.</p>
        <hr style="margin: 20px 0;" />
        <p><strong>Configuration Details:</strong></p>
        <ul>
          <li>Email Mode: ${settings.mode === 'provider' ? 'Provider SMTP' : 'Client SMTP'}</li>
          <li>Status: Email enabled</li>
        </ul>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          ⚠️ This is a demo/mock email service. No actual email was sent.
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
