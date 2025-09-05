import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { addressLookupService, AddressData, City, State, Country } from '@/services/addressLookupService';
import { EnhancedAddressData, addressMasterService } from '@/services/addressMasterService';
import { addressConfigService, ModuleName, AddressFieldName } from '@/services/addressConfigService';
import { gstAddressMapper, GSTAddressMapping } from '@/services/gstAddressMapper';
import { gstPublicService, GSTTaxpayerInfo } from '@/services/gstPublicService';
import { SourceChip, DataSource, EditableSourceChip } from '@/components/ui/source-chip';
import { featureFlagService } from '@/services/featureFlagService';
import { Download, MapPin, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AddressFormProps {
  value: EnhancedAddressData | AddressData;
  onChange: (address: EnhancedAddressData | AddressData) => void;
  disabled?: boolean;
  required?: boolean;
  module?: ModuleName;
  showGSTIntegration?: boolean;
  gstin?: string;
  onGSTAddressSelect?: (address: EnhancedAddressData) => void;
  className?: string;
}

export const AddressForm: React.FC<AddressFormProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  module = 'client',
  showGSTIntegration = false,
  gstin,
  onGSTAddressSelect,
  className
}) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fieldConfig, setFieldConfig] = useState<Record<string, any>>({});
  const [gstData, setGstData] = useState<GSTTaxpayerInfo | null>(null);
  const [gstLoading, setGstLoading] = useState(false);
  const [fieldSources, setFieldSources] = useState<Record<string, DataSource>>({});
  const [isAddressMasterEnabled, setIsAddressMasterEnabled] = useState(false);

  useEffect(() => {
    loadInitialData();
    loadFieldConfiguration();
    setIsAddressMasterEnabled(featureFlagService.isEnabled('address_master_v1'));
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

  useEffect(() => {
    if (showGSTIntegration && gstin && isAddressMasterEnabled) {
      loadGSTData();
    }
  }, [gstin, showGSTIntegration, isAddressMasterEnabled]);

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
        const enhancedValue = {
          ...value,
          countryId: india.id,
          source: (value as any).source || 'manual'
        };
          onChange(enhancedValue);
        }
      }
    } catch (error) {
      console.error('Failed to load address data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFieldConfiguration = async () => {
    if (!isAddressMasterEnabled) return;
    
    try {
      const result = await addressConfigService.getModuleConfig(module);
      if (result.success) {
        setFieldConfig(result.data);
      }
    } catch (error) {
      console.error('Failed to load field configuration:', error);
    }
  };

  const loadGSTData = async () => {
    if (!gstin) return;
    
    setGstLoading(true);
    try {
      const result = await gstPublicService.fetchTaxpayer(gstin);
      if (result.success && result.data) {
        setGstData(result.data);
      }
    } catch (error) {
      console.error('Failed to load GST data:', error);
    } finally {
      setGstLoading(false);
    }
  };

  const loadStates = async (countryId: string) => {
    try {
      const statesData = await addressLookupService.getStates(countryId);
      setStates(statesData);
      
      // Reset state and city if country changes
      if (value.countryId !== countryId) {
        const enhancedValue = {
          ...value,
          countryId, 
          stateId: '', 
          cityId: '',
          source: (value as any).source || 'manual'
        };
        onChange(enhancedValue);
        setCities([]);
      }
    } catch (error) {
      console.error('Failed to load states:', error);
    }
  };

  const loadCities = async (stateId: string) => {
    setCitiesLoading(true);
    try {
      const citiesData = await addressLookupService.getCities(stateId);
      setCities(citiesData);
      
      // Reset city if state changes
      if (value.stateId !== stateId) {
        const enhancedValue = {
          ...value,
          stateId,
          cityId: '',
          source: (value as any).source || 'manual'
        };
        onChange(enhancedValue);
      }
    } catch (error) {
      console.error('Failed to load cities:', error);
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  };

  const handleFieldChange = (field: keyof EnhancedAddressData, fieldValue: string | number) => {
    const enhancedValue = {
      ...value,
      [field]: fieldValue,
      source: (value as any).source || 'manual'
    };
    
    // If field is being manually edited and has GST/Public source, mark as edited
    if (fieldSources[field] && ['public', 'gsp'].includes(fieldSources[field])) {
      setFieldSources(prev => ({ ...prev, [field]: 'edited' }));
      enhancedValue.source = 'edited';
    }
    
    onChange(enhancedValue);
  };

  const handleUseGSTAddress = async () => {
    if (!gstData) return;
    
    try {
      const mapping = await gstAddressMapper.mapGSTTaxpayerToAddress(gstData);
      if (mapping.principalAddress) {
        // Mark all fields as GST sourced
        const newFieldSources: Record<string, DataSource> = {};
        Object.keys(mapping.principalAddress).forEach(key => {
          if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
            newFieldSources[key] = 'public';
          }
        });
        setFieldSources(newFieldSources);
        
        onChange(mapping.principalAddress);
        onGSTAddressSelect?.(mapping.principalAddress);
        toast.success('GST address populated successfully');
      }
    } catch (error) {
      toast.error('Failed to populate GST address');
    }
  };

  const isFieldVisible = (fieldName: AddressFieldName): boolean => {
    if (!isAddressMasterEnabled) {
      // Legacy behavior - show all fields except new ones
      return !['landmark', 'district', 'stateCode', 'stateName', 'lat', 'lng'].includes(fieldName);
    }
    return fieldConfig[fieldName]?.visible ?? true;
  };

  const isFieldRequired = (fieldName: AddressFieldName): boolean => {
    if (!isAddressMasterEnabled) {
      // Legacy required fields
      return ['line1', 'cityId', 'stateId', 'countryId', 'pincode'].includes(fieldName);
    }
    return fieldConfig[fieldName]?.required ?? false;
  };

  const isFieldEditable = (fieldName: AddressFieldName): boolean => {
    if (!isAddressMasterEnabled) return true;
    return fieldConfig[fieldName]?.editable ?? true;
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading address fields...</div>;
  }

  return (
    <div className={className}>
      {/* GST Integration Panel */}
      {showGSTIntegration && gstData && isAddressMasterEnabled && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4" />
              GST Address Available
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {gstData.principalAddress && (
                  <div>
                    {[
                      gstData.principalAddress.buildingNumber,
                      gstData.principalAddress.buildingName,
                      gstData.principalAddress.street,
                      gstData.principalAddress.location,
                      gstData.principalAddress.district
                    ].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
              <Button onClick={handleUseGSTAddress} size="sm">
                Use GST Address
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {/* Address Line 1 */}
        {isFieldVisible('line1') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="address-line1">
                Address Line 1 {(required || isFieldRequired('line1')) && '*'}
              </Label>
              {isAddressMasterEnabled && fieldSources['line1'] && (
                <SourceChip source={fieldSources['line1']} />
              )}
            </div>
            <Input
              id="address-line1"
              value={value.line1 || ''}
              onChange={(e) => handleFieldChange('line1', e.target.value)}
              placeholder="Street address, building name"
              disabled={disabled || !isFieldEditable('line1')}
              required={required || isFieldRequired('line1')}
            />
          </div>
        )}

        {/* Address Line 2 */}
        {isFieldVisible('line2') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="address-line2">
                Address Line 2 {isFieldRequired('line2') && '*'}
              </Label>
              {isAddressMasterEnabled && fieldSources['line2'] && (
                <SourceChip source={fieldSources['line2']} />
              )}
            </div>
            <Input
              id="address-line2"
              value={value.line2 || ''}
              onChange={(e) => handleFieldChange('line2', e.target.value)}
              placeholder="Apartment, suite, unit (optional)"
              disabled={disabled || !isFieldEditable('line2')}
              required={isFieldRequired('line2')}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Landmark */}
          {isFieldVisible('landmark') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="landmark">
                  Landmark {isFieldRequired('landmark') && '*'}
                </Label>
                {isAddressMasterEnabled && fieldSources['landmark'] && (
                  <SourceChip source={fieldSources['landmark']} />
                )}
              </div>
              <Input
                id="landmark"
                value={(value as any).landmark || ''}
                onChange={(e) => handleFieldChange('landmark', e.target.value)}
                placeholder="Nearby landmark"
                disabled={disabled || !isFieldEditable('landmark')}
                required={isFieldRequired('landmark')}
              />
            </div>
          )}

          {/* Locality */}
          {isFieldVisible('locality') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="locality">
                  Locality {isFieldRequired('locality') && '*'}
                </Label>
                {isAddressMasterEnabled && fieldSources['locality'] && (
                  <SourceChip source={fieldSources['locality']} />
                )}
              </div>
              <Input
                id="locality"
                value={value.locality || ''}
                onChange={(e) => handleFieldChange('locality', e.target.value)}
                placeholder="Area, locality"
                disabled={disabled || !isFieldEditable('locality')}
                required={isFieldRequired('locality')}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* District */}
          {isFieldVisible('district') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="district">
                  District {(required || isFieldRequired('district')) && '*'}
                </Label>
                {isAddressMasterEnabled && fieldSources['district'] && (
                  <SourceChip source={fieldSources['district']} />
                )}
              </div>
              <Input
                id="district"
                value={(value as any).district || ''}
                onChange={(e) => handleFieldChange('district', e.target.value)}
                placeholder="District"
                disabled={disabled || !isFieldEditable('district')}
                required={required || isFieldRequired('district')}
              />
            </div>
          )}

          {/* Pincode */}
          {isFieldVisible('pincode') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pincode">
                  Pincode {(required || isFieldRequired('pincode')) && '*'}
                </Label>
                {isAddressMasterEnabled && fieldSources['pincode'] && (
                  <SourceChip source={fieldSources['pincode']} />
                )}
              </div>
              <Input
                id="pincode"
                value={value.pincode || ''}
                onChange={(e) => handleFieldChange('pincode', e.target.value)}
                placeholder="6-digit pincode"
                pattern="[0-9]{6}"
                maxLength={6}
                disabled={disabled || !isFieldEditable('pincode')}
                required={required || isFieldRequired('pincode')}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Country */}
          {isFieldVisible('countryId') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="country">
                  Country {(required || isFieldRequired('countryId')) && '*'}
                </Label>
                {isAddressMasterEnabled && fieldSources['countryId'] && (
                  <SourceChip source={fieldSources['countryId']} />
                )}
              </div>
              <Select
                value={value.countryId || ''}
                onValueChange={(countryId) => loadStates(countryId)}
                disabled={disabled || !isFieldEditable('countryId')}
                required={required || isFieldRequired('countryId')}
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
          )}

          {/* State */}
          {isFieldVisible('stateId') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="state">
                  State {(required || isFieldRequired('stateId')) && '*'}
                </Label>
                {isAddressMasterEnabled && fieldSources['stateId'] && (
                  <SourceChip source={fieldSources['stateId']} />
                )}
              </div>
              <Select
                value={value.stateId || ''}
                onValueChange={(stateId) => loadCities(stateId)}
                disabled={disabled || !value.countryId || !isFieldEditable('stateId')}
                required={required || isFieldRequired('stateId')}
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
          )}

          {/* City */}
          {isFieldVisible('cityId') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="city">
                  City {(required || isFieldRequired('cityId')) && '*'}
                </Label>
                {isAddressMasterEnabled && fieldSources['cityId'] && (
                  <SourceChip source={fieldSources['cityId']} />
                )}
              </div>
              
              {/* Show manual input if allowManualInput is enabled and no cities available */}
              {fieldConfig.cityId?.allowManualInput && cities.length === 0 && value.stateId && !citiesLoading ? (
                <Input
                  id="city-manual"
                  value={value.cityId || ''}
                  onChange={(e) => handleFieldChange('cityId', e.target.value)}
                  placeholder="Enter city name manually"
                  disabled={disabled || !isFieldEditable('cityId')}
                  required={required || isFieldRequired('cityId')}
                />
              ) : (
                <Select
                  value={value.cityId || ''}
                  onValueChange={(cityId) => handleFieldChange('cityId', cityId)}
                  disabled={disabled || !isFieldEditable('cityId')}
                  required={required || isFieldRequired('cityId')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !value.stateId 
                        ? "Select state first" 
                        : citiesLoading 
                          ? "Loading cities..." 
                          : cities.length === 0 
                            ? (fieldConfig.cityId?.allowManualInput ? "No cities - manual entry available" : "No cities available")
                            : "Select city"
                    } />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    {!value.stateId ? (
                      <SelectItem value="_select_state_first" disabled>
                        Please select a state first
                      </SelectItem>
                    ) : citiesLoading ? (
                      <SelectItem value="_loading_cities" disabled>
                        Loading cities...
                      </SelectItem>
                    ) : cities.length === 0 ? (
                      <>
                        <SelectItem value="_no_cities" disabled>
                          No cities available for this state
                        </SelectItem>
                        {fieldConfig.cityId?.allowManualInput && (
                          <SelectItem value="_manual_hint" disabled className="text-xs text-muted-foreground">
                            Manual entry will be enabled automatically
                          </SelectItem>
                        )}
                      </>
                    ) : (
                      cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        {/* Coordinates */}
        {(isFieldVisible('lat') || isFieldVisible('lng')) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isFieldVisible('lat') && (
              <div className="space-y-2">
                <Label htmlFor="latitude">
                  Latitude {isFieldRequired('lat') && '*'}
                </Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={(value as any).lat || ''}
                  onChange={(e) => handleFieldChange('lat', parseFloat(e.target.value) || 0)}
                  placeholder="Latitude coordinate"
                  disabled={disabled || !isFieldEditable('lat')}
                  required={isFieldRequired('lat')}
                />
              </div>
            )}

            {isFieldVisible('lng') && (
              <div className="space-y-2">
                <Label htmlFor="longitude">
                  Longitude {isFieldRequired('lng') && '*'}
                </Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={(value as any).lng || ''}
                  onChange={(e) => handleFieldChange('lng', parseFloat(e.target.value) || 0)}
                  placeholder="Longitude coordinate"
                  disabled={disabled || !isFieldEditable('lng')}
                  required={isFieldRequired('lng')}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};