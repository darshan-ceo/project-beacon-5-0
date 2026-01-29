
# Plan: Improve Password Error Messages with Leaked Password Guidance

## Problem Summary

When users attempt to change passwords, they may encounter a cryptic error message: **"Password is known to be weak and easy to guess"** from the backend's HaveIBeenPwned integration. This error is unclear because:
- It doesn't explain *why* the password was rejected
- It doesn't clarify that the password was found in a **leaked password database**
- It offers no actionable guidance on creating a stronger password

## How the Backend Security Works

The project uses Supabase Auth with **Leaked Password Protection** enabled. When a password is set/changed:
1. Supabase Auth queries the HaveIBeenPwned.org Pwned Passwords API
2. If the password hash matches a known leaked password, the operation is rejected
3. The error message returned is: `"Password is known to be weak and easy to guess"`

This applies to **all user roles** equally (Partner, Admin, Manager, CA, Advocate, Staff, etc.) - the error is about the password itself, not the user's role.

## Solution Overview

Create a centralized password error handling utility that:
1. Detects leaked password errors specifically
2. Provides clear, actionable guidance
3. Is used consistently across all password-related flows

---

## Implementation Details

### 1. Add Password Error Mapping to Error Utilities

**File:** `src/utils/errorUtils.ts`

Add a new function specifically for password-related errors that maps the backend error to user-friendly guidance:

```typescript
export function getPasswordErrorMessage(err: unknown): { 
  title: string; 
  description: string; 
  guidance?: string[];
} {
  const rawMessage = getErrorMessage(err);
  const lowerMessage = rawMessage.toLowerCase();
  
  // Leaked password detection
  if (lowerMessage.includes('weak') && 
      (lowerMessage.includes('known') || lowerMessage.includes('guess'))) {
    return {
      title: 'Password Found in Data Breach',
      description: 'This password has appeared in a known data breach and cannot be used.',
      guidance: [
        'Choose a unique password not used on other websites',
        'Use at least 12 characters with uppercase, lowercase, numbers, and symbols',
        'Consider using a password manager to generate secure passwords',
        'Avoid common words, names, or patterns like "Password123"'
      ]
    };
  }
  
  // Other password validations...
  if (lowerMessage.includes('too short') || lowerMessage.includes('at least')) {
    return {
      title: 'Password Too Short',
      description: 'Password must be at least 8 characters long.',
      guidance: ['Use a longer password with a mix of characters']
    };
  }
  
  // Generic weak password
  if (lowerMessage.includes('weak')) {
    return {
      title: 'Password Too Weak',
      description: 'Please choose a stronger password.',
      guidance: [
        'Include uppercase and lowercase letters',
        'Add numbers and special characters (!@#$%^&*)',
        'Avoid common patterns or dictionary words'
      ]
    };
  }
  
  return {
    title: 'Password Error',
    description: rawMessage || 'Failed to update password'
  };
}
```

### 2. Create a Reusable Password Error Alert Component

**File:** `src/components/ui/password-error-alert.tsx` (new file)

Create a component that displays password errors with structured guidance:

```typescript
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface PasswordErrorAlertProps {
  title: string;
  description: string;
  guidance?: string[];
}

export function PasswordErrorAlert({ title, description, guidance }: PasswordErrorAlertProps) {
  return (
    <Alert variant="destructive" className="mt-4">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{description}</p>
        {guidance && guidance.length > 0 && (
          <div className="mt-3">
            <p className="font-medium text-sm">Tips for a secure password:</p>
            <ul className="mt-1 space-y-1">
              {guidance.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-3 w-3 mt-1 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

### 3. Update UserProfile Password Change Handler

**File:** `src/components/admin/UserProfile.tsx`

Update the `handleChangePassword` function to use improved error handling:

```typescript
// Import the new utility
import { getPasswordErrorMessage } from '@/utils/errorUtils';

const handleChangePassword = async () => {
  // ... validation code stays the same ...

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully.",
    });
    // Clear fields...
  } catch (error: any) {
    const passwordError = getPasswordErrorMessage(error);
    toast({
      title: passwordError.title,
      description: passwordError.guidance 
        ? `${passwordError.description} ${passwordError.guidance[0]}`
        : passwordError.description,
      variant: "destructive"
    });
  }
};
```

### 4. Update ResetPassword Page

**File:** `src/pages/ResetPassword.tsx`

Add state to store and display detailed password errors with guidance:

```typescript
import { getPasswordErrorMessage } from '@/utils/errorUtils';
import { PasswordErrorAlert } from '@/components/ui/password-error-alert';

// Add state for password error
const [passwordError, setPasswordError] = useState<{
  title: string;
  description: string;
  guidance?: string[];
} | null>(null);

// In handleSubmit:
try {
  const { error } = await updatePassword(password);
  if (error) {
    const errorInfo = getPasswordErrorMessage(error);
    setPasswordError(errorInfo);
    toast({
      title: errorInfo.title,
      description: errorInfo.description,
      variant: 'destructive'
    });
    return;
  }
  // Success handling...
} catch (error: any) {
  const errorInfo = getPasswordErrorMessage(error);
  setPasswordError(errorInfo);
}

// In the JSX, display the error alert:
{passwordError && (
  <PasswordErrorAlert 
    title={passwordError.title}
    description={passwordError.description}
    guidance={passwordError.guidance}
  />
)}
```

### 5. Update Edge Functions for Clearer Backend Messages

**File:** `supabase/functions/invite-employee/index.ts`

Improve error handling to provide specific leaked password messages:

```typescript
if (authError) {
  console.error('[invite-employee] Auth error:', authError);
  
  // Detect leaked password error
  const errorMsg = authError.message?.toLowerCase() || '';
  if (errorMsg.includes('weak') && (errorMsg.includes('known') || errorMsg.includes('guess'))) {
    throw new Error('Password rejected: This password has appeared in a data breach. Please use a unique, strong password that is not used elsewhere.');
  }
  
  throw new Error(`Failed to create user: ${authError?.message}`);
}
```

**File:** `supabase/functions/provision-portal-user/index.ts`

Apply similar improvements to portal user password handling:

```typescript
const errorMessage = updateError.message?.includes('weak') 
  ? 'Password rejected: This password appears in a known data breach database. Please choose a unique password with at least 12 characters, including uppercase, lowercase, numbers, and symbols.'
  : updateError.message;
```

---

## Files to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `src/utils/errorUtils.ts` | Modify | Add `getPasswordErrorMessage()` function with leaked password detection |
| `src/components/ui/password-error-alert.tsx` | Create | New component for displaying password errors with guidance tips |
| `src/components/admin/UserProfile.tsx` | Modify | Update `handleChangePassword()` to use new error handling |
| `src/pages/ResetPassword.tsx` | Modify | Add password error state and display component |
| `supabase/functions/invite-employee/index.ts` | Modify | Improve error messages for leaked passwords |
| `supabase/functions/provision-portal-user/index.ts` | Modify | Improve error messages for leaked passwords |

---

## User Experience After Fix

When a user tries to set a password that exists in the HaveIBeenPwned database:

**Before:**
> "Password is known to be weak and easy to guess"

**After:**
> **Password Found in Data Breach**
>
> This password has appeared in a known data breach and cannot be used.
>
> **Tips for a secure password:**
> - Choose a unique password not used on other websites
> - Use at least 12 characters with uppercase, lowercase, numbers, and symbols
> - Consider using a password manager to generate secure passwords
> - Avoid common words, names, or patterns like "Password123"

---

## Testing Checklist

1. **UserProfile password change:** Enter a commonly leaked password (e.g., "Password123!") and verify the improved error message appears
2. **Reset Password page:** Test with a weak password and confirm guidance is displayed
3. **Employee creation:** Create an employee with a leaked password and verify the clear error message
4. **Client portal password:** Set a portal password that's in the breach database and check error clarity
5. **Success case:** Verify strong, unique passwords still work correctly

