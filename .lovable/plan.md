

# Fix: Case Workspace Drawer Display and Edit Case Scrollability

## Issues Identified

### Issue 1: Drawer is distorted/narrow
The Sheet component's right-side variant hardcodes `sm:max-w-sm` (384px max-width on screens >= 640px). This overrides the CaseWorkspaceDrawer's custom widths (`w-[100vw] sm:w-[95vw] lg:w-[90vw]`), causing the drawer to render as a narrow strip instead of a full workspace.

### Issue 2: Edit Case form is not scrollable
When "Edit Case" opens from within the drawer, the `FullPageForm` (used by `AdaptiveFormShell` for complex forms on desktop) renders at `z-50` -- the same z-index as the Sheet. This causes z-index conflicts and scroll interception. The form appears but cannot be scrolled to access lower fields.

## Fix Plan

### File 1: `src/components/ui/sheet.tsx`
**Change:** Remove `sm:max-w-sm` from the right variant so custom width classes passed via `className` are not overridden.

Before:
```
right: "inset-y-0 right-0 h-full w-3/4 border-l ... sm:max-w-sm"
```

After:
```
right: "inset-y-0 right-0 h-full w-3/4 border-l ..."
```

This is safe because any Sheet usage that needs the `sm:max-w-sm` constraint can pass it via className. The CaseWorkspaceDrawer (and LargeSlideOver) already pass explicit widths.

### File 2: `src/components/ui/full-page-form.tsx`
**Change:** Increase z-index from `z-50` to `z-[60]` on the outer container and backdrop so the Edit Case form renders above the Sheet drawer and scroll works correctly.

### File 3: `src/components/cases/CaseWorkspaceDrawer.tsx`
**Change:** Clean up the responsive width classes to ensure proper display across all breakpoints. Ensure no conflicting max-width constraints. The widths should be:
- Mobile: `w-[100vw]` (full screen)
- Tablet (sm): `w-[95vw]`
- Desktop (lg): `w-[90vw]`
- Max: `max-w-[1600px]`

Remove the CSS hack that hides the default Sheet close button via style tag (it uses `[data-radix-collection-item]` which can hide other Radix elements). Instead, use a more targeted approach.

## Summary

| File | Change |
|------|--------|
| `src/components/ui/sheet.tsx` | Remove `sm:max-w-sm` from right variant |
| `src/components/ui/full-page-form.tsx` | Bump z-index to `z-[60]` so Edit Case renders above drawer |
| `src/components/cases/CaseWorkspaceDrawer.tsx` | Clean up width classes and close button CSS hack |

No database changes. Pure frontend fix.

