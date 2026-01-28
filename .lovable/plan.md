
# Day 3: Unified Address Handling for judgesService & employeesService

## Objective
Enforce Unified Address Architecture in both services by replacing manual JSON handling and inline validation with centralized utilities.

---

## Part A: judgesService.ts Refactoring

### Current Violations Found

| Line(s) | Issue | Type |
|---------|-------|------|
| 207 | `JSON.stringify(updates.address)` | Direct JSON manipulation |
| 319-321 | `typeof j.address === 'string' ? JSON.parse(j.address)` | Manual parsing in list() |
| 391-394 | Same pattern in getById() | Manual parsing |
| 75, 352, 425 | Raw address passthrough | No normalization |

### Changes Required

#### 1. Add Imports (Top of file)
```typescript
import { 
  normalizeAddress, 
  serializeAddress, 
  parseDbAddress 
} from '@/utils/addressUtils';
import { PartialAddress } from '@/types/address';
```

#### 2. Refactor CREATE Flow (Line 75)
**Before:**
```typescript
address: judgeData.address,
```
**After:**
```typescript
address: judgeData.address ? normalizeAddress(judgeData.address) : undefined,
```

#### 3. Refactor UPDATE Flow (Line 207)
**Before:**
```typescript
...(updates.address && { address: JSON.stringify(updates.address) }),
```
**After:**
```typescript
...(updates.address && { address: serializeAddress(updates.address as PartialAddress) }),
```

#### 4. Refactor list() READ Flow (Lines 319-324)
**Before:**
```typescript
const qualifications = j.qualifications ? (typeof j.qualifications === 'string' ? JSON.parse(j.qualifications) : j.qualifications) : undefined;
const tenureDetails = j.tenure_details ? (typeof j.tenure_details === 'string' ? JSON.parse(j.tenure_details) : j.tenure_details) : undefined;
const address = j.address ? (typeof j.address === 'string' ? JSON.parse(j.address) : j.address) : undefined;
const assistant = j.assistant ? (typeof j.assistant === 'string' ? JSON.parse(j.assistant) : j.assistant) : {};
const availability = j.availability ? (typeof j.availability === 'string' ? JSON.parse(j.availability) : j.availability) : {};
```
**After:**
```typescript
const qualifications = j.qualifications ? (typeof j.qualifications === 'string' ? JSON.parse(j.qualifications) : j.qualifications) : undefined;
const tenureDetails = j.tenure_details ? (typeof j.tenure_details === 'string' ? JSON.parse(j.tenure_details) : j.tenure_details) : undefined;
const address = parseDbAddress(j.address); // Use centralized utility
const assistant = j.assistant ? (typeof j.assistant === 'string' ? JSON.parse(j.assistant) : j.assistant) : {};
const availability = j.availability ? (typeof j.availability === 'string' ? JSON.parse(j.availability) : j.availability) : {};
```

#### 5. Refactor getById() READ Flow (Lines 391-396)
Apply same pattern:
**Before:**
```typescript
const address = judge.address ? (typeof judge.address === 'string' ? JSON.parse(judge.address) : judge.address) : undefined;
```
**After:**
```typescript
const address = parseDbAddress(judge.address);
```

---

## Part B: employeesService.ts Refactoring

### Current State Analysis

| Field | Location | Status |
|-------|----------|--------|
| `currentAddress` | Interface line 34 | Legacy TEXT (preserve) |
| `permanentAddress` | Interface line 35 | Legacy TEXT (preserve) |
| `address` | DB column (JSONB) | NEW - added Day 1 |
| `pincode` | Interface line 38 | Legacy, inline validation |

### Changes Required

#### 1. Add Imports (Top of file)
```typescript
import { 
  normalizeAddress, 
  serializeAddress, 
  parseDbAddress,
  createAddressFromLegacy,
  isAddressEmpty
} from '@/utils/addressUtils';
import { PartialAddress, UnifiedAddress } from '@/types/address';
```

#### 2. Update Employee Interface (Lines 6-87)
Add unified address field alongside legacy fields:
```typescript
// Contact Tab - Legacy fields preserved for backward compat
currentAddress?: string;
permanentAddress?: string;
city?: string;
state?: string;
pincode?: string;

// NEW: Unified address (takes priority when present)
address?: UnifiedAddress;
```

#### 3. Refactor Validation (Lines 151-154)
**Before:**
```typescript
// Pincode validation
if (employee.pincode && !/^\d{6}$/.test(employee.pincode)) {
  errors.push("Invalid pincode. Must be 6 digits");
}
```
**After (no change needed):** Keep inline validation for legacy field, but add:
```typescript
// Unified address validation (if provided)
if (employee.address && !isAddressEmpty(employee.address)) {
  const { validateAddress } = await import('@/utils/addressUtils');
  const addressValidation = validateAddress(employee.address, 'employee');
  if (!addressValidation.isValid) {
    addressValidation.errors.forEach(err => errors.push(err.message));
  }
}
```

#### 4. Refactor CREATE Flow - Persistence (Lines 211-226)
**Before:**
```typescript
await storage.create('employees', {
  id: newEmployee.id,
  employee_code: newEmployee.employeeCode,
  email: newEmployee.email,
  // ... other fields
});
```
**After (add address field):**
```typescript
await storage.create('employees', {
  id: newEmployee.id,
  employee_code: newEmployee.employeeCode,
  email: newEmployee.email,
  // ... other fields
  // NEW: Unified address JSONB
  address: newEmployee.address ? serializeAddress(newEmployee.address) : null,
});
```

#### 5. Refactor UPDATE Flow - Persistence (Lines 271-276)
**Before:**
```typescript
await storage.update('employees', employeeId, {
  ...updates,
  email: updates.email || updates.officialEmail,
  status: updates.status,
  updated_at: new Date(),
});
```
**After:**
```typescript
await storage.update('employees', employeeId, {
  ...updates,
  email: updates.email || updates.officialEmail,
  status: updates.status,
  // NEW: Serialize unified address if provided
  ...(updates.address && { address: serializeAddress(updates.address as PartialAddress) }),
  updated_at: new Date(),
});
```

#### 6. Add Legacy Fallback Helper Function
Add helper for backward compatible reads:
```typescript
/**
 * Get address from employee with legacy fallback
 * Priority: address (JSONB) > legacy fields
 */
function getEmployeeAddress(emp: Partial<Employee>): UnifiedAddress | null {
  // Priority 1: New unified JSONB address
  if (emp.address && !isAddressEmpty(emp.address)) {
    return normalizeAddress(emp.address);
  }
  
  // Priority 2: Legacy TEXT fields
  if (emp.currentAddress || emp.city || emp.state) {
    return createAddressFromLegacy(
      emp.currentAddress || null,
      emp.city || null,
      emp.state || null,
      emp.pincode || null
    );
  }
  
  return null;
}
```

---

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `src/services/judgesService.ts` | EDIT | Use addressUtils for parse/serialize |
| `src/services/employeesService.ts` | EDIT | Add unified address handling with legacy fallback |

---

## Diff Summary

### judgesService.ts
```diff
+ import { 
+   normalizeAddress, 
+   serializeAddress, 
+   parseDbAddress 
+ } from '@/utils/addressUtils';
+ import { PartialAddress } from '@/types/address';

// Line 75: CREATE - normalize
- address: judgeData.address,
+ address: judgeData.address ? normalizeAddress(judgeData.address) : undefined,

// Line 207: UPDATE - serialize
- ...(updates.address && { address: JSON.stringify(updates.address) }),
+ ...(updates.address && { address: serializeAddress(updates.address as PartialAddress) }),

// Line 321: list() - parse
- const address = j.address ? (typeof j.address === 'string' ? JSON.parse(j.address) : j.address) : undefined;
+ const address = parseDbAddress(j.address);

// Line 394: getById() - parse
- const address = judge.address ? (typeof judge.address === 'string' ? JSON.parse(judge.address) : judge.address) : undefined;
+ const address = parseDbAddress(judge.address);
```

### employeesService.ts
```diff
+ import { 
+   normalizeAddress, 
+   serializeAddress, 
+   parseDbAddress,
+   createAddressFromLegacy,
+   isAddressEmpty
+ } from '@/utils/addressUtils';
+ import { PartialAddress, UnifiedAddress } from '@/types/address';

// Interface update
+ // NEW: Unified address (JSONB)
+ address?: UnifiedAddress;

// CREATE - add address to persistence
  await storage.create('employees', {
    ...existing fields...,
+   address: newEmployee.address ? serializeAddress(newEmployee.address) : null,
  });

// UPDATE - serialize address
  await storage.update('employees', employeeId, {
    ...existing fields...,
+   ...(updates.address && { address: serializeAddress(updates.address as PartialAddress) }),
  });

+ // NEW: Legacy fallback helper
+ function getEmployeeAddress(emp: Partial<Employee>): UnifiedAddress | null {
+   if (emp.address && !isAddressEmpty(emp.address)) {
+     return normalizeAddress(emp.address);
+   }
+   if (emp.currentAddress || emp.city || emp.state) {
+     return createAddressFromLegacy(
+       emp.currentAddress || null,
+       emp.city || null,
+       emp.state || null,
+       emp.pincode || null
+     );
+   }
+   return null;
+ }
```

---

## Backward Compatibility Guarantee

### Judges
- Legacy string addresses: `parseDbAddress()` handles TEXT → UnifiedAddress
- Empty addresses: Returns EMPTY_ADDRESS defaults
- Existing data: No migration needed, parsing is non-destructive

### Employees
- Legacy TEXT fields (`currentAddress`, `permanentAddress`): Preserved, NOT modified
- New JSONB `address` column: Takes priority when present
- Fallback chain: `address` (JSONB) → `currentAddress`/`city`/`state` (legacy)
- Pincode validation: Legacy inline validation preserved alongside new unified validation

---

## Safety Checklist

- [ ] No UI component changes
- [ ] No RLS policy changes  
- [ ] No database schema changes (Day 1 already added employees.address)
- [ ] Legacy TEXT fields NOT deleted
- [ ] Legacy validation preserved
- [ ] Fallback priority documented
- [ ] parseDbAddress handles null/undefined gracefully

---

## Estimated Effort
- judgesService refactoring: ~15 minutes
- employeesService refactoring: ~25 minutes
- Testing: ~15 minutes
- **Total: ~55 minutes**
