
# Fix: Signatory Phone Duplicate Validation Across Multiple Clients

## Problem Summary

When entering a mobile number for a signatory, the system does not show a warning if the same phone number exists in another client's signatory. The duplicate check code exists in `phoneDuplicateService.ts` but the signatory ID is not being passed through the component chain, preventing proper detection.

## Root Cause

The component chain for signatory phone input:
```
SignatoryModal → SignatoryPhoneManager → PhoneManager → PhoneInput
```

**Issues found:**
1. `SignatoryPhoneManager` does not accept or pass `excludeEntityId` prop
2. `SignatoryModal` does not pass the signatory ID to `SignatoryPhoneManager`

Without the `excludeEntityId`, when editing an existing signatory:
- The duplicate check finds the signatory's own phone and reports it as a duplicate
- This may cause false positives or the check may be silently failing

## Solution

Pass the signatory ID through the component chain so that:
1. When creating a new signatory: no ID is excluded (check all signatories)
2. When editing a signatory: exclude only the current signatory's ID

---

## Files to Modify

### 1. Update SignatoryPhoneManager to Accept excludeEntityId

**File:** `src/components/contacts/SignatoryPhoneManager.tsx`

Add the `excludeEntityId` prop and pass it to `PhoneManager`:

```typescript
interface SignatoryPhoneManagerProps {
  phones: SignatoryPhone[];
  onChange: (phones: SignatoryPhone[]) => void;
  disabled?: boolean;
  excludeEntityId?: string;  // NEW: signatory ID to exclude from duplicate check
}

export const SignatoryPhoneManager: React.FC<SignatoryPhoneManagerProps> = ({
  phones,
  onChange,
  disabled,
  excludeEntityId  // NEW
}) => {
  // ... existing conversion logic ...

  return (
    <PhoneManager
      phones={contactPhones}
      onChange={handleChange}
      disabled={disabled}
      excludeEntityId={excludeEntityId}  // NEW: pass through
    />
  );
};
```

### 2. Update SignatoryModal to Pass Signatory ID

**File:** `src/components/modals/SignatoryModal.tsx`

Pass the current signatory's ID when in edit mode:

```typescript
<SignatoryPhoneManager
  phones={formData.phones}
  onChange={(phones) => {
    setFormData(prev => ({ ...prev, phones }));
    setErrors(prev => ({ ...prev, phones: '' }));
  }}
  disabled={mode === 'view'}
  excludeEntityId={mode === 'edit' ? signatory?.id : undefined}  // NEW
/>
```

---

## Data Flow After Fix

```
User enters phone in Signatory form
         ↓
SignatoryModal passes signatory.id (if editing)
         ↓
SignatoryPhoneManager passes excludeEntityId
         ↓
PhoneManager passes excludeEntityId
         ↓
PhoneInput calls checkPhoneDuplicateDebounced(countryCode, number, callback, excludeEntityId)
         ↓
phoneDuplicateService.checkPhoneDuplicate() checks:
  • client_contacts (Contacts)
  • employees (Employees)
  • clients (Client main phone)
  • courts (Courts)
  • clients.signatories (ALL signatories across ALL clients)
         ↓
Returns matches, excluding the entity with excludeEntityId
         ↓
PhoneInput displays warning if duplicates found
```

---

## Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| New signatory with phone matching signatory in Client A | No warning | Warning: "Number exists for [Name] (Client A)" |
| New signatory with phone matching signatory in Client B | No warning | Warning: "Number exists for [Name] (Client B)" |
| Edit signatory - same phone as before | May show false positive | No warning (excluded) |
| Edit signatory - change to phone matching another signatory | No warning | Warning displayed |

---

## Testing Checklist

After implementation:
1. Create signatory for Client A with phone 9876543210
2. Create signatory for Client B with same phone 9876543210
   - Expected: Warning "This phone number already exists for [Signatory Name] (Client A)"
3. Edit the signatory in Client A
   - Expected: No self-duplicate warning
4. Change phone to match another signatory
   - Expected: Warning about the duplicate
5. Existing duplicate checks still work:
   - Employee phone detection
   - Contact phone detection
   - Client phone detection
   - Court phone detection
