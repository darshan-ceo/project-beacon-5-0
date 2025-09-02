import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addressLookupService, AddressData, City, State, Country } from '@/services/addressLookupService';

interface AddressFormProps {
  value: AddressData;
  onChange: (address: AddressData) => void;
  disabled?: boolean;
  required?: boolean;
}

export const AddressForm: React.FC<AddressFormProps> = ({
  value,
  onChange,
  disabled = false,
  required = false
}) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (value.countryId) {
      loadStates(value.countryId);
    }
  }, [value.countryId]);

  useEffect(() => {
    if (value.stateId) {
      loadCities(value.stateId);
    }
  }, [value.stateId]);

  const loadInitialData = async () => {
    try {
      const [countriesData] = await Promise.all([
        addressLookupService.getCountries()
      ]);
      
      setCountries(countriesData);
      
      // Set India as default if no country selected
      if (!value.countryId && countriesData.length > 0) {
        const india = countriesData.find(c => c.id === 'IN');
        if (india) {
          onChange({ ...value, countryId: india.id });
        }
      }
    } catch (error) {
      console.error('Failed to load address data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStates = async (countryId: string) => {
    try {
      const statesData = await addressLookupService.getStates(countryId);
      setStates(statesData);
      
      // Reset state and city if country changes
      if (value.countryId !== countryId) {
        onChange({ 
          ...value, 
          countryId, 
          stateId: '', 
          cityId: '' 
        });
        setCities([]);
      }
    } catch (error) {
      console.error('Failed to load states:', error);
    }
  };

  const loadCities = async (stateId: string) => {
    try {
      const citiesData = await addressLookupService.getCities(stateId);
      setCities(citiesData);
      
      // Reset city if state changes
      if (value.stateId !== stateId) {
        onChange({ ...value, stateId, cityId: '' });
      }
    } catch (error) {
      console.error('Failed to load cities:', error);
    }
  };

  const handleFieldChange = (field: keyof AddressData, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading address fields...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="address-line1">
            Address Line 1 {required && '*'}
          </Label>
          <Input
            id="address-line1"
            value={value.line1 || ''}
            onChange={(e) => handleFieldChange('line1', e.target.value)}
            placeholder="Street address, building name"
            disabled={disabled}
            required={required}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address-line2">Address Line 2</Label>
          <Input
            id="address-line2"
            value={value.line2 || ''}
            onChange={(e) => handleFieldChange('line2', e.target.value)}
            placeholder="Apartment, suite, unit (optional)"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="locality">Locality</Label>
          <Input
            id="locality"
            value={value.locality || ''}
            onChange={(e) => handleFieldChange('locality', e.target.value)}
            placeholder="Area, locality"
            disabled={disabled}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pincode">
            Pincode {required && '*'}
          </Label>
          <Input
            id="pincode"
            value={value.pincode || ''}
            onChange={(e) => handleFieldChange('pincode', e.target.value)}
            placeholder="6-digit pincode"
            pattern="[0-9]{6}"
            maxLength={6}
            disabled={disabled}
            required={required}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">
            Country {required && '*'}
          </Label>
          <Select
            value={value.countryId || ''}
            onValueChange={(countryId) => loadStates(countryId)}
            disabled={disabled}
            required={required}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.id} value={country.id}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="state">
            State {required && '*'}
          </Label>
          <Select
            value={value.stateId || ''}
            onValueChange={(stateId) => loadCities(stateId)}
            disabled={disabled || !value.countryId}
            required={required}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {states.map((state) => (
                <SelectItem key={state.id} value={state.id}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="city">
            City {required && '*'}
          </Label>
          <Select
            value={value.cityId || ''}
            onValueChange={(cityId) => handleFieldChange('cityId', cityId)}
            disabled={disabled || !value.stateId}
            required={required}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};