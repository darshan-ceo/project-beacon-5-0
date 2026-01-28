

# QA Validation Report: Address Persistence Testing

## Executive Summary

**Overall Status: PARTIAL PASS with BLOCKING BUG FOUND**

The SupabaseAdapter whitelist fixes are correctly implemented, but a separate data preparation bug was discovered in `courtsService.ts` that causes address double-serialization.

---

## Test Results by Entity

### 1. Judges

| Check | Result | Evidence |
|-------|--------|----------|
| Record Created | PASS | Judge "Qa Test Judge Address" created (ID: 55080c97-...) |
| Address Persisted | INCONCLUSIVE | Empty `{}` - no address data entered during test |
| Whitelist Fix Applied | PASS | `address` field in whitelist at line 1994 |
| Stringify Applied | PASS | Lines 1980-1983 implement stringify |

**Database Snippet (NEW record):**
```json
{
  "id": "55080c97-4d59-4d7b-a8db-2a43953a0e45",
  "name": "Qa Test Judge Address",
  "designation": "Chief Justice",
  "address": {}
}
```

**Conclusion:** Whitelist fix is correct. Test was incomplete due to form navigation complexity - address fields were not filled.

---

### 2. Courts

| Check | Result | Evidence |
|-------|--------|----------|
| Whitelist Fix Applied | PASS | `address_jsonb` in whitelist at line 1949 |
| Stringify Applied | PASS | Lines 1943-1946 implement stringify |
| Data Integrity | FAIL | Double-serialization in legacy data |

**Database Snippet (LEGACY record - "RJ District Court"):**
```json
{
  "line1": "{\"line1\":\"1\",\"line2\":\"2\",\"locality\":\"3\"...}",
  "cityName": "New Delhi",
  "source": "imported"
}
```

**Root Cause:** `courtsService.ts` lines 62-67 incorrectly assigns a potentially JSON-stringified `address` field to `line1`:
```typescript
const unifiedAddress = normalizeAddress({
  line1: normalizedData.address || '',  // BUG: may be JSON string
  ...
});
```

**Conclusion:** FAIL - Double-serialization bug exists in service layer, not SupabaseAdapter.

---

### 3. Client Contacts

| Check | Result | Evidence |
|-------|--------|----------|
| Case Handler Added | PASS | Lines 1150-1216 in SupabaseAdapter |
| Address in Whitelist | PASS | `address` field whitelisted |
| Data Validation | INCONCLUSIVE | No records with address data exist |

**Database Query Result:**
```sql
SELECT * FROM client_contacts WHERE address::text != '{}' → 0 rows
```

**Conclusion:** Fix is implemented but cannot be validated without test data.

---

## SupabaseAdapter Verification

All three fixes were correctly applied:

| Entity | Whitelist Field | Stringify Logic | Line Reference |
|--------|----------------|-----------------|----------------|
| Courts | `address_jsonb` | Lines 1943-1946 | Line 1949 |
| Judges | `address` | Lines 1980-1983 | Line 1994 |
| Client Contacts | `address` | Lines 1203-1205 | Line 1213 |

---

## Blocking Issue Requiring Fix

### Bug: Courts Address Double-Serialization

**File:** `src/services/courtsService.ts`

**Location:** Lines 62-67

**Current (Buggy):**
```typescript
const unifiedAddress: UnifiedAddress = normalizeAddress({
  line1: normalizedData.address || '',  // Wrong: address may be JSON object
  cityName: normalizedData.city || '',
  stateName: normalizedData.state || '',
  source: 'manual'
});
```

**Fix Required:**
```typescript
// If normalizedData has a full address object, use it directly
const rawAddress = normalizedData.addressJsonb || normalizedData.address_jsonb || {};
const unifiedAddress: UnifiedAddress = normalizeAddress({
  ...rawAddress,
  // Fallback to legacy fields if no JSONB address
  line1: rawAddress.line1 || normalizedData.addressText || '',
  cityName: rawAddress.cityName || normalizedData.city || '',
  stateName: rawAddress.stateName || normalizedData.state || '',
  source: rawAddress.source || 'manual'
});
```

---

## Final Summary Table

| Entity | SupabaseAdapter Fix | Service Layer | End-to-End | Status |
|--------|---------------------|---------------|------------|--------|
| Clients | N/A (already working) | N/A | PASS | PASS |
| Courts | PASS | FAIL (double-serialize) | FAIL | FAIL |
| Judges | PASS | PASS | INCONCLUSIVE | NEEDS RETEST |
| Contacts | PASS | PASS | INCONCLUSIVE | NEEDS RETEST |

---

## Recommended Actions

1. **Immediate:** Fix `courtsService.ts` double-serialization bug
2. **Validation:** Re-run Courts create/edit with address data
3. **Complete:** Create test Judge and Contact records with full address data
4. **Optional:** Add sidebar link to `/qa/masters-qc` for easier QC access

