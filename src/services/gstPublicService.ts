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

    const response = await apiService.get<any>('/api/gst/public/taxpayer', { gstin });
    
    if (response.success && response.data) {
      // Map API response to our interface
      const mappedData = this.mapApiResponseToInterface(response.data);
      return {
        success: true,
        data: mappedData,
        error: null
      };
    }
    
    return response;
  }

  /**
   * Map API response format to internal interface
   */
  private mapApiResponseToInterface(apiData: any): GSTTaxpayerInfo {
    return {
      gstin: apiData.gstin,
      legalName: apiData.lgnm,
      tradeName: apiData.tradeNam,
      status: apiData.sts,
      registrationDate: apiData.rgdt,
      cancellationDate: apiData.cnldt,
      constitution: apiData.ctb,
      taxpayerType: apiData.dty,
      natureOfBusiness: apiData.nba || [],
      principalAddress: this.mapAddressFormat(apiData.pradr?.addr),
      additionalAddresses: apiData.adadr?.map((addr: any) => this.mapAddressFormat(addr.addr)) || [],
      centreJurisdiction: apiData.ctj,
      centreJurisdictionCode: apiData.ctjCd,
      stateJurisdiction: apiData.stj,
      stateJurisdictionCode: apiData.stjCd,
      lastUpdated: apiData.lstupdt,
      isEInvoiceEnabled: apiData.einv,
      isEWayBillEnabled: apiData.ewb,
      filingFrequency: apiData.freq,
      aatoBand: apiData.aato
    };
  }

  /**
   * Map API address format to internal format
   */
  private mapAddressFormat(apiAddr: any): GSTAddress {
    if (!apiAddr) {
      return {
        type: 'Principal',
        district: '',
        stateCode: '',
        pincode: ''
      };
    }

    return {
      type: 'Principal',
      buildingNumber: apiAddr.bno,
      buildingName: apiAddr.bnm,
      street: apiAddr.st,
      location: apiAddr.loc,
      district: apiAddr.dst,
      stateCode: apiAddr.stcd,
      pincode: apiAddr.pncd
    };
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