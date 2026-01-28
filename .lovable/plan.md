
# Day 2: Refactor clientsService to Unified Address Architecture

## Objective
Refactor `clientsService.ts` to fully comply with Unified Address Architecture by routing all address handling through `addressUtils`.

---

## Current Issues Found

| Line(s) | Issue | Violation |
|---------|-------|-----------|
| 60-73 | `validatePincode()` duplicates addressUtils logic | Inline validation |
| 163-168 | Uses `clientsService.validatePincode()` for address validation | Should use `validateAddress()` |
| 218 | `JSON.stringify(clientData.address)` | Direct JSON manipulation |
| 240-246 | Manual address object construction | Should use `normalizeAddress()` |
| 328 | `JSON.stringify(updates.address)` | Direct JSON manipulation |
| 563-573 | Legacy migration creates address manually | Should use `createAddressFromLegacy()` |

---

## Tasks

### Task 1: Add Required Imports

Add imports at top of file:
```typescript
import { 
  normalizeAddress, 
  serializeAddress, 
  validateAddress,
  createAddressFromLegacy,
  extractLegacyFields
} from '@/utils/addressUtils';
import { PartialAddress, UnifiedAddress } from '@/types/address';
```

---

### Task 2: Refactor CREATE Flow (Lines 139-284)

**Before (Line 163-168):**
```typescript
if (clientData.address && typeof clientData.address === 'object' && clientData.address.pincode) {
  const pincodeValidation = clientsService.validatePincode(clientData.address.pincode);
  if (!pincodeValidation.isValid) {
    validationErrors.push(...pincodeValidation.errors);
  }
}
```

**After:**
```typescript
if (clientData.address && typeof clientData.address === 'object') {
  const addressValidation = validateAddress(clientData.address as PartialAddress, 'client');
  if (!addressValidation.isValid) {
    addressValidation.errors.forEach(err => validationErrors.push(err.message));
  }
}
```

**Before (Line 218):**
```typescript
address: clientData.address ? JSON.stringify(clientData.address) : null,
```

**After:**
```typescript
address: clientData.address ? serializeAddress(clientData.address as PartialAddress) : null,
```

**Before (Lines 240-246):**
```typescript
address: clientData.address || {
  line1: '',
  city: savedClient.city || clientData.address?.city || '',
  state: savedClient.state || clientData.address?.state || '',
  pincode: '',
  country: 'India'
},
```

**After:**
```typescript
address: clientData.address 
  ? normalizeAddress(clientData.address) 
  : normalizeAddress({ 
      cityName: savedClient.city || '', 
      stateName: savedClient.state || '' 
    }),
```

---

### Task 3: Refactor UPDATE Flow (Lines 286-364)

**Before (Line 328):**
```typescript
if (updates.address !== undefined) supabaseUpdates.address = JSON.stringify(updates.address);
```

**After:**
```typescript
if (updates.address !== undefined) {
  // Validate address before serialization
  if (updates.address && typeof updates.address === 'object') {
    const addressValidation = validateAddress(updates.address as PartialAddress, 'client');
    if (!addressValidation.isValid) {
      throw new Error(addressValidation.errors.map(e => e.message).join(', '));
    }
  }
  supabaseUpdates.address = updates.address ? serializeAddress(updates.address as PartialAddress) : null;
}
```

---

### Task 4: Refactor Migration Utility (Lines 552-616)

**Before (Lines 562-573):**
```typescript
if (typeof client.address === 'string') {
  updates.address = {
    line1: client.address,
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  };
  updates.needsAddressReview = true;
  needsUpdate = true;
  flagged++;
}
```

**After:**
```typescript
if (typeof client.address === 'string') {
  updates.address = createAddressFromLegacy(client.address, null, null);
  updates.needsAddressReview = true;
  needsUpdate = true;
  flagged++;
}
```

---

### Task 5: Remove Duplicate validatePincode (Lines 60-73)

Keep the function for backward compatibility but mark as deprecated and delegate to addressUtils:
```typescript
/**
 * @deprecated Use validateAddress from addressUtils instead
 */
validatePincode: (pincode: string): ValidationResult => {
  if (!pincode) {
    return { isValid: false, errors: ['Pincode is required'] };
  }
  
  if (!/^\d{6}$/.test(pincode.trim())) {
    return {
      isValid: false,
      errors: ['Pincode must be exactly 6 digits']
    };
  }
  
  return { isValid: true, errors: [] };
},
```

This function is still used elsewhere (signatory forms), so we keep it but add deprecation notice.

---

## Files Modified

| File | Change Type |
|------|-------------|
| `src/services/clientsService.ts` | EDIT - Refactor address handling |

---

## Diff Preview (Key Changes)

```diff
// IMPORTS
+ import { 
+   normalizeAddress, 
+   serializeAddress, 
+   validateAddress,
+   createAddressFromLegacy
+ } from '@/utils/addressUtils';
+ import { PartialAddress } from '@/types/address';

// CREATE - Validation (Line 163)
- if (clientData.address && typeof clientData.address === 'object' && clientData.address.pincode) {
-   const pincodeValidation = clientsService.validatePincode(clientData.address.pincode);
-   if (!pincodeValidation.isValid) {
-     validationErrors.push(...pincodeValidation.errors);
-   }
- }
+ if (clientData.address && typeof clientData.address === 'object') {
+   const addressValidation = validateAddress(clientData.address as PartialAddress, 'client');
+   if (!addressValidation.isValid) {
+     addressValidation.errors.forEach(err => validationErrors.push(err.message));
+   }
+ }

// CREATE - Serialize (Line 218)
- address: clientData.address ? JSON.stringify(clientData.address) : null,
+ address: clientData.address ? serializeAddress(clientData.address as PartialAddress) : null,

// CREATE - Normalize response (Line 240)
- address: clientData.address || {
-   line1: '',
-   city: savedClient.city || clientData.address?.city || '',
-   state: savedClient.state || clientData.address?.state || '',
-   pincode: '',
-   country: 'India'
- },
+ address: clientData.address 
+   ? normalizeAddress(clientData.address) 
+   : normalizeAddress({ cityName: savedClient.city || '', stateName: savedClient.state || '' }),

// UPDATE - Serialize (Line 328)
- if (updates.address !== undefined) supabaseUpdates.address = JSON.stringify(updates.address);
+ if (updates.address !== undefined) {
+   if (updates.address && typeof updates.address === 'object') {
+     const addressValidation = validateAddress(updates.address as PartialAddress, 'client');
+     if (!addressValidation.isValid) {
+       throw new Error(addressValidation.errors.map(e => e.message).join(', '));
+     }
+   }
+   supabaseUpdates.address = updates.address ? serializeAddress(updates.address as PartialAddress) : null;
+ }

// MIGRATION - Legacy address (Line 562)
- updates.address = {
-   line1: client.address,
-   city: '',
-   state: '',
-   pincode: '',
-   country: 'India'
- };
+ updates.address = createAddressFromLegacy(client.address, null, null);
```

---

## Backward Compatibility Preserved

- Legacy `Address` interface in `AppStateContext` unchanged
- `EnhancedAddressData` in `addressMasterService` unchanged (adapter exists)
- GST integration via `gstAddressMapper` unchanged (works through AddressForm)
- `validatePincode` kept with deprecation notice
- Legacy string addresses still parse correctly via `normalizeAddress()`

---

## GST Autofill Confirmation

GST autofill flow is NOT affected:
1. User enters GSTIN in `AddressForm.tsx`
2. `AddressForm` calls `gstPublicService.getGSTInfo()`
3. Response mapped via `gstAddressMapper.mapGSTTaxpayerToAddress()`
4. Result populates form fields as `EnhancedAddressData`
5. On save, data flows to `clientsService.create()` where it will now use `serializeAddress()`

The `normalizeAddress()` utility already handles `EnhancedAddressData` field mappings (line1, cityName, stateName, stateCode, etc.), so GST data flows through correctly.

---

## Safety Checklist

- No UI component changes
- No RLS policy changes
- No database schema changes
- Backward compatible with legacy string addresses
- GST integration behavior unchanged
- Validation now uses centralized module-aware logic

---

## Estimated Effort
~20 minutes implementation + testing
