

# Fix: Google Calendar OAuth Callback -- Missing Session Credentials

## Problem

After updating the redirect URIs in Google Cloud Console, the OAuth flow still fails. The Google consent screen works correctly and redirects back to `/oauth/callback`, but the callback page throws:

**"OAuth credentials expired. Please try connecting again from Settings."**

## Root Cause

There is a disconnect between what `handleConnect` stores and what `OAuthCallback` expects:

1. `CalendarIntegrationPanel.handleConnect()` saves credentials to the backend (edge function) and stores only PKCE verifier + state in `sessionStorage`
2. `OAuthCallback` expects `oauth_google_client_id` and `oauth_google_client_secret` in `sessionStorage` -- but they were **never stored there**

The OAuth redirect to Google wipes the page, and when Google redirects back, `sessionStorage` is missing the client credentials needed for the token exchange.

## Fix

**File: `src/components/admin/CalendarIntegrationPanel.tsx`**

In `handleConnect()`, store the OAuth client credentials in `sessionStorage` before starting the OAuth redirect:

```typescript
// Before calling OAuthManager.startOAuth(), add:
if (settings.provider === 'google') {
  sessionStorage.setItem('oauth_google_client_id', oauthCredentials.googleClientId);
  sessionStorage.setItem('oauth_google_client_secret', oauthCredentials.googleClientSecret);
} else {
  sessionStorage.setItem('oauth_microsoft_client_id', oauthCredentials.microsoftClientId);
  sessionStorage.setItem('oauth_microsoft_client_secret', oauthCredentials.microsoftClientSecret);
  sessionStorage.setItem('oauth_microsoft_tenant', oauthCredentials.microsoftTenant);
}
```

This ensures that when Google redirects back to `/oauth/callback`, the callback page can retrieve the credentials from `sessionStorage` to complete the token exchange.

## Security Note

`sessionStorage` is scoped to the browser tab and cleared when the tab closes. The credentials are only needed temporarily for the token exchange and are cleaned up by `OAuthCallback` after successful connection (lines 99-102).

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/CalendarIntegrationPanel.tsx` | Add `sessionStorage.setItem()` calls for OAuth client credentials in `handleConnect()`, before the `OAuthManager.startOAuth()` call |

