

# Fix JudgeModal "Saving..." Button Loop Issue

## Problem Summary

When opening an existing Judge record in edit mode, the "Saving..." button appears immediately and remains in a loading state indefinitely. The address data is visible but the modal appears stuck.

## Root Cause Analysis

Two issues combine to cause this bug:

### Issue 1: Missing Key-Based Isolation Pattern

**File:** `src/components/masters/JudgeMasters.tsx` (line 431)

The JudgeModal is rendered without a `key` prop, violating the established modal-isolation-key-pattern. When users switch between different judges or modes, React reuses the same component instance, causing stale state to persist.

```typescript
// Current (buggy):
<JudgeModal
  isOpen={judgeModal.isOpen}
  onClose={() => setJudgeModal({ isOpen: false, mode: 'create', judge: null })}
  judge={judgeModal.judge}
  mode={judgeModal.mode}
/>
```

### Issue 2: Missing State Reset on Success

**File:** `src/components/modals/JudgeModal.tsx` (lines 114-123)

When a save operation succeeds, `isSaving` is never reset to `false` before calling `onClose()`. If the modal doesn't fully unmount (due to missing key), the `isSaving: true` state persists to the next open.

```typescript
// Current (buggy):
await judgesService.update(...);
onClose(); // isSaving still true!
// ...
catch (error) {
  setIsSaving(false); // Only reset on error
}
```

## Implementation Plan

### Fix 1: Add Key Prop to JudgeModal (JudgeMasters.tsx)

**File:** `src/components/masters/JudgeMasters.tsx`
**Line:** 431

Add a unique key based on judge ID and mode to force component remount:

```typescript
<JudgeModal
  key={`${judgeModal.judge?.id || 'new'}-${judgeModal.mode}`}
  isOpen={judgeModal.isOpen}
  onClose={() => setJudgeModal({ isOpen: false, mode: 'create', judge: null })}
  judge={judgeModal.judge}
  mode={judgeModal.mode}
/>
```

### Fix 2: Reset State on Success (JudgeModal.tsx)

**File:** `src/components/modals/JudgeModal.tsx`
**Lines:** 113-114

Reset `isSaving` before closing the modal on successful save:

```typescript
// Before onClose(), add:
setIsSaving(false);
onClose();
```

### Fix 3: Add useEffect Reset Guard (JudgeModal.tsx)

As a safety net, reset loading states when the modal opens:

**File:** `src/components/modals/JudgeModal.tsx`
**After line 31 (after the fetchUser useEffect)**

```typescript
// Reset loading states when modal opens
useEffect(() => {
  if (isOpen) {
    setIsSaving(false);
    setIsDeleting(false);
  }
}, [isOpen]);
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/masters/JudgeMasters.tsx` | Add `key` prop to JudgeModal (line 431) |
| `src/components/modals/JudgeModal.tsx` | Add `setIsSaving(false)` before `onClose()` on success (line 113) |
| `src/components/modals/JudgeModal.tsx` | Add useEffect to reset states when modal opens (after line 31) |

## Technical Details

The key prop pattern follows React's component identity model. When the key changes, React treats it as a completely new component instance, unmounting the old one and mounting a fresh one. This guarantees:

1. All local state (useState) is initialized fresh
2. All effects (useEffect) run their setup functions
3. No stale closures or cached values persist

The pattern `key={\`${entity?.id || 'new'}-${mode}\`}` ensures:
- Different judges get different keys
- Same judge in different modes (view/edit) gets different keys
- New entity creation always gets the same 'new' prefix

## Validation Steps

After implementation:
1. Create a new judge with address data
2. Save successfully - modal should close
3. Reopen the same judge in edit mode
4. Verify "Update Judge" button is visible (not "Saving...")
5. Verify address fields are populated correctly
6. Make a change and save again
7. Verify save completes and modal closes properly

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Component remount performance | Minimal - only occurs on modal open, not during editing |
| Breaking existing functionality | None - adds defensive patterns without changing core logic |
| Rollback difficulty | Simple - remove key prop and useEffect |

