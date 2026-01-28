/**
 * Address Utilities
 * Centralized functions for address normalization, validation, serialization
 */

import {
  UnifiedAddress,
  PartialAddress,
  AddressValidationResult,
  AddressFieldError,
  AddressModule,
  ADDRESS_MODULE_CONFIGS,
  EMPTY_ADDRESS,
  AddressSource
} from '@/types/address';

/**
 * Normalize raw address data (from DB or form) into UnifiedAddress
 * Handles legacy TEXT fields, JSONB, and partial objects
 */
export function normalizeAddress(raw: any): UnifiedAddress {
  if (!raw) {
    return { ...EMPTY_ADDRESS };
  }

  // If it's a string (legacy TEXT field), parse as line1
  if (typeof raw === 'string') {
    return {
      ...EMPTY_ADDRESS,
      line1: raw,
      source: 'manual'
    };
  }

  // If it's a JSON string, parse it
  if (typeof raw === 'string' && raw.startsWith('{')) {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {
        ...EMPTY_ADDRESS,
        line1: raw,
        source: 'manual'
      };
    }
  }

  // Normalize from object (handle various field name conventions)
  return {
    line1: raw.line1 || raw.address_line1 || raw.addressLine1 || '',
    line2: raw.line2 || raw.address_line2 || raw.addressLine2 || '',
    pincode: raw.pincode || raw.postal_code || raw.postalCode || raw.zip || '',
    cityId: raw.cityId || raw.city_id || '',
    cityName: raw.cityName || raw.city_name || raw.city || '',
    stateId: raw.stateId || raw.state_id || '',
    stateCode: raw.stateCode || raw.state_code || '',
    stateName: raw.stateName || raw.state_name || raw.state || '',
    countryId: raw.countryId || raw.country_id || 'IN',
    countryName: raw.countryName || raw.country_name || raw.country || 'India',
    landmark: raw.landmark || '',
    locality: raw.locality || '',
    district: raw.district || '',
    lat: raw.lat || raw.latitude || undefined,
    lng: raw.lng || raw.longitude || undefined,
    source: normalizeSource(raw.source),
    isPrimary: raw.isPrimary ?? raw.is_primary ?? true,
    addressType: raw.addressType || raw.address_type || undefined
  };
}

/**
 * Normalize source value to valid AddressSource
 */
function normalizeSource(source: any): AddressSource {
  const validSources: AddressSource[] = ['manual', 'gsp', 'public', 'imported', 'edited'];
  if (validSources.includes(source)) {
    return source;
  }
  return 'manual';
}

/**
 * Serialize UnifiedAddress for database storage (JSONB)
 */
export function serializeAddress(addr: UnifiedAddress | PartialAddress): string {
  const normalized = normalizeAddress(addr);
  return JSON.stringify({
    line1: normalized.line1,
    line2: normalized.line2,
    pincode: normalized.pincode,
    cityId: normalized.cityId,
    cityName: normalized.cityName,
    stateId: normalized.stateId,
    stateCode: normalized.stateCode,
    stateName: normalized.stateName,
    countryId: normalized.countryId,
    countryName: normalized.countryName,
    landmark: normalized.landmark,
    locality: normalized.locality,
    district: normalized.district,
    lat: normalized.lat,
    lng: normalized.lng,
    source: normalized.source,
    isPrimary: normalized.isPrimary,
    addressType: normalized.addressType
  });
}

/**
 * Validate address based on module requirements
 */
export function validateAddress(
  addr: PartialAddress,
  module: AddressModule = 'client'
): AddressValidationResult {
  const config = ADDRESS_MODULE_CONFIGS[module];
  const errors: AddressFieldError[] = [];

  // Check required fields
  for (const field of config.requiredFields) {
    const value = addr[field];
    if (!value || (typeof value === 'string' && !value.trim())) {
      errors.push({
        field,
        message: `${formatFieldName(field)} is required`
      });
    }
  }

  // Validate pincode format (Indian 6-digit)
  if (addr.pincode && !/^\d{6}$/.test(addr.pincode)) {
    errors.push({
      field: 'pincode',
      message: 'Pincode must be 6 digits'
    });
  }

  // Validate lat/lng if provided
  if (addr.lat !== undefined && (addr.lat < -90 || addr.lat > 90)) {
    errors.push({
      field: 'lat',
      message: 'Latitude must be between -90 and 90'
    });
  }
  if (addr.lng !== undefined && (addr.lng < -180 || addr.lng > 180)) {
    errors.push({
      field: 'lng',
      message: 'Longitude must be between -180 and 180'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format field name for display
 */
function formatFieldName(field: keyof UnifiedAddress): string {
  const fieldNames: Record<string, string> = {
    line1: 'Address Line 1',
    line2: 'Address Line 2',
    pincode: 'Pincode',
    cityId: 'City',
    cityName: 'City',
    stateId: 'State',
    stateName: 'State',
    countryId: 'Country',
    countryName: 'Country',
    landmark: 'Landmark',
    locality: 'Locality',
    district: 'District'
  };
  return fieldNames[field] || field;
}

/**
 * Format address for display (single line)
 */
export function formatDisplayAddress(addr: UnifiedAddress | PartialAddress | null): string {
  if (!addr) return '';
  
  const parts: string[] = [];
  
  if (addr.line1) parts.push(addr.line1);
  if (addr.line2) parts.push(addr.line2);
  if (addr.landmark) parts.push(addr.landmark);
  if (addr.locality) parts.push(addr.locality);
  if (addr.cityName) parts.push(addr.cityName);
  if (addr.district && addr.district !== addr.cityName) parts.push(addr.district);
  if (addr.stateName) parts.push(addr.stateName);
  if (addr.pincode) parts.push(addr.pincode);
  if (addr.countryName && addr.countryName !== 'India') parts.push(addr.countryName);
  
  return parts.join(', ');
}

/**
 * Format address for multi-line display
 */
export function formatMultiLineAddress(addr: UnifiedAddress | PartialAddress | null): string[] {
  if (!addr) return [];
  
  const lines: string[] = [];
  
  if (addr.line1) lines.push(addr.line1);
  if (addr.line2) lines.push(addr.line2);
  if (addr.landmark) lines.push(`Near: ${addr.landmark}`);
  
  const cityLine: string[] = [];
  if (addr.locality) cityLine.push(addr.locality);
  if (addr.cityName) cityLine.push(addr.cityName);
  if (cityLine.length > 0) lines.push(cityLine.join(', '));
  
  const stateLine: string[] = [];
  if (addr.district && addr.district !== addr.cityName) stateLine.push(addr.district);
  if (addr.stateName) stateLine.push(addr.stateName);
  if (addr.pincode) stateLine.push(addr.pincode);
  if (stateLine.length > 0) lines.push(stateLine.join(' - '));
  
  if (addr.countryName && addr.countryName !== 'India') {
    lines.push(addr.countryName);
  }
  
  return lines;
}

/**
 * Compare two addresses for equality
 */
export function compareAddresses(a: UnifiedAddress | null, b: UnifiedAddress | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  
  return (
    a.line1 === b.line1 &&
    a.line2 === b.line2 &&
    a.pincode === b.pincode &&
    a.cityId === b.cityId &&
    a.cityName === b.cityName &&
    a.stateId === b.stateId &&
    a.stateName === b.stateName
  );
}

/**
 * Check if address is empty
 */
export function isAddressEmpty(addr: UnifiedAddress | PartialAddress | null): boolean {
  if (!addr) return true;
  return !addr.line1?.trim() && !addr.cityName?.trim() && !addr.stateName?.trim();
}

/**
 * Create address from legacy flat fields (for migration)
 */
export function createAddressFromLegacy(
  addressText: string | null,
  city: string | null,
  state: string | null,
  pincode?: string | null
): UnifiedAddress {
  return {
    ...EMPTY_ADDRESS,
    line1: addressText || '',
    cityName: city || '',
    stateName: state || '',
    pincode: pincode || '',
    source: 'imported'
  };
}

/**
 * Extract flat fields from UnifiedAddress (for backward compatibility)
 */
export function extractLegacyFields(addr: UnifiedAddress): {
  address: string;
  city: string;
  state: string;
  pincode: string;
} {
  return {
    address: addr.line1 || '',
    city: addr.cityName || '',
    state: addr.stateName || '',
    pincode: addr.pincode || ''
  };
}

/**
 * Parse JSONB address from database
 */
export function parseDbAddress(dbValue: any): UnifiedAddress {
  if (!dbValue) return { ...EMPTY_ADDRESS };
  
  // If already an object, normalize it
  if (typeof dbValue === 'object') {
    return normalizeAddress(dbValue);
  }
  
  // If string, try to parse as JSON
  if (typeof dbValue === 'string') {
    try {
      const parsed = JSON.parse(dbValue);
      return normalizeAddress(parsed);
    } catch {
      // Legacy text address
      return {
        ...EMPTY_ADDRESS,
        line1: dbValue,
        source: 'manual'
      };
    }
  }
  
  return { ...EMPTY_ADDRESS };
}
