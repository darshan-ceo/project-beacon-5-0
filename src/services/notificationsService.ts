import { toast } from '@/hooks/use-toast';

export interface NotificationPreferences {
  caseId: string;
  googleCalendar: boolean;
  outlook: boolean;
  reminderDays: number[];
  emailNotifications: boolean;
  smsNotifications: boolean;
}

const isDev = import.meta.env.DEV;

const log = (level: 'success' | 'error', tab: string, action: string, details?: any) => {
  if (!isDev) return;
  const color = level === 'success' ? 'color: green' : 'color: red';
  console.log(`%c[Cases] ${tab} ${action} ${level}`, color, details);
};

export const notificationsService = {
  saveCasePreferences: async (preferences: NotificationPreferences): Promise<NotificationPreferences> => {
    try {
      // Save to localStorage for persistence
      const key = `case_notifications_${preferences.caseId}`;
      localStorage.setItem(key, JSON.stringify(preferences));
      
      log('success', 'Hearings', 'saveNotificationPrefs', { 
        caseId: preferences.caseId, 
        google: preferences.googleCalendar,
        outlook: preferences.outlook,
        reminderDays: preferences.reminderDays
      });
      
      toast({
        title: "Preferences Saved",
        description: "Notification preferences have been saved successfully.",
      });

      return preferences;
    } catch (error) {
      log('error', 'Hearings', 'saveNotificationPrefs', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  getCasePreferences: async (caseId: string): Promise<NotificationPreferences | null> => {
    try {
      const key = `case_notifications_${caseId}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const preferences = JSON.parse(stored);
        log('success', 'Hearings', 'getNotificationPrefs', { caseId, preferences });
        return preferences;
      }
      
      return null;
    } catch (error) {
      log('error', 'Hearings', 'getNotificationPrefs', error);
      return null;
    }
  },

  createCalendarIntegration: async (caseId: string, provider: 'google' | 'outlook'): Promise<void> => {
    try {
      // Simulate calendar integration
      await new Promise(resolve => setTimeout(resolve, 500));
      
      log('success', 'Hearings', 'createCalendarIntegration', { caseId, provider });
      
      toast({
        title: "Calendar Integration",
        description: `${provider === 'google' ? 'Google Calendar' : 'Outlook'} integration enabled successfully.`,
      });
    } catch (error) {
      log('error', 'Hearings', 'createCalendarIntegration', error);
      toast({
        title: "Error",
        description: "Failed to enable calendar integration. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }
};