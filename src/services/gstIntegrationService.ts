import { supabase } from '@/integrations/supabase/client';

export interface GSTIntegrationStatus {
  isConfigured: boolean;
  mode: 'production' | 'sandbox' | 'not_configured';
  credentialStatus: {
    clientId: boolean;
    clientSecret: boolean;
    email: boolean;
  };
  lastApiCall?: {
    endpoint: string;
    timestamp: string;
    success: boolean;
    latencyMs: number;
  };
  activeConsents: number;
  expiredConsents: number;
  apiHealth: {
    publicApi: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
    consentApi: 'healthy' | 'degraded' | 'unavailable' | 'unknown' | 'not_subscribed';
  };
  lastSyncTime?: string;
}

export interface TestConnectionResult {
  success: boolean;
  mode: 'production' | 'sandbox';
  latencyMs: number;
  message: string;
  taxpayerPreview?: {
    tradeName: string;
    legalName: string;
    status: string;
    state: string;
  };
  errorCode?: string;
  errorDetails?: string;
  apiType?: 'public' | 'consent';
  recommendation?: string;
  consentApiEndpoint?: string;
}

export interface GSTIntegrationService {
  checkIntegrationStatus: () => Promise<GSTIntegrationStatus>;
  testConnection: (gstin: string) => Promise<TestConnectionResult>;
  testConsentApi: (gstin: string, gstUsername: string) => Promise<TestConnectionResult>;
  getActiveConsentsCount: () => Promise<{ active: number; expired: number; lastSync?: string }>;
}

class GSTIntegrationServiceImpl implements GSTIntegrationService {
  /**
   * Check the overall GST integration status
   */
  async checkIntegrationStatus(): Promise<GSTIntegrationStatus> {
    try {
      // Call the gst-status edge function to check credentials
      const { data, error } = await supabase.functions.invoke('gst-status', {
        body: { action: 'check_status' }
      });

      if (error) {
        console.error('[GSTIntegration] Status check failed:', error);
        return this.getNotConfiguredStatus();
      }

      // Get consent counts from database
      const consentCounts = await this.getActiveConsentsCount();

      return {
        isConfigured: data?.isConfigured ?? false,
        mode: data?.mode ?? 'not_configured',
        credentialStatus: data?.credentialStatus ?? {
          clientId: false,
          clientSecret: false,
          email: false
        },
        lastApiCall: data?.lastApiCall,
        activeConsents: consentCounts.active,
        expiredConsents: consentCounts.expired,
        apiHealth: data?.apiHealth ?? {
          publicApi: 'unknown',
          consentApi: 'unknown'
        },
        lastSyncTime: consentCounts.lastSync
      };
    } catch (error) {
      console.error('[GSTIntegration] Status check error:', error);
      return this.getNotConfiguredStatus();
    }
  }

  /**
   * Test the GST Public API connection with a sample GSTIN lookup
   */
  async testConnection(gstin: string): Promise<TestConnectionResult> {
    const startTime = Date.now();

    try {
      // Call the gst-status edge function with test action
      const { data, error } = await supabase.functions.invoke('gst-status', {
        body: { action: 'test_connection', gstin }
      });

      const latencyMs = Date.now() - startTime;

      if (error) {
        return {
          success: false,
          mode: 'sandbox',
          latencyMs,
          message: error.message || 'Failed to connect to MasterGST API',
          errorCode: 'EDGE_FUNCTION_ERROR',
          errorDetails: error.message,
          apiType: 'public'
        };
      }

      if (!data?.success) {
        return {
          success: false,
          mode: data?.mode ?? 'sandbox',
          latencyMs: data?.latencyMs ?? latencyMs,
          message: data?.message ?? 'API returned an error',
          errorCode: data?.errorCode,
          errorDetails: data?.errorDetails,
          apiType: 'public'
        };
      }

      return {
        success: true,
        mode: data.mode ?? 'production',
        latencyMs: data.latencyMs ?? latencyMs,
        message: data.message ?? 'Connection successful',
        taxpayerPreview: data.taxpayerPreview,
        apiType: 'public'
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        mode: 'sandbox',
        latencyMs,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'NETWORK_ERROR',
        apiType: 'public'
      };
    }
  }

  /**
   * Test the GSP Consent/OTP API specifically
   */
  async testConsentApi(gstin: string, gstUsername: string): Promise<TestConnectionResult> {
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('gst-status', {
        body: { action: 'test_consent_api', gstin, gstUsername }
      });

      const latencyMs = Date.now() - startTime;

      if (error) {
        return {
          success: false,
          mode: 'sandbox',
          latencyMs,
          message: error.message || 'Failed to test GSP Consent API',
          errorCode: 'EDGE_FUNCTION_ERROR',
          errorDetails: error.message,
          apiType: 'consent'
        };
      }

      return {
        success: data?.success ?? false,
        mode: data?.mode ?? 'sandbox',
        latencyMs: data?.latencyMs ?? latencyMs,
        message: data?.message ?? 'Test completed',
        errorCode: data?.errorCode,
        errorDetails: data?.errorDetails,
        apiType: 'consent',
        recommendation: data?.recommendation,
        consentApiEndpoint: data?.consentApiEndpoint
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        mode: 'sandbox',
        latencyMs,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'NETWORK_ERROR',
        apiType: 'consent'
      };
    }
  }

  /**
   * Get counts of active and expired GSP consents
   */
  async getActiveConsentsCount(): Promise<{ active: number; expired: number; lastSync?: string }> {
    try {
      const { data, error } = await supabase
        .from('gst_credentials')
        .select('consent_status, last_sync');

      if (error) {
        console.error('[GSTIntegration] Failed to get consent counts:', error);
        return { active: 0, expired: 0 };
      }

      const active = data?.filter(c => c.consent_status === 'active').length ?? 0;
      const expired = data?.filter(c => c.consent_status === 'expired' || c.consent_status === 'revoked').length ?? 0;
      
      // Get the most recent sync time
      const lastSync = data?.reduce((latest, c) => {
        if (!c.last_sync) return latest;
        if (!latest) return c.last_sync;
        return new Date(c.last_sync) > new Date(latest) ? c.last_sync : latest;
      }, null as string | null);

      return { active, expired, lastSync: lastSync ?? undefined };
    } catch (error) {
      console.error('[GSTIntegration] Consent count error:', error);
      return { active: 0, expired: 0 };
    }
  }

  private getNotConfiguredStatus(): GSTIntegrationStatus {
    return {
      isConfigured: false,
      mode: 'not_configured',
      credentialStatus: {
        clientId: false,
        clientSecret: false,
        email: false
      },
      activeConsents: 0,
      expiredConsents: 0,
      apiHealth: {
        publicApi: 'unknown',
        consentApi: 'unknown'
      }
    };
  }
}

export const gstIntegrationService = new GSTIntegrationServiceImpl();
