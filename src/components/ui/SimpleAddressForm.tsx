import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PartialAddress } from '@/types/address';

/**
 * @deprecated Use PartialAddress from @/types/address.ts instead
 */
export interface SimpleAddressData {
  line1?: string;
  line2?: string;
  cityName?: string;
  stateName?: string;
  pincode?: string;
  countryName?: string;
}

interface SimpleAddressFormProps {
  value: SimpleAddressData | PartialAddress;
  onChange: (address: SimpleAddressData) => void;
  disabled?: boolean;
  className?: string;
  errors?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

/**
 * Simple text-based address form with NO async operations.
 * Eliminates all race conditions from cascading dropdowns.
 */
export const SimpleAddressForm: React.FC<SimpleAddressFormProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  errors = {}
}) => {
  const handleFieldChange = (field: keyof SimpleAddressData, newValue: string) => {
    onChange({
      ...value,
      [field]: newValue
    });
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      <div className="md:col-span-2">
        <Label htmlFor="line1">Address Line 1</Label>
        <Input
          id="line1"
          value={value.line1 || ''}
          onChange={(e) => handleFieldChange('line1', e.target.value)}
          disabled={disabled}
          placeholder="Street address, building name"
          className={errors.line1 ? 'border-destructive' : ''}
        />
        {errors.line1 && <p className="text-sm text-destructive mt-1">{errors.line1}</p>}
      </div>
      
      <div className="md:col-span-2">
        <Label htmlFor="line2">Address Line 2</Label>
        <Input
          id="line2"
          value={value.line2 || ''}
          onChange={(e) => handleFieldChange('line2', e.target.value)}
          disabled={disabled}
          placeholder="Apartment, suite, floor (optional)"
        />
      </div>
      
      <div>
        <Label htmlFor="cityName">City</Label>
        <Input
          id="cityName"
          value={value.cityName || ''}
          onChange={(e) => handleFieldChange('cityName', e.target.value)}
          disabled={disabled}
          placeholder="Enter city name"
          className={errors.city ? 'border-destructive' : ''}
        />
        {errors.city && <p className="text-sm text-destructive mt-1">{errors.city}</p>}
      </div>
      
      <div>
        <Label htmlFor="stateName">State</Label>
        <Input
          id="stateName"
          value={value.stateName || ''}
          onChange={(e) => handleFieldChange('stateName', e.target.value)}
          disabled={disabled}
          placeholder="Enter state name"
          className={errors.state ? 'border-destructive' : ''}
        />
        {errors.state && <p className="text-sm text-destructive mt-1">{errors.state}</p>}
      </div>
      
      <div>
        <Label htmlFor="pincode">Pincode</Label>
        <Input
          id="pincode"
          value={value.pincode || ''}
          onChange={(e) => handleFieldChange('pincode', e.target.value)}
          disabled={disabled}
          placeholder="Enter pincode"
          className={errors.pincode ? 'border-destructive' : ''}
        />
        {errors.pincode && <p className="text-sm text-destructive mt-1">{errors.pincode}</p>}
      </div>
      
      <div>
        <Label htmlFor="countryName">Country</Label>
        <Input
          id="countryName"
          value={value.countryName || 'India'}
          onChange={(e) => handleFieldChange('countryName', e.target.value)}
          disabled={disabled}
          placeholder="India"
        />
      </div>
    </div>
  );
};

export default SimpleAddressForm;
