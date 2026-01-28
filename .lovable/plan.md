
# Day 1 Execution Plan: Database Schema & TypeScript Alignment

## Objective
Align database schema and TypeScript contracts with Unified Address Architecture without touching UI or business logic.

---

## Current State Assessment

| Entity | Column | Type | Status |
|--------|--------|------|--------|
| Courts | `address` | TEXT | Exists (needs deprecation comment) |
| Courts | `address_jsonb` | JSONB | ✅ Already migrated |
| Client Contacts | `address` | JSONB | ✅ In DB, ❌ Missing in TypeScript |
| Employees | `address` | JSONB | ❌ **MISSING** - needs creation |
| Employees | `current_address` | TEXT | Exists (legacy - keep) |
| Employees | `permanent_address` | TEXT | Exists (legacy - keep) |

---

## Task 1: Employees Table - Add Unified Address Column

### SQL Migration

```sql
-- Add unified address JSONB column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS address JSONB;

-- Add documentation comment
COMMENT ON COLUMN employees.address IS 
  'Unified structured address replacing legacy current_address/permanent_address fields after migration. 
   Structure: {line1, line2, pincode, cityId, cityName, stateId, stateName, source, addressType, ...}';

-- Create functional index for address searches
CREATE INDEX IF NOT EXISTS idx_employees_address_city 
  ON employees ((address->>'cityName'));
CREATE INDEX IF NOT EXISTS idx_employees_address_state 
  ON employees ((address->>'stateName'));
```

### Verification
- Legacy columns `current_address` and `permanent_address` remain untouched
- RLS policies unaffected (column addition only)
- No data migration in this phase (Day 1 is schema-only)

---

## Task 2: Courts Table - Safe Deprecation Comment

### SQL Migration

```sql
-- Mark legacy TEXT address column as deprecated
COMMENT ON COLUMN courts.address IS 
  'DEPRECATED: Use address_jsonb instead. This TEXT column is preserved for backward compatibility.
   All new writes should target address_jsonb column. Will be removed in future migration.';
```

### Verification
- `address` (TEXT) remains for backward compatibility
- `address_jsonb` (JSONB) continues as primary target
- No data changes

---

## Task 3: Client Contacts - TypeScript Type Safety Fix

### Current State

The database has `client_contacts.address` as JSONB (confirmed in types.ts line 743):
```typescript
// Database type (auto-generated)
address: Json | null  // ✅ Exists
```

But the **service interface** `ClientContact` does not include the address field.

### Required Change

**File: `src/services/clientContactsService.ts`**

Update the `ClientContact` interface to include:
```typescript
export interface ClientContact {
  id: string;
  clientId?: string;
  name: string;
  designation?: string;
  emails: ContactEmail[];
  phones: ContactPhone[];
  // ... existing fields ...
  
  // NEW: Unified address support
  address?: UnifiedAddress;  // Add this field
  
  // ... rest of fields
}
```

**Also update `CreateContactRequest`**:
```typescript
export interface CreateContactRequest {
  name: string;
  // ... existing fields ...
  
  // NEW: Optional address during creation
  address?: PartialAddress;
}
```

**Update the `toClientContact` helper**:
```typescript
function toClientContact(row: any): ClientContact {
  return {
    id: row.id,
    // ... existing fields ...
    
    // NEW: Parse address from DB
    address: row.address ? parseDbAddress(row.address) : undefined,
  };
}
```

### Import Required
```typescript
import { UnifiedAddress, PartialAddress } from '@/types/address';
import { parseDbAddress } from '@/utils/addressUtils';
```

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/new_migration.sql` | CREATE | SQL for employees.address + courts.address comment |
| `src/services/clientContactsService.ts` | EDIT | Add address field to interfaces |

---

## Safety Checklist

- [ ] No legacy columns removed
- [ ] No RLS policy changes
- [ ] No UI component changes
- [ ] No business logic changes
- [ ] Backward compatibility maintained
- [ ] NULL handling safe (all new fields nullable)

---

## Expected Database State After Migration

```text
employees table:
├── current_address (TEXT)    -- Legacy, preserved
├── permanent_address (TEXT)  -- Legacy, preserved
└── address (JSONB)           -- NEW: Unified address

courts table:
├── address (TEXT)            -- DEPRECATED (comment added)
└── address_jsonb (JSONB)     -- Active unified address

client_contacts table:
└── address (JSONB)           -- Already exists, now typed in TS
```

---

## Estimated Effort
- SQL Migration: 5 minutes
- TypeScript updates: 15 minutes
- Testing: 10 minutes
- **Total: ~30 minutes**
