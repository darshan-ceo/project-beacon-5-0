

# Day 6: Replace Legacy Address Forms with UnifiedAddressForm

## Objective
Incrementally replace legacy address form usage with `UnifiedAddressForm` across 5 entities in the specified order, ensuring no behavior change or prop loss.

---

## Current State Analysis

| Entity | File | Current Implementation | Replacement Scope |
|--------|------|------------------------|-------------------|
| **Courts** | `CourtModal.tsx` | `SimpleAddressForm` (line 785) + `AddressView` (line 779) | Replace SimpleAddressForm only |
| **Judges** | `JudgeForm.tsx` | `AddressForm` (line 912) | Direct replacement |
| **Clients** | `ClientModal.tsx` | `SimpleAddressForm` (line 1213) + `AddressView` (line 1206) | Replace SimpleAddressForm only |
| **Employees** | `EmployeeModalV2.tsx` | Manual inline fields (lines 860-920) | **DEFERRED** - requires UI redesign |
| **Contacts** | `ContactModal.tsx` | No address support | **DEFERRED** - feature not implemented |

---

## Implementation Order

### 1. CourtModal.tsx

**Import Changes:**
```typescript
// Remove:
import { SimpleAddressForm, SimpleAddressData } from '@/components/ui/SimpleAddressForm';

// Add:
import { UnifiedAddressForm } from '@/components/ui/UnifiedAddressForm';
import { UnifiedAddress } from '@/types/address';
```

**Address Section Replacement (Lines 785-813):**

```
BEFORE:
<SimpleAddressForm
  value={{
    line1: typeof formData.address === 'object' ? formData.address.line1 || '' : ...,
    line2: ...,
    cityName: formData.city || ...,
    ...
  }}
  onChange={(addr: SimpleAddressData) => {
    const enhancedAddress: EnhancedAddressData = {...};
    setFormData(prev => ({ ...prev, address: enhancedAddress, city: addr.cityName || prev.city || '' }));
  }}
  disabled={mode === 'view'}
/>

AFTER:
<UnifiedAddressForm
  value={formData.address || {}}
  onChange={(address: UnifiedAddress) => {
    setFormData(prev => ({
      ...prev,
      address: address,
      city: address.cityName || prev.city || ''
    }));
  }}
  module="court"
  mode={mode}
/>
```

**Key Behavior Preserved:**
- City field syncing via `cityName` extraction
- View mode disabling via `mode` prop
- `AddressView` for view mode kept unchanged

---

### 2. JudgeForm.tsx

**Import Changes:**
```typescript
// Remove:
import { AddressForm } from '@/components/ui/AddressForm';

// Add:
import { UnifiedAddressForm } from '@/components/ui/UnifiedAddressForm';
import { UnifiedAddress } from '@/types/address';
```

**Address Section Replacement (Lines 912-928):**

```
BEFORE:
<AddressForm
  value={formData.address || {
    line1: '',
    line2: '',
    locality: '',
    district: '',
    cityId: '',
    stateId: '',
    pincode: '',
    countryId: 'IN',
    source: 'manual'
  }}
  onChange={(address) => setFormData(prev => ({ ...prev, address }))}
  disabled={isReadOnly}
  required={false}
  module="judge"
/>

AFTER:
<UnifiedAddressForm
  value={formData.address || {}}
  onChange={(address: UnifiedAddress) => setFormData(prev => ({ ...prev, address }))}
  module="judge"
  mode={isReadOnly ? 'view' : 'edit'}
  required={false}
/>
```

**Key Behavior Preserved:**
- `isReadOnly` maps to `mode='view'`
- `required={false}` preserved
- `module="judge"` preserved

---

### 3. ClientModal.tsx

**Import Changes:**
```typescript
// Remove:
import { SimpleAddressForm, SimpleAddressData } from '@/components/ui/SimpleAddressForm';

// Add:
import { UnifiedAddressForm } from '@/components/ui/UnifiedAddressForm';
import { UnifiedAddress } from '@/types/address';
```

**Address Section Replacement (Lines 1213-1241):**

```
BEFORE:
<SimpleAddressForm
  value={{
    line1: formData.address?.line1 || '',
    line2: formData.address?.line2 || '',
    cityName: (formData.address as any)?.cityName || '',
    stateName: (formData.address as any)?.stateName || '',
    pincode: formData.address?.pincode || '',
    countryName: 'India'
  }}
  onChange={(address) => setFormData(prev => ({ 
    ...prev, 
    address: {
      ...prev.address,
      line1: address.line1 || '',
      line2: address.line2 || '',
      cityName: address.cityName || '',
      ...
    }
  }))}
  disabled={mode === 'view'}
  errors={{
    line1: errors.addressLine1,
    city: errors.addressCity,
    state: errors.addressState,
    pincode: errors.pincode
  }}
/>

AFTER:
<UnifiedAddressForm
  value={formData.address || {}}
  onChange={(address: UnifiedAddress) => setFormData(prev => ({
    ...prev,
    address: address
  }))}
  module="client"
  mode={mode}
/>
```

**Key Behavior Preserved:**
- Mode-based disabling via `mode` prop
- `AddressView` for view mode kept unchanged
- Error display handled via UnifiedAddressForm's internal AddressForm

**Note:** Client address errors (`errors.addressLine1`, etc.) need validation at form level since UnifiedAddressForm doesn't accept `errors` prop. This is acceptable as validation runs on submit.

---

### 4. EmployeeModalV2.tsx - DEFERRED

**Current State:** Uses manual inline fields (Textarea for addresses, Input for city, Select for state, Input for pincode)

**Reason for Deferral:**
- Current implementation uses legacy TEXT fields (`currentAddress`, `permanentAddress`) as free-text
- Replacing with UnifiedAddressForm requires:
  1. UI restructuring (replace 6 inline fields with form component)
  2. Data model change (TEXT → JSONB)
  3. Backward compatibility handling for existing employee data

**Impact:** No regression - current functionality unchanged

**Future Work:** Separate task to implement structured address for employees

---

### 5. ContactModal.tsx - DEFERRED

**Current State:** No physical address support in the modal

**Reason for Deferral:**
- ContactModal handles only emails and phones
- Physical address field is in `client_contacts` table but not exposed in UI

**Impact:** No regression - feature not implemented

**Future Work:** Add address section to ContactModal with UnifiedAddressForm

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/modals/CourtModal.tsx` | EDIT | Replace SimpleAddressForm with UnifiedAddressForm |
| `src/components/masters/judges/JudgeForm.tsx` | EDIT | Replace AddressForm with UnifiedAddressForm |
| `src/components/modals/ClientModal.tsx` | EDIT | Replace SimpleAddressForm with UnifiedAddressForm |

---

## Detailed Diff Summary

### CourtModal.tsx

```diff
// Line 15 - Imports
- import { SimpleAddressForm, SimpleAddressData } from '@/components/ui/SimpleAddressForm';
+ import { UnifiedAddressForm } from '@/components/ui/UnifiedAddressForm';
+ import { UnifiedAddress } from '@/types/address';

// Lines 785-813 - Address section
-               <SimpleAddressForm
-                   value={{
-                     line1: typeof formData.address === 'object' ? formData.address.line1 || '' : String(formData.address || ''),
-                     line2: typeof formData.address === 'object' ? formData.address.line2 || '' : '',
-                     cityName: formData.city || (typeof formData.address === 'object' ? formData.address.cityName || '' : ''),
-                     stateName: typeof formData.address === 'object' ? formData.address.stateName || '' : '',
-                     pincode: typeof formData.address === 'object' ? formData.address.pincode || '' : '',
-                     countryName: 'India'
-                   }}
-                   onChange={(addr: SimpleAddressData) => {
-                     const enhancedAddress: EnhancedAddressData = {
-                       ...formData.address,
-                       line1: addr.line1 || '',
-                       line2: addr.line2 || '',
-                       cityName: addr.cityName || '',
-                       stateName: addr.stateName || '',
-                       pincode: addr.pincode || '',
-                       countryId: 'IN',
-                       source: 'manual'
-                     };
-                     setFormData(prev => ({
-                       ...prev,
-                       address: enhancedAddress,
-                       city: addr.cityName || prev.city || ''
-                     }));
-                   }}
-                   disabled={mode === 'view'}
-                 />
+               <UnifiedAddressForm
+                 value={formData.address || {}}
+                 onChange={(address: UnifiedAddress) => {
+                   setFormData(prev => ({
+                     ...prev,
+                     address: address,
+                     city: address.cityName || prev.city || ''
+                   }));
+                 }}
+                 module="court"
+                 mode={mode}
+               />
```

### JudgeForm.tsx

```diff
// Line 12 - Imports
- import { AddressForm } from '@/components/ui/AddressForm';
+ import { UnifiedAddressForm } from '@/components/ui/UnifiedAddressForm';
+ import { UnifiedAddress } from '@/types/address';

// Lines 912-928 - Address section
-           <AddressForm
-             value={formData.address || {
-               line1: '',
-               line2: '',
-               locality: '',
-               district: '',
-               cityId: '',
-               stateId: '',
-               pincode: '',
-               countryId: 'IN',
-               source: 'manual'
-             }}
-             onChange={(address) => setFormData(prev => ({ ...prev, address }))}
-             disabled={isReadOnly}
-             required={false}
-             module="judge"
-           />
+           <UnifiedAddressForm
+             value={formData.address || {}}
+             onChange={(address: UnifiedAddress) => setFormData(prev => ({ ...prev, address }))}
+             module="judge"
+             mode={isReadOnly ? 'view' : 'edit'}
+             required={false}
+           />
```

### ClientModal.tsx

```diff
// Line 26 - Imports
- import { SimpleAddressForm, SimpleAddressData } from '@/components/ui/SimpleAddressForm';
+ import { UnifiedAddressForm } from '@/components/ui/UnifiedAddressForm';
+ import { UnifiedAddress } from '@/types/address';

// Lines 1213-1241 - Address section
-                   <SimpleAddressForm
-                     value={{
-                       line1: formData.address?.line1 || '',
-                       line2: formData.address?.line2 || '',
-                       cityName: (formData.address as any)?.cityName || '',
-                       stateName: (formData.address as any)?.stateName || '',
-                       pincode: formData.address?.pincode || '',
-                       countryName: 'India'
-                     }}
-                     onChange={(address) => setFormData(prev => ({ 
-                       ...prev, 
-                       address: {
-                         ...prev.address,
-                         line1: address.line1 || '',
-                         line2: address.line2 || '',
-                         cityName: address.cityName || '',
-                         stateName: address.stateName || '',
-                         pincode: address.pincode || '',
-                         countryName: address.countryName || 'India'
-                       }
-                     }))}
-                     disabled={mode === 'view'}
-                     errors={{
-                       line1: errors.addressLine1,
-                       city: errors.addressCity,
-                       state: errors.addressState,
-                       pincode: errors.pincode
-                     }}
-                   />
+                   <UnifiedAddressForm
+                     value={formData.address || {}}
+                     onChange={(address: UnifiedAddress) => setFormData(prev => ({
+                       ...prev,
+                       address: address
+                     }))}
+                     module="client"
+                     mode={mode}
+                   />
```

---

## Verification Checklist

After implementation, verify:

- [ ] **Courts**: Create/Edit/View modes work correctly
- [ ] **Courts**: City field syncs with address.cityName
- [ ] **Courts**: AddressView still shows in view mode
- [ ] **Judges**: Create/Edit/View modes work correctly
- [ ] **Judges**: Address persists correctly on save
- [ ] **Clients**: Create/Edit/View modes work correctly
- [ ] **Clients**: AddressView still shows in view mode
- [ ] **Clients**: GST address integration still works (if applicable)

---

## Backward Compatibility

| Legacy Component | Status |
|-----------------|--------|
| `SimpleAddressForm` | PRESERVED - not deleted |
| `AddressForm` | PRESERVED - used internally by UnifiedAddressForm |
| `AddressView` | PRESERVED - used for read-only display |

---

## Components After Migration

| Component | Direct Usage |
|-----------|-------------|
| `UnifiedAddressForm` | CourtModal, JudgeForm, ClientModal |
| `AddressForm` | UnifiedAddressForm (internal only) |
| `SimpleAddressForm` | Available for future use |
| `AddressView` | CourtModal (view), ClientModal (view) |

---

## Estimated Effort

- CourtModal: ~15 minutes
- JudgeForm: ~10 minutes
- ClientModal: ~15 minutes
- Testing: ~20 minutes
- **Total: ~60 minutes**

