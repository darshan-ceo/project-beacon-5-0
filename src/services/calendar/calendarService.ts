// Main calendar service that manages different providers
import { Hearing, Case, Court, Judge } from '@/contexts/AppStateContext';
import { CalendarIntegrationSettings, integrationsService } from '../integrationsService';
import { googleCalendarProvider } from './googleCalendarProvider';
import { outlookCalendarProvider } from './outlookCalendarProvider';
import { toast } from '@/hooks/use-toast';

export interface CalendarEvent {
  id?: string;
  title: string;
  description: string;
  start: string; // ISO date string
  end: string; // ISO date string
  location?: string;
  attendees?: string[];
  reminders?: number[]; // minutes before event
  calendarId?: string;
}

export interface CalendarProvider {
  listCalendars(settings: CalendarIntegrationSettings): Promise<CalendarInfo[]>;
  createEvent(event: CalendarEvent, settings: CalendarIntegrationSettings): Promise<string>; // returns external event ID
  updateEvent(eventId: string, event: CalendarEvent, settings: CalendarIntegrationSettings): Promise<void>;
  deleteEvent(eventId: string, settings: CalendarIntegrationSettings): Promise<void>;
  testConnection(settings: CalendarIntegrationSettings): Promise<{ success: boolean; message: string }>;
}

export interface CalendarInfo {
  id: string;
  name: string;
  primary?: boolean;
  accessRole?: string;
}

class CalendarService {
  private getProvider(provider: 'google' | 'outlook'): CalendarProvider {
    switch (provider) {
      case 'google':
        return googleCalendarProvider;
      case 'outlook':
        return outlookCalendarProvider;
      default:
        throw new Error(`Unknown calendar provider: ${provider}`);
    }
  }

  // Convert Hearing data to CalendarEvent
  private hearingToCalendarEvent(
    hearing: Hearing, 
    caseData?: Case, 
    courtData?: Court, 
    judgeData?: Judge,
    settings?: CalendarIntegrationSettings
  ): CalendarEvent {
    const startDateTime = new Date(`${hearing.date}T${hearing.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration

    const title = caseData ? `${caseData.title} – ${hearing.type}` : `Hearing – ${hearing.type}`;
    
    const descriptionParts = [
      `Case: ${caseData?.caseNumber || hearing.caseId}`,
      courtData ? `Court: ${courtData.name}` : '',
      judgeData ? `Judge: ${judgeData.name}` : '',
      hearing.agenda ? `Agenda: ${hearing.agenda}` : '',
      hearing.notes ? `Notes: ${hearing.notes}` : ''
    ].filter(Boolean);

    return {
      id: hearing.externalEventId,
      title,
      description: descriptionParts.join('\n'),
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      location: courtData?.address,
      reminders: settings?.reminderTime ? [settings.reminderTime] : [30],
      calendarId: settings?.defaultCalendarId
    };
  }

  // Create calendar event for hearing
  async createEvent(
    hearing: Hearing,
    settings: CalendarIntegrationSettings,
    caseData?: Case,
    courtData?: Court,
    judgeData?: Judge
  ): Promise<string | null> {
    if (!settings || settings.provider === 'none' || !settings.autoSync) {
      return null;
    }

    try {
      const provider = this.getProvider(settings.provider);
      const calendarEvent = this.hearingToCalendarEvent(hearing, caseData, courtData, judgeData, settings);
      
      const externalEventId = await provider.createEvent(calendarEvent, settings);
      
      toast({
        title: "Calendar Event Created",
        description: `Hearing synced to ${settings.provider === 'google' ? 'Google Calendar' : 'Outlook'}`,
      });

      return externalEventId;
    } catch (error) {
      console.error(`[Calendar] ${settings.provider} create event error:`, error);
      
      toast({
        title: "Calendar Sync Failed",
        description: `Failed to sync hearing to ${settings.provider === 'google' ? 'Google Calendar' : 'Outlook'}. The hearing has been saved locally.`,
        variant: "destructive",
      });

      return null;
    }
  }

  // Update calendar event for hearing
  async updateEvent(
    hearing: Hearing,
    settings: CalendarIntegrationSettings,
    caseData?: Case,
    courtData?: Court,
    judgeData?: Judge
  ): Promise<boolean> {
    if (!settings || settings.provider === 'none' || !settings.autoSync || !hearing.externalEventId) {
      return false;
    }

    try {
      const provider = this.getProvider(settings.provider);
      const calendarEvent = this.hearingToCalendarEvent(hearing, caseData, courtData, judgeData, settings);
      
      await provider.updateEvent(hearing.externalEventId, calendarEvent, settings);
      
      toast({
        title: "Calendar Event Updated",
        description: `Hearing changes synced to ${settings.provider === 'google' ? 'Google Calendar' : 'Outlook'}`,
      });

      return true;
    } catch (error) {
      console.error(`[Calendar] ${settings.provider} update event error:`, error);
      
      toast({
        title: "Calendar Sync Failed",
        description: `Failed to update hearing in ${settings.provider === 'google' ? 'Google Calendar' : 'Outlook'}. Changes saved locally.`,
        variant: "destructive",
      });

      return false;
    }
  }

  // Delete calendar event for hearing
  async deleteEvent(hearing: Hearing, settings: CalendarIntegrationSettings): Promise<boolean> {
    if (!settings || settings.provider === 'none' || !hearing.externalEventId) {
      return false;
    }

    try {
      const provider = this.getProvider(settings.provider);
      await provider.deleteEvent(hearing.externalEventId, settings);
      
      toast({
        title: "Calendar Event Removed",
        description: `Hearing removed from ${settings.provider === 'google' ? 'Google Calendar' : 'Outlook'}`,
      });

      return true;
    } catch (error) {
      console.error(`[Calendar] ${settings.provider} delete event error:`, error);
      
      toast({
        title: "Calendar Sync Failed",
        description: `Failed to remove hearing from ${settings.provider === 'google' ? 'Google Calendar' : 'Outlook'}. Hearing cancelled locally.`,
        variant: "destructive",
      });

      return false;
    }
  }

  // List available calendars
  async listCalendars(settings: CalendarIntegrationSettings): Promise<CalendarInfo[]> {
    if (!settings || settings.provider === 'none') {
      return [];
    }

    try {
      const provider = this.getProvider(settings.provider);
      return await provider.listCalendars(settings);
    } catch (error) {
      console.error(`[Calendar] ${settings.provider} list calendars error:`, error);
      return [];
    }
  }

  // Test calendar connection
  async testConnection(settings: CalendarIntegrationSettings): Promise<{ success: boolean; message: string }> {
    if (!settings || settings.provider === 'none') {
      return { success: false, message: 'No calendar provider selected' };
    }

    try {
      const provider = this.getProvider(settings.provider);
      return await provider.testConnection(settings);
    } catch (error) {
      console.error(`[Calendar] ${settings.provider} test connection error:`, error);
      return { 
        success: false, 
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Get calendar sync status for a hearing
  getSyncStatus(hearing: Hearing, settings?: CalendarIntegrationSettings): {
    status: 'synced' | 'not_synced' | 'sync_failed' | 'sync_pending';
    message: string;
    canSync: boolean;
  } {
    if (!settings || settings.provider === 'none') {
      return {
        status: 'not_synced',
        message: 'No calendar provider configured',
        canSync: false
      };
    }

    if (!settings.autoSync) {
      return {
        status: 'not_synced',
        message: 'Auto-sync disabled',
        canSync: true
      };
    }

    if (hearing.externalEventId) {
      return {
        status: hearing.syncStatus || 'synced',
        message: hearing.syncError || 'Synced successfully',
        canSync: true
      };
    }

    return {
      status: 'not_synced',
      message: 'Not synced to calendar',
      canSync: true
    };
  }

  // Manual sync for a specific hearing
  async manualSync(
    hearing: Hearing,
    settings: CalendarIntegrationSettings,
    caseData?: Case,
    courtData?: Court,
    judgeData?: Judge
  ): Promise<string | null> {
    if (hearing.externalEventId) {
      // Update existing event
      const success = await this.updateEvent(hearing, settings, caseData, courtData, judgeData);
      return success ? hearing.externalEventId : null;
    } else {
      // Create new event
      return await this.createEvent(hearing, settings, caseData, courtData, judgeData);
    }
  }
}

export const calendarService = new CalendarService();