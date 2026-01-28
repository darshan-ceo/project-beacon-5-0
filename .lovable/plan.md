

# Day 4: Complete Unified Address Adoption

## Objective
Complete Unified Address Architecture adoption in `clientContactsService` and identify/mark deprecated duplicated address logic across other services.

---

## Current State Analysis

### clientContactsService.ts

| Area | Current Status | Gap |
|------|----------------|-----|
| Interface (line 57) | ✅ `address?: UnifiedAddress` | Complete |
| CreateContactRequest (line 85) | ✅ `address?: PartialAddress` | Complete |
| toClientContact (line 119) | ✅ Uses `parseDbAddress()` | Complete |
| **createContact (line 271-286)** | ❌ **Missing address serialization** | Needs fix |
| **updateContact (line 411-420)** | ❌ **Missing address handling** | Needs fix |
| **bulkCreateContacts (line 655-670)** | ❌ **Missing address handling** | Needs fix |

### Other Services Status

| Service | normalizeAddress | serializeAddress | validateAddress | parseDbAddress | Status |
|---------|------------------|------------------|-----------------|----------------|--------|
| clientsService.ts | ✅ | ✅ | ✅ | - | ✅ Complete |
| judgesService.ts | ✅ | ✅ | - | ✅ | ✅ Complete |
| employeesService.ts | ✅ | ✅ | ✅ | ✅ | ✅ Complete |
| courtsService.ts | ✅ | ✅ | - | ✅ | ✅ Complete |
| clientContactsService.ts | - | ❌ Missing | ❌ Missing | ✅ | ❌ Incomplete |

### Duplicated Logic to Deprecate

| Service | Method | Issue |
|---------|--------|-------|
| addressLookupService.ts | `validateAddress()` (line 306) | Custom validation logic |
| addressLookupService.ts | `validatePincode()` (line 301) | Inline regex check |
| addressMasterService.ts | `validateAddress()` (line 415) | Already marked `@deprecated` ✅ |

---

## Task 1: Complete clientContactsService Address Handling

### 1.1 Add Required Imports (Line 9)

**Before:**
```typescript
import { parseDbAddress } from '@/utils/addressUtils';
```

**After:**
```typescript
import { 
  parseDbAddress, 
  serializeAddress, 
  validateAddress 
} from '@/utils/addressUtils';
```

### 1.2 Add Address Validation in createContact (After line 268)

Add address validation before the try block:
```typescript
// Validate address using unified architecture
if (migratedContact.address) {
  const addressValidation = validateAddress(migratedContact.address, 'contact');
  if (!addressValidation.isValid) {
    return {
      success: false,
      error: `Address validation failed: ${addressValidation.errors.map(e => e.message).join(', ')}`,
      data: null
    };
  }
}
```

### 1.3 Add Address Serialization in createContact (Line 271-286)

**Before:**
```typescript
const insertData = {
  tenant_id: tenantId,
  client_id: clientId || null,
  name: migratedContact.name,
  designation: migratedContact.designation || null,
  emails: JSON.parse(JSON.stringify(migratedContact.emails || [])),
  phones: JSON.parse(JSON.stringify(migratedContact.phones || [])),
  roles: migratedContact.roles || [],
  is_primary: migratedContact.isPrimary || false,
  is_active: true,
  source: 'manual',
  notes: migratedContact.notes || null,
  owner_user_id: user.id,
  data_scope: contact.dataScope || 'TEAM'
};
```

**After:**
```typescript
const insertData = {
  tenant_id: tenantId,
  client_id: clientId || null,
  name: migratedContact.name,
  designation: migratedContact.designation || null,
  emails: JSON.parse(JSON.stringify(migratedContact.emails || [])),
  phones: JSON.parse(JSON.stringify(migratedContact.phones || [])),
  roles: migratedContact.roles || [],
  is_primary: migratedContact.isPrimary || false,
  is_active: true,
  source: 'manual',
  notes: migratedContact.notes || null,
  owner_user_id: user.id,
  data_scope: contact.dataScope || 'TEAM',
  // Unified Address Architecture: serialize address to JSONB
  address: migratedContact.address ? serializeAddress(migratedContact.address) : null
};
```

### 1.4 Add Address Handling in updateContact (Lines 411-420)

**Before:**
```typescript
const updateData: any = {};
if (updates.name !== undefined) updateData.name = updates.name;
if (updates.designation !== undefined) updateData.designation = updates.designation;
if (updates.emails !== undefined) updateData.emails = JSON.parse(JSON.stringify(updates.emails));
if (updates.phones !== undefined) updateData.phones = JSON.parse(JSON.stringify(updates.phones));
if (updates.roles !== undefined) updateData.roles = updates.roles;
if (updates.isPrimary !== undefined) updateData.is_primary = updates.isPrimary;
if (updates.notes !== undefined) updateData.notes = updates.notes;
if (updates.dataScope !== undefined) updateData.data_scope = updates.dataScope;
if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
```

**After:**
```typescript
const updateData: any = {};
if (updates.name !== undefined) updateData.name = updates.name;
if (updates.designation !== undefined) updateData.designation = updates.designation;
if (updates.emails !== undefined) updateData.emails = JSON.parse(JSON.stringify(updates.emails));
if (updates.phones !== undefined) updateData.phones = JSON.parse(JSON.stringify(updates.phones));
if (updates.roles !== undefined) updateData.roles = updates.roles;
if (updates.isPrimary !== undefined) updateData.is_primary = updates.isPrimary;
if (updates.notes !== undefined) updateData.notes = updates.notes;
if (updates.dataScope !== undefined) updateData.data_scope = updates.dataScope;
if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

// Unified Address Architecture: validate and serialize address
if (updates.address !== undefined) {
  if (updates.address) {
    const addressValidation = validateAddress(updates.address, 'contact');
    if (!addressValidation.isValid) {
      return {
        success: false,
        error: `Address validation failed: ${addressValidation.errors.map(e => e.message).join(', ')}`,
        data: null
      };
    }
    updateData.address = serializeAddress(updates.address);
  } else {
    updateData.address = null;
  }
}
```

### 1.5 Add Address Handling in bulkCreateContacts (Lines 656-670)

**Before:**
```typescript
const insertData = contacts.map(contact => {
  const migrated = this.migrateContactData(contact);
  return {
    tenant_id: tenantId,
    client_id: clientId,
    name: migrated.name,
    designation: migrated.designation || null,
    emails: JSON.parse(JSON.stringify(migrated.emails || [])),
    phones: JSON.parse(JSON.stringify(migrated.phones || [])),
    roles: migrated.roles || [],
    is_primary: migrated.isPrimary || false,
    is_active: true,
    source: 'imported',
    notes: migrated.notes || null
  };
});
```

**After:**
```typescript
const insertData = contacts.map(contact => {
  const migrated = this.migrateContactData(contact);
  return {
    tenant_id: tenantId,
    client_id: clientId,
    name: migrated.name,
    designation: migrated.designation || null,
    emails: JSON.parse(JSON.stringify(migrated.emails || [])),
    phones: JSON.parse(JSON.stringify(migrated.phones || [])),
    roles: migrated.roles || [],
    is_primary: migrated.isPrimary || false,
    is_active: true,
    source: 'imported',
    notes: migrated.notes || null,
    // Unified Address Architecture: serialize address to JSONB
    address: migrated.address ? serializeAddress(migrated.address) : null
  };
});
```

---

## Task 2: Deprecate Duplicated Logic in addressLookupService

### 2.1 Mark validatePincode as Deprecated (Lines 301-304)

**Before:**
```typescript
async validatePincode(pincode: string): Promise<boolean> {
  const pincodeRegex = /^[0-9]{6}$/;
  return pincodeRegex.test(pincode);
}
```

**After:**
```typescript
/**
 * @deprecated Use validateAddress from @/utils/addressUtils.ts instead
 */
async validatePincode(pincode: string): Promise<boolean> {
  const pincodeRegex = /^[0-9]{6}$/;
  return pincodeRegex.test(pincode);
}
```

### 2.2 Mark validateAddress as Deprecated (Lines 306-335)

**Before:**
```typescript
async validateAddress(address: AddressData): Promise<{ isValid: boolean; errors: string[] }> {
```

**After:**
```typescript
/**
 * @deprecated Use validateAddress from @/utils/addressUtils.ts instead
 */
async validateAddress(address: AddressData): Promise<{ isValid: boolean; errors: string[] }> {
```

---

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `src/services/clientContactsService.ts` | EDIT | Add validate + serialize for address in create/update/bulk flows |
| `src/services/addressLookupService.ts` | EDIT | Add @deprecated JSDoc to validatePincode and validateAddress |

---

## Diff Summary

### clientContactsService.ts
```diff
// Line 9 - Imports
- import { parseDbAddress } from '@/utils/addressUtils';
+ import { 
+   parseDbAddress, 
+   serializeAddress, 
+   validateAddress 
+ } from '@/utils/addressUtils';

// Line 268 - Before createContact try block
+ // Validate address using unified architecture
+ if (migratedContact.address) {
+   const addressValidation = validateAddress(migratedContact.address, 'contact');
+   if (!addressValidation.isValid) {
+     return {
+       success: false,
+       error: `Address validation failed: ${addressValidation.errors.map(e => e.message).join(', ')}`,
+       data: null
+     };
+   }
+ }

// Line 286 - Add to insertData
    data_scope: contact.dataScope || 'TEAM'
+   // Unified Address Architecture
+   address: migratedContact.address ? serializeAddress(migratedContact.address) : null

// Line 420 - Add after isActive handling
+ if (updates.address !== undefined) {
+   if (updates.address) {
+     const addressValidation = validateAddress(updates.address, 'contact');
+     if (!addressValidation.isValid) {
+       return {
+         success: false,
+         error: `Address validation failed: ${addressValidation.errors.map(e => e.message).join(', ')}`,
+         data: null
+       };
+     }
+     updateData.address = serializeAddress(updates.address);
+   } else {
+     updateData.address = null;
+   }
+ }

// Line 670 - Add to bulk insert data
    notes: migrated.notes || null
+   address: migrated.address ? serializeAddress(migrated.address) : null
```

### addressLookupService.ts
```diff
// Line 301
+ /**
+  * @deprecated Use validateAddress from @/utils/addressUtils.ts instead
+  */
  async validatePincode(pincode: string): Promise<boolean> {

// Line 306
+ /**
+  * @deprecated Use validateAddress from @/utils/addressUtils.ts instead
+  */
  async validateAddress(address: AddressData): Promise<{ isValid: boolean; errors: string[] }> {
```

---

## Final Compliance Summary

### Services Now Using addressUtils

| Service | Status | Notes |
|---------|--------|-------|
| clientsService.ts | ✅ Complete | Day 2 - Full compliance |
| judgesService.ts | ✅ Complete | Day 3 - Full compliance |
| employeesService.ts | ✅ Complete | Day 3 - Full compliance with legacy fallback |
| courtsService.ts | ✅ Complete | Pre-existing compliance |
| clientContactsService.ts | ✅ Complete | Day 4 - After this update |

### Deprecated Methods (Kept for Backward Compatibility)

| Service | Method | Reason |
|---------|--------|--------|
| clientsService.ts | `validatePincode()` | Used by signatory forms |
| addressLookupService.ts | `validatePincode()` | Legacy callers |
| addressLookupService.ts | `validateAddress()` | Legacy callers |
| addressMasterService.ts | `validateAddress()` | Already deprecated |

---

## Safety Checklist

- [ ] No UI component changes
- [ ] No database schema changes
- [ ] No RLS policy changes
- [ ] addressUtils is single source of truth
- [ ] Legacy data continues to render via parseDbAddress
- [ ] Backward compatibility maintained via @deprecated markers

---

## Estimated Effort
- clientContactsService refactoring: ~20 minutes
- addressLookupService deprecation: ~5 minutes
- Testing: ~10 minutes
- **Total: ~35 minutes**

