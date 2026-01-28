
# Enhance MastersQC Runner - Address JSONB Persistence Testing

## Objective
Add structured `UnifiedAddress` data to CRUD test payloads for Clients, Courts, Judges, and Contacts entities, and verify address persistence in the READ step.

---

## Current State Analysis

### Existing Test Payloads (Without Address)

| Entity | Current createPayload | Address Field in DB |
|--------|----------------------|---------------------|
| Clients | `display_name`, `email`, `status`... | `address` (JSONB) |
| Client Contacts | `name`, `designation`, `emails`... | `address` (JSONB) |
| Courts | `name`, `type`, `level`... | `address_jsonb` (JSONB) |
| Judges | `name`, `designation`, `status`... | `address` (JSONB) |

### Database Column Mapping

```text
clients.address         → JSONB (accepts JSON.stringify'd UnifiedAddress)
client_contacts.address → JSONB (accepts JSON.stringify'd UnifiedAddress)
courts.address_jsonb    → JSONB (accepts JSON.stringify'd UnifiedAddress)
judges.address          → JSONB (accepts JSON.stringify'd UnifiedAddress)
```

---

## Implementation Plan

### 1. Create Test Address Generator

Add a helper function to generate consistent test address data:

```typescript
// Generate a test UnifiedAddress for QC testing
const generateTestAddress = (entityName: string): string => {
  return JSON.stringify({
    line1: `QC Test Address for ${entityName}`,
    line2: 'Building A, Floor 3',
    pincode: '380001',
    cityId: '',
    cityName: 'Ahmedabad',
    stateId: '',
    stateCode: '24',
    stateName: 'Gujarat',
    countryId: 'IN',
    countryName: 'India',
    landmark: 'Near Test Landmark',
    locality: 'Test Locality',
    district: 'Ahmedabad',
    source: 'manual',
    isPrimary: true
  });
};
```

### 2. Update Entity Test Configurations

**Clients:**
```typescript
{
  name: 'Clients',
  table: 'clients',
  createPayload: {
    display_name: `QC Test Client ${Date.now()}`,
    email: `qc-test-${Date.now()}@test.local`,
    phone: '+91 9999999999',
    status: 'active',
    type: 'Proprietorship',
    state: 'Gujarat',
    city: 'Ahmedabad',
    data_scope: 'TEAM',
    address: generateTestAddress('Clients')  // NEW
  },
  updatePayload: { status: 'inactive' },
  requiredFields: ['display_name'],
  requiresOwner: true,
  verifyFields: ['address']  // NEW - fields to verify in READ
}
```

**Client Contacts:**
```typescript
{
  name: 'Client Contacts',
  table: 'client_contacts',
  createPayload: {
    name: `QC Test Contact ${Date.now()}`,
    designation: 'Manager',
    is_primary: false,
    is_active: true,
    data_scope: 'TEAM',
    emails: [{ email: 'test@example.com', isPrimary: true }],
    phones: [{ countryCode: '+91', number: '9999999999', isPrimary: true }],
    address: generateTestAddress('Client Contacts')  // NEW
  },
  updatePayload: { designation: 'Director' },
  requiredFields: ['name'],
  requiresOwner: true,
  requiresClientLink: true,
  verifyFields: ['address']  // NEW
}
```

**Courts:**
```typescript
{
  name: 'Legal Authorities (Courts)',
  table: 'courts',
  createPayload: {
    name: `QC Test Forum ${Date.now()}`,
    type: 'Tribunal',
    level: 'First Appeal',
    jurisdiction: 'State',
    state: 'Gujarat',
    city: 'Ahmedabad',
    status: 'Active',
    tax_jurisdiction: 'CGST',
    officer_designation: 'Commissioner (Appeals)',
    bench_location: 'Ahmedabad',
    address_jsonb: generateTestAddress('Courts')  // NEW - uses address_jsonb column
  },
  updatePayload: { status: 'Inactive' },
  requiredFields: ['name'],
  verifyFields: ['address_jsonb']  // NEW
}
```

**Judges:**
```typescript
{
  name: 'Judges',
  table: 'judges',
  createPayload: {
    name: `QC Test Judge ${Date.now()}`,
    designation: 'Member (Technical)',
    status: 'Active',
    phone: '+91 9999999999',
    email: `qc-judge-${Date.now()}@test.local`,
    address: generateTestAddress('Judges')  // NEW
  },
  updatePayload: { status: 'Inactive' },
  requiredFields: ['name'],
  verifyFields: ['address']  // NEW
}
```

### 3. Enhance READ Verification

Update the `runEntityTest` function to verify address persistence:

```typescript
// After existing READ logic (line ~322-345)
// Add address verification
if (data && config.verifyFields?.length) {
  const addressVerification = verifyAddressFields(data, config.verifyFields);
  
  if (!addressVerification.passed) {
    entityResults.push({
      entity: config.name,
      operation: 'read',
      status: 'fail',
      duration: performance.now() - readStart,
      errorMessage: `Address verification failed: ${addressVerification.errors.join(', ')}`
    });
  }
}
```

### 4. Add Address Verification Helper

```typescript
interface AddressVerificationResult {
  passed: boolean;
  errors: string[];
}

const verifyAddressFields = (
  data: Record<string, any>, 
  verifyFields: string[]
): AddressVerificationResult => {
  const errors: string[] = [];
  
  for (const field of verifyFields) {
    const value = data[field];
    
    if (!value) {
      errors.push(`${field} is null/undefined`);
      continue;
    }
    
    // Parse if string (JSONB returned as string sometimes)
    let parsed: any;
    try {
      parsed = typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      errors.push(`${field} is not valid JSON`);
      continue;
    }
    
    // Verify required UnifiedAddress fields
    if (!parsed.line1) errors.push(`${field}.line1 is missing`);
    if (!parsed.cityName) errors.push(`${field}.cityName is missing`);
    if (!parsed.stateName) errors.push(`${field}.stateName is missing`);
    if (!parsed.source) errors.push(`${field}.source is missing`);
  }
  
  return {
    passed: errors.length === 0,
    errors
  };
};
```

### 5. Update TestResult Interface

```typescript
interface TestResult {
  entity: string;
  operation: 'create' | 'read' | 'update' | 'delete' | 'verify-address';  // NEW
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: string;
  recordId?: string;
}
```

### 6. Add Address Verification as Separate Test Step

After READ, add explicit address verification step:

```typescript
// VERIFY ADDRESS (after READ, before UPDATE)
if (createdId && config.verifyFields?.length) {
  const verifyStart = performance.now();
  try {
    // Fetch with specific address fields
    const { data, error } = await (supabase as any)
      .from(config.table)
      .select(config.verifyFields.join(', '))
      .eq('id', createdId)
      .single();

    if (error) {
      entityResults.push({
        entity: config.name,
        operation: 'verify-address',
        status: 'fail',
        duration: performance.now() - verifyStart,
        errorCode: error.code,
        errorMessage: error.message
      });
    } else {
      const verification = verifyAddressFields(data, config.verifyFields);
      entityResults.push({
        entity: config.name,
        operation: 'verify-address',
        status: verification.passed ? 'pass' : 'fail',
        duration: performance.now() - verifyStart,
        errorMessage: verification.passed ? undefined : verification.errors.join('; ')
      });
    }
  } catch (err: any) {
    entityResults.push({
      entity: config.name,
      operation: 'verify-address',
      status: 'fail',
      duration: performance.now() - verifyStart,
      errorMessage: err.message
    });
  }
}
```

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/MastersQC.tsx` | EDIT | Add address to payloads, verification logic |

---

## Expected UI Changes

### Test Results Display

```text
Before:
┌────────────────────────────────────────────────────────────┐
│ Clients                        [create][read][update][delete] │
└────────────────────────────────────────────────────────────┘

After:
┌────────────────────────────────────────────────────────────────────┐
│ Clients                [create][read][verify-address][update][delete] │
└────────────────────────────────────────────────────────────────────┘
```

### Example Failure Output

```text
❌ verify-address
   Clients: address.cityName is missing; address.source is missing
```

---

## Test Coverage Summary

| Entity | Address Field | Payload Key | Verification |
|--------|--------------|-------------|--------------|
| Clients | `address` (JSONB) | `address` | line1, cityName, stateName, source |
| Client Contacts | `address` (JSONB) | `address` | line1, cityName, stateName, source |
| Courts | `address_jsonb` (JSONB) | `address_jsonb` | line1, cityName, stateName, source |
| Judges | `address` (JSONB) | `address` | line1, cityName, stateName, source |
| Employees | N/A | (skipped) | N/A |
| Client Groups | N/A | (no address field) | N/A |

---

## Safety Checklist

- Uses existing database columns - no schema changes needed
- Address data is stringified JSON (matches service layer behavior)
- Verification only checks core UnifiedAddress fields
- Existing CRUD test logic unchanged
- New operation type displayed in UI alongside existing badges

---

## Estimated Effort

| Task | Time |
|------|------|
| Add test address generator | ~5 min |
| Update entity payloads | ~10 min |
| Add verification logic | ~15 min |
| Update UI for new operation | ~5 min |
| Testing | ~10 min |
| **Total** | **~45 min** |
