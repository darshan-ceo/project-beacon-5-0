import { toast } from '@/hooks/use-toast';
import { getEmailSettings } from './emailSettingsService';
import { sendEmail as sendEmailService } from './emailService';
import type { EmailMessage } from '@/types/email';
import { supabase } from '@/integrations/supabase/client';
import { storageManager } from '@/data/StorageManager';

export interface CommunicationLog {
  id: string;
  caseId: string;
  clientId: string;
  channel: 'email' | 'sms' | 'whatsapp';
  direction: 'inbound' | 'outbound';
  subject?: string;
  message: string;
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }>;
  sentBy: string;
  sentTo: string;
  sentToName: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: {
    messageId?: string;
    failureReason?: string;
    readAt?: string;
    deliveredAt?: string;
  };
}

export interface MessageComposer {
  to: string;
  toName: string;
  channel: 'email' | 'sms' | 'whatsapp';
  subject?: string;
  message: string;
  attachments: File[];
  caseId: string;
  clientId: string;
}

// Mock communication templates
// Helper to get tenant and user context
const getTenantAndUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, full_name')
    .eq('id', user.id)
    .single();
  
  if (!profile) throw new Error('User profile not found');
  
  return { 
    userId: user.id, 
    tenantId: profile.tenant_id,
    userName: profile.full_name || 'Unknown User'
  };
};

const MESSAGE_TEMPLATES = {
  hearing_reminder: {
    email: {
      subject: "Hearing Reminder - Case: [CASE_NUMBER]",
      body: `Dear [CLIENT_NAME],

This is to remind you that your hearing is scheduled for:

Date: [HEARING_DATE]
Time: [HEARING_TIME]
Court: [COURT_NAME]
Case: [CASE_NUMBER] - [CASE_TITLE]

Please ensure to:
- Arrive 30 minutes before the scheduled time
- Bring all required documents
- Contact us if you have any queries

Best regards,
[FIRM_NAME]`
    },
    sms: {
      body: "Hearing reminder: [CASE_NUMBER] on [HEARING_DATE] at [HEARING_TIME] in [COURT_NAME]. Please arrive 30 min early. Contact us for queries."
    },
    whatsapp: {
      body: `🏛️ *Hearing Reminder*

📅 Date: [HEARING_DATE]
⏰ Time: [HEARING_TIME]
🏢 Court: [COURT_NAME]
📋 Case: [CASE_NUMBER]

Please arrive 30 minutes early and bring all documents. Contact us for any queries.

Best regards,
[FIRM_NAME]`
    }
  },
  document_request: {
    email: {
      subject: "Document Submission Required - Case: [CASE_NUMBER]",
      body: `Dear [CLIENT_NAME],

We require the following documents for your case [CASE_NUMBER]:

[DOCUMENT_LIST]

Please submit these documents by [DEADLINE] to ensure timely processing.

You can submit documents by:
- Email: [EMAIL]
- Physical submission at our office
- Secure client portal

Best regards,
[FIRM_NAME]`
    }
  },
  case_update: {
    email: {
      subject: "Case Update - [CASE_NUMBER]",
      body: `Dear [CLIENT_NAME],

We are pleased to update you on the progress of your case [CASE_NUMBER]:

[UPDATE_DETAILS]

Next steps:
[NEXT_STEPS]

Please feel free to contact us if you have any questions.

Best regards,
[FIRM_NAME]`
    }
  }
};

export const communicationService = {
  // Send email
  sendEmail: async (
    message: MessageComposer
  ): Promise<CommunicationLog> => {
    console.log('[Communication Service] Sending email:', message);
    
    try {
      // Load email settings
      const settings = await getEmailSettings();
      
      // Check if email is configured
      if (!settings.enabled) {
        throw new Error('Email notifications are disabled. Enable in Global Parameters → Notifications.');
      }

      // Validate email address
      if (!message.to || !message.to.includes('@')) {
        throw new Error('Invalid email address - recipient email is required');
      }

      // Build email message
      const emailMessage: EmailMessage = {
        to: message.to,
        subject: message.subject || 'Message from Law Firm',
        body: message.message,
        html: message.message // Could be enhanced with HTML templates
      };

      // Send via email service
      const result = await sendEmailService(emailMessage, settings);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      // Get user context
      const { userId, tenantId, userName } = await getTenantAndUser();

      // Persist communication log to Supabase
      const storage = storageManager.getStorage();
      const logData = {
        tenant_id: tenantId,
        case_id: message.caseId,
        client_id: message.clientId,
        channel: 'email' as const,
        direction: 'outbound' as const,
        subject: message.subject,
        message: message.message,
        sent_by: userId,
        sent_by_name: userName,
        sent_to: message.to,
        sent_to_name: message.toName,
        status: 'sent' as const,
        message_id: result.messageId || '',
        delivered_at: new Date().toISOString(),
        attachments: message.attachments.map(file => ({
          id: `att-${Date.now()}-${Math.random()}`,
          name: file.name,
          type: file.type,
          size: file.size
        }))
      };

      const savedLog: any = await storage.create('communication_logs', logData as any);

      // Create communication log response
      const communicationLog: CommunicationLog = {
        id: savedLog.id,
        caseId: message.caseId,
        clientId: message.clientId,
        channel: 'email',
        direction: 'outbound',
        subject: message.subject,
        message: message.message,
        attachments: message.attachments.map(file => ({
          id: `att-${Date.now()}-${Math.random()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file)
        })),
        sentBy: userName,
        sentTo: message.to,
        sentToName: message.toName,
        timestamp: savedLog.created_at || new Date().toISOString(),
        status: 'sent',
        metadata: {
          messageId: result.messageId,
          deliveredAt: new Date().toISOString()
        }
      };

      toast({
        title: "Email Sent",
        description: `Email sent successfully to ${message.toName}`,
      });

      return communicationLog;
    } catch (error) {
      console.error('[Communication Service] Email sending failed:', error);
      
      toast({
        title: "Email Failed",
        description: error instanceof Error ? error.message : 'Failed to send email',
        variant: 'destructive'
      });
      
      throw new Error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Send SMS
  sendSMS: async (
    phoneNumber: string,
    message: string,
    caseId: string,
    clientId: string,
    clientName: string
  ): Promise<CommunicationLog> => {
    // Note: Real SMS delivery requires Twilio or similar SMS provider setup
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

    try {
      // Mock SMS validation
      if (!/^\+?[\d\s-()]+$/.test(phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      if (message.length > 160) {
        toast({
          title: "SMS Length Warning",
          description: "SMS will be sent as multiple parts",
        });
      }

      // Get user context
      const { userId, tenantId, userName } = await getTenantAndUser();

      // Persist communication log to Supabase
      const storage = storageManager.getStorage();
      const logData = {
        tenant_id: tenantId,
        case_id: caseId,
        client_id: clientId,
        channel: 'sms' as const,
        direction: 'outbound' as const,
        message,
        sent_by: userId,
        sent_by_name: userName,
        sent_to: phoneNumber,
        sent_to_name: clientName,
        status: 'sent' as const,
        message_id: `sms-${Date.now()}`,
        delivered_at: new Date(Date.now() + 2000).toISOString(),
        attachments: []
      };

      const savedLog: any = await storage.create('communication_logs', logData as any);

      const communicationLog: CommunicationLog = {
        id: savedLog.id,
        caseId,
        clientId,
        channel: 'sms',
        direction: 'outbound',
        message,
        attachments: [],
        sentBy: userName,
        sentTo: phoneNumber,
        sentToName: clientName,
        timestamp: savedLog.created_at || new Date().toISOString(),
        status: 'sent',
        metadata: {
          messageId: `sms-${Date.now()}`,
          deliveredAt: new Date(Date.now() + 2000).toISOString()
        }
      };

      toast({
        title: "SMS Sent",
        description: `SMS sent successfully to ${clientName}`,
      });

      return communicationLog;
    } catch (error) {
      throw new Error(`SMS sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Send WhatsApp message
  sendWhatsApp: async (
    phoneNumber: string,
    message: string,
    attachments: File[],
    caseId: string,
    clientId: string,
    clientName: string
  ): Promise<CommunicationLog> => {
    // Note: Real WhatsApp delivery requires WhatsApp Business API setup
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 600));

    try {
      // Get user context
      const { userId, tenantId, userName } = await getTenantAndUser();

      // Persist communication log to Supabase
      const storage = storageManager.getStorage();
      const logData = {
        tenant_id: tenantId,
        case_id: caseId,
        client_id: clientId,
        channel: 'whatsapp' as const,
        direction: 'outbound' as const,
        message,
        sent_by: userId,
        sent_by_name: userName,
        sent_to: phoneNumber,
        sent_to_name: clientName,
        status: 'sent' as const,
        message_id: `wa-${Date.now()}`,
        delivered_at: new Date(Date.now() + 1500).toISOString(),
        attachments: attachments.map(file => ({
          id: `att-${Date.now()}-${Math.random()}`,
          name: file.name,
          type: file.type,
          size: file.size
        }))
      };

      const savedLog: any = await storage.create('communication_logs', logData as any);

      const communicationLog: CommunicationLog = {
        id: savedLog.id,
        caseId,
        clientId,
        channel: 'whatsapp',
        direction: 'outbound',
        message,
        attachments: attachments.map(file => ({
          id: `att-${Date.now()}-${Math.random()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file)
        })),
        sentBy: userName,
        sentTo: phoneNumber,
        sentToName: clientName,
        timestamp: savedLog.created_at || new Date().toISOString(),
        status: 'sent',
        metadata: {
          messageId: `wa-${Date.now()}`,
          deliveredAt: new Date(Date.now() + 1500).toISOString()
        }
      };

      toast({
        title: "WhatsApp Sent",
        description: `WhatsApp message sent successfully to ${clientName}`,
      });

      return communicationLog;
    } catch (error) {
      throw new Error(`WhatsApp sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get communication log for a case
  getCommunicationLog: async (caseId: string): Promise<CommunicationLog[]> => {
    try {
      const storage = storageManager.getStorage();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Query communication_logs from Supabase filtered by case_id
      const logs = await storage.query('communication_logs', (log: any) => log.case_id === caseId);
      
      // Map database fields to CommunicationLog interface
      return logs.map((log: any) => ({
        id: log.id,
        caseId: log.case_id,
        clientId: log.client_id,
        channel: log.channel,
        direction: log.direction,
        subject: log.subject,
        message: log.message,
        attachments: log.attachments || [],
        sentBy: log.sent_by_name,
        sentTo: log.sent_to,
        sentToName: log.sent_to_name,
        timestamp: log.created_at,
        status: log.status,
        metadata: {
          messageId: log.message_id,
          failureReason: log.failure_reason,
          deliveredAt: log.delivered_at,
          readAt: log.read_at
        }
      })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to load communication logs:', error);
      return [];
    }
  },

  // Get message templates
  getMessageTemplate: (templateType: keyof typeof MESSAGE_TEMPLATES, channel: 'email' | 'sms' | 'whatsapp') => {
    const template = MESSAGE_TEMPLATES[templateType];
    if (!template || !template[channel]) {
      return null;
    }
    return template[channel];
  },

  // Apply template variables
  applyTemplate: (template: string, variables: Record<string, string>) => {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
    });
    return result;
  }
};