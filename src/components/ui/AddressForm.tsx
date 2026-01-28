import React, { useEffect, useRef, useState } from 'react';
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
import { Download, MapPin, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { autoCapitalizeFirst } from '@/utils/textFormatters';

interface AddressFormProps {
  value: EnhancedAddressData | AddressData;
  onChange: (address: EnhancedAddressData | AddressData) => void;
  disabled?: boolean;
  required?: boolean;
  module?: ModuleName;
  showGSTIntegration?: boolean;
  showGeocoding?: boolean;
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
  showGeocoding = false,
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
  const [manualCityMode, setManualCityMode] = useState(false);
  const [manualCityInput, setManualCityInput] = useState('');
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Prevent async initial-load logic from using stale `value` and overwriting a newer address
  const latestValueRef = useRef(value);
  const hasMeaningfulAddressRef = useRef(false);

  useEffect(() => {
    latestValueRef.current = value;

    const cityName = (value as any).cityName as string | undefined;
    const stateName = (value as any).stateName as string | undefined;

    // Mark as "meaningful" once we have anything beyond just a default country
    if (
      value.stateId ||
      value.cityId ||
      (cityName && cityName.trim()) ||
      (stateName && stateName.trim()) ||
      (value.line1 && value.line1.trim()) ||
      (value.pincode && value.pincode.trim())
    ) {
      hasMeaningfulAddressRef.current = true;
    }
  }, [value]);

  // Debug: Log whenever value changes
  useEffect(() => {
    console.log('📍 [AddressForm] Value received:', JSON.stringify({
      cityId: value.cityId,
      cityName: (value as any).cityName,
      stateId: value.stateId,
      stateName: (value as any).stateName,
      countryId: value.countryId
    }));
  }, [value]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const addressMasterEnabled = featureFlagService.isEnabled('address_master_v1');
    setIsAddressMasterEnabled(addressMasterEnabled);
  }, []);

  useEffect(() => {
    if (isAddressMasterEnabled) {
      loadFieldConfiguration();
    }
  }, [isAddressMasterEnabled, module]);

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
      
      // REMOVED: Don't call onChange here to set default country
      // Parent component (ClientModal) is responsible for setting initial values
      // Calling onChange here causes race conditions that clear address fields
      console.log('📍 [AddressForm] loadInitialData complete. Countries loaded:', countriesData.length);
    } catch (error) {
      console.error('Failed to load address data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFieldConfiguration = async () => {
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
      // Country/state/city reset is handled in Country dropdown onValueChange handler
      // Do NOT reset here - avoids stale closure issues on initial load
    } catch (error) {
      console.error('Failed to load states:', error);
    }
  };

  const loadCities = async (stateId: string) => {
    setCitiesLoading(true);
    try {
      const citiesData = await addressLookupService.getCities(stateId);
      setCities(citiesData);
      // City reset is handled in State dropdown onValueChange handler
      // Do NOT reset city here - causes stale closure issues on initial load
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

  const handleManualCitySubmit = async () => {
    if (!manualCityInput.trim() || !value.stateId) {
      toast.error('Please enter a city name');
      return;
    }

    try {
      const { cityMasterService } = await import('@/services/cityMasterService');
      
      // Check if city already exists
      const exists = await cityMasterService.cityExists(manualCityInput, value.stateId);
      
      if (exists) {
        toast.error('City already exists');
        return;
      }
      
      // Add to master
      const newCity = await cityMasterService.addCustomCity(manualCityInput, value.stateId);
      
      // Reload cities to include new one
      await loadCities(value.stateId);
      
      // Set the new city as selected with name
      const enhancedValue = {
        ...value,
        cityId: newCity.id,
        cityName: newCity.name,
        source: (value as any).source || 'manual'
      };
      onChange(enhancedValue);
      
      // Reset manual mode
      setManualCityMode(false);
      setManualCityInput('');
      
      toast.success(`City "${newCity.name}" added successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add city');
    }
  };

  const handleGeocode = async () => {
    if (!value.line1 && !value.cityId && !(value as any).cityName) {
      toast.error('Please enter address details before geocoding');
      return;
    }

    setGeocodeLoading(true);
    setGeocodeError(null);

    try {
      const { geocodingService } = await import('@/services/geocodingService');
      
      const result = await geocodingService.geocodeAddress({
        line1: value.line1,
        line2: value.line2,
        locality: value.locality,
        cityName: (value as any).cityName,
        district: (value as any).district,
        stateName: (value as any).stateName,
        pincode: value.pincode,
        countryName: 'India'
      });

      if (result.success && result.data) {
        const enhancedValue = {
          ...value,
          lat: result.data.lat,
          lng: result.data.lng,
          source: (value as any).source || 'manual'
        };
        onChange(enhancedValue);

        if (result.data.confidence === 'high') {
          toast.success('Coordinates found with high accuracy');
        } else if (result.data.confidence === 'medium') {
          toast.success('Coordinates found - please verify on map');
        } else {
          toast.warning('Approximate coordinates found - verification recommended');
        }
      } else {
        setGeocodeError(result.error || 'Could not find coordinates');
        toast.error(result.error || 'Could not find coordinates for this address');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Geocoding failed';
      setGeocodeError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setGeocodeLoading(false);
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
    // If required prop is explicitly false, no fields are required
    if (required === false) {
      return false;
    }
    
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
                Address Line 1 {isFieldRequired('line1') && '*'}
              </Label>
              {isAddressMasterEnabled && fieldSources['line1'] && (
                <SourceChip source={fieldSources['line1']} />
              )}
            </div>
            <Input
              id="address-line1"
              value={value.line1 || ''}
              onChange={(e) => handleFieldChange('line1', e.target.value)}
              onBlur={(e) => {
                const capitalized = autoCapitalizeFirst(e.target.value);
                if (capitalized !== e.target.value) {
                  handleFieldChange('line1', capitalized);
                }
              }}
              placeholder="Street address, building name"
              disabled={disabled || !isFieldEditable('line1')}
              required={isFieldRequired('line1')}
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
              onBlur={(e) => {
                const capitalized = autoCapitalizeFirst(e.target.value);
                if (capitalized !== e.target.value) {
                  handleFieldChange('line2', capitalized);
                }
              }}
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
                onBlur={(e) => {
                  const capitalized = autoCapitalizeFirst(e.target.value);
                  if (capitalized !== e.target.value) {
                    handleFieldChange('landmark', capitalized);
                  }
                }}
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
                  District {isFieldRequired('district') && '*'}
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
                required={isFieldRequired('district')}
              />
            </div>
          )}

          {/* Pincode */}
          {isFieldVisible('pincode') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pincode">
                  Pincode {isFieldRequired('pincode') && '*'}
                </Label>
                {isAddressMasterEnabled && fieldSources['pincode'] && (
                  <SourceChip source={fieldSources['pincode']} />
                )}
              </div>
              <Input
                id="pincode"
                type="text"
                inputMode="numeric"
                value={value.pincode || ''}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/\D/g, '');
                  handleFieldChange('pincode', numericValue);
                }}
                placeholder="6-digit PIN (e.g., 380001 for Ahmedabad)"
                pattern="[0-9]{6}"
                maxLength={6}
                disabled={disabled || !isFieldEditable('pincode')}
                required={isFieldRequired('pincode')}
                className={
                  value.pincode && value.pincode.length > 0 && value.pincode.length !== 6
                    ? 'border-destructive'
                    : ''
                }
              />
              {value.pincode && value.pincode.length > 0 && value.pincode.length !== 6 && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>Pincode must be exactly 6 digits</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Enter 6-digit Indian postal code
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Country */}
          {isFieldVisible('countryId') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="country">
                  Country {isFieldRequired('countryId') && '*'}
                </Label>
                {isAddressMasterEnabled && fieldSources['countryId'] && (
                  <SourceChip source={fieldSources['countryId']} />
                )}
              </div>
              <Select
                value={value.countryId || ''}
                onValueChange={(newCountryId) => {
                  // CRITICAL: Use latestValueRef to avoid stale closure issues
                  const currentValue = latestValueRef.current;
                  
                  // Guard: Don't process if country hasn't actually changed
                  if (newCountryId === currentValue.countryId) {
                    console.log('🛡️ [AddressForm] Country unchanged, skipping reset');
                    return;
                  }
                  
                  console.log('🌍 [AddressForm] Country changed from', currentValue.countryId, 'to', newCountryId);
                  
                  // Reset dependent fields when user explicitly changes country
                  const enhancedValue = {
                    ...currentValue,  // Use ref instead of stale value prop
                    countryId: newCountryId,
                    stateId: '',
                    stateName: '',
                    cityId: '',
                    cityName: '',
                    source: (currentValue as any).source || 'manual'
                  };
                  onChange(enhancedValue);
                  setCities([]);
                  loadStates(newCountryId);
                }}
                disabled={disabled || !isFieldEditable('countryId')}
                required={isFieldRequired('countryId')}
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
                  State {isFieldRequired('stateId') && '*'}
                </Label>
                {isAddressMasterEnabled && fieldSources['stateId'] && (
                  <SourceChip source={fieldSources['stateId']} />
                )}
              </div>
              <Select
                value={value.stateId || ''}
                onValueChange={(newStateId) => {
                  // Use latestValueRef to avoid stale closure issues
                  const currentValue = latestValueRef.current;
                  
                  // Don't clear city if state hasn't actually changed - prevents spurious resets
                  // from dynamic states array loading or race conditions
                  if (newStateId === currentValue.stateId) {
                    // Still load cities if not already loaded
                    if (cities.length === 0) {
                      loadCities(newStateId);
                    }
                    return;
                  }
                  
                  console.log('📍 [AddressForm] State ACTUALLY changed from', currentValue.stateId, 'to', newStateId, '- clearing city');
                  
                  const selectedState = states.find(s => s.id === newStateId);
                  const enhancedValue = {
                    ...currentValue,
                    stateId: newStateId,
                    stateName: selectedState?.name || '',
                    // Only clear city when state ACTUALLY changes
                    cityId: '',
                    cityName: '',
                    source: (currentValue as any).source || 'manual'
                  };
                  onChange(enhancedValue);
                  loadCities(newStateId);
                }}
                disabled={disabled || !value.countryId || !isFieldEditable('stateId')}
                required={isFieldRequired('stateId')}
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
            <div className={`space-y-2 ${manualCityMode ? 'md:col-span-3' : ''}`}>
              <div className="flex items-center justify-between">
                <Label htmlFor="city">
                  City {isFieldRequired('cityId') && '*'}
                </Label>
                {isAddressMasterEnabled && fieldSources['cityId'] && (
                  <SourceChip source={fieldSources['cityId']} />
                )}
              </div>
              
              {!manualCityMode ? (
                // Normal dropdown with "Add New City" option
                <Select
                  value={value.cityId || ''}
                  onValueChange={(val) => {
                    // CRITICAL GUARD: Don't process empty/undefined value when cities haven't loaded yet
                    // This prevents the Select from clearing cityId during async loading
                    const currentValue = latestValueRef.current;
                    if (!val && cities.length === 0 && currentValue.cityId) {
                      console.log('🛡️ [AddressForm] City Select guard: Preventing spurious clear while cities loading. Preserving cityId:', currentValue.cityId);
                      return; // Preserve existing cityId
                    }
                    
                    if (val === '__ADD_NEW__') {
                      setManualCityMode(true);
                    } else {
                      const selectedCity = cities.find(c => c.id === val);
                      const enhancedValue = {
                        ...currentValue,
                        cityId: val,
                        cityName: selectedCity?.name || val, // Fallback to val if city not found
                        source: (currentValue as any).source || 'manual'
                      };
                      onChange(enhancedValue);
                    }
                  }}
                  disabled={disabled || !value.stateId || !isFieldEditable('cityId')}
                  required={isFieldRequired('cityId')}
                >
                  <SelectTrigger>
                    {/* Show stored cityName directly - don't rely on finding in cities array */}
                    <SelectValue placeholder={
                      !value.stateId 
                        ? "Select state first" 
                        : citiesLoading 
                          ? "Loading cities..." 
                          : (value as any).cityName || "Select city"
                    } />
                  </SelectTrigger>
                  <SelectContent className="z-[200] bg-popover">
                    {!value.stateId ? (
                      <SelectItem value="_select_state_first" disabled>
                        Please select a state first
                      </SelectItem>
                    ) : citiesLoading ? (
                      <SelectItem value="_loading_cities" disabled>
                        Loading cities...
                      </SelectItem>
                    ) : (
                      <>
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.id}>
                            {city.name}
                            {city.id.startsWith('CUSTOM_') && (
                              <Badge variant="secondary" className="ml-2 text-xs">Custom</Badge>
                            )}
                          </SelectItem>
                        ))}
                        {fieldConfig.cityId?.allowManualInput && (
                          <SelectItem value="__ADD_NEW__" className="text-primary font-medium border-t mt-1 pt-1">
                            + Add New City
                          </SelectItem>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                // Manual input mode
                <div className="flex gap-2">
                  <Input
                    value={manualCityInput}
                    onChange={(e) => setManualCityInput(e.target.value)}
                    placeholder="Enter city name"
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleManualCitySubmit();
                      } else if (e.key === 'Escape') {
                        setManualCityMode(false);
                        setManualCityInput('');
                      }
                    }}
                  />
                  <Button onClick={handleManualCitySubmit} size="sm" type="button">
                    Add
                  </Button>
                  <Button 
                    onClick={() => {
                      setManualCityMode(false);
                      setManualCityInput('');
                    }} 
                    size="sm" 
                    variant="outline"
                    type="button"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Geocoding Section */}
        {showGeocoding && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Location Coordinates</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeocode}
                disabled={disabled || geocodeLoading}
                className="gap-2"
              >
                {geocodeLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Geocoding...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    Get Coordinates
                  </>
                )}
              </Button>
            </div>
            
            {geocodeError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {geocodeError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Latitude */}
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={(value as any).lat || ''}
                  onChange={(e) => handleFieldChange('lat', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 23.0225"
                  disabled={disabled}
                />
              </div>

              {/* Longitude */}
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={(value as any).lng || ''}
                  onChange={(e) => handleFieldChange('lng', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 72.5714"
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Map Preview Links */}
            {(value as any).lat && (value as any).lng && (
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`https://www.google.com/maps?q=${(value as any).lat},${(value as any).lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View on Google Maps
                </a>
                <span className="text-muted-foreground">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${(value as any).lat}&mlon=${(value as any).lng}&zoom=17`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  OpenStreetMap
                </a>
              </div>
            )}
          </div>
        )}

        {/* Legacy Coordinates (when geocoding not enabled but fields visible) */}
        {!showGeocoding && (isFieldVisible('lat') || isFieldVisible('lng')) && (
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