/**
 * UnifiedAddressForm
 * 
 * Contract layer component that wraps the existing AddressForm while exposing
 * the Unified Address Architecture interface (UnifiedAddress/PartialAddress).
 * 
 * This enables consumers to use typed address interfaces while leveraging
 * the existing UI implementation.
 */

import React, { useMemo, useCallback } from 'react';
import { AddressForm } from '@/components/ui/AddressForm';
import { 
  UnifiedAddress, 
  PartialAddress, 
  AddressModule, 
  AddressType,
  ADDRESS_MODULE_CONFIGS
} from '@/types/address';
import { normalizeAddress } from '@/utils/addressUtils';
import { ModuleName } from '@/services/addressConfigService';
import { EnhancedAddressData } from '@/services/addressMasterService';
import { AddressData } from '@/services/addressLookupService';

interface UnifiedAddressFormProps {
  /** Address data - accepts UnifiedAddress or PartialAddress */
  value: UnifiedAddress | PartialAddress;
  /** Callback when address changes - returns normalized UnifiedAddress */
  onChange: (address: UnifiedAddress) => void;
  /** Module determines field configuration and validation rules */
  module: AddressModule;
  /** Form mode - 'view' sets disabled=true */
  mode: 'create' | 'edit' | 'view';
  /** Override default GST integration setting for module */
  showGSTIntegration?: boolean;
  /** Reserved for future geocoding feature */
  showGeocoding?: boolean;
  /** Address type tag (registered/correspondence/current/permanent) */
  addressType?: AddressType;
  /** GSTIN for GST address lookup */
  gstin?: string;
  /** Callback when GST address is selected */
  onGSTAddressSelect?: (address: UnifiedAddress) => void;
  /** Override disabled state */
  disabled?: boolean;
  /** Override required state */
  required?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Map AddressModule to legacy ModuleName for AddressForm compatibility
 * 'contact' maps to 'client' since AddressForm doesn't have contact-specific config
 */
function mapToLegacyModule(module: AddressModule): ModuleName {
  if (module === 'contact') {
    return 'client';
  }
  return module as ModuleName;
}

export const UnifiedAddressForm: React.FC<UnifiedAddressFormProps> = ({
  value,
  onChange,
  module,
  mode,
  showGSTIntegration,
  showGeocoding,
  addressType,
  gstin,
  onGSTAddressSelect,
  disabled,
  required,
  className
}) => {
  // Get module configuration for defaults
  const moduleConfig = ADDRESS_MODULE_CONFIGS[module];
  
  // Map AddressModule to legacy ModuleName
  const legacyModule = mapToLegacyModule(module);
  
  // Normalize incoming value for AddressForm compatibility
  const normalizedValue = useMemo(() => normalizeAddress(value), [value]);
  
  // Determine feature flags with module defaults
  const gstEnabled = showGSTIntegration ?? moduleConfig.showGSTIntegration;
  const geocodingEnabled = showGeocoding ?? moduleConfig.showGeocoding;
  
  // Handle mode-based states
  const isDisabled = disabled ?? (mode === 'view');
  const isRequired = required ?? (mode !== 'view');
  
  // Wrap onChange to normalize output and preserve addressType
  const handleChange = useCallback((data: EnhancedAddressData | AddressData) => {
    const normalized = normalizeAddress(data);
    // Preserve addressType if set
    if (addressType) {
      normalized.addressType = addressType;
    }
    onChange(normalized);
  }, [onChange, addressType]);
  
  // Wrap GST callback to ensure output is UnifiedAddress
  const handleGSTAddressSelect = useCallback((data: EnhancedAddressData) => {
    const normalized = normalizeAddress(data);
    // Preserve addressType if set
    if (addressType) {
      normalized.addressType = addressType;
    }
    onGSTAddressSelect?.(normalized);
  }, [onGSTAddressSelect, addressType]);
  
  return (
    <AddressForm
      value={normalizedValue}
      onChange={handleChange}
      module={legacyModule}
      showGSTIntegration={gstEnabled}
      showGeocoding={geocodingEnabled}
      gstin={gstin}
      onGSTAddressSelect={onGSTAddressSelect ? handleGSTAddressSelect : undefined}
      disabled={isDisabled}
      required={isRequired}
      className={className}
    />
  );
};

export default UnifiedAddressForm;
