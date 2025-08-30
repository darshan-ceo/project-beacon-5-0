import { toast } from '@/hooks/use-toast';

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
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

    try {
      // Mock email validation
      if (!message.to.includes('@')) {
        throw new Error('Invalid email address');
      }

      const communicationLog: CommunicationLog = {
        id: `comm-${Date.now()}`,
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
        sentBy: 'Current User',
        sentTo: message.to,
        sentToName: message.toName,
        timestamp: new Date().toISOString(),
        status: Math.random() > 0.1 ? 'sent' : 'failed',
        metadata: {
          messageId: `msg-${Date.now()}`,
          deliveredAt: new Date(Date.now() + 1000).toISOString()
        }
      };

      toast({
        title: "Email Sent",
        description: `Email sent successfully to ${message.toName}`,
      });

      return communicationLog;
    } catch (error) {
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

      const communicationLog: CommunicationLog = {
        id: `sms-${Date.now()}`,
        caseId,
        clientId,
        channel: 'sms',
        direction: 'outbound',
        message,
        attachments: [],
        sentBy: 'Current User',
        sentTo: phoneNumber,
        sentToName: clientName,
        timestamp: new Date().toISOString(),
        status: Math.random() > 0.05 ? 'delivered' : 'failed',
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
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 600));

    try {
      const communicationLog: CommunicationLog = {
        id: `wa-${Date.now()}`,
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
        sentBy: 'Current User',
        sentTo: phoneNumber,
        sentToName: clientName,
        timestamp: new Date().toISOString(),
        status: Math.random() > 0.02 ? 'delivered' : 'failed',
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
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock communication history
    return [
      {
        id: 'comm-1',
        caseId,
        clientId: 'client-1',
        channel: 'email',
        direction: 'outbound',
        subject: 'Hearing Reminder - Case: CASE-2024-0001',
        message: 'This is to remind you about your upcoming hearing...',
        attachments: [],
        sentBy: 'Partner',
        sentTo: 'client@example.com',
        sentToName: 'John Doe',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'read',
        metadata: {
          messageId: 'msg-001',
          deliveredAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 1000).toISOString(),
          readAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
        }
      },
      {
        id: 'comm-2',
        caseId,
        clientId: 'client-1',
        channel: 'sms',
        direction: 'outbound',
        message: 'Hearing tomorrow at 10 AM. Please arrive 30 min early.',
        attachments: [],
        sentBy: 'Associate',
        sentTo: '+91-9876543210',
        sentToName: 'John Doe',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'delivered',
        metadata: {
          messageId: 'sms-002',
          deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2000).toISOString()
        }
      }
    ];
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