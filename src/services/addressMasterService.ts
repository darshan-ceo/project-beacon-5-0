/**
 * Address Master Service for Central Address Management
 * Handles CRUD operations for centralized address system with GST integration
 * 
 * NOTE: This service is being migrated to use UnifiedAddress from @/types/address.ts
 * The EnhancedAddressData interface below is kept for backward compatibility.
 */

import { apiService, ApiResponse } from './apiService';
import { envConfig } from '../utils/envConfig';
import { DataSource } from '@/components/ui/source-chip';
import { 
  UnifiedAddress, 
  EMPTY_ADDRESS, 
  AddressSource, 
  AddressType 
} from '@/types/address';
import { normalizeAddress, serializeAddress, validateAddress } from '@/utils/addressUtils';

/**
 * @deprecated Use UnifiedAddress from @/types/address.ts instead
 */
export interface EnhancedAddressData {
  id?: string;
  line1?: string;
  line2?: string;
  landmark?: string;
  locality?: string;
  district?: string;
  cityId?: string;
  cityName?: string;  // Display name for city (to preserve legacy 'city' data)
  stateId?: string;
  stateCode?: string;
  stateName?: string;
  countryId?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  source?: DataSource;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Convert EnhancedAddressData to UnifiedAddress
 */
export function toUnifiedAddress(enhanced: EnhancedAddressData): UnifiedAddress {
  return normalizeAddress(enhanced);
}

/**
 * Convert UnifiedAddress to EnhancedAddressData (for backward compatibility)
 */
export function fromUnifiedAddress(unified: UnifiedAddress): EnhancedAddressData {
  return {
    line1: unified.line1,
    line2: unified.line2,
    landmark: unified.landmark,
    locality: unified.locality,
    district: unified.district,
    cityId: unified.cityId,
    cityName: unified.cityName,
    stateId: unified.stateId,
    stateCode: unified.stateCode,
    stateName: unified.stateName,
    countryId: unified.countryId,
    pincode: unified.pincode,
    lat: unified.lat,
    lng: unified.lng,
    source: unified.source as DataSource
  };
}

export interface AddressLink {
  id: string;
  addressId: string;
  entityType: 'employee' | 'judge' | 'client' | 'court';
  entityId: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface AddressMigrationResult {
  entityId: string;
  entityType: string;
  oldAddress: string;
  newAddressId: string;
  success: boolean;
  error?: string;
}

class AddressMasterService {
  private addresses: EnhancedAddressData[] = [];
  private addressLinks: AddressLink[] = [];

  /**
   * Create a new address record
   */
  async createAddress(data: Omit<EnhancedAddressData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<EnhancedAddressData>> {
    try {
      const newAddress: EnhancedAddressData = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.addresses.push(newAddress);

      return {
        success: true,
        data: newAddress,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to create address'
      };
    }
  }

  /**
   * Update an existing address
   */
  async updateAddress(addressId: string, updates: Partial<EnhancedAddressData>): Promise<ApiResponse<EnhancedAddressData>> {
    try {
      const index = this.addresses.findIndex(addr => addr.id === addressId);
      if (index === -1) {
        return {
          success: false,
          data: null,
          error: 'Address not found'
        };
      }

      const updatedAddress = {
        ...this.addresses[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.addresses[index] = updatedAddress;

      return {
        success: true,
        data: updatedAddress,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to update address'
      };
    }
  }

  /**
   * Get address by ID
   */
  async getAddress(addressId: string): Promise<ApiResponse<EnhancedAddressData>> {
    try {
      const address = this.addresses.find(addr => addr.id === addressId);
      
      if (!address) {
        return {
          success: false,
          data: null,
          error: 'Address not found'
        };
      }

      return {
        success: true,
        data: address,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch address'
      };
    }
  }

  /**
   * Delete an address (if not linked to any entities)
   */
  async deleteAddress(addressId: string): Promise<ApiResponse<boolean>> {
    try {
      // Check if address is linked to any entities
      const hasLinks = this.addressLinks.some(link => link.addressId === addressId);
      if (hasLinks) {
        return {
          success: false,
          data: null,
          error: 'Cannot delete address that is linked to entities'
        };
      }

      const index = this.addresses.findIndex(addr => addr.id === addressId);
      if (index === -1) {
        return {
          success: false,
          data: null,
          error: 'Address not found'
        };
      }

      this.addresses.splice(index, 1);

      return {
        success: true,
        data: true,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to delete address'
      };
    }
  }

  /**
   * Link an address to an entity
   */
  async linkAddress(entityType: AddressLink['entityType'], entityId: string, addressId: string, isPrimary: boolean = true): Promise<ApiResponse<AddressLink>> {
    try {
      // Remove existing primary link if setting this as primary
      if (isPrimary) {
        this.addressLinks = this.addressLinks.map(link => 
          link.entityType === entityType && link.entityId === entityId 
            ? { ...link, isPrimary: false }
            : link
        );
      }

      const newLink: AddressLink = {
        id: Date.now().toString(),
        addressId,
        entityType,
        entityId,
        isPrimary,
        createdAt: new Date().toISOString()
      };

      this.addressLinks.push(newLink);

      return {
        success: true,
        data: newLink,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to link address'
      };
    }
  }

  /**
   * Unlink an address from an entity
   */
  async unlinkAddress(entityType: AddressLink['entityType'], entityId: string, addressId?: string): Promise<ApiResponse<boolean>> {
    try {
      const beforeCount = this.addressLinks.length;
      
      this.addressLinks = this.addressLinks.filter(link => {
        if (link.entityType === entityType && link.entityId === entityId) {
          return addressId ? link.addressId !== addressId : false;
        }
        return true;
      });

      const removed = beforeCount - this.addressLinks.length;

      return {
        success: true,
        data: removed > 0,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to unlink address'
      };
    }
  }

  /**
   * Get address for an entity
   */
  async getEntityAddress(entityType: AddressLink['entityType'], entityId: string): Promise<ApiResponse<EnhancedAddressData | null>> {
    try {
      const link = this.addressLinks.find(link => 
        link.entityType === entityType && 
        link.entityId === entityId && 
        link.isPrimary
      );

      if (!link) {
        return {
          success: true,
          data: null,
          error: null
        };
      }

      const address = this.addresses.find(addr => addr.id === link.addressId);

      return {
        success: true,
        data: address || null,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch entity address'
      };
    }
  }

  /**
   * Migrate existing free-text addresses to central address system
   */
  async migrateEntityAddresses(entities: Array<{
    id: string;
    type: 'employee' | 'judge' | 'client' | 'court';
    address: string;
  }>): Promise<AddressMigrationResult[]> {
    const results: AddressMigrationResult[] = [];

    for (const entity of entities) {
      try {
        if (!entity.address || entity.address.trim() === '') {
          results.push({
            entityId: entity.id,
            entityType: entity.type,
            oldAddress: entity.address,
            newAddressId: '',
            success: false,
            error: 'Empty address'
          });
          continue;
        }

        // Create new address from free-text
        const addressData: Omit<EnhancedAddressData, 'id' | 'createdAt' | 'updatedAt'> = {
          line1: entity.address,
          line2: '',
          landmark: '',
          locality: '',
          district: '',
          cityId: '',
          stateId: '',
          stateCode: '',
          stateName: '',
          countryId: 'IN',
          pincode: '',
          source: 'manual'
        };

        const createResult = await this.createAddress(addressData);
        
        if (createResult.success && createResult.data) {
          // Link the new address to the entity
          await this.linkAddress(entity.type, entity.id, createResult.data.id!, true);

          results.push({
            entityId: entity.id,
            entityType: entity.type,
            oldAddress: entity.address,
            newAddressId: createResult.data.id!,
            success: true
          });
        } else {
          results.push({
            entityId: entity.id,
            entityType: entity.type,
            oldAddress: entity.address,
            newAddressId: '',
            success: false,
            error: createResult.error || 'Unknown error'
          });
        }
      } catch (error) {
        results.push({
          entityId: entity.id,
          entityType: entity.type,
          oldAddress: entity.address,
          newAddressId: '',
          success: false,
          error: error instanceof Error ? error.message : 'Migration failed'
        });
      }
    }

    return results;
  }

  /**
   * Validate address data using unified validation
   * @deprecated Use validateAddress from @/utils/addressUtils.ts instead
   */
  validateAddress(address: Partial<EnhancedAddressData>): { isValid: boolean; errors: string[] } {
    const result = validateAddress(address, 'client');
    return {
      isValid: result.isValid,
      errors: result.errors.map(e => e.message)
    };
  }

  /**
   * Validate address using unified validation (new method)
   */
  validateUnified(address: Partial<UnifiedAddress>, module: 'client' | 'court' | 'judge' | 'employee' | 'contact' = 'client') {
    return validateAddress(address, module);
  }

  /**
   * Get all addresses
   */
  async listAddresses(): Promise<ApiResponse<EnhancedAddressData[]>> {
    try {
      return {
        success: true,
        data: [...this.addresses],
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to list addresses'
      };
    }
  }
}

export const addressMasterService = new AddressMasterService();