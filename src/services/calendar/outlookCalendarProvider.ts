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
      let errorBody: any = null;
      try {
        errorBody = await response.json();
      } catch {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Microsoft Graph API error (${response.status}): ${errorText}`);
      }

      // Parse Microsoft Graph API error format
      const errorMessage = this.parseMicrosoftApiError(response.status, errorBody);
      const error = new Error(errorMessage);
      (error as any).statusCode = response.status;
      (error as any).errorCode = errorBody?.error?.code;
      throw error;
    }

    // Handle empty responses (e.g., DELETE returns 204)
    if (response.status === 204) {
      return {};
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return {};
  }

  // Parse Microsoft Graph API error responses
  private parseMicrosoftApiError(status: number, errorBody: any): string {
    const errorCode = errorBody?.error?.code || 'UnknownError';
    const errorMessage = errorBody?.error?.message || 'Unknown error';

    // Map common Microsoft error codes to user-friendly messages
    switch (status) {
      case 401:
        if (errorCode === 'InvalidAuthenticationToken') {
          return 'Your Outlook access has expired. Please reconnect your Microsoft account.';
        }
        return 'Authentication failed. Please reconnect your Outlook Calendar.';
      case 403:
        if (errorCode === 'AccessDenied') {
          return 'You don\'t have permission to access this calendar. Check your account permissions.';
        }
        return `Permission denied: ${errorMessage}`;
      case 404:
        if (errorCode === 'ResourceNotFound') {
          return 'Calendar or event not found. It may have been deleted.';
        }
        return 'The requested resource was not found.';
      case 409:
        return 'Conflict: The event may have been modified by another user.';
      case 429:
        return 'Rate limit exceeded. Please wait a few minutes before trying again.';
      case 500:
      case 502:
      case 503:
        return 'Microsoft Outlook is temporarily unavailable. Please try again later.';
      default:
        // Handle specific Microsoft error codes
        switch (errorCode) {
          case 'ErrorCalendarIsCancelledForAccept':
            return 'This meeting has been cancelled.';
          case 'ErrorCalendarIsDelegatedForAccept':
            return 'This is a delegated calendar. Use the primary calendar instead.';
          case 'ErrorCalendarViewRangeTooBig':
            return 'The requested date range is too large.';
          case 'ErrorMailboxMoveInProgress':
            return 'Mailbox migration in progress. Please try again later.';
          default:
            return `Microsoft Calendar error (${errorCode}): ${errorMessage}`;
        }
    }
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