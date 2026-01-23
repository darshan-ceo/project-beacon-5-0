import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

async function getTenantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();
  
  return profile?.tenant_id || null;
}

export const notificationsService = {
  saveCasePreferences: async (preferences: NotificationPreferences): Promise<NotificationPreferences> => {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('case_notification_preferences')
        .upsert({
          tenant_id: tenantId,
          case_id: preferences.caseId,
          google_calendar: preferences.googleCalendar,
          outlook: preferences.outlook,
          reminder_days: preferences.reminderDays,
          email_notifications: preferences.emailNotifications,
          sms_notifications: preferences.smsNotifications
        }, { onConflict: 'tenant_id,case_id' });

      if (error) throw error;
      
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
      const tenantId = await getTenantId();
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('case_notification_preferences')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('case_id', caseId)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      const preferences: NotificationPreferences = {
        caseId: data.case_id,
        googleCalendar: data.google_calendar || false,
        outlook: data.outlook || false,
        reminderDays: data.reminder_days || [7, 3, 1],
        emailNotifications: data.email_notifications || true,
        smsNotifications: data.sms_notifications || false
      };
      
      log('success', 'Hearings', 'getNotificationPrefs', { caseId, preferences });
      return preferences;
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
