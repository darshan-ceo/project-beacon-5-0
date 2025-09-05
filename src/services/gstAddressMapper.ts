/**
 * GST Address Mapper Service
 * Maps GST API address format to enhanced address schema
 */

import { EnhancedAddressData } from './addressMasterService';
import { GSTAddress, GSTTaxpayerInfo } from './gstPublicService';
import { addressLookupService, State } from './addressLookupService';

export interface GSTAddressMapping {
  principalAddress?: EnhancedAddressData;
  additionalAddresses?: EnhancedAddressData[];
}

class GSTAddressMapperService {
  private stateCodeToNameMap: Map<string, string> = new Map();
  private stateCodeToIdMap: Map<string, string> = new Map();

  constructor() {
    this.initializeStateMappings();
  }

  /**
   * Initialize state code mappings
   */
  private async initializeStateMappings() {
    try {
      const states = await addressLookupService.getStates('IN');
      
      states.forEach(state => {
        // Map common state codes to state IDs and names
        const stateCode = this.getStateCodeForState(state.name);
        if (stateCode) {
          this.stateCodeToNameMap.set(stateCode, state.name);
          this.stateCodeToIdMap.set(stateCode, state.id);
        }
      });
    } catch (error) {
      console.error('Failed to initialize state mappings:', error);
    }
  }

  /**
   * Get GST state code for a state name
   */
  private getStateCodeForState(stateName: string): string | null {
    const stateCodeMap: Record<string, string> = {
      'Andhra Pradesh': '28',
      'Arunachal Pradesh': '12',
      'Assam': '18',
      'Bihar': '10',
      'Chhattisgarh': '22',
      'Goa': '30',
      'Gujarat': '24',
      'Haryana': '06',
      'Himachal Pradesh': '02',
      'Jharkhand': '20',
      'Karnataka': '29',
      'Kerala': '32',
      'Madhya Pradesh': '23',
      'Maharashtra': '27',
      'Manipur': '14',
      'Meghalaya': '17',
      'Mizoram': '15',
      'Nagaland': '13',
      'Odisha': '21',
      'Punjab': '03',
      'Rajasthan': '08',
      'Sikkim': '11',
      'Tamil Nadu': '33',
      'Telangana': '36',
      'Tripura': '16',
      'Uttar Pradesh': '09',
      'Uttarakhand': '05',
      'West Bengal': '19',
      'Andaman and Nicobar Islands': '35',
      'Chandigarh': '04',
      'Dadra and Nagar Haveli and Daman and Diu': '26',
      'Delhi': '07',
      'Jammu and Kashmir': '01',
      'Ladakh': '37',
      'Lakshadweep': '31',
      'Puducherry': '34'
    };

    return stateCodeMap[stateName] || null;
  }

  /**
   * Get state name from GST state code
   */
  private getStateNameFromCode(stateCode: string): string {
    return this.stateCodeToNameMap.get(stateCode) || '';
  }

  /**
   * Get state ID from GST state code
   */
  private getStateIdFromCode(stateCode: string): string {
    return this.stateCodeToIdMap.get(stateCode) || stateCode;
  }

  /**
   * Map GST taxpayer info to enhanced address format
   */
  async mapGSTTaxpayerToAddress(taxpayerInfo: GSTTaxpayerInfo): Promise<GSTAddressMapping> {
    const mapping: GSTAddressMapping = {};

    // Map principal address
    if (taxpayerInfo.principalAddress) {
      mapping.principalAddress = await this.mapGSTAddressToEnhanced(
        taxpayerInfo.principalAddress,
        'gsp'
      );
    }

    // Map additional addresses
    if (taxpayerInfo.additionalAddresses && taxpayerInfo.additionalAddresses.length > 0) {
      mapping.additionalAddresses = await Promise.all(
        taxpayerInfo.additionalAddresses.map(addr => 
          this.mapGSTAddressToEnhanced(addr, 'gsp')
        )
      );
    }

    return mapping;
  }

  /**
   * Map single GST address to enhanced address format
   */
  async mapGSTAddressToEnhanced(
    gstAddress: GSTAddress, 
    source: 'public' | 'gsp' = 'public'
  ): Promise<EnhancedAddressData> {
    const stateName = this.getStateNameFromCode(gstAddress.stateCode);
    const stateId = this.getStateIdFromCode(gstAddress.stateCode);

    return {
      line1: [gstAddress.buildingNumber, gstAddress.buildingName]
        .filter(Boolean)
        .join(' ') || gstAddress.street || '',
      line2: gstAddress.street && gstAddress.buildingNumber ? gstAddress.street : '',
      landmark: '',
      locality: gstAddress.location || '',
      district: gstAddress.district,
      cityId: '', // Will need to be resolved based on district and state
      stateId: stateId,
      stateCode: gstAddress.stateCode,
      stateName: stateName,
      countryId: 'IN',
      pincode: gstAddress.pincode,
      source: source
    };
  }

  /**
   * Map enhanced address back to GST format (for API calls)
   */
  mapEnhancedToGSTFormat(address: EnhancedAddressData): GSTAddress {
    return {
      type: 'Principal',
      buildingNumber: this.extractBuildingNumber(address.line1),
      buildingName: this.extractBuildingName(address.line1),
      street: address.line2 || '',
      location: address.locality || '',
      district: address.district,
      stateCode: address.stateCode,
      pincode: address.pincode
    };
  }

  /**
   * Extract building number from address line 1
   */
  private extractBuildingNumber(line1: string): string {
    // Simple regex to extract potential building numbers
    const match = line1.match(/^(\d+[\w]*)/);
    return match ? match[1] : '';
  }

  /**
   * Extract building name from address line 1
   */
  private extractBuildingName(line1: string): string {
    // Remove building number and return the rest
    const buildingNumber = this.extractBuildingNumber(line1);
    if (buildingNumber) {
      return line1.replace(buildingNumber, '').trim();
    }
    return line1;
  }

  /**
   * Validate GST address mapping
   */
  validateGSTMapping(gstAddress: GSTAddress): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!gstAddress.district) {
      errors.push('District is required in GST address');
    }

    if (!gstAddress.stateCode) {
      errors.push('State code is required in GST address');
    }

    if (!gstAddress.pincode || !/^\d{6}$/.test(gstAddress.pincode)) {
      errors.push('Valid 6-digit pincode is required in GST address');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get display address from enhanced address data
   */
  formatDisplayAddress(address: EnhancedAddressData): string {
    const parts = [
      address.line1,
      address.line2,
      address.landmark,
      address.locality,
      address.district,
      address.stateName,
      address.pincode
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Compare two addresses for similarity
   */
  compareAddresses(addr1: EnhancedAddressData, addr2: EnhancedAddressData): number {
    // Simple similarity score based on key fields
    let score = 0;
    let totalFields = 5;

    if (addr1.line1.toLowerCase() === addr2.line1.toLowerCase()) score++;
    if (addr1.district.toLowerCase() === addr2.district.toLowerCase()) score++;
    if (addr1.stateCode === addr2.stateCode) score++;
    if (addr1.pincode === addr2.pincode) score++;
    if (addr1.locality?.toLowerCase() === addr2.locality?.toLowerCase()) score++;

    return score / totalFields;
  }

  /**
   * Suggest address improvements based on GST data
   */
  suggestAddressImprovements(
    currentAddress: EnhancedAddressData, 
    gstAddress: EnhancedAddressData
  ): string[] {
    const suggestions: string[] = [];

    if (!currentAddress.landmark && gstAddress.locality) {
      suggestions.push(`Consider adding locality: ${gstAddress.locality}`);
    }

    if (currentAddress.pincode !== gstAddress.pincode) {
      suggestions.push(`GST pincode (${gstAddress.pincode}) differs from current (${currentAddress.pincode})`);
    }

    if (currentAddress.district.toLowerCase() !== gstAddress.district.toLowerCase()) {
      suggestions.push(`GST district (${gstAddress.district}) differs from current (${currentAddress.district})`);
    }

    return suggestions;
  }
}

export const gstAddressMapper = new GSTAddressMapperService();