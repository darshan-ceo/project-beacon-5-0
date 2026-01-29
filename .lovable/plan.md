
# Final Scope of Improvements: GST Litigation Lifecycle Enhancement

## Executive Summary

Based on detailed analysis of the uploaded SOW document against the current implementation, with the client clarification that **"Assessment" stage consolidates both "Scrutiny" and "Demand"** from the original document, the following improvements are required to ensure complete milestone tracking and accurate statutory deadline calculations.

---

## Current Stage Mapping (6-Stage Model)

| # | Client SOW Term | Current System Stage | Form/Notice | Implementation Status |
|---|-----------------|---------------------|-------------|----------------------|
| 1 | Scrutiny + Demand | **Assessment** | ASMT-10, DRC-01 | ✅ Implemented |
| 2 | Adjudication | **Adjudication** | DRC-07 (Order) | ✅ Implemented |
| 3 | First Appellate Authority | **First Appeal** | APL-01 | ✅ Implemented |
| 4 | Appellate Tribunal (GSTAT) | **Tribunal** | Appeal Form | ✅ Implemented |
| 5 | High Court | **High Court** | Writ/Appeal | ✅ Implemented |
| 6 | Supreme Court | **Supreme Court** | SLP | ✅ Implemented |

---

## Gap Analysis: Missing Date Milestones

### Critical Finding

The statutory deadline system in `statutoryMasterData.json` defines `base_date_type` for calculating appeal deadlines:
- `notice_date` → For SCN replies (Assessment stage)
- `order_date` → For appeals (Adjudication → First Appeal → Tribunal → HC → SC)

**Current Problem:** The `cases` table has `notice_date` but **lacks `order_date`, `order_received_date`, and `appeal_filed_date`** fields needed to trigger appeal deadlines.

### Impact

| Event | Required Date Field | Current Status | Impact |
|-------|-------------------|----------------|--------|
| DRC-07 Order Received | `order_date` | ❌ Missing | Cannot calculate 3-month First Appeal deadline |
| First Appeal Filed | `appeal_filed_date` | ❌ Missing | Cannot track filing milestone |
| Appeal Order Received | `appellate_order_date` | ❌ Missing | Cannot calculate Tribunal appeal deadline |
| Tribunal Order | `tribunal_order_date` | ❌ Missing | Cannot calculate 180-day HC deadline |
| High Court Order | `hc_order_date` | ❌ Missing | Cannot calculate 30-day SLP deadline |

---

## Improvement Scope (Prioritized)

### Phase 1: Critical Date Milestones (Database + Form)

#### 1.1 Add Order/Appeal Date Fields to Cases Table

**Database Migration:**
```sql
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS order_date DATE,
ADD COLUMN IF NOT EXISTS order_received_date DATE,
ADD COLUMN IF NOT EXISTS appeal_filed_date DATE,
ADD COLUMN IF NOT EXISTS impugned_order_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS impugned_order_date DATE,
ADD COLUMN IF NOT EXISTS impugned_order_amount NUMERIC(15,2);

COMMENT ON COLUMN cases.order_date IS 'Date of adjudication order (DRC-07) - triggers appeal deadline';
COMMENT ON COLUMN cases.order_received_date IS 'Date order was actually received - may differ from order_date';
COMMENT ON COLUMN cases.appeal_filed_date IS 'Date appeal was filed (APL-01)';
COMMENT ON COLUMN cases.impugned_order_no IS 'Order number being appealed against';
COMMENT ON COLUMN cases.impugned_order_date IS 'Date of impugned order';
COMMENT ON COLUMN cases.impugned_order_amount IS 'Amount in dispute from impugned order';
```

#### 1.2 Update CaseFormData Interface

Add to `src/components/cases/CaseForm.tsx`:
```typescript
export interface CaseFormData {
  // ... existing fields ...
  
  // New Order/Appeal Milestone Fields
  order_date: string;           // Date of adjudication order (DRC-07)
  order_received_date: string;  // Date order was received (for deadline calc)
  appeal_filed_date: string;    // Date appeal was filed
  impugned_order_no: string;    // Order number being appealed
  impugned_order_date: string;  // Date of impugned order
  impugned_order_amount: string; // Amount in dispute
}
```

#### 1.3 Add New Form Section: "Order & Appeal Milestones"

Create a new collapsible card in CaseForm.tsx that appears conditionally based on stage:

```text
┌─────────────────────────────────────────────────────────────┐
│ ⚖️ Order & Appeal Milestones                    [Collapse ▼] │
├─────────────────────────────────────────────────────────────┤
│ Order Date*          │ Order Received Date                  │
│ [  2025-01-15  📅 ]  │ [  2025-01-20  📅 ]                 │
│                      │                                      │
│ Impugned Order No    │ Impugned Order Amount                │
│ [ DRC-07/2025/001 ]  │ [ ₹ 25,00,000 ]                      │
│                      │                                      │
│ Appeal Filed Date    │ [Auto-calculated Deadline Badge]     │
│ [  2025-02-10  📅 ]  │ 🔴 First Appeal due by: 20-Apr-2025  │
└─────────────────────────────────────────────────────────────┘
```

**Visibility Rules:**
- Show when `currentStage` is `Adjudication` or higher
- Order fields become editable when transitioning from Assessment to Adjudication
- Appeal fields appear when advancing to First Appeal or higher

---

### Phase 2: Fix Statutory Deadline Timing

#### 2.1 Correct Supreme Court SLP Deadline

**Current (Wrong):** 60 days
**Correct (per SOW):** 30 days

Update `src/data/seedData/statutoryMasterData.json`:
```json
{
  "act_code": "SC",
  "code": "SC-SLP",
  "name": "Supreme Court SLP",
  "base_date_type": "order_date",
  "deadline_type": "days",
  "deadline_count": 30,  // Changed from 60
  "extension_allowed": true,
  "max_extension_count": 1,
  "extension_days": 30,  // Changed from 60
  "legal_reference": "Article 136 Constitution",
  "description": "Special Leave Petition to Supreme Court"
}
```

#### 2.2 Add Missing Event Types

Add new statutory deadline entries:
```json
[
  {
    "act_code": "GST",
    "code": "GST-DRC01A",
    "name": "DRC-01A Reply (Pre-SCN Intimation)",
    "base_date_type": "notice_date",
    "deadline_type": "days",
    "deadline_count": 30,
    "extension_allowed": false,
    "description": "Reply to Pre-SCN Intimation under DRC-01A"
  },
  {
    "act_code": "GST",
    "code": "GST-TRIBUNAL-APPEAL",
    "name": "Tribunal Appeal (after First Appeal)",
    "base_date_type": "order_date",
    "deadline_type": "months",
    "deadline_count": 3,
    "extension_allowed": true,
    "max_extension_count": 1,
    "extension_days": 90,
    "legal_reference": "Section 112 CGST Act",
    "description": "Appeal to GSTAT after First Appellate Order"
  }
]
```

---

### Phase 3: Add Missing Form Types

#### 3.1 Add DRC-01A to Form Type Dropdown

Update `src/components/cases/CaseForm.tsx` (line 669-678):
```tsx
<SelectContent>
  <SelectItem value="DRC-01A">DRC-01A (Pre-SCN Intimation)</SelectItem>  {/* NEW */}
  <SelectItem value="DRC-01">DRC-01 (Show Cause Notice)</SelectItem>
  <SelectItem value="DRC-03">DRC-03 (Audit Intimation)</SelectItem>
  <SelectItem value="DRC-07">DRC-07 (Order)</SelectItem>
  <SelectItem value="DRC-08">DRC-08 (Rectification)</SelectItem>  {/* Ensure present */}
  <SelectItem value="ASMT-10">ASMT-10 (Notice for Clarification)</SelectItem>
  <SelectItem value="ASMT-11">ASMT-11 (Summary of Order)</SelectItem>
  <SelectItem value="ASMT-12">ASMT-12 (Final Notice)</SelectItem>
  <SelectItem value="APL-01">APL-01 (Appeal Filed)</SelectItem>  {/* NEW */}
  <SelectItem value="APL-05">APL-05 (Appeal Order)</SelectItem>  {/* NEW */}
  <SelectItem value="SCN">SCN (Show Cause Notice)</SelectItem>
  <SelectItem value="Other">Other</SelectItem>
</SelectContent>
```

#### 3.2 Create DRC-01A Form Template

Create `public/form-templates/DRC01A_INTIMATION.json`:
```json
{
  "code": "DRC01A_INTIMATION",
  "title": "DRC-01A Pre-SCN Intimation Reply",
  "stage": "Assessment",
  "version": "1.0",
  "act_code": "GST",
  "fields": [
    { "key": "intimation_no", "label": "Intimation Number", "type": "string", "required": true },
    { "key": "intimation_date", "label": "Intimation Date", "type": "date", "required": true },
    { "key": "reply_date", "label": "Reply Date", "type": "date", "required": true },
    { "key": "proposed_tax", "label": "Proposed Tax Demand", "type": "number" },
    { "key": "taxpayer_response", "label": "Taxpayer's Response", "type": "text", "maxLength": 5000 }
  ]
}
```

---

### Phase 4: Enhance Stage Transition Modal

#### 4.1 Capture Impugned Order on Forward Transition

When advancing from **Adjudication → First Appeal**, require:
- Impugned Order Number (DRC-07 reference)
- Order Date
- Order Received Date
- Amount Confirmed/Disputed

Update `src/components/modals/StageManagementModal.tsx` to include conditional fields:

```text
┌────────────────────────────────────────────────────────────────┐
│                    Advance Case Stage                          │
├────────────────────────────────────────────────────────────────┤
│ Current Stage: [Adjudication]                                  │
│ Next Stage: [First Appeal ▼]                                   │
│                                                                │
│ ────────── Impugned Order Details (Required) ──────────       │
│                                                                │
│ Order Number*           │ Order Date*                          │
│ [ DRC-07/2025/001    ]  │ [  2025-01-15  📅 ]                  │
│                         │                                      │
│ Order Received Date*    │ Amount Confirmed (₹)                 │
│ [  2025-01-20  📅 ]     │ [ 25,00,000 ]                        │
│                                                                │
│ [Upload Order Document]                                        │
│                                                                │
│ Comments: [_______________________________________]            │
│                                                                │
│               [Cancel]  [Advance Stage →]                      │
└────────────────────────────────────────────────────────────────┘
```

---

### Phase 5: Enhance Deadline Calculation Hook

#### 5.1 Update useStatutoryDeadlines Hook

Modify `src/hooks/useStatutoryDeadlines.ts` to support order-based deadline calculation:

```typescript
interface UseStatutoryDeadlinesOptions {
  caseId?: string;
  noticeDate?: string;      // For Assessment stage
  orderDate?: string;       // For Appeal stages (NEW)
  noticeType?: string;
  autoCalculate?: boolean;
}

// Add new function
const calculateAppealDeadline = useCallback(async (
  orderDateStr: string,
  currentStage: string
): Promise<DeadlineCalculationResult | null> => {
  if (!orderDateStr || !currentStage) return null;
  
  // Map stage to statutory event type
  const stageEventMap: Record<string, string> = {
    'Adjudication': 'GST-APPEAL-1',      // 3 months
    'First Appeal': 'GST-TRIBUNAL',       // 3 months
    'Tribunal': 'HC-WRIT',                // 180 days
    'High Court': 'SC-SLP'                // 30 days
  };
  
  const eventCode = stageEventMap[currentStage];
  if (!eventCode) return null;
  
  return await statutoryDeadlineService.calculateDeadline(orderDateStr, eventCode);
}, []);
```

---

### Phase 6: Case Interface Update

#### 6.1 Update AppStateContext Case Interface

Add to `src/contexts/AppStateContext.tsx`:
```typescript
interface Case {
  // ... existing fields ...
  
  // Phase 1: Order & Appeal Milestones
  order_date?: string;           // DRC-07 order date
  orderDate?: string;            // CamelCase variant
  order_received_date?: string;  // When order was received
  orderReceivedDate?: string;    // CamelCase variant
  appeal_filed_date?: string;    // APL-01 filing date
  appealFiledDate?: string;      // CamelCase variant
  
  // Impugned Order (for appeals)
  impugned_order_no?: string;
  impugnedOrderNo?: string;
  impugned_order_date?: string;
  impugnedOrderDate?: string;
  impugned_order_amount?: number;
  impugnedOrderAmount?: number;
}
```

---

## Implementation Files Summary

| File | Action | Purpose |
|------|--------|---------|
| **Database Migration** | CREATE | Add 6 new columns to cases table |
| `src/components/cases/CaseForm.tsx` | UPDATE | Add Order & Appeal Milestones section, DRC-01A form type |
| `src/contexts/AppStateContext.tsx` | UPDATE | Extend Case interface with new fields |
| `src/data/seedData/statutoryMasterData.json` | UPDATE | Fix SC SLP deadline (60→30), add DRC-01A event |
| `src/hooks/useStatutoryDeadlines.ts` | UPDATE | Add `calculateAppealDeadline()` function |
| `src/components/modals/StageManagementModal.tsx` | UPDATE | Capture impugned order on stage advancement |
| `public/form-templates/DRC01A_INTIMATION.json` | CREATE | New form template for DRC-01A |
| `src/services/casesService.ts` | UPDATE | Handle new date fields in CRUD operations |
| `src/adapters/SupabaseAdapter.ts` | UPDATE | Whitelist new columns |

---

## Timeline & Compliance Matrix

| Stage | Trigger Event | Response Time | Auto-Calculated Deadline |
|-------|--------------|---------------|-------------------------|
| Assessment | ASMT-10 Received | 30 days | ✅ (from notice_date) |
| Assessment | DRC-01 Received | 30 days (+15 ext) | ✅ (from notice_date) |
| Adjudication | DRC-07 Order | 3 months | 🔄 Requires order_date field |
| First Appeal | APL-05 Order | 3 months (+3m ext) | 🔄 Requires order_date field |
| Tribunal | GSTAT Order | 180 days | 🔄 Requires order_date field |
| High Court | HC Order | **30 days** | 🔄 Fix: Currently 60 days |
| Supreme Court | SLP Decision | - | Final stage |

---

## Testing Checklist

1. Create case at Assessment stage with ASMT-10 notice
2. Verify reply deadline auto-calculates (30 days from notice_date)
3. Advance to Adjudication → Verify order date fields appear
4. Enter DRC-07 order details → Verify appeal deadline calculates (3 months)
5. Advance to First Appeal → Verify impugned order captured in transition
6. Test Supreme Court SLP deadline → Should be 30 days, not 60
7. Verify DRC-01A form type appears in dropdown
8. Test form template generation for DRC-01A reply
