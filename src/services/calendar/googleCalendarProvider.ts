// Google Calendar API provider implementation
import { CalendarProvider, CalendarEvent, CalendarInfo } from './calendarService';
import { CalendarIntegrationSettings } from '../integrationsService';
import { supabase } from '@/integrations/supabase/client';

class GoogleCalendarProvider implements CalendarProvider {
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3';

  // Get valid access token via edge function
  private async getValidAccessToken(): Promise<string> {
    const { data, error } = await supabase.functions.invoke('manage-secrets/get-calendar-token', {
      body: { provider: 'google' }
    });

    if (error || !data?.access_token) {
      // Check for TOKEN_REFRESH_FAILED to give a specific message
      const errorCode = data?.code || '';
      if (errorCode === 'TOKEN_REFRESH_FAILED') {
        throw new Error('Your Google Calendar access has expired and could not be refreshed automatically. Please go to Settings > Integrations and reconnect your Google account.');
      }
      throw new Error('No Google access token found. Please reconnect your Google account.');
    }

    return data.access_token;
  }

  // Make authenticated API request
  private async apiRequest(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    const accessToken = await this.getValidAccessToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorBody: any = null;
      try {
        errorBody = await response.json();
      } catch {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Google Calendar API error (${response.status}): ${errorText}`);
      }

      const errorMessage = this.parseGoogleApiError(response.status, errorBody);
      const error = new Error(errorMessage);
      (error as any).statusCode = response.status;
      (error as any).errorCode = errorBody?.error?.code;
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return {};
  }

  // Parse Google API error responses
  private parseGoogleApiError(status: number, errorBody: any): string {
    const errorCode = errorBody?.error?.code || status;
    const errorMessage = errorBody?.error?.message || 'Unknown error';
    const errorReason = errorBody?.error?.errors?.[0]?.reason;

    switch (status) {
      case 401:
        if (errorMessage.includes('invalid_token') || errorMessage.includes('expired')) {
          return 'Your calendar access has expired. Please reconnect your Google account.';
        }
        return 'Authentication failed. Please reconnect your Google Calendar.';
      case 403:
        if (errorReason === 'forbidden') {
          return 'You don\'t have permission to access this calendar. Check your account permissions.';
        }
        if (errorReason === 'rateLimitExceeded' || errorReason === 'userRateLimitExceeded') {
          return 'Too many requests. Please wait a moment and try again.';
        }
        if (errorReason === 'calendarLimitsExceeded') {
          return 'Calendar limits exceeded. Please try again later.';
        }
        return `Permission denied: ${errorMessage}`;
      case 404:
        return 'Calendar or event not found. It may have been deleted.';
      case 409:
        return 'Conflict: The event may have been modified by another user.';
      case 410:
        return 'The calendar resource has been deleted.';
      case 429:
        return 'Rate limit exceeded. Please wait a few minutes before trying again.';
      case 500:
      case 503:
        return 'Google Calendar is temporarily unavailable. Please try again later.';
      default:
        return `Google Calendar error (${errorCode}): ${errorMessage}`;
    }
  }

  // List available calendars
  async listCalendars(settings: CalendarIntegrationSettings): Promise<CalendarInfo[]> {
    try {
      const response = await this.apiRequest('GET', '/users/me/calendarList');
      
      return (response.items || []).map((calendar: any) => ({
        id: calendar.id,
        name: calendar.summary || calendar.id,
        primary: calendar.primary || false,
        accessRole: calendar.accessRole
      }));
    } catch (error) {
      console.error('Failed to list Google calendars:', error);
      throw error;
    }
  }

  // Create calendar event
  async createEvent(event: CalendarEvent, settings: CalendarIntegrationSettings): Promise<string> {
    try {
      const calendarId = event.calendarId || settings.defaultCalendarId || 'primary';
      
      const googleEvent = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.start,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: (event.reminders || [30]).map(minutes => ({
            method: 'popup',
            minutes
          }))
        },
        attendees: (event.attendees || []).map(email => ({ email }))
      };

      const response = await this.apiRequest(
        'POST', 
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        googleEvent
      );

      return response.id;
    } catch (error) {
      console.error('Failed to create Google Calendar event:', error);
      throw error;
    }
  }

  // Update calendar event
  async updateEvent(eventId: string, event: CalendarEvent, settings: CalendarIntegrationSettings): Promise<void> {
    try {
      const calendarId = event.calendarId || settings.defaultCalendarId || 'primary';
      
      const googleEvent = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.start,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: (event.reminders || [30]).map(minutes => ({
            method: 'popup',
            minutes
          }))
        },
        attendees: (event.attendees || []).map(email => ({ email }))
      };

      await this.apiRequest(
        'PUT',
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        googleEvent
      );
    } catch (error) {
      console.error('Failed to update Google Calendar event:', error);
      throw error;
    }
  }

  // Delete calendar event
  async deleteEvent(eventId: string, settings: CalendarIntegrationSettings): Promise<void> {
    try {
      const calendarId = settings.defaultCalendarId || 'primary';
      
      await this.apiRequest(
        'DELETE',
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        console.warn('Google Calendar event not found (may already be deleted)');
        return;
      }
      console.error('Failed to delete Google Calendar event:', error);
      throw error;
    }
  }

  // Test connection by listing calendars
  async testConnection(settings: CalendarIntegrationSettings): Promise<{ success: boolean; message: string }> {
    try {
      const calendars = await this.listCalendars(settings);
      return {
        success: true,
        message: `Connected successfully. Found ${calendars.length} calendar(s).`
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const googleCalendarProvider = new GoogleCalendarProvider();
