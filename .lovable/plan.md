
# Align "New Inquiry" Modal with "New Client" UI/UX

## Current State

### QuickInquiryModal (New Inquiry)
- Uses simple `ModalLayout` wrapper
- Flat layout with direct form fields
- No card-based sections
- Custom inline footer buttons
- Fixed modal size (doesn't adapt to screen size)

### ClientModal (New Client)
- Uses `AdaptiveFormShell` (AFPA pattern)
- Card-based sections with icons (General Info, Address, etc.)
- Uses `FormStickyFooter` for consistent button layout
- Responsive: full-page on desktop, drawer on tablet, modal on mobile
- Professional form structure with validation

## Proposed Changes

Transform `QuickInquiryModal` to match `ClientModal`'s UI/UX patterns.

---

## Implementation Details

### 1. Replace Container Component

```text
Before: <ModalLayout>
After:  <AdaptiveFormShell complexity="simple">
```

Using "simple" complexity since inquiry has fewer fields than client, so it will render as a large modal on desktop/tablet instead of full-page, while still getting responsive behavior on mobile.

### 2. Add Card-Based Section Layout

Organize form into semantic sections:

| Section | Fields | Icon |
|---------|--------|------|
| Inquiry Details | Party Name, Inquiry Type | FileText |
| Contact Information | Phone, Email | Phone |
| Source & Notes | Source, Notes | MessageSquare |

### 3. Use FormStickyFooter

Replace custom footer buttons with standardized footer:

```typescript
<FormStickyFooter
  mode="create"
  onCancel={handleClose}
  onPrimaryAction={handleSubmit}
  primaryLabel="Create Inquiry"
  isPrimaryLoading={createMutation.isPending}
/>
```

### 4. Apply Consistent Styling

- Card headers with icons matching ClientModal pattern
- Grid layouts for related fields (phone + email side-by-side)
- Proper spacing using `space-y-6` between sections
- Consistent label styling with required field indicators

---

## Visual Comparison (After)

```text
+-------------------------------------------+
| [+] New Inquiry                           |
| Capture a new business inquiry            |
+-------------------------------------------+
|                                           |
| +---------------------------------------+ |
| | [FileText] Inquiry Details            | |
| |---------------------------------------| |
| | Party Name *        [_____________]   | |
| | Inquiry Type *      [Select...    v]  | |
| +---------------------------------------+ |
|                                           |
| +---------------------------------------+ |
| | [Phone] Contact Information           | |
| |---------------------------------------| |
| | Phone              | Email            | |
| | [____________]     | [____________]   | |
| | At least one contact method required  | |
| +---------------------------------------+ |
|                                           |
| +---------------------------------------+ |
| | [MessageSquare] Source & Notes        | |
| |---------------------------------------| |
| | Source             [Select...    v]   | |
| | Notes              [_______________]  | |
| +---------------------------------------+ |
|                                           |
+-------------------------------------------+
|              [Cancel] [Create Inquiry]    |
+-------------------------------------------+
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/crm/QuickInquiryModal.tsx` | Complete UI restructure |

### Key Imports to Add
```typescript
import { AdaptiveFormShell } from '@/components/ui/adaptive-form-shell';
import { FormStickyFooter } from '@/components/ui/form-sticky-footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
```

---

## Benefits

1. **Consistency**: Same look and feel as Client creation
2. **Responsive**: Works well on desktop, tablet, and mobile
3. **Professional**: Card-based layout with visual hierarchy
4. **Maintainable**: Uses shared UI components
5. **Accessible**: Standardized button placement and styling

---

## Success Criteria

1. New Inquiry modal uses `AdaptiveFormShell` with "simple" complexity
2. Form organized into Card sections with icons
3. Footer uses `FormStickyFooter` component
4. Responsive behavior: modal on desktop/tablet, full-screen on mobile
5. Visual style matches ClientModal (spacing, typography, field arrangement)
