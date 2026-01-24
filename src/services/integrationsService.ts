import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Integrations Service - Phase 2 Migration
 * Calendar integration settings now stored in Supabase calendar_integrations table
 * OAuth tokens handled securely via manage-secrets edge function
 */

export interface CalendarIntegrationSettings {
  orgId: string;
  provider: 'none' | 'google' | 'outlook';
  autoSync: boolean;
  reminderTime: number;
  syncInterval?: number;
  defaultCalendarId?: string;
  userEmail?: string;
  connectionStatus?: 'disconnected' | 'connected' | 'error' | 'expired';
  lastSyncAt?: string;
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
  /**
   * Save calendar integration settings to Supabase
   */
  async saveCalendarSettings(settings: CalendarIntegrationSettings): Promise<void> {
    try {
      // Get user's tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('Tenant not found');
      }

      // Upsert calendar settings
      const { error } = await supabase
        .from('calendar_integrations')
        .upsert({
          tenant_id: profile.tenant_id,
          provider: settings.provider,
          auto_sync: settings.autoSync,
          reminder_time: settings.reminderTime,
          sync_interval: settings.syncInterval || 60,
          default_calendar_id: settings.defaultCalendarId,
          user_email: settings.userEmail,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id'
        });

      if (error) {
        console.error('[Integrations] Save settings error:', error);
        throw error;
      }
      
      toast({
        title: "Settings Saved",
        description: "Calendar integration settings have been saved successfully.",
      });
    } catch (error) {
      console.error('[Integrations] Failed to save calendar settings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save calendar settings. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }
  
  /**
   * Load calendar integration settings from Supabase
   */
  async loadCalendarSettings(): Promise<CalendarIntegrationSettings | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle();

      if (error) {
        console.error('[Integrations] Load settings error:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        orgId: profile.tenant_id,
        provider: (data.provider as 'none' | 'google' | 'outlook') || 'none',
        autoSync: data.auto_sync || false,
        reminderTime: data.reminder_time || 30,
        syncInterval: data.sync_interval || 60,
        defaultCalendarId: data.default_calendar_id || undefined,
        userEmail: data.user_email || undefined,
        connectionStatus: (data.connection_status as CalendarIntegrationSettings['connectionStatus']) || 'disconnected',
        lastSyncAt: data.last_sync_at || undefined
      };
    } catch (error) {
      console.error('[Integrations] Failed to load calendar settings:', error);
      return null;
    }
  }
  
  /**
   * Save OAuth tokens securely via edge function
   */
  async saveTokens(provider: 'google' | 'outlook', tokens: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
    user_email?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('manage-secrets/save-calendar-tokens', {
        body: { provider, tokens }
      });

      if (error) {
        console.error('[Integrations] Save tokens error:', error);
        throw error;
      }
    } catch (error) {
      console.error('[Integrations] Failed to save tokens:', error);
      throw error;
    }
  }
  
  /**
   * Clear OAuth tokens via edge function
   */
  async clearTokens(provider: 'google' | 'outlook'): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('manage-secrets/clear-calendar-tokens', {
        body: { provider }
      });

      if (error) {
        console.error('[Integrations] Clear tokens error:', error);
      }
    } catch (error) {
      console.error('[Integrations] Failed to clear tokens:', error);
    }
  }
  
  /**
   * Get connection status from Supabase
   */
  async getConnectionStatus(provider: 'google' | 'outlook'): Promise<CalendarConnectionStatus> {
    try {
      const settings = await this.loadCalendarSettings();
      
      if (!settings || settings.provider !== provider) {
        return { connected: false };
      }

      if (settings.connectionStatus === 'expired') {
        return { 
          connected: false, 
          error: 'Access token expired. Please reconnect.' 
        };
      }

      if (settings.connectionStatus === 'error') {
        return { 
          connected: false, 
          error: 'Connection error. Please reconnect.' 
        };
      }

      return {
        connected: settings.connectionStatus === 'connected',
        userEmail: settings.userEmail,
        lastSync: settings.lastSyncAt
      };
    } catch (error) {
      console.error('[Integrations] Failed to get connection status:', error);
      return { connected: false, error: 'Failed to check connection status' };
    }
  }

  /**
   * Update sync timestamp
   */
  async updateLastSync(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) return;

      await supabase
        .from('calendar_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', profile.tenant_id);
    } catch (error) {
      console.error('[Integrations] Failed to update last sync:', error);
    }
  }

  /**
   * Update connection status
   */
  async updateConnectionStatus(status: 'disconnected' | 'connected' | 'error' | 'expired'): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) return;

      await supabase
        .from('calendar_integrations')
        .update({
          connection_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', profile.tenant_id);
    } catch (error) {
      console.error('[Integrations] Failed to update connection status:', error);
    }
  }
}

export const integrationsService = new IntegrationsService();
