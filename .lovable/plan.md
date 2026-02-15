

# Add "Registered Under" Dropdown with Conditional GSTIN/TIN Logic

## What Changes

A new dropdown field "Registered Under" will be added to the Client form (in the section between Client Group and GSTIN/PAN). Based on the selection:

- **GST selected** (default): Form behaves exactly as today -- GSTIN field is enabled, TIN field is hidden
- **Any other option** (ST, Excise, Custom, VAT, DGFT): GSTIN field becomes disabled/greyed out, and a new "TIN Number" input field appears in its place

### Dropdown Options
GST, ST (Service Tax), Excise, Custom, VAT, DGFT

## UI Layout Change

```text
Before:
  [Client Group                          v]
  [GST Category       v] [Registration No.   ]
  [GSTIN                ] [PAN Number *       ]

After:
  [Client Group                          v]
  [Registered Under   v] [GST Category    v] [Registration No.]
  [GSTIN / TIN Number   ] [PAN Number *       ]
```

- When "Registered Under" = GST: Shows GSTIN field (existing behavior)
- When "Registered Under" != GST: Shows TIN Number field instead of GSTIN, GSTIN is hidden

## Technical Plan

### File: `src/components/modals/ClientModal.tsx`

1. **Add to formData state** (around line 65-83):
   - Add `registeredUnder: 'GST' | 'ST' | 'Excise' | 'Custom' | 'VAT' | 'DGFT'` (default: `'GST'`)
   - Add `tinNumber: string` (default: `''`)

2. **Add "Registered Under" dropdown** (insert before the GST Category row, around line 1080):
   - Full-width or alongside GST Category in a 3-column grid
   - When value changes to non-GST: clear GSTIN, disable PAN auto-derive
   - When value changes back to GST: clear TIN number

3. **Conditional GSTIN / TIN rendering** (around lines 1115-1216):
   - If `registeredUnder === 'GST'`: Show existing GSTIN field (unchanged)
   - If `registeredUnder !== 'GST'`: Show a "TIN Number" input field instead, with simpler validation (alphanumeric, max 20 chars)

4. **Update save logic** (around line 581):
   - Include `registeredUnder` and `tinNumber` in `clientToSave`

5. **Update edit mode hydration** (around line 186):
   - Load `registeredUnder` and `tinNumber` from `clientData` if present

### Database Consideration

No migration is needed right now. The `registeredUnder` and `tinNumber` values will be stored via the existing flexible client data structure. If the `clients` table lacks these columns, they can be added in a follow-up migration -- the form will work with the existing schema by passing these as part of the client object.

### Validation Updates

- When `registeredUnder !== 'GST'`: Skip GSTIN validation entirely
- When `registeredUnder !== 'GST'` and TIN is provided: Validate TIN as alphanumeric, max 20 characters
- PAN auto-derive from GSTIN only fires when `registeredUnder === 'GST'`

### Files to Modify

| File | Change |
|------|--------|
| `src/components/modals/ClientModal.tsx` | Add registeredUnder dropdown, TIN field, conditional logic |

No database changes in this step.

