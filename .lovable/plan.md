

# Enhance Add Notice Modal: Issuing Authority & Demand Breakdown

## Change 1: Issuing Authority Section Reorder

Currently the Issuing Authority section shows:
- Authority Name (dropdown)
- Officer Designation (text input)

**New layout** -- three fields displayed in priority order:

| Field | Type | Notes |
|-------|------|-------|
| Officer Name | Text input | New field -- name of the specific officer |
| Officer Designation | Text input (existing) | Kept as-is |
| Authority Name | Dropdown (existing) | Moved below, relabeled to "Officer Details / Authority" for clarity |

The fields will be arranged as:
```text
Row 1: [Officer Name        ] [Officer Designation    ]
Row 2: [Authority Name (dropdown)                      ]
```

## Change 2: Demand Details with IGST/CGST/SGST/CESS Breakdown Popups

Each of the three demand fields (Tax Amount, Interest Amount, Penalty Amount) will become **clickable fields** that open a small popup dialog showing a breakdown into IGST, CGST, SGST, and CESS.

### How It Works

1. Each amount field displays the total (sum of IGST + CGST + SGST + CESS) as read-only with a "Click to enter breakdown" placeholder
2. Clicking the field opens a Dialog with four input fields: IGST, CGST, SGST, CESS
3. The dialog shows a computed Total at the bottom
4. "Save Breakdown" writes the sum back to the parent field and stores the individual components
5. The main form Total Demand = Tax + Interest + Penalty (unchanged logic)

### UI Reference (from screenshot)
```text
+---------------------------------+
| Tax Amount (*) Breakdown    [X] |
|                                 |
| IGST (Rs)        CGST (Rs)     |
| [    0    ]      [    0    ]    |
|                                 |
| SGST (Rs)        CESS (Rs)     |
| [    0    ]      [    0    ]    |
| ________________________________|
| Total                   Rs 0.00 |
| [Save Breakdown]  [Cancel]      |
+---------------------------------+
```

## Technical Plan

### File: `src/types/stageWorkflow.ts`
- Add breakdown fields to `CreateStageNoticeInput` and `UpdateStageNoticeInput`:
  - `tax_breakdown?: { igst: number; cgst: number; sgst: number; cess: number }`
  - `interest_breakdown?: { igst: number; cgst: number; sgst: number; cess: number }`
  - `penalty_breakdown?: { igst: number; cgst: number; sgst: number; cess: number }`

### File: `src/components/modals/AddNoticeModal.tsx`

1. **Add `officer_name` to formData state** (line 82-106) and to hydration logic (line 128-173)

2. **Reorder Issuing Authority section** (lines 431-479):
   - Row 1: Officer Name (new text input) + Officer Designation (existing)
   - Row 2: Authority Name dropdown (existing, full width)

3. **Add breakdown state** for each demand type:
   ```typescript
   const [taxBreakdown, setTaxBreakdown] = useState({ igst: 0, cgst: 0, sgst: 0, cess: 0 });
   const [interestBreakdown, setInterestBreakdown] = useState({ igst: 0, cgst: 0, sgst: 0, cess: 0 });
   const [penaltyBreakdown, setPenaltyBreakdown] = useState({ igst: 0, cgst: 0, sgst: 0, cess: 0 });
   const [activeBreakdown, setActiveBreakdown] = useState<'tax' | 'interest' | 'penalty' | null>(null);
   ```

4. **Replace each amount Input** (lines 584-682) with a clickable field that:
   - Shows the total amount (read-only display)
   - On click, sets `activeBreakdown` to open the breakdown dialog
   - Keeps the "Applicable" checkbox alongside

5. **Add a reusable Breakdown Dialog** (using the existing Dialog component):
   - Title: "{Type} Amount Breakdown" (e.g., "Tax Amount Breakdown")
   - 2x2 grid: IGST, CGST, SGST, CESS inputs
   - Computed total shown below
   - "Save Breakdown" button sums the four values and writes to the parent amount field
   - "Cancel" button discards changes

6. **Update handleSubmit** (line 243-268): Include `officer_name` and breakdown objects in the saved input, stored in metadata or as new fields.

### File: `src/services/stageNoticesService.ts`
- Pass through `officer_name` and breakdown data when creating/updating notices (store breakdowns in metadata JSONB field for now to avoid a migration).

### Files to Modify

| File | Change |
|------|--------|
| `src/components/modals/AddNoticeModal.tsx` | Reorder authority fields, add officer name, add breakdown popup for all 3 demands |
| `src/types/stageWorkflow.ts` | Add `officer_name` and breakdown types to input interfaces |
| `src/services/stageNoticesService.ts` | Pass through new fields during create/update |

### No database migration needed
The `officer_name` and breakdown data will be stored in the existing `metadata` JSONB column on `stage_notices`, keeping this change non-invasive.

