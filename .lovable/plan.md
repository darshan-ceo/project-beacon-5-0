
# Complete Removal of Address Fields from Legal Forum

## Overview

Permanently remove both the **Address** field and **Residence Address** field from the Legal Forum (Courts) module. This includes:
- Removing from the UI form
- Dropping database columns
- Cleaning up all related code references
- Hiding address display from the /courts list page

---

## Database Migration

Drop the address-related columns from the `courts` table:

```sql
-- Drop address columns from courts table
ALTER TABLE courts DROP COLUMN IF EXISTS address;
ALTER TABLE courts DROP COLUMN IF EXISTS address_jsonb;
ALTER TABLE courts DROP COLUMN IF EXISTS residence_address;

-- Add comment documenting removal
COMMENT ON TABLE courts IS 'Legal authorities/forums table. Address columns removed 2026-01-30 due to persistent data integrity issues.';
```

**Columns being dropped:**
| Column | Type | Purpose |
|--------|------|---------|
| `address` | TEXT | Legacy free-text address |
| `address_jsonb` | JSONB | Structured address (attempted fix) |
| `residence_address` | JSONB | Independent residence address |

---

## Files to Modify

### 1. CourtModal.tsx - Remove Address Sections from Form

**Remove from state initialization (lines 55, 78-88, 101):**
- Delete `address: EnhancedAddressData` from formData type
- Delete `residenceAddress: PartialAddress` from formData type
- Remove default values for both

**Remove hydration logic (lines 164-186, 198, 211):**
- Delete address parsing code
- Delete `address: parsedAddress` assignment
- Delete `residenceAddress: courtData.residenceAddress` assignment

**Remove Address section UI (lines 777-807):**
- Delete entire Card for "Address"

**Remove Residence Address section UI (lines 809-831):**
- Delete entire Card for "Residence Address"

**Remove from submit handler (lines 322, 336, 362, 375):**
- Delete `address: formData.address` from courtToCreate
- Delete `residenceAddress: formData.residenceAddress` from courtToCreate
- Delete same from updates object

**Remove unused imports:**
- `UnifiedAddressForm` (if only used here)
- `UnifiedAddress, PartialAddress` from types/address
- `AddressView`
- `EnhancedAddressData, addressMasterService`
- `Home` icon

### 2. CourtMasters.tsx - Hide Address Display

**Remove address from search filtering (lines 54-65):**
- Remove `addressText` construction
- Remove address from `matchesSearch` condition

**Remove address from city migration helper (line 95):**
- Remove `extractCityFromAddress` usage

**Remove Address line display (lines 271-278):**
- Delete the `MapPin` + address span in Legal Forum Details column

**Remove Pincode column (lines 337-404):**
- Delete entire TableCell for pincode + mapping dropdown

**Update table header (line 230):**
- Remove "Pincode" column header

**Remove unused imports:**
- `Map, Globe, Navigation` icons (only used for mapping)
- `MAPPING_SERVICES` from utils/mappingServices
- `extractCityFromAddress` from utils/cityExtractor

### 3. courtsService.ts - Remove Address Handling

**Create method (lines 61-98):**
- Remove `addressData` extraction and `unifiedAddress` construction
- Remove `address` and `address_jsonb` from storage.create()
- Remove `residence_address` from storage.create()

**Update method (lines 134-176):**
- Remove `addressJsonb` variable and address construction
- Remove `address` and `address_jsonb` from storage.update()
- Remove `residence_address` from storage.update()

**List method (lines 260-287):**
- Remove `parsedAddress` and `parsedResidenceAddress` parsing
- Remove `address`, `addressJsonb`, `residenceAddress` from return object

**GetById method (lines 304-329):**
- Same removals as list method

**Remove unused imports:**
- `UnifiedAddress, EMPTY_ADDRESS` from types/address
- `normalizeAddress, serializeAddress, parseDbAddress` from utils/addressUtils

### 4. AppStateContext.tsx - Remove from Court Interface

**Court interface (lines 276, 284, 294):**
- Remove `address: string | any;`
- Remove `addressId?: string;`
- Remove `residenceAddress?: any;`

### 5. SupabaseAdapter.ts - Remove Address Normalization

**Courts case (lines 2010-2058):**
- Remove `residenceAddress` → `residence_address` mapping
- Remove `delete normalized.residenceAddress`
- Remove stringification for `address_jsonb`, `residence_address`, `address`
- Remove `address`, `address_jsonb`, `residence_address` from `validCourtFields` whitelist

---

## Cleanup Summary

| Location | What to Remove |
|----------|----------------|
| Database | `address`, `address_jsonb`, `residence_address` columns |
| CourtModal.tsx | Address + Residence Address sections (UI + state + handlers) |
| CourtMasters.tsx | Address display, Pincode column, Map links |
| courtsService.ts | All address persistence/retrieval logic |
| AppStateContext.tsx | `address`, `addressId`, `residenceAddress` from Court interface |
| SupabaseAdapter.ts | Address normalization for courts |

---

## Impact Assessment

### Data Loss
- All existing address data for Legal Forums will be permanently deleted
- This includes ~100+ records based on earlier database queries
- **Recommendation**: Take a database backup before running migration

### UI Changes
- Legal Forum form will have 2 fewer sections (cleaner form)
- /courts list will not show Address line or Pincode column
- Mapping links (Google Maps, OpenStreetMap) will be removed

### Code Reduction
- ~150 lines removed from CourtModal.tsx
- ~70 lines removed from CourtMasters.tsx
- ~50 lines removed from courtsService.ts
- Total: ~270+ lines of problematic code eliminated

---

## Testing Checklist After Implementation

1. Create new Legal Forum → Verify no Address sections appear
2. Edit existing Legal Forum → Verify no Address sections appear
3. View Legal Forum → Confirm no address-related errors
4. /courts list → Verify no Address column, no Pincode column
5. Save Legal Forum → Verify successful save without address data
6. Check database → Verify address columns are gone

---

## Future: Adding Fresh Address Field

Once this cleanup is complete and verified stable, a new clean address field can be added following these principles:

1. Use only JSONB column (no legacy TEXT)
2. Use `module="contact"` which is proven stable
3. Implement with simple state management (no complex hydration)
4. Add thorough unit tests before deployment
