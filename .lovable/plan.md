

# Fix: Google Calendar 403 Error -- Invalid Client ID Format

## Problem

The Google Client ID is being saved with an incorrect format. Network logs show:

```
"value": "http://562061333627-jeok6i23obcf38082a4hsd9hpn6v53mk.apps.googleusercontent.com/"
```

The `http://` prefix and trailing `/` cause Google to reject the OAuth request with a 403 error. The correct format is just:

```
562061333627-jeok6i23obcf38082a4hsd9hpn6v53mk.apps.googleusercontent.com
```

## Solution

Add automatic sanitization of the Google Client ID and other credential fields to strip common copy-paste mistakes (URL prefixes, trailing slashes, whitespace).

## Changes

**File: `src/components/admin/CalendarIntegrationPanel.tsx`**

1. Add a `sanitizeCredential` helper function that strips `http://`, `https://`, and trailing `/` from pasted values
2. Apply it in `handleCredentialChange` so credentials are cleaned on input
3. Also apply it in `saveSettings` and `handleConnect` as a safety net before the values are used

```typescript
// Helper to clean up common copy-paste issues with OAuth credentials
const sanitizeCredential = (value: string): string => {
  return value
    .trim()
    .replace(/^https?:\/\//, '')  // Remove http:// or https:// prefix
    .replace(/\/+$/, '');          // Remove trailing slashes
};
```

Update `handleCredentialChange`:
```typescript
const handleCredentialChange = (key: keyof typeof oauthCredentials, value: string) => {
  const cleanValue = key.includes('ClientId') ? sanitizeCredential(value) : value.trim();
  setOauthCredentials(prev => ({ ...prev, [key]: cleanValue }));
};
```

## Technical Details

- The sanitization is applied specifically to Client ID fields (where URL prefixes are a common mistake)
- Secret fields get basic trim() only since they don't have this issue
- This prevents the 403 error from Google's OAuth endpoint which rejects malformed client IDs

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/CalendarIntegrationPanel.tsx` | Add `sanitizeCredential` helper; apply in `handleCredentialChange` for Client ID fields |

