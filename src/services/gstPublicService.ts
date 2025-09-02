/**
 * GST Public Service for Beacon Essential 5.0
 * Handles public GSTIN lookup without credentials
 */

import { apiService, ApiResponse } from './apiService';

export interface GSTTaxpayerInfo {
  gstin: string;
  legalName: string;
  tradeName?: string;
  status: 'Active' | 'Cancelled' | 'Suspended';
  registrationDate: string;
  cancellationDate?: string;
  constitution: string;
  taxpayerType: string;
  natureOfBusiness: string[];
  principalAddress: GSTAddress;
  additionalAddresses?: GSTAddress[];
  centreJurisdiction: string;
  centreJurisdictionCode: string;
  stateJurisdiction: string;
  stateJurisdictionCode: string;
  lastUpdated: string;
  isEInvoiceEnabled?: boolean;
  isEWayBillEnabled?: boolean;
  filingFrequency?: 'Monthly' | 'Quarterly';
  aatoBand?: string;
}

export interface GSTAddress {
  type: 'Principal' | 'Additional';
  buildingNumber?: string;
  buildingName?: string;
  street?: string;
  location?: string;
  district: string;
  stateCode: string;
  pincode: string;
}

export interface EInvoiceStatus {
  gstin: string;
  isEnabled: boolean;
  enabledDate?: string;
  provider?: string;
  version?: string;
}

class GSTPublicService {
  /**
   * Fetch taxpayer information by GSTIN
   */
  async fetchTaxpayer(gstin: string): Promise<ApiResponse<GSTTaxpayerInfo>> {
    if (!gstin || gstin.length !== 15) {
      return {
        success: false,
        error: 'Invalid GSTIN format. Must be 15 characters.',
        data: null
      };
    }

    return apiService.get<GSTTaxpayerInfo>('/api/gst/public/taxpayer', { gstin });
  }

  /**
   * Fetch E-Invoice status by GSTIN
   */
  async fetchEInvoiceStatus(gstin: string): Promise<ApiResponse<EInvoiceStatus>> {
    if (!gstin || gstin.length !== 15) {
      return {
        success: false,
        error: 'Invalid GSTIN format. Must be 15 characters.',
        data: null
      };
    }

    return apiService.get<EInvoiceStatus>('/api/gst/public/einvoice-status', { gstin });
  }

  /**
   * Validate GSTIN format
   */
  validateGSTIN(gstin: string): { isValid: boolean; error?: string } {
    if (!gstin) {
      return { isValid: false, error: 'GSTIN is required' };
    }

    if (gstin.length !== 15) {
      return { isValid: false, error: 'GSTIN must be 15 characters' };
    }

    // Basic GSTIN format validation
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/;
    if (!gstinRegex.test(gstin)) {
      return { isValid: false, error: 'Invalid GSTIN format' };
    }

    return { isValid: true };
  }

  /**
   * Map API response to internal address format
   */
  mapToAddressFormat(gstAddress: GSTAddress): any {
    return {
      line1: [gstAddress.buildingNumber, gstAddress.buildingName].filter(Boolean).join(' '),
      line2: gstAddress.street,
      line3: gstAddress.location,
      city: gstAddress.district,
      state: gstAddress.stateCode, // Will need mapping to full names
      pincode: gstAddress.pincode,
      country: 'India'
    };
  }
}

export const gstPublicService = new GSTPublicService();