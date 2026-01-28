
# Geocoding Support for UnifiedAddressForm

## Objective
Implement address-to-coordinates geocoding using OpenStreetMap's Nominatim API, enabling the `showGeocoding` feature flag that's already defined in the Unified Address Architecture.

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    UnifiedAddressForm                                │
│    showGeocoding prop ──► Passed to AddressForm                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AddressForm                                   │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ [Geocode Address] Button (visible when showGeocoding=true) │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ Calls geocodingService.geocodeAddress(addressString)       │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ Updates lat/lng fields + Shows coordinates + Map link      │     │
│  └────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    geocodingService.ts                               │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ Nominatim API (OpenStreetMap)                               │     │
│  │ - Free, no API key required                                 │     │
│  │ - 1 request/second rate limit (handled with debounce)      │     │
│  │ - Returns lat, lng, display_name, address details          │     │
│  └────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/services/geocodingService.ts` | Nominatim API integration service |

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/ui/AddressForm.tsx` | EDIT | Add geocoding button and handler |
| `src/components/ui/UnifiedAddressForm.tsx` | EDIT | Pass `showGeocoding` prop to AddressForm |
| `src/services/addressConfigService.ts` | EDIT | Add `showGeocoding` to field config |

---

## Implementation Details

### 1. Create Geocoding Service

**File:** `src/services/geocodingService.ts`

```typescript
/**
 * Geocoding Service
 * Uses OpenStreetMap Nominatim API for address geocoding
 * Free, no API key required, 1 request/second rate limit
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  confidence: 'high' | 'medium' | 'low';
  placeType: string;
}

export interface GeocodingResponse {
  success: boolean;
  data: GeocodingResult | null;
  error: string | null;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

class GeocodingService {
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 1100; // 1.1 seconds

  async geocodeAddress(address: {
    line1?: string;
    line2?: string;
    locality?: string;
    cityName?: string;
    district?: string;
    stateName?: string;
    pincode?: string;
    countryName?: string;
  }): Promise<GeocodingResponse> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();

    // Build query string
    const parts = [
      address.line1,
      address.line2,
      address.locality,
      address.cityName,
      address.district,
      address.stateName,
      address.pincode,
      address.countryName || 'India'
    ].filter(Boolean);

    if (parts.length < 2) {
      return { success: false, data: null, error: 'Insufficient address data' };
    }

    const query = parts.join(', ');

    try {
      const response = await fetch(
        `${NOMINATIM_BASE_URL}/search?` + new URLSearchParams({
          q: query,
          format: 'json',
          addressdetails: '1',
          limit: '1',
          countrycodes: 'in' // Restrict to India for accuracy
        }),
        {
          headers: {
            'User-Agent': 'LegalERP/1.0 (Contact: support@example.com)'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status}`);
      }

      const results = await response.json();

      if (!results || results.length === 0) {
        return { success: false, data: null, error: 'No results found' };
      }

      const result = results[0];
      const importance = parseFloat(result.importance || '0');

      return {
        success: true,
        data: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          displayName: result.display_name,
          confidence: importance > 0.6 ? 'high' : importance > 0.3 ? 'medium' : 'low',
          placeType: result.type || 'unknown'
        },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Geocoding failed'
      };
    }
  }

  buildMapUrl(lat: number, lng: number, provider: 'google' | 'osm' = 'google'): string {
    if (provider === 'osm') {
      return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=17`;
    }
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
}

export const geocodingService = new GeocodingService();
```

---

### 2. Update AddressForm to Include Geocoding Button

**File:** `src/components/ui/AddressForm.tsx`

**Add to interface (line ~19):**
```typescript
interface AddressFormProps {
  // ... existing props
  showGeocoding?: boolean; // NEW PROP
}
```

**Add state for geocoding (after line ~52):**
```typescript
const [geocodeLoading, setGeocodeLoading] = useState(false);
const [geocodeError, setGeocodeError] = useState<string | null>(null);
```

**Add geocoding handler (after line ~232):**
```typescript
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
```

**Update coordinates section (lines 750-788) to include Geocode button:**
```tsx
{/* Geocoding Section */}
{showGeocoding && (
  <div className="space-y-4">
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

    {/* Map Preview Link */}
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
```

---

### 3. Update UnifiedAddressForm to Pass showGeocoding

**File:** `src/components/ui/UnifiedAddressForm.tsx`

**Change line 69 from:**
```typescript
showGeocoding: _showGeocoding, // Reserved for future use
```

**To:**
```typescript
showGeocoding,
```

**Add to AddressForm props (line ~117):**
```typescript
return (
  <AddressForm
    value={normalizedValue}
    onChange={handleChange}
    module={legacyModule}
    showGSTIntegration={gstEnabled}
    showGeocoding={showGeocoding ?? moduleConfig.showGeocoding} // ADD THIS
    gstin={gstin}
    onGSTAddressSelect={onGSTAddressSelect ? handleGSTAddressSelect : undefined}
    disabled={isDisabled}
    required={isRequired}
    className={className}
  />
);
```

---

### 4. Update AddressForm Props Interface

**File:** `src/components/ui/AddressForm.tsx`

**Update AddressFormProps interface (line ~19):**
```typescript
interface AddressFormProps {
  value: EnhancedAddressData | AddressData;
  onChange: (address: EnhancedAddressData | AddressData) => void;
  disabled?: boolean;
  required?: boolean;
  module?: ModuleName;
  showGSTIntegration?: boolean;
  showGeocoding?: boolean;  // ADD THIS
  gstin?: string;
  onGSTAddressSelect?: (address: EnhancedAddressData) => void;
  className?: string;
}
```

**Destructure in component (line ~31):**
```typescript
export const AddressForm: React.FC<AddressFormProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  module = 'client',
  showGSTIntegration = false,
  showGeocoding = false,  // ADD THIS
  gstin,
  onGSTAddressSelect,
  className
}) => {
```

**Add required imports (line ~15):**
```typescript
import { Download, MapPin, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
```

---

## Usage Examples

### Enable Geocoding for Courts

```tsx
<UnifiedAddressForm
  value={courtData.address || {}}
  onChange={(address) => setCourtData(prev => ({ ...prev, address }))}
  module="court"
  mode="edit"
  showGeocoding={true}  // Enables the geocoding feature
/>
```

### Per-Module Default Configuration

To enable geocoding by default for specific modules, update `ADDRESS_MODULE_CONFIGS` in `src/types/address.ts`:

```typescript
court: {
  module: 'court',
  requiredFields: ['line1', 'cityName', 'stateName'],
  showGSTIntegration: false,
  showGeocoding: true,  // Enable by default for courts
  showAddressType: false,
  defaultSource: 'manual'
},
```

---

## Nominatim API Details

| Property | Value |
|----------|-------|
| **Base URL** | `https://nominatim.openstreetmap.org/search` |
| **Rate Limit** | 1 request/second |
| **API Key** | Not required (free) |
| **Response Format** | JSON |
| **Country Filter** | `countrycodes=in` (India) |

### Required Headers
```
User-Agent: LegalERP/1.0 (Contact: support@example.com)
```

### Response Example
```json
{
  "lat": "23.0225",
  "lon": "72.5714",
  "display_name": "Ahmedabad, Gujarat, India",
  "importance": 0.85,
  "type": "city"
}
```

---

## UI Preview

```text
┌─────────────────────────────────────────────────────────────────┐
│  Address Line 1 *                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 123 Main Street, Near Railway Station                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Address Line 2                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Building A, Floor 3                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  City              State              Pincode                   │
│  ┌──────────┐     ┌──────────┐       ┌──────────┐             │
│  │ Ahmedabad│     │ Gujarat  │       │ 380001   │             │
│  └──────────┘     └──────────┘       └──────────┘             │
│                                                                 │
│  ════════════════════════════════════════════════════════════  │
│                                                                 │
│  Location Coordinates                    [🗺️ Get Coordinates]  │
│                                                                 │
│  Latitude                      Longitude                        │
│  ┌────────────────┐           ┌────────────────┐               │
│  │ 23.0225        │           │ 72.5714        │               │
│  └────────────────┘           └────────────────┘               │
│                                                                 │
│  🔗 View on Google Maps | OpenStreetMap                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Safety Checklist

- Uses free Nominatim API (no API key required)
- Rate limiting built in (1 request/second)
- Feature is opt-in via `showGeocoding` prop
- No database changes required
- No breaking changes to existing forms
- Fallback to manual lat/lng entry if geocoding fails
- Works with existing `lat` and `lng` fields in `UnifiedAddress`

---

## Estimated Effort

| Task | Time |
|------|------|
| Create geocodingService.ts | ~15 min |
| Update AddressForm.tsx | ~20 min |
| Update UnifiedAddressForm.tsx | ~5 min |
| Testing | ~15 min |
| **Total** | **~55 min** |
