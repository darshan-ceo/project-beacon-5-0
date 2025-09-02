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
   * Initiate consent flow with mock support
   */
  async initiateConsent(clientId: string, gstin: string): Promise<ApiResponse<ConsentInitResponse>> {
    if (!clientId || !gstin) {
      return {
        success: false,
        error: 'Client ID and GSTIN are required',
        data: null
      };
    }

    // Check for mock mode
    if (import.meta.env.VITE_GST_MOCK === 'on') {
      return this.getMockConsentInitResponse();
    }

    return apiService.post<ConsentInitResponse>('/api/gst/consent/initiate', {
      clientId,
      gstin
    });
  }

  /**
   * Generate mock consent initiate response
   */
  private getMockConsentInitResponse(): Promise<ApiResponse<ConsentInitResponse>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            txnId: `mock_txn_${Date.now()}`,
            maskedDestination: "**98",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
          },
          error: null
        });
      }, 1500);
    });
  }

  /**
   * Verify OTP with mock support
   */
  async verifyOTP(txnId: string, otp: string): Promise<ApiResponse<ConsentVerifyResponse>> {
    if (!txnId || !otp) {
      return {
        success: false,
        error: 'Transaction ID and OTP are required',
        data: null
      };
    }

    // Check for mock mode
    if (import.meta.env.VITE_GST_MOCK === 'on') {
      return this.getMockConsentVerifyResponse();
    }

    const response = await apiService.post<any>('/api/gst/consent/verify', {
      txnId,
      otp
    });

    if (response.success && response.data) {
      const mappedData = this.mapGSPResponseToInterface(response.data);
      return { success: true, data: mappedData, error: null };
    }
    
    return response;
  }

  /**
   * Generate mock consent verify response
   */
  private getMockConsentVerifyResponse(): Promise<ApiResponse<ConsentVerifyResponse>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResponse = {
          gstin: "24AAACB5343E1Z2",
          registeredEmail: "accounts@abcindustries.com", 
          registeredMobile: "+91-9876543210",
          filingFreq: "Monthly",
          signatories: [
            { name: "Rakesh Shah", email: "rakesh.shah@abcindustries.com", mobile: "+91-9898989898", role: "Authorized Signatory", signatoryType: "Primary" },
            { name: "Meera Patel", email: "meera.patel@abcindustries.com", mobile: "+91-9090909090", role: "Billing", signatoryType: "Secondary" }
          ],
          eInvoiceEnabled: true, eWayBillEnabled: true, aatoBand: "1B"
        };
        resolve({ success: true, data: this.mapGSPResponseToInterface(mockResponse), error: null });
      }, 2000);
    });
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