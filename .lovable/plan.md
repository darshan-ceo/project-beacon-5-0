

# Day 6.1: Complete UnifiedAddressForm UI Migration

## Objective
Add address form support using `UnifiedAddressForm` in both Employees and Client Contacts modals, completing the UI migration for all entities.

---

## Current State Analysis

### EmployeeModalV2.tsx (Lines 860-922)

| Field | Current Implementation | Issue |
|-------|----------------------|-------|
| currentAddress | `Textarea` (free text) | Legacy TEXT field |
| permanentAddress | `Textarea` (free text) | Legacy TEXT field |
| city | `Input` (text) | Separate field |
| state | `Select` (dropdown) | Hardcoded state list |
| pincode | `Input` (6 chars) | Separate field |

The Employee interface in `employeesService.ts` already supports `address?: UnifiedAddress` (line 49), but the modal uses legacy separate fields.

### ContactModal.tsx

| Area | Status |
|------|--------|
| Address field in interface | YES - `ClientContact.address?: UnifiedAddress` |
| Address field in create request | YES - `CreateContactRequest.address?: PartialAddress` |
| Address field in UI | **NO** - Not exposed in modal |
| Service layer support | YES - Day 4 added validation/serialization |

---

## Implementation Plan

### 1. EmployeeModalV2.tsx - Replace Manual Fields with UnifiedAddressForm

**Strategy:** Replace the 6 inline fields (currentAddress, permanentAddress, city, state, pincode) with two `UnifiedAddressForm` instances for Current and Permanent addresses.

**Import Changes (Line ~1):**
```typescript
import { UnifiedAddressForm } from '@/components/ui/UnifiedAddressForm';
import { UnifiedAddress } from '@/types/address';
```

**State Changes:**
Add address state handling to formData to support structured address:
```typescript
// In formData state initialization
currentAddressData?: UnifiedAddress;
permanentAddressData?: UnifiedAddress;
```

**Replace Lines 860-922 (renderContactTab address section):**

**BEFORE:**
```tsx
<div className="space-y-2 md:col-span-2">
  <Label htmlFor="currentAddress">Current Address</Label>
  <Textarea
    id="currentAddress"
    value={formData.currentAddress || ''}
    onChange={(e) => handleInputChange('currentAddress', e.target.value)}
    rows={2}
    disabled={isReadOnly}
  />
</div>
<div className="space-y-2 md:col-span-2">
  <Label htmlFor="permanentAddress">Permanent Address</Label>
  <Textarea ... />
</div>
<div className="space-y-2">
  <Label htmlFor="city">City</Label>
  <Input ... />
</div>
<div className="space-y-2">
  <Label htmlFor="state">State</Label>
  <Select ... />
</div>
<div className="space-y-2">
  <Label htmlFor="pincode">Pincode</Label>
  <Input ... />
</div>
```

**AFTER:**
```tsx
{/* Current Address Section */}
<div className="space-y-2 md:col-span-2">
  <Label>Current Address</Label>
  <UnifiedAddressForm
    value={formData.currentAddressData || {}}
    onChange={(address: UnifiedAddress) => handleInputChange('currentAddressData', address)}
    module="employee"
    mode={isReadOnly ? 'view' : mode}
    addressType="current"
    required={false}
  />
</div>

{/* Permanent Address Section */}
<div className="space-y-2 md:col-span-2">
  <Label>Permanent Address</Label>
  <UnifiedAddressForm
    value={formData.permanentAddressData || {}}
    onChange={(address: UnifiedAddress) => handleInputChange('permanentAddressData', address)}
    module="employee"
    mode={isReadOnly ? 'view' : mode}
    addressType="permanent"
    required={false}
  />
</div>
```

**Data Initialization (useEffect ~line 164):**
```typescript
// When loading employee for edit/view, hydrate address data from legacy fields
if (employee && (mode === 'edit' || mode === 'view')) {
  const employeeData = {
    ...employee,
    // Hydrate current address from unified or legacy
    currentAddressData: employee.address?.addressType === 'current' 
      ? employee.address 
      : {
          line1: employee.currentAddress || '',
          cityName: employee.city || '',
          stateName: employee.state || '',
          pincode: employee.pincode || '',
          addressType: 'current' as const
        },
    permanentAddressData: {
      line1: employee.permanentAddress || '',
      addressType: 'permanent' as const
    }
  };
  setFormData(employeeData);
}
```

**Submission Handling:**
Map the unified address data back to legacy fields for backward compatibility during the transition:
```typescript
// In handleSubmit, map address data back to legacy fields
currentAddress: formData.currentAddressData?.line1 || '',
permanentAddress: formData.permanentAddressData?.line1 || '',
city: formData.currentAddressData?.cityName || '',
state: formData.currentAddressData?.stateName || '',
pincode: formData.currentAddressData?.pincode || '',
// Also pass unified address for services that support it
address: formData.currentAddressData
```

---

### 2. ContactModal.tsx - Add Address Section

**Strategy:** Add a new "Address" card section with `UnifiedAddressForm` between Contact Details and Settings cards.

**Import Changes (Line ~1):**
```typescript
import { UnifiedAddressForm } from '@/components/ui/UnifiedAddressForm';
import { UnifiedAddress, PartialAddress } from '@/types/address';
import { MapPin } from 'lucide-react';
```

**FormData State Update (Line ~74):**
```typescript
const [formData, setFormData] = useState<CreateContactRequest & { 
  clientId?: string | null; 
  isActive?: boolean;
  address?: PartialAddress;  // ADD THIS
}>({
  name: '',
  designation: '',
  emails: [],
  phones: [],
  roles: ['primary'],
  isPrimary: false,
  notes: '',
  dataScope: 'TEAM',
  clientId: defaultClientId || null,
  isActive: true,
  address: {}  // ADD THIS
});
```

**Load Contact Data (Lines 141-152):**
```typescript
setFormData({
  name: contact.name,
  designation: contact.designation || '',
  emails: contact.emails || [],
  phones: contact.phones || [],
  roles: contact.roles || ['primary'],
  isPrimary: contact.isPrimary,
  notes: contact.notes || '',
  dataScope: contact.dataScope || 'TEAM',
  clientId: contact.clientId || null,
  isActive: contact.isActive,
  address: contact.address || {}  // ADD THIS
});
```

**Add Address Card (Insert after Contact Details Card, ~line 448):**
```tsx
{/* Address Card */}
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base flex items-center gap-2">
      <MapPin className="h-4 w-4 text-primary" />
      Address
    </CardTitle>
  </CardHeader>
  <CardContent>
    <UnifiedAddressForm
      value={formData.address || {}}
      onChange={(address: UnifiedAddress) => setFormData(prev => ({ 
        ...prev, 
        address 
      }))}
      module="contact"
      mode={isViewMode ? 'view' : mode}
      required={false}
    />
  </CardContent>
</Card>
```

**Update handleSubmit (Line 207):**
```typescript
const response = await clientContactsService.updateContact(contactId, {
  name: formData.name,
  designation: formData.designation,
  emails: formData.emails,
  phones: formData.phones,
  roles: formData.roles,
  isPrimary: formData.isPrimary,
  notes: formData.notes,
  dataScope: formData.dataScope,
  isActive: formData.isActive,
  address: formData.address  // ADD THIS
});
```

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/modals/EmployeeModalV2.tsx` | EDIT | Replace manual address fields with UnifiedAddressForm |
| `src/components/modals/ContactModal.tsx` | EDIT | Add Address section with UnifiedAddressForm |

---

## Backward Compatibility

### Employees
- Legacy TEXT fields (`currentAddress`, `permanentAddress`, `city`, `state`, `pincode`) are still populated on save
- This ensures existing employee data remains compatible with any legacy code
- New JSONB `address` field is also populated for forward compatibility

### Contacts
- Service layer already handles address serialization (Day 4)
- No legacy fields to maintain - this is a new feature addition

---

## Safety Checklist

- No deletion of AddressForm or SimpleAddressForm components
- No UI redesign - using existing UnifiedAddressForm wrapper
- Backward compatibility maintained for employees via legacy field mapping
- No validation changes - UnifiedAddressForm uses existing validation
- All props from UnifiedAddressForm interface are utilized appropriately

---

## Verification After Implementation

- [ ] Employee Modal: Create mode shows address forms
- [ ] Employee Modal: Edit mode loads existing address data
- [ ] Employee Modal: View mode shows read-only addresses
- [ ] Employee Modal: Save persists to both legacy and unified fields
- [ ] Contact Modal: Create mode shows address form
- [ ] Contact Modal: Edit mode loads existing address data
- [ ] Contact Modal: View mode shows read-only address
- [ ] Contact Modal: Save persists address correctly

---

## Final Status After Implementation

| Entity | UnifiedAddressForm Used | Status |
|--------|------------------------|--------|
| Courts | Yes | Complete (Day 6) |
| Judges | Yes | Complete (Day 6) |
| Clients | Yes | Complete (Day 6) |
| Employees | Yes | Complete (Day 6.1) |
| Contacts | Yes | Complete (Day 6.1) |

**Confirmation:** After this implementation, `UnifiedAddressForm` will be the **ONLY** address form component directly used by entity modals. Legacy `AddressForm` is used internally by `UnifiedAddressForm`, and `SimpleAddressForm` remains available but unused.

---

## Estimated Effort
- EmployeeModalV2: ~25 minutes (complex due to dual address + legacy mapping)
- ContactModal: ~15 minutes (straightforward addition)
- Testing: ~20 minutes
- **Total: ~60 minutes**

