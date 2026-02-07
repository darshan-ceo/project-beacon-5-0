
# Fix LOVABLE_API_KEY Invalid Format Error in Notice Intake Wizard

## Root Cause Analysis

The error message **"LOVABLE_API_KEY has invalid format (must start with sk_)"** originates from the **Lovable AI Gateway** (at `https://ai.gateway.lovable.dev`), not from application code.

### What's Happening

```text
User uploads PDF
       ↓
Step 1: Try OpenAI Vision API (using user's openai_api_key from localStorage)
       ↓
OpenAI extraction fails or throws error
       ↓
Step 2: Fallback to Lovable AI via notice-ocr edge function
       ↓
Edge function calls: https://ai.gateway.lovable.dev/v1/chat/completions
       with Authorization: Bearer ${LOVABLE_API_KEY}
       ↓
Lovable AI Gateway rejects: 401 Unauthorized
       "LOVABLE_API_KEY has invalid format (must start with sk_)"
```

### Why OpenAI Key Doesn't Help

The OpenAI API key you configured is for **direct OpenAI API calls** (Step 1).

When that fails (API issues, rate limits, or errors), the system falls back to **Lovable AI** (Step 2), which uses a completely different authentication mechanism - the `LOVABLE_API_KEY` system secret.

### The Real Problem

The `LOVABLE_API_KEY` secret in this project has an **invalid format**. The Lovable AI Gateway requires keys that start with `sk_` prefix.

Per system constraints: "The LOVABLE_API_KEY is a system-managed project secret provisioned by Lovable Cloud and **cannot be manually generated or modified** by the AI Agent."

---

## Solution Options

### Option A: Re-provision LOVABLE_API_KEY (Recommended)

This requires action in the Lovable platform settings:

1. Navigate to **Settings → Lovable Cloud**
2. Look for an option to **regenerate/re-provision** the API key
3. The new key should automatically have the correct `sk_` prefix

If this option isn't available in the UI, you may need to contact **support@lovable.dev** to re-provision the secret.

### Option B: Improve Error Handling (Code Fix)

While the root cause is the invalid API key, we can improve the user experience by:

1. Better error messaging when Lovable AI fails
2. More graceful fallback to regex extraction
3. Not treating Lovable AI failure as a blocking error

---

## Proposed Code Changes

Even though the root cause is the API key, I recommend improving error handling so users aren't blocked when Lovable AI is unavailable.

### File: `supabase/functions/notice-ocr/index.ts`

Improve error response to distinguish API key format errors:

```typescript
// After line 124-126
if (!response.ok) {
  const errorText = await response.text();
  console.error('[notice-ocr] Lovable AI error:', response.status, errorText);
  
  // Check for API key format error
  if (response.status === 401 && errorText.includes('invalid format')) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'AI service configuration issue. Please contact support.',
        errorCode: 'API_KEY_INVALID'
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  // ... rest of error handling
}
```

### File: `src/services/noticeExtractionService.ts`

Improve fallback handling to not block on Lovable AI errors:

```typescript
// In extractWithLovableAI method, line ~380-385
if (!response.ok) {
  const errorText = await response.text();
  console.error('Lovable AI edge function error:', response.status, errorText);
  
  // Check for configuration issues - fallback gracefully
  if (response.status === 503 || response.status === 401) {
    throw { 
      code: 'LOVABLE_AI_UNAVAILABLE', 
      message: 'Lovable AI service unavailable, falling back to regex extraction'
    };
  }
  
  throw new Error(`Lovable AI extraction failed: ${response.status}`);
}
```

---

## Immediate Resolution Steps

### For You (User)

1. **Check Lovable Cloud settings** for an option to regenerate the LOVABLE_API_KEY
2. If no regenerate option exists, **contact support@lovable.dev** with:
   - Project ID: `myncxddatwvtyiioqekh`
   - Issue: "LOVABLE_API_KEY has invalid format, needs re-provisioning"

### What the Code Fix Provides

- Users won't see the cryptic "must start with sk_" error
- Extraction will gracefully fall back to regex when Lovable AI is unavailable
- Better error messages for debugging

---

## Files to Modify

| File | Purpose |
|------|---------|
| `supabase/functions/notice-ocr/index.ts` | Return clearer error for API key issues |
| `src/services/noticeExtractionService.ts` | Graceful fallback when Lovable AI unavailable |

---

## Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| OpenAI works | ✓ Extracts via OpenAI | ✓ Same |
| OpenAI fails, Lovable AI works | ✓ Falls back to Lovable AI | ✓ Same |
| OpenAI fails, Lovable AI fails | ❌ Shows cryptic 401 error | ✓ Gracefully uses regex extraction |

---

## Summary

The `LOVABLE_API_KEY` system secret has an invalid format. This is a **platform provisioning issue** that requires either:
- Re-provisioning via Lovable Cloud settings, or
- Contacting Lovable support

In the meantime, I can implement code fixes to improve error handling and ensure the wizard still works (using regex fallback) when AI services are unavailable.
