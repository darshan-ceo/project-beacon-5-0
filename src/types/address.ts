/**
 * Unified Address Types
 * Single source of truth for address data across all entities:
 * - Clients, Courts, Judges, Employees, Contacts
 */

/**
 * Source of address data
 */
export type AddressSource = 'manual' | 'gsp' | 'public' | 'imported' | 'edited';

/**
 * Type of address (for entities with multiple addresses)
 */
export type AddressType = 'registered' | 'correspondence' | 'current' | 'permanent';

/**
 * Unified Address Interface
 * Canonical structure for ALL entities across the application
 */
export interface UnifiedAddress {
  // Core fields (required for valid address)
  line1: string;
  line2?: string;
  pincode: string;
  
  // Location hierarchy
  cityId?: string;
  cityName: string;        // Always populated for display
  stateId?: string;
  stateCode?: string;      // GST state code (e.g., "24" for Gujarat)
  stateName: string;       // Always populated for display
  countryId?: string;
  countryName?: string;    // Default: "India"
  
  // Enhanced fields (optional)
  landmark?: string;
  locality?: string;
  district?: string;
  
  // Geocoding (optional)
  lat?: number;
  lng?: number;
  
  // Metadata
  source: AddressSource;
  isPrimary?: boolean;     // For multi-address entities (employees)
  addressType?: AddressType;
}

/**
 * Partial address for form inputs (before validation)
 */
export type PartialAddress = Partial<UnifiedAddress>;

/**
 * Validation result for address
 */
export interface AddressValidationResult {
  isValid: boolean;
  errors: AddressFieldError[];
}

export interface AddressFieldError {
  field: keyof UnifiedAddress;
  message: string;
}

/**
 * Module types that use address
 */
export type AddressModule = 'client' | 'court' | 'judge' | 'employee' | 'contact';

/**
 * Configuration for address form per module
 */
export interface AddressModuleConfig {
  module: AddressModule;
  requiredFields: (keyof UnifiedAddress)[];
  showGSTIntegration: boolean;
  showGeocoding: boolean;
  showAddressType: boolean;
  allowedAddressTypes?: AddressType[];
  defaultSource: AddressSource;
}

/**
 * Default configurations per module
 */
export const ADDRESS_MODULE_CONFIGS: Record<AddressModule, AddressModuleConfig> = {
  client: {
    module: 'client',
    requiredFields: ['line1', 'cityName', 'stateName', 'pincode'],
    showGSTIntegration: true,
    showGeocoding: false,
    showAddressType: true,
    allowedAddressTypes: ['registered', 'correspondence'],
    defaultSource: 'manual'
  },
  court: {
    module: 'court',
    requiredFields: ['line1', 'cityName', 'stateName'],
    showGSTIntegration: false,
    showGeocoding: false,
    showAddressType: false,
    defaultSource: 'manual'
  },
  judge: {
    module: 'judge',
    requiredFields: ['line1', 'cityName', 'stateName'],
    showGSTIntegration: false,
    showGeocoding: false,
    showAddressType: false,
    defaultSource: 'manual'
  },
  employee: {
    module: 'employee',
    requiredFields: ['line1', 'cityName', 'stateName', 'pincode'],
    showGSTIntegration: false,
    showGeocoding: false,
    showAddressType: true,
    allowedAddressTypes: ['current', 'permanent'],
    defaultSource: 'manual'
  },
  contact: {
    module: 'contact',
    requiredFields: ['line1', 'cityName', 'stateName'],
    showGSTIntegration: false,
    showGeocoding: false,
    showAddressType: false,
    defaultSource: 'manual'
  }
};

/**
 * Empty address object with defaults
 */
export const EMPTY_ADDRESS: UnifiedAddress = {
  line1: '',
  line2: '',
  pincode: '',
  cityId: '',
  cityName: '',
  stateId: '',
  stateCode: '',
  stateName: '',
  countryId: 'IN',
  countryName: 'India',
  landmark: '',
  locality: '',
  district: '',
  source: 'manual',
  isPrimary: true
};
