
# Fix: Legal Forum Address Persistence - Complete Root Cause Analysis and Solution

## Problem Summary

Both the existing **Address** field and the new **Residence Address** field lose data after save. Database investigation revealed:

| Field | Database Value | Expected | Issue |
|-------|---------------|----------|-------|
| `address` (TEXT) | Has JSON data correctly | JSON string | Working for CREATE |
| `address_jsonb` (JSONB) | Empty/incomplete structure | Full address | Wrong source data |
| `residence_address` (JSONB) | `nil` | Full address | **Silently dropped** |

## Root Cause Analysis

### Root Cause 1: `residence_address` Missing from SupabaseAdapter Whitelist

**File:** `src/data/adapters/SupabaseAdapter.ts` line 2036

```typescript
const validCourtFields = ['id', 'tenant_id', 'name', 'code', 'type', 'level', 'city', 'state', 'jurisdiction', 'address', 'address_jsonb', 'created_by', 'created_at', 'updated_at', 'established_year', 'bench_location', 'tax_jurisdiction', 'officer_designation', 'phone', 'email', 'status'];
```

**Problem:** `residence_address` is NOT in this whitelist, so it gets deleted during normalization and never reaches the database.

### Root Cause 2: Missing Stringification for `address` and `residence_address`

The normalization for courts only stringifies `address_jsonb`:

```typescript
if (normalized.address_jsonb && typeof normalized.address_jsonb === 'object') {
  normalized.address_jsonb = JSON.stringify(normalized.address_jsonb);
}
```

Missing for both `address` and `residence_address` JSONB fields.

### Root Cause 3: Wrong Data Source in courtsService

In `courtsService.ts` update method (line 127-141):

```typescript
const rawAddress = (updates as any).addressJsonb || (updates as any).address_jsonb || {};
const unifiedAddress: UnifiedAddress = normalizeAddress({
  ...rawAddress,
  line1: rawAddress.line1 || (typeof updates.address === 'string' ? updates.address : '') || '',
  // ...
});
```

**Problem:** This checks `updates.addressJsonb` first (empty), then tries to extract `line1` only if `updates.address` is a string. But the form sends `updates.address` as an **object**, so `line1` becomes empty string!

## Solution

### Fix 1: Add `residence_address` to SupabaseAdapter Whitelist

**File:** `src/data/adapters/SupabaseAdapter.ts`

Update line 2036 to include `residence_address`:

```typescript
const validCourtFields = [
  'id', 'tenant_id', 'name', 'code', 'type', 'level', 'city', 'state', 
  'jurisdiction', 'address', 'address_jsonb', 'residence_address',
  'created_by', 'created_at', 'updated_at', 'established_year', 
  'bench_location', 'tax_jurisdiction', 'officer_designation', 
  'phone', 'email', 'status'
];
```

### Fix 2: Add Stringification for All JSONB Address Fields

**File:** `src/data/adapters/SupabaseAdapter.ts`

In the `case 'courts':` section, add stringification for all JSONB fields:

```typescript
case 'courts':
  // ... existing field mappings ...
  
  // Stringify JSONB fields before sending to Supabase
  if (normalized.address_jsonb && typeof normalized.address_jsonb === 'object') {
    normalized.address_jsonb = JSON.stringify(normalized.address_jsonb);
  }
  if (normalized.residence_address && typeof normalized.residence_address === 'object') {
    normalized.residence_address = JSON.stringify(normalized.residence_address);
  }
  // Also stringify 'address' if it's an object (for TEXT column compatibility)
  if (normalized.address && typeof normalized.address === 'object') {
    normalized.address = JSON.stringify(normalized.address);
  }
  
  // Updated whitelist with residence_address
  const validCourtFields = [..., 'residence_address'];
```

### Fix 3: Correct Data Source in courtsService

**File:** `src/services/courtsService.ts`

In the `update` method, extract address data correctly from the object:

```typescript
// Build unified address for JSONB storage if address-related fields are updated
let addressJsonb: string | undefined;
if (updates.address || updates.city || (updates as any).state) {
  // The form sends address as EnhancedAddressData object, NOT addressJsonb
  const addressData = typeof updates.address === 'object' ? updates.address : {};
  
  const unifiedAddress: UnifiedAddress = normalizeAddress({
    ...addressData,
    // Ensure cityName/stateName are populated from form's city field too
    cityName: (addressData as any).cityName || updates.city || '',
    stateName: (addressData as any).stateName || (updates as any).state || '',
    source: 'edited'
  });
  addressJsonb = serializeAddress(unifiedAddress);
}
```

Apply the same fix to the `create` method.

### Fix 4: Ensure residenceAddress is Properly Stringified in courtsService

Both `create` and `update` methods already have:
```typescript
residence_address: (normalizedData as any).residenceAddress 
  ? JSON.stringify((normalizedData as any).residenceAddress) 
  : null,
```

This is correct, but the SupabaseAdapter strips it before it reaches the database due to the whitelist issue.

## Files to Modify

| File | Changes |
|------|---------|
| `src/data/adapters/SupabaseAdapter.ts` | Add `residence_address` to whitelist, add stringification for `address` and `residence_address` |
| `src/services/courtsService.ts` | Fix address data extraction in create/update methods |

## Detailed Code Changes

### 1. SupabaseAdapter.ts - Courts Normalization (lines 2010-2040)

```typescript
case 'courts':
  // Map camelCase fields to snake_case
  if (normalized.establishedYear && !normalized.established_year) normalized.established_year = normalized.establishedYear;
  if (normalized.createdAt && !normalized.created_at) normalized.created_at = normalized.createdAt;
  if (normalized.updatedAt && !normalized.updated_at) normalized.updated_at = normalized.updatedAt;
  if (normalized.createdBy && !normalized.created_by) normalized.created_by = normalized.createdBy;
  if (normalized.benchLocation && !normalized.bench_location) normalized.bench_location = normalized.benchLocation;
  if (normalized.taxJurisdiction && !normalized.tax_jurisdiction) normalized.tax_jurisdiction = normalized.taxJurisdiction;
  if (normalized.officerDesignation && !normalized.officer_designation) normalized.officer_designation = normalized.officerDesignation;
  // Map residenceAddress -> residence_address
  if (normalized.residenceAddress !== undefined && normalized.residence_address === undefined) {
    normalized.residence_address = normalized.residenceAddress;
  }
  
  // Delete camelCase/UI-only fields
  delete normalized.activeCases;
  delete normalized.establishedYear;
  delete normalized.createdAt;
  delete normalized.updatedAt;
  delete normalized.createdBy;
  delete normalized.benchLocation;
  delete normalized.taxJurisdiction;
  delete normalized.officerDesignation;
  delete normalized.residenceAddress; // Delete after mapping
  
  // Stringify JSONB fields before sending to Supabase
  if (normalized.address_jsonb && typeof normalized.address_jsonb === 'object') {
    normalized.address_jsonb = JSON.stringify(normalized.address_jsonb);
  }
  if (normalized.residence_address && typeof normalized.residence_address === 'object') {
    normalized.residence_address = JSON.stringify(normalized.residence_address);
  }
  // Also stringify 'address' if it's an object (TEXT column stores JSON string)
  if (normalized.address && typeof normalized.address === 'object') {
    normalized.address = JSON.stringify(normalized.address);
  }
  
  // Whitelist with residence_address added
  const validCourtFields = [
    'id', 'tenant_id', 'name', 'code', 'type', 'level', 'city', 'state', 
    'jurisdiction', 'address', 'address_jsonb', 'residence_address',
    'created_by', 'created_at', 'updated_at', 'established_year', 
    'bench_location', 'tax_jurisdiction', 'officer_designation', 
    'phone', 'email', 'status'
  ];
  Object.keys(normalized).forEach(key => {
    if (!validCourtFields.includes(key)) delete normalized[key];
  });
  break;
```

### 2. courtsService.ts - Fix Create Method (lines 61-72)

```typescript
// Build unified address for JSONB storage
// Extract from the address object passed by the form (EnhancedAddressData)
const addressData = typeof normalizedData.address === 'object' ? normalizedData.address : {};
const unifiedAddress: UnifiedAddress = normalizeAddress({
  line1: (addressData as any).line1 || '',
  line2: (addressData as any).line2 || '',
  pincode: (addressData as any).pincode || '',
  locality: (addressData as any).locality || '',
  district: (addressData as any).district || '',
  cityId: (addressData as any).cityId || '',
  cityName: (addressData as any).cityName || normalizedData.city || '',
  stateId: (addressData as any).stateId || '',
  stateName: (addressData as any).stateName || (normalizedData as any).state || '',
  countryId: (addressData as any).countryId || 'IN',
  source: 'manual'
});
```

### 3. courtsService.ts - Fix Update Method (lines 127-141)

```typescript
// Build unified address for JSONB storage if address-related fields are updated
let addressJsonb: string | undefined;
if (updates.address || updates.city || (updates as any).state) {
  // Extract from the address object passed by the form (EnhancedAddressData)
  const addressData = typeof updates.address === 'object' ? updates.address : {};
  const unifiedAddress: UnifiedAddress = normalizeAddress({
    line1: (addressData as any).line1 || '',
    line2: (addressData as any).line2 || '',
    pincode: (addressData as any).pincode || '',
    locality: (addressData as any).locality || '',
    district: (addressData as any).district || '',
    cityId: (addressData as any).cityId || '',
    cityName: (addressData as any).cityName || updates.city || '',
    stateId: (addressData as any).stateId || '',
    stateName: (addressData as any).stateName || (updates as any).state || '',
    countryId: (addressData as any).countryId || 'IN',
    source: 'edited'
  });
  addressJsonb = serializeAddress(unifiedAddress);
}
```

## Why This Will Work

1. **Whitelist Fix**: `residence_address` will no longer be stripped during normalization
2. **Stringification Fix**: Both `address` and `residence_address` will be properly converted to JSON strings before database insert/update
3. **Data Source Fix**: Address fields will be extracted from the actual form object, not from empty `addressJsonb`

## Testing Checklist

1. Create new Legal Forum with Residence Address filled
2. Save and verify `residence_address` is not `nil` in database
3. Reopen form and verify Residence Address is populated
4. Edit and save - verify data persists
5. Test existing Address field with same flow
6. Verify both addresses can be saved independently

## Risk Assessment

- **Low Risk**: Changes are additive (adding to whitelist, adding stringification)
- **No Breaking Changes**: Existing data patterns are preserved
- **Follows Established Pattern**: Same approach used for judges table (which works)
