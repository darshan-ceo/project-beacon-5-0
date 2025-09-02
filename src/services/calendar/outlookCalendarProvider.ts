// Microsoft Outlook Calendar (Graph API) provider implementation
import { CalendarProvider, CalendarEvent, CalendarInfo } from './calendarService';
import { CalendarIntegrationSettings, integrationsService } from '../integrationsService';
import { OAuthManager } from '@/utils/oauthUtils';

class OutlookCalendarProvider implements CalendarProvider {
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0';

  // Get valid access token, refreshing if necessary
  private async getValidAccessToken(settings: CalendarIntegrationSettings): Promise<string> {
    const tokens = integrationsService.loadTokens(settings.orgId, 'outlook');
    if (!tokens?.access_token) {
      throw new Error('No Microsoft access token found. Please reconnect your Microsoft account.');
    }

    // Check if token needs refresh
    if (OAuthManager.isTokenExpired(tokens.expires_at) && tokens.refresh_token) {
      try {
        const config = OAuthManager.getMicrosoftConfig(
          settings.microsoftClientId || '',
          settings.microsoftTenant || 'common',
          settings.microsoftClientSecret
        );
        
        const newTokens = await OAuthManager.refreshToken('microsoft', tokens.refresh_token, config);
        
        // Update stored tokens
        integrationsService.saveTokens(settings.orgId, 'outlook', {
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || tokens.refresh_token,
          expires_at: newTokens.expires_at,
          user_email: tokens.user_email
        });

        return newTokens.access_token;
      } catch (error) {
        throw new Error('Failed to refresh Microsoft access token. Please reconnect your account.');
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
      throw new Error(`Microsoft Graph API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // List available calendars
  async listCalendars(settings: CalendarIntegrationSettings): Promise<CalendarInfo[]> {
    try {
      const response = await this.apiRequest('GET', '/me/calendars', settings);
      
      return (response.value || []).map((calendar: any) => ({
        id: calendar.id,
        name: calendar.name,
        primary: calendar.isDefaultCalendar || false,
        accessRole: calendar.canEdit ? 'writer' : 'reader'
      }));
    } catch (error) {
      console.error('Failed to list Microsoft calendars:', error);
      throw error;
    }
  }

  // Create calendar event
  async createEvent(event: CalendarEvent, settings: CalendarIntegrationSettings): Promise<string> {
    try {
      const calendarId = event.calendarId || 'calendar'; // Use default calendar if not specified
      
      const outlookEvent = {
        subject: event.title,
        body: {
          contentType: 'text',
          content: event.description
        },
        location: event.location ? {
          displayName: event.location
        } : undefined,
        start: {
          dateTime: event.start,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminderMinutesBeforeStart: event.reminders?.[0] || 30,
        attendees: (event.attendees || []).map(email => ({
          emailAddress: {
            address: email,
            name: email
          }
        }))
      };

      // Remove undefined fields
      const cleanEvent = JSON.parse(JSON.stringify(outlookEvent, (key, value) => 
        value === undefined ? undefined : value
      ));

      const endpoint = calendarId === 'calendar' ? '/me/events' : `/me/calendars/${encodeURIComponent(calendarId)}/events`;
      const response = await this.apiRequest('POST', endpoint, settings, cleanEvent);

      return response.id;
    } catch (error) {
      console.error('Failed to create Microsoft Calendar event:', error);
      throw error;
    }
  }

  // Update calendar event
  async updateEvent(eventId: string, event: CalendarEvent, settings: CalendarIntegrationSettings): Promise<void> {
    try {
      const outlookEvent = {
        subject: event.title,
        body: {
          contentType: 'text',
          content: event.description
        },
        location: event.location ? {
          displayName: event.location
        } : undefined,
        start: {
          dateTime: event.start,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminderMinutesBeforeStart: event.reminders?.[0] || 30,
        attendees: (event.attendees || []).map(email => ({
          emailAddress: {
            address: email,
            name: email
          }
        }))
      };

      // Remove undefined fields
      const cleanEvent = JSON.parse(JSON.stringify(outlookEvent, (key, value) => 
        value === undefined ? undefined : value
      ));

      await this.apiRequest('PATCH', `/me/events/${encodeURIComponent(eventId)}`, settings, cleanEvent);
    } catch (error) {
      console.error('Failed to update Microsoft Calendar event:', error);
      throw error;
    }
  }

  // Delete calendar event
  async deleteEvent(eventId: string, settings: CalendarIntegrationSettings): Promise<void> {
    try {
      await this.apiRequest('DELETE', `/me/events/${encodeURIComponent(eventId)}`, settings);
    } catch (error) {
      // Don't throw error if event doesn't exist (already deleted)
      if (error instanceof Error && error.message.includes('404')) {
        console.warn('Microsoft Calendar event not found (may already be deleted)');
        return;
      }
      console.error('Failed to delete Microsoft Calendar event:', error);
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

export const outlookCalendarProvider = new OutlookCalendarProvider();