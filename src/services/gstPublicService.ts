/**
 * GST Public Service for Beacon Essential 5.0
 * Handles public GSTIN lookup via MasterGST API
 */

import { ApiResponse } from './apiService';
import { gstCacheService } from './gstCacheService';
import { supabase } from '@/integrations/supabase/client';

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
   * Fetch taxpayer information by GSTIN via MasterGST Edge Function
   */
  async fetchTaxpayer(gstin: string, bypassCache: boolean = false): Promise<ApiResponse<GSTTaxpayerInfo>> {
    if (!gstin || gstin.length !== 15) {
      return {
        success: false,
        error: 'Invalid GSTIN format. Must be 15 characters.',
        data: null
      };
    }

    // Check cache first (unless bypassed)
    if (!bypassCache) {
      const cached = await gstCacheService.get(gstin);
      if (cached) {
        console.log('Returning cached GST data for:', gstin);
        return {
          success: true,
          data: this.mapApiResponseToInterface(cached.data),
          error: null
        };
      }
    }

    try {
      console.log('Fetching live GST data for:', gstin);
      
      // Call the gst-public-lookup edge function
      const { data, error } = await supabase.functions.invoke('gst-public-lookup', {
        body: { gstin }
      });

      if (error) {
        console.error('Edge function error:', error);
        return {
          success: false,
          error: error.message || 'Failed to fetch taxpayer data',
          data: null
        };
      }

      if (!data?.success) {
        // Detect sandbox mode errors
        const errorMessage = data?.error || '';
        const isSandboxError = this.detectSandboxError(errorMessage);
        
        if (isSandboxError) {
          return {
            success: false,
            error: 'SANDBOX_MODE_ERROR',
            errorDetails: {
              isSandbox: true,
              message: 'MasterGST credentials are configured for sandbox/development mode. Production API access is required to fetch live GST data.',
              action: 'Contact MasterGST support to enable production API access for your client credentials.',
              originalError: errorMessage
            },
            data: null
          };
        }

        // Detect invalid credentials
        if (errorMessage.includes('Invalid Client ID') || errorMessage.includes('AUT4033')) {
          return {
            success: false,
            error: 'INVALID_CREDENTIALS',
            errorDetails: {
              message: 'MasterGST API credentials are invalid or expired.',
              action: 'Verify your MasterGST client ID and secret are correct.',
              originalError: errorMessage
            },
            data: null
          };
        }

        return {
          success: false,
          error: data?.error || 'Failed to fetch taxpayer data',
          data: null
        };
      }

      // Cache the response
      gstCacheService.set(gstin, data.data, 'public');
      
      // Map API response to our interface
      const mappedData = this.mapApiResponseToInterface(data.data);
      console.log('Successfully fetched GST data for:', mappedData.legalName);
      
      return {
        success: true,
        data: mappedData,
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching taxpayer data:', error);
      
      // Check for sandbox errors in exception
      const errorMsg = error.message || '';
      if (this.detectSandboxError(errorMsg)) {
        return {
          success: false,
          error: 'SANDBOX_MODE_ERROR',
          errorDetails: {
            isSandbox: true,
            message: 'MasterGST is routing to sandbox GST server which is unavailable.',
            action: 'Contact MasterGST support to enable production API access.',
            originalError: errorMsg
          },
          data: null
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to connect to GST service',
        data: null
      };
    }
  }

  /**
   * Generate mock taxpayer data for development
   */
  private getMockTaxpayerData(gstin: string): Promise<ApiResponse<GSTTaxpayerInfo>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockData = {
          gstin: gstin,
          lgnm: "ABC INDUSTRIES PRIVATE LIMITED",
          tradeNam: "ABC INDUSTRIES",
          sts: "Active",
          rgdt: "2017-07-01",
          cnldt: null, // Cancellation date
          lstupdt: new Date().toISOString().split('T')[0],
          ctb: "Private Limited Company",
          dty: "Regular",
          nba: ["Manufacturing", "Wholesale"],
          pradr: {
            addr: {
              bno: "12",
              bnm: "Shreenath Complex",
              st: "Ring Road",
              loc: "Adajan",
              dst: "Surat",
              stcd: "24",
              pncd: "395007"
            }
          },
          adadr: [],
          ctj: "CE Surat North",
          ctjCd: "ZZ123",
          stj: "STO Surat-1",
          stjCd: "SR01",
          einv: true,
          ewb: true,
          freq: "Monthly"
        };

        const mappedData = this.mapApiResponseToInterface(mockData);
        
        // Cache mock data
        gstCacheService.set(gstin, mockData, 'public');
        
        resolve({
          success: true,
          data: mappedData,
          error: null
        });
      }, 1000); // Simulate API delay
    });
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
   * Note: E-Invoice status is included in taxpayer data from fetchTaxpayer()
   */
  async fetchEInvoiceStatus(gstin: string): Promise<ApiResponse<EInvoiceStatus>> {
    if (!gstin || gstin.length !== 15) {
      return {
        success: false,
        error: 'Invalid GSTIN format. Must be 15 characters.',
        data: null
      };
    }

    // E-Invoice status is available in the taxpayer info from fetchTaxpayer
    const taxpayerResponse = await this.fetchTaxpayer(gstin);
    if (taxpayerResponse.success && taxpayerResponse.data) {
      return {
        success: true,
        data: {
          gstin,
          isEnabled: taxpayerResponse.data.isEInvoiceEnabled || false,
        },
        error: null
      };
    }

    return {
      success: false,
      error: taxpayerResponse.error || 'Failed to fetch E-Invoice status',
      data: null
    };
  }

  /**
   * Detect sandbox mode errors from MasterGST API
   */
  private detectSandboxError(errorMessage: string): boolean {
    const sandboxIndicators = [
      'devapi.gst.gov.in',
      'sandbox.gst.gov.in',
      'UnknownHostException',
      'Name or service not known',
      'development mode',
      'sandbox mode'
    ];
    
    return sandboxIndicators.some(indicator => 
      errorMessage.toLowerCase().includes(indicator.toLowerCase())
    );
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
   * Map state name to state ID for dropdown selection
   */
  private getStateIdFromName(stateName: string): string {
    const stateIdMap: Record<string, string> = {
      'Andhra Pradesh': 'AP', 'Arunachal Pradesh': 'AR', 'Assam': 'AS',
      'Bihar': 'BR', 'Chhattisgarh': 'CG', 'Goa': 'GA', 'Gujarat': 'GJ',
      'Haryana': 'HR', 'Himachal Pradesh': 'HP', 'Jharkhand': 'JH',
      'Karnataka': 'KA', 'Kerala': 'KL', 'Madhya Pradesh': 'MP',
      'Maharashtra': 'MH', 'Manipur': 'MN', 'Meghalaya': 'ML',
      'Mizoram': 'MZ', 'Nagaland': 'NL', 'Odisha': 'OD', 'Punjab': 'PB',
      'Rajasthan': 'RJ', 'Sikkim': 'SK', 'Tamil Nadu': 'TN',
      'Telangana': 'TS', 'Tripura': 'TR', 'Uttar Pradesh': 'UP',
      'Uttarakhand': 'UK', 'West Bengal': 'WB', 'Delhi': 'DL',
      'Jammu and Kashmir': 'JK', 'Ladakh': 'LA', 'Puducherry': 'PY',
      'Chandigarh': 'CH', 'Andaman and Nicobar Islands': 'AN',
      'Dadra and Nagar Haveli and Daman and Diu': 'DD', 'Lakshadweep': 'LD'
    };
    return stateIdMap[stateName] || '';
  }

  /**
   * Map API response to internal address format
   */
  mapToAddressFormat(gstAddress: GSTAddress): any {
    const stateId = this.getStateIdFromName(gstAddress.stateCode);
    
    return {
      line1: [gstAddress.buildingNumber, gstAddress.buildingName].filter(Boolean).join(' '),
      line2: gstAddress.street,
      line3: gstAddress.location,
      city: gstAddress.district,
      district: gstAddress.district,
      stateId: stateId,               // ID for dropdown selection
      stateName: gstAddress.stateCode, // Display name
      state: gstAddress.stateCode,     // Fallback
      pincode: gstAddress.pincode,
      country: 'India',
      countryId: 'IN'
    };
  }
}

export const gstPublicService = new GSTPublicService();