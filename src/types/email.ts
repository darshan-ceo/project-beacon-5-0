/**
 * Email System Type Definitions
 * Supports Provider SMTP (Gmail/Yahoo/Outlook) and Client SMTP modes
 */

export type EmailProvider = 'gmail' | 'yahoo' | 'outlook' | 'custom';
export type EmailMode = 'provider' | 'client';

export interface ProviderSmtpConfig {
  provider: EmailProvider;
  email: string;
  appPassword: string;
}

export interface ClientSmtpConfig {
  host: string;
  port: number;
  secure: boolean; // TLS/SSL
  username: string;
  password: string;
  fromAddress: string;
  fromName?: string;
}

export interface EmailSettings {
  enabled: boolean;
  mode: EmailMode;
  providerConfig?: ProviderSmtpConfig;
  clientConfig?: ClientSmtpConfig;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailTestRequest {
  recipientEmail: string;
  settings: EmailSettings;
}

export interface EmailTestResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: string;
  timestamp: Date;
}

export interface ProviderDefaults {
  host: string;
  port: number;
  secure: boolean;
  setupGuideUrl: string;
  helpText: string;
}

export const PROVIDER_CONFIGS: Record<Exclude<EmailProvider, 'custom'>, ProviderDefaults> = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: true,
    setupGuideUrl: 'https://support.google.com/accounts/answer/185833',
    helpText: 'Use an App Password from your Google Account Security settings. Port 587 (TLS) or 465 (SSL).'
  },
  yahoo: {
    host: 'smtp.mail.yahoo.com',
    port: 587,
    secure: true,
    setupGuideUrl: 'https://help.yahoo.com/kb/generate-third-party-passwords-sln15241.html',
    helpText: 'Generate an app password from Yahoo Account Security. Port 587 recommended.'
  },
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: true,
    setupGuideUrl: 'https://support.microsoft.com/account-billing',
    helpText: 'Use an App Password from Microsoft Account Security. Port 587 (TLS) recommended.'
  }
};
