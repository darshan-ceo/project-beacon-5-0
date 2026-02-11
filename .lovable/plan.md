

# Fix: "Cannot read properties of undefined (reading 'toUpperCase')" on Create

## Problem

Clicking "Create" at Step 7 of the Notice Intake Wizard crashes with:
```
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
    at clientsService.ts:286
```

## Root Cause

In `src/services/clientsService.ts`, line 250:

```typescript
pan: savedClient.pan || clientData.pan!.toUpperCase(),
```

The `!` (non-null assertion) on `clientData.pan` forces a `.toUpperCase()` call even when `pan` is `undefined`. The wizard creates clients with only `name`, `gstin`, and `status` -- no `pan` is provided, so `clientData.pan` is `undefined`.

When `savedClient.pan` is also falsy (null/undefined from DB), JavaScript evaluates the right side of `||`, calling `.toUpperCase()` on `undefined`.

## Fix

**File:** `src/services/clientsService.ts` (line 250)

Change:
```typescript
pan: savedClient.pan || clientData.pan!.toUpperCase(),
```

To:
```typescript
pan: savedClient.pan || clientData.pan?.toUpperCase(),
```

Replace the `!` (non-null assertion) with `?.` (optional chaining) so that if `pan` is undefined, it gracefully returns `undefined` instead of crashing.

Also audit line 249 for the same pattern on `gstin` (already uses `?.` so it is safe).

## Files to Modify

| File | Change |
|------|--------|
| `src/services/clientsService.ts` | Replace `clientData.pan!.toUpperCase()` with `clientData.pan?.toUpperCase()` on line 250 |

