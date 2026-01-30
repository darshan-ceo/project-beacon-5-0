
# Employee Management Improvements: Password Error Message & Designation List

## Summary

Two issues need to be addressed in the Employee Management module:

1. **Password Error Message**: When a similar/reused password is detected, the error should display "Password already used. Please create a different password." instead of a generic edge function error.

2. **Designation Dropdown Update**: Replace the current designation list with the client-specified job titles.

---

## Issue 1: Password Error Message Improvement

### Current Behavior
When creating an employee with a password that has been used before (detected via HaveIBeenPwned), the system shows:
- "Failed to create employee: Edge Function returned a non-2xx status code"

### Expected Behavior
Display a clear, user-friendly message:
- "Password already used. Please create a different password."

### Technical Changes

#### File 1: Edge Function - `supabase/functions/invite-employee/index.ts`

Current error detection (lines 341-347):
```javascript
const errorMsg = authError?.message?.toLowerCase() || '';
if (errorMsg.includes('weak') && (errorMsg.includes('known') || ...)) {
  throw new Error('Password rejected: This password has appeared in ...');
}
```

Add new detection for "same_password" or password reuse errors:
```javascript
// Add detection for password reuse/same password error
if (errorMsg.includes('same_password') || 
    errorMsg.includes('previously used') || 
    errorMsg.includes('password reuse') ||
    errorMsg.includes('already used')) {
  throw new Error('Password already used. Please create a different password.');
}
```

#### File 2: Client-Side Error Utility - `src/utils/errorUtils.ts`

Update `getPasswordErrorMessage()` function to detect reused password errors:

```javascript
// Add BEFORE the existing weak password check (around line 147)

// Password reuse detection
if (lowerMessage.includes('already used') || 
    lowerMessage.includes('same_password') ||
    lowerMessage.includes('previously used') ||
    lowerMessage.includes('password reuse')) {
  return {
    title: 'Password Already Used',
    description: 'This password has been used before. Please create a different password.',
    guidance: [
      'Choose a password you have not used previously',
      'Use a unique combination of characters',
      'Consider using a password manager to track unique passwords'
    ]
  };
}
```

#### File 3: Employee Modal Error Handling - `src/components/modals/EmployeeModalV2.tsx`

Update the error handling (lines 683-689) to use password-specific error detection:

```javascript
// Import at top of file
import { getPasswordErrorMessage } from '@/utils/errorUtils';

// In catch block (lines 683-689)
} catch (error) {
  console.error('Employee save error:', error);
  
  // Check if this is a password-related error
  const errorMsg = error instanceof Error ? error.message : String(error);
  const isPasswordError = errorMsg.toLowerCase().includes('password');
  
  if (isPasswordError) {
    const passwordError = getPasswordErrorMessage(error);
    toast({
      title: passwordError.title,
      description: passwordError.description,
      variant: 'destructive',
    });
  } else {
    toast({
      title: 'Error',
      description: errorMsg || 'Failed to save employee',
      variant: 'destructive',
    });
  }
}
```

---

## Issue 2: Designation Dropdown Update

### Current List (lines 64-74 in EmployeeModalV2.tsx)
```javascript
const designations = [
  'Sr. Partner',
  'Associate',
  'CA',
  'Advocate',
  'Paralegal',
  'Research Analyst',
  'Clerk',
  'Intern',
  'IT/Support',
];
```

### New List (Client Requirement)
```javascript
const designations = [
  'Managing Partner',
  'Senior Partner',
  'Partner',
  'Associate Partner',
  'Director',
  'Associate Director',
  'Sr. Manager',
  'Manager',
  'Deputy Manager',
  'Assistant Manager',
  'Sr. Executive',
  'Executive',
  'Senior Article',
  'Article',
];
```

### Technical Change

#### File: `src/components/modals/EmployeeModalV2.tsx`

Replace lines 64-74 with the new designation list.

**Impact Note**: The `showConditionalField()` function (line 695) checks for specific designations like `'Advocate'`, `'Sr. Partner'`, `'CA'` to show/hide credential fields (Bar Council No., ICAI No.). Since these designations are being removed, we should update the conditional logic:

Current (line 1274):
```javascript
{showConditionalField(formData.designation, ['Advocate', 'Sr. Partner']) && (
  // Bar Council Registration No.
)}
```

Updated:
```javascript
// Bar Council - relevant for Partner-level and legal designations
{showConditionalField(formData.designation, ['Managing Partner', 'Senior Partner', 'Partner', 'Associate Partner']) && (
  // Bar Council Registration No.
)}
```

Current (line 1287):
```javascript
{showConditionalField(formData.designation, ['CA', 'Sr. Partner', 'Associate']) && (
  // ICAI Membership No.
)}
```

Updated:
```javascript
// ICAI - relevant for Partner and Director level (likely CA-qualified)
{showConditionalField(formData.designation, ['Managing Partner', 'Senior Partner', 'Partner', 'Associate Partner', 'Director', 'Associate Director']) && (
  // ICAI Membership No.
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/invite-employee/index.ts` | Add password reuse error detection (lines 341-347) |
| `src/utils/errorUtils.ts` | Add password reuse case in `getPasswordErrorMessage()` |
| `src/components/modals/EmployeeModalV2.tsx` | Update designations array + conditional field logic + password error handling |

---

## Testing Checklist

1. Create new employee with a password that triggers reuse detection - verify message shows "Password already used. Please create a different password."
2. Create new employee with weak/breached password - verify existing breach detection still works
3. Create new employee successfully with valid password
4. Verify Designation dropdown shows all 14 new options
5. Select "Senior Partner" designation - verify Bar Council and ICAI fields appear
6. Select "Manager" designation - verify credential fields are hidden
7. Edit existing employee with old designation value - verify form loads correctly
