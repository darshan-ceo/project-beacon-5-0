// Google Calendar API provider implementation
import { CalendarProvider, CalendarEvent, CalendarInfo } from './calendarService';
import { CalendarIntegrationSettings, integrationsService } from '../integrationsService';
import { OAuthManager } from '@/utils/oauthUtils';

class GoogleCalendarProvider implements CalendarProvider {
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3';

  // Get valid access token, refreshing if necessary
  private async getValidAccessToken(settings: CalendarIntegrationSettings): Promise<string> {
    const tokens = integrationsService.loadTokens(settings.orgId, 'google');
    if (!tokens?.access_token) {
      throw new Error('No Google access token found. Please reconnect your Google account.');
    }

    // Check if token needs refresh
    if (OAuthManager.isTokenExpired(tokens.expires_at) && tokens.refresh_token) {
      try {
        const config = OAuthManager.getGoogleConfig(
          settings.googleClientId || '',
          settings.googleClientSecret
        );
        
        const newTokens = await OAuthManager.refreshToken('google', tokens.refresh_token, config);
        
        // Update stored tokens
        integrationsService.saveTokens(settings.orgId, 'google', {
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || tokens.refresh_token,
          expires_at: newTokens.expires_at,
          user_email: tokens.user_email
        });

        return newTokens.access_token;
      } catch (error) {
        throw new Error('Failed to refresh Google access token. Please reconnect your account.');
      }
    }

    return tokens.access_token;
  }

  // Make authenticated API request
  private async apiRequest(
    method: string,
    endpoint: string,
    settings: CalendarIntegrationSettings,
    body?: any
  ): Promise<any> {
    const accessToken = await this.getValidAccessToken(settings);
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // List available calendars
  async listCalendars(settings: CalendarIntegrationSettings): Promise<CalendarInfo[]> {
    try {
      const response = await this.apiRequest('GET', '/users/me/calendarList', settings);
      
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
      const calendarId = event.calendarId || 'primary';
      
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
        settings,
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
      const calendarId = event.calendarId || 'primary';
      
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
        settings,
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
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        settings
      );
    } catch (error) {
      // Don't throw error if event doesn't exist (already deleted)
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