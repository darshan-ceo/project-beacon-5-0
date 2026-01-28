

# Address Architecture Analysis & Unified Design Proposal

## Current State Analysis

### Entity-Wise Address Storage Patterns

Based on the deep research of the codebase, I found **5 distinct patterns** for address management across entities:

| Entity | Database Column | Data Type | Storage Pattern | Form Component |
|--------|-----------------|-----------|-----------------|----------------|
| **Clients** | `address` | JSONB | Enhanced structured object | `AddressForm`, `SimpleAddressForm` |
| **Courts** | `address` | TEXT | Plain text string | Manual input |
| **Judges** | `address` | JSONB | Enhanced structured object | `AddressForm` |
| **Employees** | `current_address`, `permanent_address` | TEXT | Plain text strings | Manual input |
| **Contacts** | N/A | N/A | No address field exists | N/A |

---

## Key Architectural Differences

### 1. Clients (Most Advanced)
```typescript
// Database: JSONB
// TypeScript: EnhancedAddressData
interface ClientAddress {
  line1: string;
  line2?: string;
  landmark?: string;
  locality?: string;
  district?: string;
  cityId?: string;
  cityName?: string;      // Display name
  stateId?: string;
  stateCode?: string;     // GST state code
  stateName?: string;     // Display name
  countryId?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  source?: 'manual' | 'gsp' | 'public' | 'edited';
}
```
**Features:**
- GST integration via `gstAddressMapper.ts`
- Source tracking (manual, GST portal, public API)
- Cascading dropdowns (Country → State → City)
- City master with custom city addition
- Address configuration per module
- Jurisdiction mapping from GST data

### 2. Courts/Legal Forums (Legacy)
```typescript
// Database: TEXT
// TypeScript: string
address: string;  // "Room 101, High Court Building, Ahmedabad"
```
**Issues:**
- No structured data for filtering/searching
- No geocoding capability
- No pincode validation
- Inconsistent with client addresses

### 3. Judges (Partial Enhanced)
```typescript
// Database: JSONB (but rarely populated)
// TypeScript: EnhancedAddressData
address?: EnhancedAddressData;
```
**Issues:**
- Form component exists but rarely used
- Most judges have no address stored
- Address is optional, not tied to court location

### 4. Employees (Split Fields)
```typescript
// Database: TEXT, TEXT
current_address?: string;
permanent_address?: string;
city?: string;
state?: string;
pincode?: string;
```
**Issues:**
- Two separate address fields (current/permanent)
- City, state, pincode as separate columns
- No structured JSONB storage
- No source tracking
- No GST integration

### 5. Contacts (Missing)
```typescript
// Database: No address column
// Only has emails and phones JSONB arrays
```
**Issues:**
- Contacts cannot have addresses
- Business contacts often need mailing addresses

---

## Address Service Layer Analysis

### Existing Services

| Service | Purpose | Used By |
|---------|---------|---------|
| `addressMasterService.ts` | Central CRUD for addresses with entity linking | Not fully integrated |
| `addressLookupService.ts` | State/City/Country dropdown data | AddressForm |
| `addressConfigService.ts` | Per-module field visibility/validation config | AddressForm |
| `gstAddressMapper.ts` | GST API address → EnhancedAddressData | Client GST autofill |
| `cityMasterService.ts` | Custom city addition to master | AddressForm |

### Critical Gap: `addressMasterService` Not Utilized

The `addressMasterService` was designed as a central address registry with entity linking:

```typescript
interface AddressLink {
  id: string;
  addressId: string;
  entityType: 'employee' | 'judge' | 'client' | 'court';
  entityId: string;
  isPrimary: boolean;
}
```

**However**, this is currently an **in-memory implementation** with no database persistence. Entities still store addresses inline rather than referencing a central `addresses` table.

---

## Proposed Unified Architecture

### Option A: Normalize to Central Addresses Table (Enterprise Pattern)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         addresses (new table)                       │
├─────────────────────────────────────────────────────────────────────┤
│ id (UUID PK)                                                        │
│ tenant_id (UUID FK)                                                 │
│ line1, line2, landmark, locality, district (TEXT)                   │
│ city_id, state_id, country_id (UUID FK to masters)                  │
│ city_name, state_name (TEXT - denormalized for display)             │
│ pincode (VARCHAR 6)                                                 │
│ lat, lng (NUMERIC - optional geocoding)                             │
│ source ('manual' | 'gsp' | 'public' | 'imported')                   │
│ created_at, updated_at (TIMESTAMP)                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    clients    │    │    courts     │    │   employees   │
│ address_id FK │    │ address_id FK │    │ current_addr  │
│               │    │               │    │ permanent_addr│
└───────────────┘    └───────────────┘    └───────────────┘
```

**Pros:**
- Single source of truth
- Reusable addresses across entities
- Easy to add address to any entity
- Consistent validation
- Enables address deduplication

**Cons:**
- Migration complexity
- Breaking change for existing integrations
- Additional JOINs for reads

---

### Option B: Standardize JSONB Format (Recommended)

Simpler approach: Keep inline storage but enforce identical JSONB structure everywhere.

```text
Step 1: Database Migration
────────────────────────────────────────────────────────────────
1. ALTER courts.address from TEXT → JSONB
2. ALTER employees: add address JSONB, deprecate current_address/permanent_address
3. ADD client_contacts.address JSONB (nullable)
4. Ensure judges.address uses consistent schema

Step 2: Unified TypeScript Interface
────────────────────────────────────────────────────────────────
// Single canonical interface for ALL entities
interface UnifiedAddress {
  // Core fields (always present)
  line1: string;
  line2?: string;
  pincode: string;
  
  // Location hierarchy
  cityId?: string;
  cityName: string;        // Always populated
  stateId?: string;
  stateName: string;       // Always populated
  countryId?: string;
  countryName?: string;
  
  // Enhanced fields (optional)
  landmark?: string;
  locality?: string;
  district?: string;
  stateCode?: string;      // For GST integration
  
  // Geocoding (optional)
  lat?: number;
  lng?: number;
  
  // Metadata
  source: 'manual' | 'gsp' | 'public' | 'imported' | 'edited';
  isPrimary?: boolean;     // For multi-address entities
  addressType?: 'registered' | 'correspondence' | 'current' | 'permanent';
}

Step 3: Shared Form Component
────────────────────────────────────────────────────────────────
// Unified form for all entities
<UnifiedAddressForm
  value={address}
  onChange={setAddress}
  module="client" | "court" | "judge" | "employee" | "contact"
  mode="create" | "edit" | "view"
  showGSTIntegration={true/false}
  showGeocoding={true/false}
/>

Step 4: Adapter Pattern for Services
────────────────────────────────────────────────────────────────
// Each entity service uses shared adapter
import { normalizeAddress, serializeAddress } from '@/utils/addressUtils';

// On read: Parse JSONB → UnifiedAddress
// On write: Validate → Serialize → JSONB
```

---

## Implementation Plan

### Phase 1: Unify TypeScript Types (1-2 days)

1. Create `src/types/address.ts`:
```typescript
export interface UnifiedAddress {
  line1: string;
  line2?: string;
  landmark?: string;
  locality?: string;
  district?: string;
  cityId?: string;
  cityName: string;
  stateId?: string;
  stateCode?: string;
  stateName: string;
  countryId?: string;
  countryName?: string;
  pincode: string;
  lat?: number;
  lng?: number;
  source: AddressSource;
  addressType?: AddressType;
  isPrimary?: boolean;
}

export type AddressSource = 'manual' | 'gsp' | 'public' | 'imported' | 'edited';
export type AddressType = 'registered' | 'correspondence' | 'current' | 'permanent';
```

2. Create `src/utils/addressUtils.ts`:
```typescript
export function normalizeAddress(raw: any): UnifiedAddress;
export function serializeAddress(addr: UnifiedAddress): string;
export function validateAddress(addr: Partial<UnifiedAddress>): ValidationResult;
export function formatDisplayAddress(addr: UnifiedAddress): string;
export function compareAddresses(a: UnifiedAddress, b: UnifiedAddress): boolean;
```

### Phase 2: Database Alignment (Migration)

```sql
-- Convert courts.address from TEXT to JSONB
ALTER TABLE courts ADD COLUMN address_new JSONB;
UPDATE courts SET address_new = jsonb_build_object(
  'line1', address,
  'cityName', city,
  'stateName', state,
  'source', 'manual'
) WHERE address IS NOT NULL;
ALTER TABLE courts DROP COLUMN address;
ALTER TABLE courts RENAME COLUMN address_new TO address;

-- Add address to client_contacts
ALTER TABLE client_contacts ADD COLUMN address JSONB;

-- Add unified address to employees (keep legacy for migration)
ALTER TABLE employees ADD COLUMN address JSONB;
COMMENT ON COLUMN employees.address IS 'Unified address replacing current_address/permanent_address';
```

### Phase 3: Unified AddressForm Component

Refactor existing `AddressForm.tsx` to:
1. Accept `module` prop to configure field visibility
2. Support `addressType` for multi-address entities (employees)
3. Use shared validation from `addressUtils.ts`
4. Handle legacy TEXT → JSONB parsing gracefully

### Phase 4: Service Layer Updates

Update each entity service to use shared address utilities:
- `clientsService.ts` - Already uses JSONB, add normalization
- `courtsService.ts` - Parse/serialize JSONB instead of TEXT
- `judgesService.ts` - Ensure consistent JSONB handling
- `employeesService.ts` - Migrate to single address field
- `clientContactsService.ts` - Add address support

---

## Technical Recommendations

### Do First
1. Create shared types (`UnifiedAddress`) without changing existing code
2. Create adapter functions that can parse both legacy and new formats
3. Add database migration with backward compatibility

### Avoid
1. Breaking existing GST integration
2. Changing RLS policies unexpectedly
3. Removing legacy fields before full migration

### Testing Strategy
1. Unit tests for address parsing/normalization
2. Integration tests for GST autofill flow
3. E2E tests for each entity CRUD with addresses

---

## Summary

| Aspect | Current State | Proposed State |
|--------|---------------|----------------|
| Type Definition | 3+ different interfaces | 1 `UnifiedAddress` |
| Database Storage | TEXT/JSONB mixed | JSONB everywhere |
| Form Component | AddressForm + SimpleAddressForm | UnifiedAddressForm |
| Validation | Scattered in services | Centralized in `addressUtils` |
| GST Integration | Client only | Available for all entities |
| Source Tracking | Client only | All entities |

This architecture ensures **single source of design** while maintaining backward compatibility and enabling gradual migration.

