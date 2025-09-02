/**
 * GSP Consent Service for Beacon Essential 5.0
 * Handles GSP authorization and OTP-based consent flow
 */

import { apiService, ApiResponse } from './apiService';

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
   * Initiate GSP consent flow
   */
  async initiateConsent(clientId: string, gstin: string): Promise<ApiResponse<ConsentInitResponse>> {
    if (!clientId || !gstin) {
      return {
        success: false,
        error: 'Client ID and GSTIN are required',
        data: null
      };
    }

    return apiService.post<ConsentInitResponse>('/api/gst/consent/initiate', {
      clientId,
      gstin
    });
  }

  /**
   * Verify OTP and complete consent
   */
  async verifyOTP(txnId: string, otp: string): Promise<ApiResponse<ConsentVerifyResponse>> {
    if (!txnId || !otp) {
      return {
        success: false,
        error: 'Transaction ID and OTP are required',
        data: null
      };
    }

    return apiService.post<ConsentVerifyResponse>('/api/gst/consent/verify', {
      txnId,
      otp
    });
  }

  /**
   * Revoke existing consent
   */
  async revokeConsent(clientId: string, gstin: string): Promise<ApiResponse<void>> {
    if (!clientId || !gstin) {
      return {
        success: false,
        error: 'Client ID and GSTIN are required',
        data: null
      };
    }

    return apiService.post<void>('/api/gst/consent/revoke', {
      clientId,
      gstin
    });
  }

  /**
   * Get GSP profile data
   */
  async getProfile(gstin: string): Promise<ApiResponse<GSPProfile>> {
    if (!gstin) {
      return {
        success: false,
        error: 'GSTIN is required',
        data: null
      };
    }

    return apiService.get<GSPProfile>('/api/gst/profile', { gstin });
  }

  /**
   * Get consent status for client
   */
  async getConsentStatus(clientId: string): Promise<ApiResponse<ConsentStatus[]>> {
    if (!clientId) {
      return {
        success: false,
        error: 'Client ID is required',
        data: null
      };
    }

    return apiService.get<ConsentStatus[]>(`/api/clients/${clientId}/gst/consent-status`);
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