
# Plan: Remove Low-Level UI Tooltips from Help Discover Tab

## Overview

This change filters the Help Discovery Hub to only show **feature-level entries** from UI tooltips, while **excluding granular button and field tooltips**. This reduces confusion by keeping low-level help where it belongs (in-context hover tooltips) rather than displaying it as standalone discovery items.

## What's Being Changed

### Current Behavior
- The Discover tab aggregates ALL entries from `ui-tooltips.json` including:
  - `buttons` (30+ entries like "Save Template", "Preview", "Generate Code")
  - `fields` (50+ entries like "Template Code", "Template Title")
  - `menu-items`
  - `cards`
  - `features` (high-level feature descriptions)

- This creates confusing standalone cards for UI elements that only make sense in context

### New Behavior
- Only `features` type entries will appear in the Discover tab
- Articles, tours, operations help, master data help, and glossary remain unchanged
- Button/field tooltips continue to work for in-app hover help (via `uiHelpService`)

## Implementation Details

### File: `src/services/helpDiscoveryService.ts`

**Change in `_loadTooltips()` method (lines 151-191):**

Current code loads all types:
```typescript
const types = ['buttons', 'fields', 'menu-items', 'cards', 'features'];
```

Updated code will only load features:
```typescript
// Only load feature-level entries for discovery
// Button/field tooltips remain available via uiHelpService for in-context help
const types = ['features'];
```

This is a single-line change that filters the discovery index while preserving all other functionality.

## Impact Summary

| Content Type | Before | After |
|--------------|--------|-------|
| Articles | Included | Included (no change) |
| Tours | Included | Included (no change) |
| Operations Help | Included | Included (no change) |
| Master Data Help | Included | Included (no change) |
| Glossary | Included | Included (no change) |
| **Feature tooltips** | Included | **Included** |
| **Button tooltips** | Included | **Removed from Discover** |
| **Field tooltips** | Included | **Removed from Discover** |
| **Menu-item tooltips** | Included | **Removed from Discover** |
| **Card tooltips** | Included | **Removed from Discover** |

## What Still Works

1. **In-Context Tooltips** - `uiHelpService.ts` continues to provide hover tooltips for all UI elements
2. **Search** - Users can still find feature-level help via search
3. **Module Help Tab** - Detailed module documentation remains unchanged
4. **Glossary** - Legal terms and definitions remain available

## Files Modified

| File | Change |
|------|--------|
| `src/services/helpDiscoveryService.ts` | Filter `_loadTooltips()` to only include `features` type |

## Testing Checklist

1. Navigate to Help & Knowledge Center → Discover tab
2. Verify no individual button/field cards appear (like "Save Template", "Preview")
3. Verify feature-level help cards still appear
4. Verify articles, tours, and workflows still appear
5. Verify total count is reduced (from ~200+ to ~50-80 entries)
6. Verify in-context hover tooltips still work in Template Builder
