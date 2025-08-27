import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INDIAN_STATES, COUNTRIES } from '@/constants/indianStates';
import { validatePincode } from '@/utils/validation';

interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface StructuredAddressProps {
  address: Address;
  onChange: (address: Address) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  errors?: Record<string, string>;
}

export const StructuredAddress: React.FC<StructuredAddressProps> = ({
  address,
  onChange,
  disabled = false,
  label = "Address",
  required = true,
  errors = {}
}) => {
  const handleFieldChange = (field: keyof Address, value: string) => {
    onChange({
      ...address,
      [field]: value
    });
  };

  const validateAndSetPincode = (pincode: string) => {
    // Only allow digits and limit to 6 characters
    const numericValue = pincode.replace(/\D/g, '').slice(0, 6);
    handleFieldChange('pincode', numericValue);
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center space-x-1">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {required && <span className="text-destructive">*</span>}
      </div>
      
      <div className="grid gap-4">
        {/* Address Line 1 */}
        <div>
          <Label htmlFor="addressLine1" className="text-xs text-muted-foreground">
            Address Line 1 {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="addressLine1"
            value={address.addressLine1}
            onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
            disabled={disabled}
            placeholder="Building/House number, Street name"
            className={errors.addressLine1 ? 'border-destructive' : ''}
          />
          {errors.addressLine1 && (
            <p className="text-xs text-destructive mt-1">{errors.addressLine1}</p>
          )}
        </div>

        {/* Address Line 2 */}
        <div>
          <Label htmlFor="addressLine2" className="text-xs text-muted-foreground">
            Address Line 2 (Optional)
          </Label>
          <Input
            id="addressLine2"
            value={address.addressLine2 || ''}
            onChange={(e) => handleFieldChange('addressLine2', e.target.value)}
            disabled={disabled}
            placeholder="Area, Landmark"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* City */}
          <div>
            <Label htmlFor="city" className="text-xs text-muted-foreground">
              City {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="city"
              value={address.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              disabled={disabled}
              placeholder="City"
              className={errors.city ? 'border-destructive' : ''}
            />
            {errors.city && (
              <p className="text-xs text-destructive mt-1">{errors.city}</p>
            )}
          </div>

          {/* Pincode */}
          <div>
            <Label htmlFor="pincode" className="text-xs text-muted-foreground">
              Pincode {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="pincode"
              value={address.pincode}
              onChange={(e) => validateAndSetPincode(e.target.value)}
              disabled={disabled}
              placeholder="123456"
              maxLength={6}
              className={errors.pincode ? 'border-destructive' : ''}
            />
            {errors.pincode && (
              <p className="text-xs text-destructive mt-1">{errors.pincode}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* State */}
          <div>
            <Label htmlFor="state" className="text-xs text-muted-foreground">
              State {required && <span className="text-destructive">*</span>}
            </Label>
            <Select 
              value={address.state} 
              onValueChange={(value) => handleFieldChange('state', value)}
              disabled={disabled}
            >
              <SelectTrigger className={errors.state ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && (
              <p className="text-xs text-destructive mt-1">{errors.state}</p>
            )}
          </div>

          {/* Country */}
          <div>
            <Label htmlFor="country" className="text-xs text-muted-foreground">
              Country {required && <span className="text-destructive">*</span>}
            </Label>
            <Select 
              value={address.country} 
              onValueChange={(value) => handleFieldChange('country', value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};