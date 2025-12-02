/**
 * GSP Consent Service for Beacon Essential 5.0
 * Handles GSP authorization and OTP-based consent flow via gst-auth Edge Function
 */

import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from './apiService';

export interface ConsentInitResponse {
  txnId: string;
  maskedDestination: string;
  expiresAt: string;
}

export interface ConsentVerifyRequest {
  txnId: string;
  otp: string;
}

export interface ConsentVerifyResponse {
  consentId: string;
  accessToken: string;
  tokenExpiry: string;
  profilePayload: GSPProfile;
}

export interface GSPProfile {
  gstin: string;
  authorizedSignatories: GSPSignatory[];
  registeredEmail: string;
  registeredMobile: string;
  filingFrequency: 'Monthly' | 'Quarterly';
  aatoBand?: string;
  eInvoiceEnabled: boolean;
  eWayBillEnabled: boolean;
  lastVerified: string;
}

export interface GSPSignatory {
  name: string;
  email?: string;
  mobile?: string;
  designation?: string;
  signatoryType: 'Authorized Signatory' | 'Director' | 'Partner' | 'Proprietor';
}

export interface ConsentStatus {
  clientId: string;
  gstin: string;
  consentId: string;
  grantedAt: string;
  validTill: string;
  revokedAt?: string;
  isActive: boolean;
  lastSync?: string;
}

class GSPConsentService {
  /**
   * Initiate consent flow via Edge Function
   */
  async initiateConsent(clientId: string, gstin: string): Promise<ApiResponse<ConsentInitResponse>> {
    if (!clientId || !gstin) {
      return {
        success: false,
        error: 'Client ID and GSTIN are required',
        data: null
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('gst-auth', {
        body: { action: 'initiate', clientId, gstin }
      });

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('[GSPConsentService] Initiate error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate consent',
        data: null
      };
    }
  }

  /**
   * Verify OTP via Edge Function (requires clientId and gstin for credential storage)
   */
  async verifyOTP(txnId: string, otp: string, clientId: string, gstin: string): Promise<ApiResponse<ConsentVerifyResponse>> {
    if (!txnId || !otp) {
      return {
        success: false,
        error: 'Transaction ID and OTP are required',
        data: null
      };
    }

    if (!clientId || !gstin) {
      return {
        success: false,
        error: 'Client ID and GSTIN are required for credential storage',
        data: null
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('gst-auth', {
        body: { action: 'verify', txnId, otp, clientId, gstin }
      });

      if (error) throw error;

      if (data.success && data.data) {
        const mappedData = this.mapGSPResponseToInterface(data.data);
        return { success: true, data: mappedData, error: null };
      }

      return data;
    } catch (error) {
      console.error('[GSPConsentService] Verify error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify OTP',
        data: null
      };
    }
  }

  /**
   * Map GSP API response to internal interface
   */
  private mapGSPResponseToInterface(apiData: any): ConsentVerifyResponse {
    return {
      consentId: apiData.consentId || `consent_${Date.now()}`,
      accessToken: apiData.accessToken || '',
      tokenExpiry: apiData.tokenExpiry || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      profilePayload: {
        gstin: apiData.gstin,
        authorizedSignatories: (apiData.signatories || []).map((sig: any) => ({
          name: sig.name,
          email: sig.email,
          mobile: sig.mobile,
          designation: sig.designation || sig.role,
          signatoryType: sig.signatoryType || sig.role || 'Authorized Signatory'
        })),
        registeredEmail: apiData.registeredEmail,
        registeredMobile: apiData.registeredMobile,
        filingFrequency: apiData.filingFreq || apiData.filingFrequency || 'Monthly',
        aatoBand: apiData.aatoBand,
        eInvoiceEnabled: apiData.eInvoiceEnabled || false,
        eWayBillEnabled: apiData.eWayBillEnabled || false,
        lastVerified: new Date().toISOString()
      }
    };
  }

  /**
   * Revoke existing consent via Edge Function
   */
  async revokeConsent(clientId: string, gstin: string): Promise<ApiResponse<void>> {
    if (!clientId || !gstin) {
      return {
        success: false,
        error: 'Client ID and GSTIN are required',
        data: null
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('gst-auth', {
        body: { action: 'revoke', gstin }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('[GSPConsentService] Revoke error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke consent',
        data: null
      };
    }
  }

  /**
   * Refresh access token via Edge Function
   */
  async refreshToken(gstin: string): Promise<ApiResponse<{ accessToken: string; tokenExpiry: string }>> {
    if (!gstin) {
      return {
        success: false,
        error: 'GSTIN is required',
        data: null
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('gst-auth', {
        body: { action: 'refresh', gstin }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('[GSPConsentService] Refresh error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh token',
        data: null
      };
    }
  }

  /**
   * Get consent status for client via Edge Function
   */
  async getConsentStatus(clientId: string): Promise<ApiResponse<ConsentStatus[]>> {
    if (!clientId) {
      return {
        success: false,
        error: 'Client ID is required',
        data: null
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('gst-auth', {
        body: { action: 'status', clientId }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('[GSPConsentService] Status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get consent status',
        data: null
      };
    }
  }

  /**
   * Map GSP signatories to client contacts
   */
  mapSignatoriesToContacts(signatories: GSPSignatory[]): any[] {
    return signatories.map(signatory => ({
      name: signatory.name,
      designation: signatory.designation || signatory.signatoryType,
      email: signatory.email,
      phone: signatory.mobile,
      roles: ['authorized_signatory'],
      source: 'gsp',
      isActive: true
    }));
  }

  /**
   * Validate OTP format
   */
  validateOTP(otp: string): { isValid: boolean; error?: string } {
    if (!otp) {
      return { isValid: false, error: 'OTP is required' };
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return { isValid: false, error: 'OTP must be 6 digits' };
    }

    return { isValid: true };
  }
}

export const gspConsentService = new GSPConsentService();