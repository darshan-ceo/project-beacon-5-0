import { secretsService } from './secretsService';
import { toast } from '@/hooks/use-toast';

export interface CalendarIntegrationSettings {
  orgId: string;
  provider: 'none' | 'google' | 'outlook';
  autoSync: boolean;
  reminderTime: number; // minutes
  syncInterval?: number; // minutes for background sync
  defaultCalendarId?: string;
  
  // Google specific
  googleClientId?: string;
  googleClientSecret?: string;
  
  // Microsoft specific
  microsoftClientId?: string;
  microsoftClientSecret?: string;
  microsoftTenant?: string; // 'common', 'organizations', or specific tenant ID
}

export interface CalendarConnectionStatus {
  connected: boolean;
  userEmail?: string;
  error?: string;
  lastSync?: string;
}

export interface CalendarInfo {
  id: string;
  name: string;
  primary?: boolean;
}

class IntegrationsService {
  private readonly settingsKey = 'calendar_settings';
  
  // Save calendar integration settings
  saveCalendarSettings(settings: CalendarIntegrationSettings): void {
    try {
      // Store non-sensitive settings in regular localStorage
      const publicSettings = {
        orgId: settings.orgId,
        provider: settings.provider,
        autoSync: settings.autoSync,
        reminderTime: settings.reminderTime,
        syncInterval: settings.syncInterval,
        defaultCalendarId: settings.defaultCalendarId,
      };
      localStorage.setItem(this.settingsKey, JSON.stringify(publicSettings));
      
      // Store sensitive credentials in encrypted storage
      if (settings.googleClientId) {
        secretsService.set(`calendar.${settings.orgId}.google.client_id`, settings.googleClientId);
      }
      if (settings.googleClientSecret) {
        secretsService.set(`calendar.${settings.orgId}.google.client_secret`, settings.googleClientSecret);
      }
      if (settings.microsoftClientId) {
        secretsService.set(`calendar.${settings.orgId}.microsoft.client_id`, settings.microsoftClientId);
      }
      if (settings.microsoftClientSecret) {
        secretsService.set(`calendar.${settings.orgId}.microsoft.client_secret`, settings.microsoftClientSecret);
      }
      if (settings.microsoftTenant) {
        secretsService.set(`calendar.${settings.orgId}.microsoft.tenant`, settings.microsoftTenant);
      }
      
      toast({
        title: "Settings Saved",
        description: "Calendar integration settings have been saved successfully.",
      });
    } catch (error) {
      console.error('Failed to save calendar settings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save calendar settings. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  // Load calendar integration settings
  loadCalendarSettings(orgId: string): CalendarIntegrationSettings | null {
    try {
      const stored = localStorage.getItem(this.settingsKey);
      if (!stored) return null;
      
      const publicSettings = JSON.parse(stored);
      
      // Load sensitive credentials from encrypted storage
      const googleClientId = secretsService.get(`calendar.${orgId}.google.client_id`);
      const googleClientSecret = secretsService.get(`calendar.${orgId}.google.client_secret`);
      const microsoftClientId = secretsService.get(`calendar.${orgId}.microsoft.client_id`);
      const microsoftClientSecret = secretsService.get(`calendar.${orgId}.microsoft.client_secret`);
      const microsoftTenant = secretsService.get(`calendar.${orgId}.microsoft.tenant`);
      
      return {
        ...publicSettings,
        googleClientId: googleClientId || undefined,
        googleClientSecret: googleClientSecret || undefined,
        microsoftClientId: microsoftClientId || undefined,
        microsoftClientSecret: microsoftClientSecret || undefined,
        microsoftTenant: microsoftTenant || undefined,
      };
    } catch (error) {
      console.error('Failed to load calendar settings:', error);
      return null;
    }
  }
  
  // Save OAuth tokens
  saveTokens(orgId: string, provider: 'google' | 'outlook', tokens: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
    user_email?: string;
  }): void {
    secretsService.set(`calendar.${orgId}.${provider}.access_token`, tokens.access_token);
    if (tokens.refresh_token) {
      secretsService.set(`calendar.${orgId}.${provider}.refresh_token`, tokens.refresh_token);
    }
    if (tokens.expires_at) {
      secretsService.set(`calendar.${orgId}.${provider}.expires_at`, tokens.expires_at.toString());
    }
    if (tokens.user_email) {
      secretsService.set(`calendar.${orgId}.${provider}.user_email`, tokens.user_email);
    }
  }
  
  // Load OAuth tokens
  loadTokens(orgId: string, provider: 'google' | 'outlook'): {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    user_email?: string;
  } | null {
    const accessToken = secretsService.get(`calendar.${orgId}.${provider}.access_token`);
    if (!accessToken) return null;
    
    const refreshToken = secretsService.get(`calendar.${orgId}.${provider}.refresh_token`);
    const expiresAtStr = secretsService.get(`calendar.${orgId}.${provider}.expires_at`);
    const userEmail = secretsService.get(`calendar.${orgId}.${provider}.user_email`);
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
      expires_at: expiresAtStr ? parseInt(expiresAtStr) : undefined,
      user_email: userEmail || undefined,
    };
  }
  
  // Clear all tokens for a provider
  clearTokens(orgId: string, provider: 'google' | 'outlook'): void {
    secretsService.remove(`calendar.${orgId}.${provider}.access_token`);
    secretsService.remove(`calendar.${orgId}.${provider}.refresh_token`);
    secretsService.remove(`calendar.${orgId}.${provider}.expires_at`);
    secretsService.remove(`calendar.${orgId}.${provider}.user_email`);
  }
  
  // Check connection status
  getConnectionStatus(orgId: string, provider: 'google' | 'outlook'): CalendarConnectionStatus {
    const tokens = this.loadTokens(orgId, provider);
    if (!tokens || !tokens.access_token) {
      return { connected: false };
    }
    
    // Check if token is expired
    if (tokens.expires_at && tokens.expires_at < Date.now()) {
      return { 
        connected: false, 
        error: 'Access token expired. Please reconnect.' 
      };
    }
    
    return {
      connected: true,
      userEmail: tokens.user_email,
    };
  }
}

export const integrationsService = new IntegrationsService();