

# Fix Google Calendar Sync: Auto Token Refresh + Setup Guide

## Problem
Google Calendar OAuth access tokens expire after ~1 hour. The edge function has a `TODO: Implement token refresh logic here` placeholder that was never completed. This causes all calendar syncs to fail with "Not Synced" after initial connection.

## Root Cause (Line 507 of manage-secrets/index.ts)
```
// TODO: Implement token refresh logic here
return Response({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, 401)
```

## Solution: 4 File Changes

### 1. Edge Function: Implement Token Refresh (`supabase/functions/manage-secrets/index.ts`)

Replace the TODO block (lines 505-512) with full refresh logic:
- When token is expired, use stored `refresh_token` + `client_id` + `client_secret` to call Google's `https://oauth2.googleapis.com/token` endpoint (or Microsoft's equivalent)
- On success: save the refreshed tokens back to database, return fresh access token
- On failure: update `calendar_integrations.connection_status` to `'expired'`, return `TOKEN_REFRESH_FAILED` error code
- Supports both Google and Outlook providers

### 2. Save Client Credentials with Tokens (`src/pages/OAuthCallback.tsx`)

On line 92, expand the `saveTokens` call to include `client_id` and `client_secret` from sessionStorage so they're persisted server-side for future refresh calls:
```typescript
await integrationsService.saveTokens(storageProvider, {
  access_token, refresh_token, expires_at, user_email,
  client_id: storedClientId,       // NEW
  client_secret: storedClientSecret, // NEW
  tenant_id: storedTenant,          // NEW (Microsoft only)
});
```

### 3. Expand Token Type (`src/services/integrationsService.ts`)

Update the `saveTokens` method signature (line 135) to accept the new fields:
- `client_id?: string`
- `client_secret?: string`
- `tenant_id?: string`

### 4. Handle Refresh Failure in Provider (`src/services/calendar/googleCalendarProvider.ts`)

Update `getValidAccessToken()` to detect `TOKEN_REFRESH_FAILED` error code and show a specific "please reconnect" message instead of a generic error.

---

## What Users Need to Do (Google Calendar Side)

For the auto-refresh to work, your Google Cloud Console OAuth app must be configured correctly:

### Google Cloud Console Setup Checklist

1. **Go to** [Google Cloud Console > APIs & Credentials](https://console.cloud.google.com/apis/credentials)

2. **Enable Google Calendar API**:
   - Go to "APIs & Services" > "Library"
   - Search "Google Calendar API" and click **Enable**

3. **OAuth Consent Screen**:
   - Type: **External** (or Internal for Workspace orgs)
   - App name: Your firm name (e.g., "ABC Legal - Case Management")
   - Scopes: Add `https://www.googleapis.com/auth/calendar` and `https://www.googleapis.com/auth/calendar.events`
   - Add your domain under "Authorized domains"

4. **OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized redirect URI: `https://project-beacon-5-0.lovable.app/oauth/callback`
   - Copy the **Client ID** and **Client Secret**

5. **Important**: If the app is in "Testing" mode, add your Google account email under "Test users". For production, submit for verification.

6. **Ensure `access_type=offline`**: This is already handled in the app's OAuth flow -- it requests `access_type=offline` which triggers Google to issue a `refresh_token`.

### Application Side Setup

1. Go to **Settings > Integrations > Calendar Integration**
2. Select **Google Calendar** as provider
3. Paste your **Client ID** and **Client Secret** from Google Cloud Console
4. Click **Connect** -- you'll be redirected to Google to authorize
5. After authorization, the system stores credentials securely (encrypted) including the refresh token
6. Hearings will now sync automatically and tokens refresh silently in the background

### If Currently Broken (Existing Users)

Since existing saved tokens don't have `client_id`/`client_secret` stored alongside them, existing users must **reconnect once**:
1. Go to Settings > Integrations
2. Click **Disconnect** on Google Calendar
3. Re-enter Client ID and Client Secret
4. Click **Connect** again
5. From this point forward, tokens will auto-refresh indefinitely

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/manage-secrets/index.ts` | Replace TODO with full Google/Outlook token refresh logic (~120 new lines) |
| `src/pages/OAuthCallback.tsx` | Include client_id, client_secret when saving tokens |
| `src/services/integrationsService.ts` | Expand saveTokens type signature |
| `src/services/calendar/googleCalendarProvider.ts` | Handle TOKEN_REFRESH_FAILED error specifically |

## Result

- Tokens auto-refresh silently -- no user intervention needed after initial setup
- If refresh fails (e.g., user revoked access in Google), status updates to "expired" and user sees clear reconnect message
- Existing users need one-time reconnection to store client credentials server-side

