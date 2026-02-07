
# Implementation Plan: Inquiry Management for GST Litigation CRM

## Executive Summary

Transform the current "Lead" module into an "Inquiry" module aligned with legal firm workflows. The core principle: **Inquiry is a temporary pre-client construct, Client is the legal source of truth.**

---

## Current State Analysis

### What Needs to Change

| Current State | Required State | Impact |
|---------------|----------------|--------|
| "New Lead" button shows toast requiring contact creation first | Direct inquiry creation via modal | **High Priority** |
| UI uses "Lead Pipeline", "Won/Lost", "Deal Value" | "Inquiry Tracker", "Converted/Not Proceeding" | UI terminology |
| 7-stage pipeline (New → Won/Lost) | 4-status flow (New → Follow-up → Converted → Not Proceeding) | Simplification |
| Stats show Conversion %, Avg Deal Value, Pipeline Value | Stats show Active Inquiries, Follow-ups Due, Conversions This Month | Legal focus |
| Lead source options: Cold Call, Advertisement, Social Media | Source options: CA/Reference, Walk-in, Website, Referral | Legal context |
| Score system (Hot/Warm/Cool/Cold) with 0-100 scale | **Remove entirely** | De-emphasize sales |
| Expected Value field prominent on cards | **Remove from cards**, optional in details | Legal focus |

---

## Phase A: Mandatory Implementation

### A1. Create QuickInquiryModal Component

**New File:** `src/components/crm/QuickInquiryModal.tsx`

A streamlined modal for capturing new business inquiries directly:

```text
┌─────────────────────────────────────────────────┐
│ ⊕ New Inquiry                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ Party Name / Business Name *                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ e.g., ABC Enterprises                       │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Phone                    Email                  │
│ ┌──────────────────┐    ┌────────────────────┐ │
│ │ +91 98765 43210  │    │ abc@example.com    │ │
│ └──────────────────┘    └────────────────────┘ │
│ (At least one required)                         │
│                                                 │
│ Inquiry Type *                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ ▼ GST Notice                                │ │
│ └─────────────────────────────────────────────┘ │
│ Options: GST Notice | Appeal | Advisory        │
│                                                 │
│ Source                                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ ▼ CA / Reference                            │ │
│ └─────────────────────────────────────────────┘ │
│ Options: CA/Reference | Referral | Walk-in |   │
│          Website | Existing Client              │
│                                                 │
│ Notes (optional)                                │
│ ┌─────────────────────────────────────────────┐ │
│ │ Brief description of inquiry...             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
├─────────────────────────────────────────────────┤
│                      [Cancel]  [Create Inquiry] │
└─────────────────────────────────────────────────┘
```

**On Submit:**
1. Creates a standalone contact (no client_id) with:
   - `name` = Party Name
   - `lead_status` = 'new'
   - `lead_source` = selected source
   - `designation` = Inquiry Type (stored for context)
   - `notes` = Notes field
   - `phones` / `emails` = entered contact info
2. Auto-sets `last_activity_at` = now
3. Logs initial activity: "Inquiry created"

---

### A2. Add Service Method for Direct Inquiry Creation

**Modify:** `src/services/leadService.ts`

Add new method `createInquiryDirect()`:

```typescript
async createInquiryDirect(inquiryData: {
  partyName: string;
  phone?: string;
  email?: string;
  inquiryType: string;
  source?: string;
  notes?: string;
}): Promise<ServiceResponse<Lead>>
```

This creates the contact + lead status atomically in one transaction.

---

### A3. Update LeadsPage to Open QuickInquiryModal

**Modify:** `src/pages/LeadsPage.tsx`

- Replace toast message with modal trigger
- Rename page title: "Lead Pipeline" → "Inquiry Tracker"
- Update subtitle: "Manage your sales pipeline..." → "Track and manage new business inquiries"
- Add state for QuickInquiryModal

---

### A4. Simplify Status Flow (7 → 4 statuses)

**Modify:** `src/types/lead.ts`

Current: `new | contacted | qualified | proposal_sent | negotiation | won | lost`

New: `new | follow_up | converted | not_proceeding`

**Updated LEAD_STATUS_CONFIG:**

| Status | Label | Color |
|--------|-------|-------|
| new | New | Blue |
| follow_up | Follow-up | Amber |
| converted | Converted to Client | Green |
| not_proceeding | Not Proceeding | Gray |

**Backward Compatibility:** Map old statuses to new:
- `contacted`, `qualified`, `proposal_sent`, `negotiation` → `follow_up`
- `won` → `converted`
- `lost` → `not_proceeding`

---

### A5. Simplify LeadPipeline to 4 Columns

**Modify:** `src/components/crm/LeadPipeline.tsx`

Reduce from 7 columns to 4:

```text
┌──────────┐  ┌───────────┐  ┌─────────────────┐  ┌────────────────┐
│   NEW    │  │ FOLLOW-UP │  │   CONVERTED     │  │ NOT PROCEEDING │
│ 5 items  │  │  3 items  │  │    8 items      │  │    2 items     │
├──────────┤  ├───────────┤  ├─────────────────┤  ├────────────────┤
│ [Card]   │  │ [Card]    │  │  [Card]         │  │  [Card]        │
│ [Card]   │  │ [Card]    │  │                 │  │                │
└──────────┘  └───────────┘  └─────────────────┘  └────────────────┘
```

---

### A6. Simplify Inquiry Cards (Remove Sales Metrics)

**Modify:** `src/components/crm/LeadCard.tsx`

**Remove:**
- Score badge (Hot/Warm/Cool/Cold)
- Expected Value display (₹ amount)

**Keep:**
- Party name
- Inquiry type (from designation)
- Source badge
- Last activity timestamp
- Actions dropdown

**New Card Layout:**
```text
┌────────────────────────────────────┐
│ ABC Enterprises              [⋮]  │
│ GST Notice                         │
│ ─────────────────────────────────  │
│ [CA/Reference]   🕐 2 days ago     │
└────────────────────────────────────┘
```

---

### A7. Replace LeadStats with Inquiry-Focused Metrics

**Modify:** `src/components/crm/LeadStats.tsx`

**Remove:**
- Pipeline Value (₹)
- Conversion Rate (%)
- Avg Deal Value (₹)

**Replace with:**

| Metric | Icon | Description |
|--------|------|-------------|
| Active Inquiries | Users | Count of new + follow_up |
| Follow-ups Pending | Clock | Count of follow_up status |
| Converted This Month | UserCheck | Converted in current month |
| Inquiries This Month | Plus | Created in current month |

---

### A8. Update LeadDetailDrawer Terminology

**Modify:** `src/components/crm/LeadDetailDrawer.tsx`

- "Lead Details" → "Inquiry Details"
- "Lead Score" section → **Remove entirely**
- "Expected Value" → Move to collapsed "Additional Info" or remove from overview
- "Expected Close Date" → Remove (not applicable for legal inquiries)
- "Convert to Client" → "Onboard as Client"
- "Mark as Lost" → "Mark as Not Proceeding"

---

### A9. Update ConvertToClientModal Terminology

**Modify:** `src/components/crm/ConvertToClientModal.tsx`

- "Convert to Client" → "Onboard as Client"
- "Converting: {name}" → "Onboarding: {name}"
- "Mark lead as Won" → "Mark as Converted"
- Remove deal-value summary language

---

### A10. Update Inquiry Source Options

**Modify:** `src/types/lead.ts` - `LEAD_SOURCE_OPTIONS`

**Current:**
```typescript
referral | website | cold_call | advertisement | social_media | seminar | existing_client | other
```

**New (Legal Context):**
```typescript
ca_reference | referral | walk_in | website | existing_client | other
```

| Value | Label |
|-------|-------|
| ca_reference | CA / Reference |
| referral | Referral |
| walk_in | Walk-in |
| website | Website |
| existing_client | Existing Client |
| other | Other |

---

### A11. Update Sidebar Navigation

**Modify:** `src/components/layout/Sidebar.tsx`

Line 126: Change label from "Leads" to "Inquiries"

```typescript
{ icon: Target, label: 'Inquiries', href: '/leads', roles: [...] }
```

---

### A12. Update LeadFilters Terminology

**Modify:** `src/components/crm/LeadFilters.tsx`

- Placeholder: "Search leads..." → "Search inquiries..."

---

### A13. Update MarkAsLeadModal for Contact Module

**Rename & Modify:** `src/components/crm/MarkAsLeadModal.tsx`

**Option 1 (Recommended):** Rename to `CreateInquiryFromContactModal.tsx`
- Change title: "Mark as Lead" → "Create Inquiry from Contact"
- Remove "Expected Value" field (sales-focused)
- Remove "Expected Close Date" field
- Keep only: Source + Notes

**Option 2:** Rename action to "Create Inquiry" but keep file as-is

---

### A14. Update ContactsMasters Row Actions

**Modify:** `src/components/contacts/ContactsMasters.tsx`

Line 632-634: Change "Mark as Lead" → "Create Inquiry"

```tsx
<DropdownMenuItem onClick={...}>
  <Target className="h-4 w-4 mr-2" />
  Create Inquiry
</DropdownMenuItem>
```

---

## Technical Migration Notes

### Database Compatibility

No schema changes required. The existing `client_contacts` table fields work as-is:
- `lead_status` - Stores inquiry status (new values map to same field)
- `lead_source` - Stores source (new options)
- `lead_score` - Can be deprecated/ignored in UI (0 default)
- `expected_value` - Can be deprecated/ignored in UI

### Status Migration Strategy

For existing data with old statuses:
```typescript
const mapLegacyStatus = (status: string): InquiryStatus => {
  const mapping: Record<string, InquiryStatus> = {
    'new': 'new',
    'contacted': 'follow_up',
    'qualified': 'follow_up',
    'proposal_sent': 'follow_up',
    'negotiation': 'follow_up',
    'won': 'converted',
    'lost': 'not_proceeding',
  };
  return mapping[status] || 'new';
};
```

Apply this mapping in UI display layer, or run a one-time data migration.

---

## Files Summary

### Files to Create

| File | Description |
|------|-------------|
| `src/components/crm/QuickInquiryModal.tsx` | Direct inquiry creation modal |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/lead.ts` | Simplify statuses (4), update source options, update labels |
| `src/services/leadService.ts` | Add `createInquiryDirect()` method |
| `src/pages/LeadsPage.tsx` | Rename title, integrate QuickInquiryModal |
| `src/components/crm/LeadStats.tsx` | Replace sales KPIs with inquiry metrics |
| `src/components/crm/LeadPipeline.tsx` | Reduce to 4 columns |
| `src/components/crm/LeadCard.tsx` | Remove score/value, show inquiry type |
| `src/components/crm/LeadFilters.tsx` | Update placeholder text |
| `src/components/crm/LeadDetailDrawer.tsx` | Terminology + remove score/value |
| `src/components/crm/ConvertToClientModal.tsx` | Terminology updates |
| `src/components/crm/MarkAsLeadModal.tsx` | Rename action, simplify fields |
| `src/components/crm/EditLeadModal.tsx` | Remove score/value fields |
| `src/components/crm/MarkAsLostDialog.tsx` | Rename to "Not Proceeding" |
| `src/components/contacts/ContactsMasters.tsx` | Update action labels |
| `src/components/layout/Sidebar.tsx` | "Leads" → "Inquiries" |

---

## Success Criteria Verification

| Criterion | Implementation |
|-----------|----------------|
| Capture inquiry in under 45 seconds | QuickInquiryModal with 5 fields only |
| Onboard client without touching Contact | Inquiry → Client conversion (existing flow) |
| Inquiry never blocks legal workflows | Inquiry is separate, optional module |
| UI feels legal-first, not sales-first | Removed: score, deal value, conversion %, pipeline value |

---

## Out of Scope (Confirmed)

- Full CRM deal analytics
- Revenue forecasting
- Sales performance dashboards
- Multi-stage sales pipelines beyond 4-status flow
- Score-based lead prioritization
