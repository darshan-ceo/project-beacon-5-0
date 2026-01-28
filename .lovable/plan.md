
# Day 5: Create UnifiedAddressForm Component

## Objective
Create a contract layer component that wraps the existing `AddressForm` while exposing the Unified Address Architecture interface. This enables consumers to use the typed `UnifiedAddress`/`PartialAddress` interface while leveraging the existing UI implementation.

---

## Component Design

### Props Interface

```typescript
interface UnifiedAddressFormProps {
  // Core data binding
  value: UnifiedAddress | PartialAddress;
  onChange: (address: UnifiedAddress) => void;
  
  // Module configuration
  module: AddressModule;  // 'client' | 'court' | 'judge' | 'employee' | 'contact'
  mode: 'create' | 'edit' | 'view';
  
  // Feature toggles (optional - defaults from ADDRESS_MODULE_CONFIGS)
  showGSTIntegration?: boolean;
  showGeocoding?: boolean;
  addressType?: AddressType;
  
  // GST integration props
  gstin?: string;
  onGSTAddressSelect?: (address: UnifiedAddress) => void;
  
  // Standard form props
  disabled?: boolean;
  required?: boolean;
  className?: string;
}
```

### Internal Mapping Strategy

The component will:
1. **Normalize incoming `value`** via `normalizeAddress()` before passing to `AddressForm`
2. **Map `module` to `ModuleName`** for legacy `AddressForm` compatibility
3. **Convert `AddressForm` output** back to `UnifiedAddress` via `normalizeAddress()` in the `onChange` handler
4. **Derive defaults** from `ADDRESS_MODULE_CONFIGS` when optional props not provided
5. **Handle `mode='view'`** by setting `disabled=true`

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Consumer Component                            │
│  (ClientModal, JudgeForm, EmployeeModal, etc.)                       │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     UnifiedAddressForm                               │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ Props: value (UnifiedAddress), onChange, module, mode       │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│         normalizeAddress(value) ──► Normalized UnifiedAddress        │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │              Existing AddressForm                            │     │
│  │  Props: value (EnhancedAddressData), onChange, module...    │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│         onChange handler ──► normalizeAddress(output)                │
│                              │                                       │
│                              ▼                                       │
│         Callback: onChange(UnifiedAddress)                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/ui/UnifiedAddressForm.tsx` | Wrapper component |

---

## Implementation Details

### 1. Module Type Mapping

The existing `AddressForm` uses `ModuleName` from `addressConfigService`:
```typescript
type ModuleName = 'employee' | 'judge' | 'client' | 'court';
```

The `AddressModule` from `types/address.ts` adds `'contact'`:
```typescript
type AddressModule = 'client' | 'court' | 'judge' | 'employee' | 'contact';
```

The wrapper will map `'contact'` to `'client'` for legacy compatibility.

### 2. Mode Handling

| Mode | Behavior |
|------|----------|
| `'create'` | `disabled=false`, `required` based on module config |
| `'edit'` | `disabled=false`, `required` based on module config |
| `'view'` | `disabled=true`, fields read-only |

### 3. Feature Flag Defaults

When `showGSTIntegration` or `showGeocoding` are not explicitly provided, defaults are derived from `ADDRESS_MODULE_CONFIGS[module]`.

### 4. GST Integration Passthrough

The component will:
- Pass `gstin` and `onGSTAddressSelect` directly to `AddressForm`
- Wrap `onGSTAddressSelect` callback to ensure output is `UnifiedAddress`

---

## Component Code Structure

```typescript
import React, { useMemo, useCallback } from 'react';
import { AddressForm } from '@/components/ui/AddressForm';
import { 
  UnifiedAddress, 
  PartialAddress, 
  AddressModule, 
  AddressType,
  ADDRESS_MODULE_CONFIGS,
  EMPTY_ADDRESS
} from '@/types/address';
import { normalizeAddress } from '@/utils/addressUtils';
import { ModuleName } from '@/services/addressConfigService';
import { EnhancedAddressData } from '@/services/addressMasterService';

interface UnifiedAddressFormProps {
  value: UnifiedAddress | PartialAddress;
  onChange: (address: UnifiedAddress) => void;
  module: AddressModule;
  mode: 'create' | 'edit' | 'view';
  showGSTIntegration?: boolean;
  showGeocoding?: boolean;
  addressType?: AddressType;
  gstin?: string;
  onGSTAddressSelect?: (address: UnifiedAddress) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const UnifiedAddressForm: React.FC<UnifiedAddressFormProps> = ({
  value,
  onChange,
  module,
  mode,
  showGSTIntegration,
  showGeocoding,
  addressType,
  gstin,
  onGSTAddressSelect,
  disabled,
  required,
  className
}) => {
  // Get module configuration
  const moduleConfig = ADDRESS_MODULE_CONFIGS[module];
  
  // Map AddressModule to legacy ModuleName
  const legacyModule: ModuleName = module === 'contact' ? 'client' : module;
  
  // Normalize value for AddressForm
  const normalizedValue = useMemo(() => normalizeAddress(value), [value]);
  
  // Determine feature flags
  const gstEnabled = showGSTIntegration ?? moduleConfig.showGSTIntegration;
  
  // Handle mode
  const isDisabled = disabled ?? (mode === 'view');
  const isRequired = required ?? (mode !== 'view');
  
  // Wrap onChange to normalize output
  const handleChange = useCallback((data: EnhancedAddressData | AddressData) => {
    const normalized = normalizeAddress(data);
    // Preserve addressType if set
    if (addressType) normalized.addressType = addressType;
    onChange(normalized);
  }, [onChange, addressType]);
  
  // Wrap GST callback
  const handleGSTAddressSelect = useCallback((data: EnhancedAddressData) => {
    const normalized = normalizeAddress(data);
    if (addressType) normalized.addressType = addressType;
    onGSTAddressSelect?.(normalized);
  }, [onGSTAddressSelect, addressType]);
  
  return (
    <AddressForm
      value={normalizedValue}
      onChange={handleChange}
      module={legacyModule}
      showGSTIntegration={gstEnabled}
      gstin={gstin}
      onGSTAddressSelect={onGSTAddressSelect ? handleGSTAddressSelect : undefined}
      disabled={isDisabled}
      required={isRequired}
      className={className}
    />
  );
};

export default UnifiedAddressForm;
```

---

## Example Usage Snippets

### 1. Client Modal (with GST Integration)

```typescript
import { UnifiedAddressForm } from '@/components/ui/UnifiedAddressForm';
import { UnifiedAddress, PartialAddress } from '@/types/address';

const ClientModal = () => {
  const [address, setAddress] = useState<PartialAddress>({});
  
  return (
    <UnifiedAddressForm
      value={address}
      onChange={setAddress}
      module="client"
      mode="edit"
      showGSTIntegration={true}
      gstin={clientData.gstin}
      onGSTAddressSelect={(addr) => {
        setAddress(addr);
        toast.success('GST address populated');
      }}
    />
  );
};
```

### 2. Court Modal (Basic)

```typescript
<UnifiedAddressForm
  value={courtData.address || {}}
  onChange={(addr) => setCourtData(prev => ({ ...prev, address: addr }))}
  module="court"
  mode={isEditing ? 'edit' : 'view'}
/>
```

### 3. Employee Modal (with Address Type)

```typescript
<UnifiedAddressForm
  value={employee.currentAddress}
  onChange={(addr) => updateAddress('current', addr)}
  module="employee"
  mode="edit"
  addressType="current"
/>

<UnifiedAddressForm
  value={employee.permanentAddress}
  onChange={(addr) => updateAddress('permanent', addr)}
  module="employee"
  mode="edit"
  addressType="permanent"
/>
```

### 4. Judge Form (View Mode)

```typescript
<UnifiedAddressForm
  value={judge.address}
  onChange={() => {}} // No-op in view mode
  module="judge"
  mode="view"
/>
```

---

## Backward Compatibility

| Existing Component | Status | Migration Path |
|-------------------|--------|----------------|
| `AddressForm` | PRESERVED | Used internally by UnifiedAddressForm |
| `SimpleAddressForm` | PRESERVED | Alternative for simple text-only forms |
| `AddressView` | PRESERVED | Separate read-only display component |

---

## Safety Checklist

- No deletion of existing components
- No UI redesign
- No database changes
- No RLS policy changes
- GST integration behavior preserved
- Existing AddressForm consumers unaffected

---

## Technical Considerations

1. **Type Compatibility**: `UnifiedAddress` is compatible with `EnhancedAddressData` through `normalizeAddress()` which handles all field name variations
2. **Memoization**: Using `useMemo` for normalization and `useCallback` for handlers to prevent unnecessary re-renders
3. **Module Fallback**: `'contact'` module maps to `'client'` config since AddressForm doesn't have contact-specific config
4. **GST Flow Preserved**: All GST-related props pass through to AddressForm unchanged

---

## Estimated Effort
- Component creation: ~15 minutes
- Documentation: ~5 minutes
- **Total: ~20 minutes**
