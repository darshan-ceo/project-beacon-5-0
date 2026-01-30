

# Add Residence Address Field to Legal Forum

## Overview

Add a new, independent **Residence Address** field to the Legal Forum (Court) creation/edit form. This field will be completely separate from the existing unstable `address` field and will follow the same schema and integration pattern as the Client Address used in the Contact module.

## Current State Analysis

### Existing Address Field (Lines 770-800 in CourtModal.tsx)
- Uses `UnifiedAddressForm` with `module="court"`
- Bound to `formData.address` of type `EnhancedAddressData`
- Has reported stability issues and race conditions
- Stored in DB as `address` (TEXT) and `address_jsonb` (JSONB)

### Contact Module Address Pattern (Reference - ContactModal.tsx lines 457-477)
- Uses `UnifiedAddressForm` with `module="contact"`
- Clean, isolated state: `formData.address` as `PartialAddress`
- Simple onChange handler updating form state
- Works reliably as confirmed by user

## Solution Design

### 1. Database Migration

Add a new JSONB column for Residence Address:

```sql
ALTER TABLE courts 
ADD COLUMN IF NOT EXISTS residence_address JSONB;

COMMENT ON COLUMN courts.residence_address IS 
'Residence address for the legal forum, following UnifiedAddress schema';
```

### 2. TypeScript Interface Updates

**File: `src/contexts/AppStateContext.tsx`**

Add to Court interface:
```typescript
interface Court {
  // ... existing fields ...
  residenceAddress?: UnifiedAddress; // New independent residence address
}
```

### 3. CourtModal.tsx Changes

**A. Add State Field**

In `formData` state initialization (line 49-99):
```typescript
const [formData, setFormData] = useState<{
  // ... existing fields ...
  residenceAddress: PartialAddress; // NEW: Independent residence address
}>({
  // ... existing values ...
  residenceAddress: {} // Empty initial state
});
```

**B. Add Hydration Logic**

In the `useEffect` that loads court data (lines 156-239):
```typescript
// Add to edit/view mode hydration:
residenceAddress: courtData.residenceAddress || {}
```

**C. Add UI Section**

After the existing Address section (after line 800), add new Card:

```typescript
{/* Section: Residence Address - Independent Clean Implementation */}
<Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
  <CardHeader className="border-b border-border p-6 pb-4">
    <CardTitle className="flex items-center gap-2">
      <Home className="h-4 w-4" />
      Residence Address
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4 p-6">
    <UnifiedAddressForm
      value={formData.residenceAddress || {}}
      onChange={(address: UnifiedAddress) => {
        setFormData(prev => ({
          ...prev,
          residenceAddress: address
        }));
      }}
      module="contact" // Use contact module config (proven stable)
      mode={mode}
      required={false}
    />
  </CardContent>
</Card>
```

**D. Update Submit Handler**

In `handleSubmit` (lines 278-384), add `residenceAddress` to court creation/update:

```typescript
// In create mode:
const courtToCreate = {
  // ... existing fields ...
  residenceAddress: formData.residenceAddress
};

// In edit mode:
const updates = {
  // ... existing fields ...
  residenceAddress: formData.residenceAddress
};
```

### 4. CourtsService.ts Updates

**A. Create Method (line 74-87)**

Add residence_address to persistence:
```typescript
const created = await storage.create('courts', {
  // ... existing fields ...
  residence_address: formData.residenceAddress 
    ? JSON.stringify(formData.residenceAddress) 
    : null,
} as any);
```

**B. Update Method (line 140-154)**

Add residence_address to updates:
```typescript
await storage.update('courts', courtId, {
  // ... existing fields ...
  ...(updates.residenceAddress !== undefined && { 
    residence_address: updates.residenceAddress 
      ? JSON.stringify(updates.residenceAddress) 
      : null 
  }),
} as any);
```

**C. List/GetById Methods**

Parse residence_address from DB in list() and getById():
```typescript
return {
  // ... existing fields ...
  residenceAddress: c.residence_address 
    ? parseDbAddress(c.residence_address) 
    : undefined,
} as Court;
```

### 5. Import Updates

Add `Home` icon import in CourtModal.tsx:
```typescript
import { MapPin, Phone, Mail, Building2, Scale, Globe, Loader2, Home } from 'lucide-react';
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/modals/CourtModal.tsx` | Add residenceAddress to formData, hydration, UI section, and submit handler |
| `src/services/courtsService.ts` | Add residence_address to create/update/list/getById |
| `src/contexts/AppStateContext.tsx` | Add residenceAddress to Court interface |

## Database Migration

```sql
-- Add residence_address column
ALTER TABLE courts 
ADD COLUMN IF NOT EXISTS residence_address JSONB;

-- Add documentation
COMMENT ON COLUMN courts.residence_address IS 
'Residence address for the legal forum, following UnifiedAddress JSONB schema. Independent from legacy address field.';
```

## Visual Layout

```text
┌─────────────────────────────────────────────────┐
│ [Scale] Basic Information                       │
│   - Name, Tax Jurisdiction, Authority Level     │
├─────────────────────────────────────────────────┤
│ [Phone] Contact Information                     │
│   - Phone, Email, Bench Location, City          │
├─────────────────────────────────────────────────┤
│ [MapPin] Address (Existing - Will Deprecate)    │
│   - UnifiedAddressForm (module="court")         │
├─────────────────────────────────────────────────┤
│ [Home] Residence Address (NEW - Clean)          │  ← NEW SECTION
│   - UnifiedAddressForm (module="contact")       │
├─────────────────────────────────────────────────┤
│ [Globe] Court-Specific Details                  │
│   - Status, Digital Filing, Working Days        │
└─────────────────────────────────────────────────┘
```

## Key Design Decisions

1. **Complete Independence**: The new `residenceAddress` field has zero dependencies on the existing `address` field - different state variable, different DB column, different hydration path.

2. **Proven Pattern**: Using `module="contact"` which is confirmed working in ContactModal.

3. **JSONB-Only Storage**: No legacy TEXT field - clean JSONB storage from the start.

4. **No Cascading Impact**: The existing address field remains unchanged - no risk to current functionality.

5. **Future Deprecation Ready**: Once Residence Address is confirmed working, the existing Address field can be hidden/removed in a later phase.

## Testing Checklist

1. Create new Legal Forum → Verify Residence Address section appears
2. Fill Residence Address fields → Verify all fields (Line 1, Pincode, State, City) work
3. Save → Verify data persists to database
4. Edit Legal Forum → Verify Residence Address hydrates correctly
5. View mode → Verify Residence Address displays correctly (read-only)
6. Verify existing Address field still works independently

