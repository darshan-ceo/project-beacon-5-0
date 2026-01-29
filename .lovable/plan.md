
# Plan: Fix Discover Tab Help Content & Navigation Issues

## Problem Summary

The Discover tab shows feature-level help entries with several issues:

1. **One-line explanations only** - The detailed tooltip content isn't displayed
2. **"View in App" doesn't work** - Navigation goes to wrong page/doesn't open feature
3. **No meaningful help content** - Detail dialog shows same one-liner, no additional value
4. **Missing context** - Users don't know where the feature lives in the app

## Root Cause Analysis

| Issue | Cause |
|-------|-------|
| One-line explanation | `content` field is empty; only short `explanation` populates `description` |
| No detailed help | Rich `tooltip.content` exists but is **not mapped** to the `content` field |
| View in App broken | Template Builder URL sets param but nothing triggers the actual UI |
| Missing context | No parent module breadcrumb shown in cards/dialog |

## Solution Overview

### Part 1: Populate Content Field with Rich Tooltip Content

**File: `src/services/helpDiscoveryService.ts`**

Update `_loadTooltips()` to properly map the detailed `tooltip.content` to the `content` field:

```typescript
entries.push({
  id: uniqueId,
  title: item.label || item.tooltip?.title || item.id,
  description: item.explanation || item.tooltip?.content || '',
  source: 'tooltip',
  module: moduleName,
  category: type.replace('-', ' '),
  roles: item.roles || ['all'],
  uiLocation: this._resolveUILocation(moduleName, item.id),
  isNew: this._isRecentlyUpdated(item.updatedAt),
  updatedAt: item.updatedAt || data.lastUpdated || new Date().toISOString(),
  tags: [type, moduleName, ...(item.tags || [])],
  searchText: `${item.label} ${item.explanation} ${item.tooltip?.content || ''}`,
  // FIX: Map tooltip.content to content field for rich display
  content: item.tooltip?.content || '',
  learnMoreUrl: item.tooltip?.learnMoreUrl
});
```

### Part 2: Fix Template Builder "View in App" Navigation

**File: `src/components/documents/DocumentManagement.tsx`**

The issue: When URL has `openTemplateBuilder=1`, the code only switches tabs but doesn't trigger Template Builder UI:

```typescript
// Current (broken)
if (openTemplateBuilder === '1') {
  setActiveTab('templates');
}

// Fixed: Actually trigger Template Builder
if (openTemplateBuilder === '1') {
  setActiveTab('templates');
  // Trigger the action to open Template Builder panel/modal
  setTimeout(() => {
    setShowTemplateBuilder(true); // or equivalent state
  }, 100);
}
```

### Part 3: Add Parent Context to Help Cards

**File: `src/components/help/HelpEntryCard.tsx`**

Add a breadcrumb showing where the feature lives:

```typescript
// Add above title
<div className="text-[10px] text-muted-foreground mb-1">
  {formatModule(entry.module)}
  {entry.uiLocation?.tab && ` > ${entry.uiLocation.tab}`}
</div>
```

### Part 4: Enhance Detail Dialog Content Display

**File: `src/components/help/HelpDetailDialog.tsx`**

If `content` exists, display it prominently:

```typescript
{/* Rich content if available */}
{entry.content && (
  <div className="bg-muted/50 rounded-lg p-4 mt-3">
    <p className="text-sm text-foreground leading-relaxed">
      {entry.content}
    </p>
  </div>
)}
```

## Visual Before/After

```text
BEFORE:
+------------------------------------------+
| Template Builder 2.0                      |
| "Unified interface for creating all..."   | <- One line only
| [View in App] (goes to wrong page)        |
+------------------------------------------+

AFTER:
+------------------------------------------+
| Document Management > Templates           | <- Context breadcrumb
| Template Builder 2.0                      |
| "Unified interface for creating all..."   |
|                                           |
| [Detailed explanation with full tooltip   | <- Rich content
|  content displayed here]                  |
|                                           |
| [View in App] (opens Template Builder)    | <- Working navigation
+------------------------------------------+
```

## Files Modified

| File | Change |
|------|--------|
| `src/services/helpDiscoveryService.ts` | Map `tooltip.content` to `content` field |
| `src/components/documents/DocumentManagement.tsx` | Fix `openTemplateBuilder` URL handling |
| `src/components/help/HelpEntryCard.tsx` | Add parent module breadcrumb |
| `src/components/help/HelpDetailDialog.tsx` | Improve content display styling |

## Testing Checklist

1. Navigate to Help & Knowledge Center > Discover tab
2. Click on "Template Builder 2.0" card
3. Verify dialog shows detailed content (not just one line)
4. Click "View in App" button
5. Verify navigation goes to Document Management > Templates
6. Verify Template Builder panel/modal actually opens
7. Verify element highlighting works if configured

## Alternative Consideration

If feature-level tooltips still don't provide enough value, we can:
- Remove them entirely from Discover (keep only articles, tours, workflows)
- Create proper help articles for each feature with step-by-step guides
- Link tooltips to articles via `learnMoreUrl`

This can be done as a follow-up if the current fix isn't sufficient.
