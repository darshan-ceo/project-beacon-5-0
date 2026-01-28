

# Fix SupabaseAdapter Address Whitelist Issues

## Problem Summary

The `normalizeForBackend()` method in `SupabaseAdapter.ts` uses entity-specific field whitelists that are **silently dropping address JSONB fields** during CREATE/UPDATE operations.

| Entity | DB Column | Whitelist Status | Current Result |
|--------|-----------|------------------|----------------|
| Clients | `address` | ✅ Included (line 1168) | Working |
| Courts | `address_jsonb` | ❌ Missing | Double-serialized |
| Judges | `address` | ❌ Missing | Empty objects {} |
| Client Contacts | `address` | ❌ No handler | Passes through unsanitized |

---

## Root Cause Analysis

### Courts (lines 1867-1892)
```typescript
const validCourtFields = ['id', 'tenant_id', 'name', 'code', 'type', 'level', 
  'city', 'state', 'jurisdiction', 'address', ...];
//                                  ^^^^ Wrong! DB column is address_jsonb
```
**Issue:** Whitelist has `address` but DB column is `address_jsonb`

### Judges (lines 1920-1928)
```typescript
const validJudgeFields = [
  'id', 'tenant_id', 'name', 'designation', 'status', 'court_id',
  'bench', 'jurisdiction', 'city', 'state', 'email', 'phone',
  // ... no 'address' field listed
];
```
**Issue:** `address` field completely missing from whitelist

### Client Contacts (no case handler)
The switch statement in `normalizeForBackend()` has no `case 'client_contacts':` handler, so records pass through without field normalization or validation.

---

## Implementation Plan

### File: `src/data/adapters/SupabaseAdapter.ts`

#### Fix 1: Courts Whitelist (line 1888)

**Current:**
```typescript
const validCourtFields = ['id', 'tenant_id', 'name', 'code', 'type', 'level', 
  'city', 'state', 'jurisdiction', 'address', 'created_by', 'created_at', 
  'updated_at', 'established_year', 'bench_location', 'tax_jurisdiction', 
  'officer_designation', 'phone', 'email', 'status'];
```

**Fixed:**
```typescript
const validCourtFields = ['id', 'tenant_id', 'name', 'code', 'type', 'level', 
  'city', 'state', 'jurisdiction', 'address', 'address_jsonb', 'created_by', 
  'created_at', 'updated_at', 'established_year', 'bench_location', 
  'tax_jurisdiction', 'officer_designation', 'phone', 'email', 'status'];
```

**Also add JSONB stringification before the whitelist (before line 1887):**
```typescript
// Stringify address_jsonb for JSONB column
if (normalized.address_jsonb && typeof normalized.address_jsonb === 'object') {
  normalized.address_jsonb = JSON.stringify(normalized.address_jsonb);
}
```

#### Fix 2: Judges Whitelist (lines 1920-1928)

**Current:**
```typescript
const validJudgeFields = [
  'id', 'tenant_id', 'name', 'designation', 'status', 'court_id',
  'bench', 'jurisdiction', 'city', 'state', 'email', 'phone',
  'appointment_date', 'retirement_date', 'years_of_service',
  'specialization', 'chambers', 'assistant', 'availability',
  'tags', 'notes', 'photo_url', 'created_at', 'updated_at', 'created_by',
  'member_type', 'authority_level', 'qualifications', 'tenure_details'
];
```

**Fixed:**
```typescript
const validJudgeFields = [
  'id', 'tenant_id', 'name', 'designation', 'status', 'court_id',
  'bench', 'jurisdiction', 'city', 'state', 'email', 'phone',
  'appointment_date', 'retirement_date', 'years_of_service',
  'specialization', 'chambers', 'assistant', 'availability',
  'tags', 'notes', 'photo_url', 'created_at', 'updated_at', 'created_by',
  'member_type', 'authority_level', 'qualifications', 'tenure_details',
  'address'  // <-- Add this
];
```

**Also add JSONB stringification (before line 1919):**
```typescript
// Stringify address for JSONB column
if (normalized.address && typeof normalized.address === 'object') {
  normalized.address = JSON.stringify(normalized.address);
}
```

#### Fix 3: Add Client Contacts Handler (after line 1216)

Insert new case handler after `client_groups` case:

```typescript
case 'client_contacts':
  // Map camelCase to snake_case
  if (normalized.clientId && !normalized.client_id) {
    normalized.client_id = normalized.clientId;
  }
  if (normalized.ownerUserId && !normalized.owner_user_id) {
    normalized.owner_user_id = normalized.ownerUserId;
  }
  if (normalized.isPrimary !== undefined && normalized.is_primary === undefined) {
    normalized.is_primary = normalized.isPrimary;
  }
  if (normalized.isActive !== undefined && normalized.is_active === undefined) {
    normalized.is_active = normalized.isActive;
  }
  if (normalized.dataScope && !normalized.data_scope) {
    normalized.data_scope = normalized.dataScope;
  }
  if (normalized.createdAt && !normalized.created_at) {
    normalized.created_at = normalized.createdAt;
  }
  if (normalized.updatedAt && !normalized.updated_at) {
    normalized.updated_at = normalized.updatedAt;
  }
  
  // Delete camelCase versions
  delete normalized.clientId;
  delete normalized.ownerUserId;
  delete normalized.isPrimary;
  delete normalized.isActive;
  delete normalized.dataScope;
  delete normalized.createdAt;
  delete normalized.updatedAt;
  
  // Stringify JSONB fields
  if (normalized.emails && typeof normalized.emails === 'object') {
    normalized.emails = JSON.stringify(normalized.emails);
  }
  if (normalized.phones && typeof normalized.phones === 'object') {
    normalized.phones = JSON.stringify(normalized.phones);
  }
  if (normalized.address && typeof normalized.address === 'object') {
    normalized.address = JSON.stringify(normalized.address);
  }
  
  // Whitelist valid columns
  const validContactFields = [
    'id', 'tenant_id', 'client_id', 'name', 'designation', 
    'emails', 'phones', 'address', 'notes',
    'is_primary', 'is_active', 'data_scope', 'owner_user_id',
    'created_at', 'updated_at'
  ];
  Object.keys(normalized).forEach(key => {
    if (!validContactFields.includes(key)) delete normalized[key];
  });
  break;
```

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/data/adapters/SupabaseAdapter.ts` | 1886-1888 | Add `address_jsonb` to courts whitelist + stringify |
| `src/data/adapters/SupabaseAdapter.ts` | 1918-1928 | Add `address` to judges whitelist + stringify |
| `src/data/adapters/SupabaseAdapter.ts` | after 1216 | Add new `client_contacts` case handler |

---

## Validation

After implementation, run MastersQC at `/qa/masters-qc` to verify:

| Entity | Expected Result |
|--------|-----------------|
| Clients | ✅ verify-address: PASS |
| Courts | ✅ verify-address: PASS (address_jsonb persists) |
| Judges | ✅ verify-address: PASS (address persists) |
| Client Contacts | ✅ verify-address: PASS (address persists) |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing data | None - only affects new writes; existing data unchanged |
| Side effects | None - changes are additive (adding fields to whitelists) |
| Rollback | Simple - remove added fields from whitelists |

**Safety Level:** Fully Safe

---

## Estimated Effort

| Task | Time |
|------|------|
| Fix Courts whitelist + stringify | ~5 min |
| Fix Judges whitelist + stringify | ~5 min |
| Add Client Contacts handler | ~10 min |
| Run MastersQC validation | ~5 min |
| **Total** | **~25 min** |

