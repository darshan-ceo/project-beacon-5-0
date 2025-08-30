import { toast } from '@/hooks/use-toast';
import { communicationService, CommunicationLog } from './communicationService';

export interface HearingReminder {
  id: string;
  hearingId: string;
  caseId: string;
  clientId: string;
  scheduledFor: string;
  daysBefore: number;
  channels: Array<'email' | 'sms' | 'whatsapp'>;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  communicationLogs: string[]; // IDs of communication logs
  createdAt: string;
}

export interface ReminderSettings {
  enabled: boolean;
  defaultChannels: Array<'email' | 'sms' | 'whatsapp'>;
  reminderDays: number[]; // e.g., [1, 3, 7] for 1, 3, and 7 days before
  autoSend: boolean;
  businessHoursOnly: boolean;
  excludeWeekends: boolean;
}

// Mock hearing data for demonstration
const MOCK_HEARINGS = [
  {
    id: 'hearing-1',
    caseId: 'case-1',
    clientId: 'client-1',
    clientName: 'John Doe',
    clientEmail: 'john.doe@example.com',
    clientPhone: '+91-9876543210',
    caseNumber: 'CASE-2024-0001',
    caseTitle: 'Income Tax Assessment',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    time: '10:00 AM',
    courtName: 'Income Tax Appellate Tribunal',
    courtAddress: 'ITAT Building, Mumbai'
  },
  {
    id: 'hearing-2',
    caseId: 'case-2',
    clientId: 'client-2',
    clientName: 'Jane Smith',
    clientEmail: 'jane.smith@example.com',
    clientPhone: '+91-9876543211',
    caseNumber: 'CASE-2024-0002',
    caseTitle: 'GST Compliance Matter',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    time: '2:30 PM',
    courtName: 'GST Appellate Authority',
    courtAddress: 'GST Bhawan, Delhi'
  },
  {
    id: 'hearing-3',
    caseId: 'case-3',
    clientId: 'client-3',
    clientName: 'Raj Patel',
    clientEmail: 'raj.patel@example.com',
    clientPhone: '+91-9876543212',
    caseNumber: 'CASE-2024-0003',
    caseTitle: 'Corporate Tax Dispute',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    time: '11:15 AM',
    courtName: 'High Court',
    courtAddress: 'High Court Building, Bangalore'
  }
];

export const reminderService = {
  // Generate hearing reminders based on settings
  generateHearingReminders: async (settings: ReminderSettings): Promise<HearingReminder[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!settings.enabled) {
      return [];
    }

    const reminders: HearingReminder[] = [];
    const now = new Date();

    MOCK_HEARINGS.forEach(hearing => {
      const hearingDate = new Date(hearing.date);
      
      settings.reminderDays.forEach(daysBefore => {
        const reminderDate = new Date(hearingDate);
        reminderDate.setDate(reminderDate.getDate() - daysBefore);

        // Check if reminder should be sent today
        const shouldSendToday = reminderDate.toDateString() === now.toDateString();
        
        if (shouldSendToday) {
          const reminder: HearingReminder = {
            id: `reminder-${hearing.id}-${daysBefore}d`,
            hearingId: hearing.id,
            caseId: hearing.caseId,
            clientId: hearing.clientId,
            scheduledFor: now.toISOString(),
            daysBefore,
            channels: settings.defaultChannels,
            status: 'pending',
            communicationLogs: [],
            createdAt: now.toISOString()
          };

          reminders.push(reminder);
        }
      });
    });

    return reminders;
  },

  // Send a specific reminder
  sendReminder: async (
    reminderId: string,
    hearingId: string,
    daysBefore: number,
    channels: Array<'email' | 'sms' | 'whatsapp'>
  ): Promise<HearingReminder> => {
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      // Find the hearing
      const hearing = MOCK_HEARINGS.find(h => h.id === hearingId);
      if (!hearing) {
        throw new Error('Hearing not found');
      }

      const communicationLogs: string[] = [];

      // Send reminders through each channel
      for (const channel of channels) {
        try {
          let communicationLog: CommunicationLog;

          const templateVariables = {
            CLIENT_NAME: hearing.clientName,
            CASE_NUMBER: hearing.caseNumber,
            CASE_TITLE: hearing.caseTitle,
            HEARING_DATE: new Date(hearing.date).toLocaleDateString('en-IN'),
            HEARING_TIME: hearing.time,
            COURT_NAME: hearing.courtName,
            FIRM_NAME: 'H-Office Legal Associates'
          };

          switch (channel) {
            case 'email':
              const emailTemplate = communicationService.getMessageTemplate('hearing_reminder', 'email');
              if (emailTemplate) {
                const subject = communicationService.applyTemplate(emailTemplate.subject, templateVariables);
                const body = communicationService.applyTemplate(emailTemplate.body, templateVariables);
                
                communicationLog = await communicationService.sendEmail({
                  to: hearing.clientEmail,
                  toName: hearing.clientName,
                  channel: 'email',
                  subject,
                  message: body,
                  attachments: [],
                  caseId: hearing.caseId,
                  clientId: hearing.clientId
                });
                communicationLogs.push(communicationLog.id);
              }
              break;

            case 'sms':
              const smsTemplate = communicationService.getMessageTemplate('hearing_reminder', 'sms');
              if (smsTemplate) {
                const message = communicationService.applyTemplate(smsTemplate.body, templateVariables);
                
                communicationLog = await communicationService.sendSMS(
                  hearing.clientPhone,
                  message,
                  hearing.caseId,
                  hearing.clientId,
                  hearing.clientName
                );
                communicationLogs.push(communicationLog.id);
              }
              break;

            case 'whatsapp':
              const whatsappTemplate = communicationService.getMessageTemplate('hearing_reminder', 'whatsapp');
              if (whatsappTemplate) {
                const message = communicationService.applyTemplate(whatsappTemplate.body, templateVariables);
                
                communicationLog = await communicationService.sendWhatsApp(
                  hearing.clientPhone,
                  message,
                  [],
                  hearing.caseId,
                  hearing.clientId,
                  hearing.clientName
                );
                communicationLogs.push(communicationLog.id);
              }
              break;
          }
        } catch (error) {
          console.error(`Failed to send ${channel} reminder:`, error);
        }
      }

      const updatedReminder: HearingReminder = {
        id: reminderId,
        hearingId,
        caseId: hearing.caseId,
        clientId: hearing.clientId,
        scheduledFor: new Date().toISOString(),
        daysBefore,
        channels,
        status: communicationLogs.length > 0 ? 'sent' : 'failed',
        sentAt: new Date().toISOString(),
        communicationLogs,
        createdAt: new Date().toISOString()
      };

      if (communicationLogs.length > 0) {
        toast({
          title: "Reminders Sent",
          description: `Hearing reminder sent via ${channels.join(', ')} to ${hearing.clientName}`,
        });
      } else {
        toast({
          title: "Reminder Failed",
          description: "Failed to send hearing reminder through any channel",
          variant: "destructive",
        });
      }

      return updatedReminder;
    } catch (error) {
      throw new Error(`Failed to send reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get upcoming hearings that need reminders
  getUpcomingHearings: async (days: number = 7): Promise<any[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return MOCK_HEARINGS.filter(hearing => {
      const hearingDate = new Date(hearing.date);
      return hearingDate >= now && hearingDate <= futureDate;
    });
  },

  // Get reminder history
  getReminderHistory: async (caseId?: string): Promise<HearingReminder[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock reminder history
    const mockHistory: HearingReminder[] = [
      {
        id: 'reminder-1',
        hearingId: 'hearing-1',
        caseId: 'case-1',
        clientId: 'client-1',
        scheduledFor: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        daysBefore: 1,
        channels: ['email', 'sms'],
        status: 'sent',
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        communicationLogs: ['comm-1', 'comm-2'],
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'reminder-2',
        hearingId: 'hearing-2',
        caseId: 'case-2',
        clientId: 'client-2',
        scheduledFor: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        daysBefore: 3,
        channels: ['email', 'whatsapp'],
        status: 'sent',
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        communicationLogs: ['comm-3', 'comm-4'],
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    if (caseId) {
      return mockHistory.filter(reminder => reminder.caseId === caseId);
    }

    return mockHistory;
  },

  // Check if business hours (for auto-send feature)
  isBusinessHours: (date: Date = new Date()): boolean => {
    const hours = date.getHours();
    const day = date.getDay();
    
    // Monday to Friday, 9 AM to 6 PM
    return day >= 1 && day <= 5 && hours >= 9 && hours < 18;
  },

  // Check if weekend
  isWeekend: (date: Date = new Date()): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  },

  // Get default reminder settings
  getDefaultSettings: (): ReminderSettings => ({
    enabled: true,
    defaultChannels: ['email', 'sms'],
    reminderDays: [1, 3, 7],
    autoSend: true,
    businessHoursOnly: true,
    excludeWeekends: false
  })
};