

# QC Report: Unified Contact Address Validation

## Executive Summary

| Category | Status | Details |
|----------|--------|---------|
| Single Source of Truth (SSOT) | **Partial** | Unified address architecture implemented but legacy compatibility layer exists |
| CRUD Operations | **Pass with Gaps** | All entities support JSONB address; employees have partial legacy dependency |
| Data Integrity | **Pass** | Validation, normalization, and serialization are centralized |
| UI/UX Consistency | **Pass** | UnifiedAddressForm used across all modules |
| Regression Risk | **Medium** | Export configs reference legacy Address interface |

---

## 1. Single Source of Truth (SSOT) Assessment

### Architecture Components Found

| Component | Location | Purpose |
|-----------|----------|---------|
| `UnifiedAddress` interface | `src/types/address.ts` | Canonical address schema |
| `addressUtils.ts` | `src/utils/addressUtils.ts` | Normalization, serialization, validation |
| `UnifiedAddressForm` | `src/components/ui/UnifiedAddressForm.tsx` | UI wrapper for address input |
| `AddressForm` | `src/components/ui/AddressForm.tsx` | Legacy UI implementation (wrapped by UnifiedAddressForm) |

### Database Schema Analysis

| Table | JSONB Column | Legacy Columns | Status |
|-------|--------------|----------------|--------|
| `clients` | `address` (jsonb) | `city`, `state` (varchar) | SSOT with legacy fallback |
| `courts` | `address_jsonb` (jsonb) | `address` (text), `city`, `state` (text) | Dual columns - needs cleanup |
| `judges` | `address` (jsonb) | `city`, `state` (text) | SSOT with legacy fallback |
| `employees` | `address` (jsonb) | `current_address`, `permanent_address` (text), `city`, `state`, `pincode` (varchar) | Multiple legacy fields - partial migration |
| `client_contacts` | `address` (jsonb) | None | Fully migrated |

### Compliance Status

- **Clients**: SSOT implemented via JSONB `address` column with `normalizeAddress()` and `serializeAddress()` in service layer
- **Courts**: Uses `address_jsonb` JSONB column; legacy `address` TEXT column still maintained for backward compatibility
- **Judges**: SSOT implemented via JSONB `address` column with `parseDbAddress()` on read
- **Employees**: Partial - JSONB `address` column added but service layer also references legacy `current_address`, `permanent_address`, `city`, `state`, `pincode` fields
- **Client Contacts**: Fully migrated to JSONB `address` column

### Issues Found

1. **Duplicate Interface Definition**: `Address` interface in `AppStateContext.tsx` (lines 1100-1107) differs from `UnifiedAddress`:
   ```typescript
   // Legacy (AppStateContext.tsx)
   interface Address {
     line1: string;
     line2?: string;
     city: string;      // Uses 'city' not 'cityName'
     state: string;     // Uses 'state' not 'stateName'
     pincode: string;
     country: string;   // Uses 'country' not 'countryName'
   }
   ```
   This creates field naming inconsistency.

2. **Courts Dual Columns**: The `courts` table has both `address` (TEXT) and `address_jsonb` (JSONB). The QC runner tests `address_jsonb`, but legacy code may still read from `address`.

3. **Employees Legacy Fields**: The employees service layer (`employeesService.ts` line 244) writes to JSONB `address`, but the `getEmployeeAddress()` helper (lines 492-510) still falls back to legacy TEXT fields.

---

## 2. CRUD Operations Validation

### Service Layer Implementation

| Entity | Create | Read | Update | Delete | Address Handling |
|--------|--------|------|--------|--------|------------------|
| Clients | `serializeAddress()` | `normalizeAddress()` | `serializeAddress()` | N/A | Correct |
| Courts | `serializeAddress()` | `parseDbAddress()` | `serializeAddress()` | N/A | Correct |
| Judges | `normalizeAddress()` | `parseDbAddress()` | `serializeAddress()` | N/A | Correct |
| Employees | `serializeAddress()` | Legacy fallback | `serializeAddress()` | N/A | Partial |
| Client Contacts | `serializeAddress()` | `parseDbAddress()` | `serializeAddress()` | N/A | Correct |

### QC Runner Verification

The MastersQC runner (`src/pages/MastersQC.tsx`) includes `verify-address` operations for:
- Clients (verifies `address` field)
- Client Contacts (verifies `address` field)
- Courts (verifies `address_jsonb` field)
- Judges (verifies `address` field)
- Employees (skipped - noted as using legacy fields)

### Issues Found

1. **Employee Address Read Not Fully Migrated**: The employee list/read operations in `employeesService.ts` do not explicitly use `parseDbAddress()` for the JSONB column - relies on the `getEmployeeAddress()` helper with legacy fallback.

2. **Employees Excluded from QC Address Verification**: Line 214-215 in MastersQC.tsx explicitly skips address verification for employees with the comment "uses legacy current_address/permanent_address".

---

## 3. Data Integrity & Consistency

### Validation Layer

| Function | Location | Status |
|----------|----------|--------|
| `validateAddress()` | `addressUtils.ts` | Validates per module requirements |
| `normalizeAddress()` | `addressUtils.ts` | Handles 15+ field name variants (snake_case, camelCase, legacy) |
| `serializeAddress()` | `addressUtils.ts` | Consistent JSONB serialization |

### Module-Specific Validation Rules

```
ADDRESS_MODULE_CONFIGS defined for:
- client: requires [line1, cityName, stateName, pincode]
- court: requires [line1, cityName, stateName]
- judge: requires [line1, cityName, stateName]
- employee: requires [line1, cityName, stateName, pincode]
- contact: requires [line1, cityName, stateName]
```

### Pincode Validation

- 6-digit Indian pincode format enforced in `validateAddress()` (line 131)
- Also enforced in legacy `clientsService.validatePincode()` (line 72-84)

**Status: PASS** - Validation is uniform and centralized.

---

## 4. UI/UX Consistency

### Component Usage

| Modal | Component Used | Mode Support | Status |
|-------|----------------|--------------|--------|
| ClientModal | `UnifiedAddressForm` | create/edit/view | Correct |
| CourtModal | `UnifiedAddressForm` | create/edit/view | Correct |
| JudgeForm | `UnifiedAddressForm` | create/edit/view | Correct |
| EmployeeModalV2 | `UnifiedAddressForm` (x2) | create/edit | Correct (current + permanent) |
| ContactModal | `UnifiedAddressForm` | create/edit | Correct |

### Display Components

| Component | Purpose | Uses addressUtils? |
|-----------|---------|-------------------|
| `AddressView` | Read-only display (card format) | Has local `formatDisplayAddress()` |
| `AddressDisplay` | Compact table display | Has local `formatDisplayAddress()` |
| `AddressSummary` | Card preview display | Direct field access |

**Issue**: `AddressView.tsx` defines its own `formatDisplayAddress()` function (line 52, 234) instead of importing from `addressUtils.ts`. This creates code duplication and potential inconsistency.

---

## 5. Regression & Side Effects

### Export Configuration

The `src/config/exports/client.ts` references the legacy `Address` interface from AppStateContext:
```typescript
import { Client, Address, Signatory } from '@/contexts/AppStateContext';
```

Export column getters access:
- `(client.address as Address).state` (not `stateName`)
- `(client.address as Address).city` (not `cityName`)
- `(client.address as Address).country` (not `countryName`)

**Risk**: If address data is stored with `cityName`/`stateName` keys (per UnifiedAddress), exports will show "N/A".

### Search & Filters

Not explicitly tested in this QC scope, but address-based filtering likely uses legacy field names.

### Reports

Timeline reports and other analytics may use legacy address field patterns.

---

## 6. Specific Fix Recommendations

### Priority 1: Critical

| Issue | Fix | Files Affected |
|-------|-----|----------------|
| Duplicate Address Interface | Deprecate `Address` in AppStateContext, use `UnifiedAddress` everywhere | `AppStateContext.tsx`, `client.ts` (exports) |
| Export Config Legacy References | Update getters to check `cityName || city`, `stateName || state` | `src/config/exports/client.ts` |

### Priority 2: High

| Issue | Fix | Files Affected |
|-------|-----|----------------|
| AddressView Local Function | Import `formatDisplayAddress` from `addressUtils.ts` | `AddressView.tsx` |
| Employee QC Verification | Add employee address JSONB verification to MastersQC | `MastersQC.tsx` |
| Courts Dual Columns | Deprecate legacy `address` TEXT column; use only `address_jsonb` | `courtsService.ts`, database migration |

### Priority 3: Medium

| Issue | Fix | Files Affected |
|-------|-----|----------------|
| Employee Legacy Fallback | Migrate `getEmployeeAddress()` to prioritize JSONB only | `employeesService.ts` |
| Employee Read Operation | Add explicit `parseDbAddress()` call in employee list/getById | `employeesService.ts` |

---

## 7. Modules Compliance Summary

| Module | SSOT | CRUD | UI | Overall |
|--------|------|------|-----|---------|
| Clients | Compliant | Compliant | Compliant | **PASS** |
| Client Contacts | Compliant | Compliant | Compliant | **PASS** |
| Courts | Partial (dual columns) | Compliant | Compliant | **PARTIAL - dual column cleanup needed** |
| Judges | Compliant | Compliant | Compliant | **PASS** |
| Employees | Partial (legacy fallback) | Partial | Compliant | **PARTIAL - legacy cleanup needed** |

---

## 8. Completion Criteria Assessment

| Criterion | Status |
|-----------|--------|
| All address handling uses one unified source | **PARTIAL** - UnifiedAddress is canonical but legacy Address interface exists |
| CRUD works flawlessly across all modules | **PARTIAL** - Employees have legacy read fallback |
| No legacy or duplicate address implementations remain | **FAIL** - Legacy Address interface in AppStateContext, dual columns in courts, legacy TEXT fields in employees |

---

## Next Steps

1. Update export configurations to use normalized field names
2. Deprecate legacy `Address` interface in AppStateContext
3. Complete employee service migration to JSONB-only reads
4. Add database migration to remove courts legacy `address` TEXT column
5. Run full MastersQC with employee address verification enabled

