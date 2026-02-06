

# CRM & Marketing Module Proposal for Project Beacon 5.0

## Executive Summary

This plan outlines a lightweight CRM and Marketing module that leverages the **existing architecture** (Contacts, Clients, Communication Logs) to enable lead management and client conversion workflows. The design minimizes schema changes while providing essential sales pipeline functionality for a legal practice.

---

## Current Architecture Analysis

### Existing Connection Between Contact and Client

```text
┌─────────────────────┐         ┌─────────────────────┐
│   client_contacts   │         │      clients        │
├─────────────────────┤         ├─────────────────────┤
│ id                  │         │ id                  │
│ client_id (FK)  ────┼────────►│ display_name        │
│ name                │  NULL   │ gstin               │
│ emails              │ allowed │ pan                 │
│ phones              │         │ status              │
│ roles               │         │ type                │
│ data_scope          │         │ client_group_id     │
│ owner_user_id       │         │ owner_id            │
│ source              │         │ data_scope          │
└─────────────────────┘         └─────────────────────┘
        │
        │ Standalone contacts (client_id = NULL)
        │ can be LEADS/PROSPECTS
        ▼
```

**Key Insight**: The `client_id` field is already **nullable**, which means standalone contacts can represent **leads/prospects** before conversion to clients.

---

## Proposed CRM Data Model

### Option 1: Minimal Changes (Recommended)

Extend `client_contacts` with CRM fields:

```text
client_contacts (existing table)
├── lead_status: enum ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost')
├── lead_source: text (referral, website, cold_call, advertisement, etc.)
├── lead_score: integer (0-100 automated or manual)
├── expected_value: numeric (potential engagement value)
├── expected_close_date: date
├── lost_reason: text (if lost)
├── converted_at: timestamp (when converted to client)
├── converted_to_client_id: uuid (FK to clients.id after conversion)
└── last_activity_at: timestamp
```

### Option 2: Separate Leads Table

Create a dedicated `leads` table that mirrors contact structure with additional CRM fields, then link to contacts/clients on conversion.

**Recommendation**: Option 1 is simpler and leverages the existing dual-access model.

---

## Lead-to-Client Conversion Workflow

```text
┌─────────────────┐
│  New Contact    │
│  (Standalone)   │
│  client_id=NULL │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lead Status:   │
│  NEW            │
└────────┬────────┘
         │ Qualification
         ▼
┌─────────────────┐
│  QUALIFIED      │
│  Score: 75/100  │
└────────┬────────┘
         │ Proposal/Engagement
         ▼
┌─────────────────┐
│  PROPOSAL_SENT  │
│  Value: ₹2L     │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐  ┌───────┐
│  WON  │  │ LOST  │
└───┬───┘  └───────┘
    │
    ▼ Conversion
┌─────────────────────────────────────┐
│  CREATE CLIENT                      │
│  - Copy contact details to client   │
│  - Set contact.client_id = new_id   │
│  - Set contact.converted_at = NOW   │
│  - Set lead_status = 'won'          │
│  - Auto-create first case (optional)│
└─────────────────────────────────────┘
```

---

## Database Changes Required

### Migration 1: Add CRM Fields to client_contacts

```sql
-- Add lead/CRM fields to existing contacts table
ALTER TABLE client_contacts
ADD COLUMN lead_status text DEFAULT NULL,
ADD COLUMN lead_source text DEFAULT NULL,
ADD COLUMN lead_score integer DEFAULT 0,
ADD COLUMN expected_value numeric(15,2) DEFAULT NULL,
ADD COLUMN expected_close_date date DEFAULT NULL,
ADD COLUMN lost_reason text DEFAULT NULL,
ADD COLUMN converted_at timestamptz DEFAULT NULL,
ADD COLUMN last_activity_at timestamptz DEFAULT NOW();

-- Create lead_status check
ALTER TABLE client_contacts
ADD CONSTRAINT chk_lead_status 
CHECK (lead_status IS NULL OR lead_status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'));

-- Index for pipeline queries
CREATE INDEX idx_contacts_lead_status ON client_contacts(lead_status) WHERE lead_status IS NOT NULL;
CREATE INDEX idx_contacts_owner_lead ON client_contacts(owner_user_id, lead_status) WHERE lead_status IS NOT NULL;
```

### Migration 2: Lead Activities Table

```sql
CREATE TABLE lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  contact_id uuid NOT NULL REFERENCES client_contacts(id) ON DELETE CASCADE,
  activity_type text NOT NULL, -- 'call', 'email', 'meeting', 'note', 'task', 'status_change'
  subject text,
  description text,
  outcome text,
  next_action text,
  next_action_date date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT NOW()
);

-- RLS policies similar to client_contacts
```

### Migration 3: Marketing Campaigns (Optional Phase 2)

```sql
CREATE TABLE marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  type text, -- 'email', 'referral', 'seminar', 'advertisement'
  status text DEFAULT 'draft', -- 'draft', 'active', 'completed'
  budget numeric(12,2),
  start_date date,
  end_date date,
  target_audience text,
  created_at timestamptz DEFAULT NOW()
);

-- Link contacts to campaigns
ALTER TABLE client_contacts
ADD COLUMN campaign_id uuid REFERENCES marketing_campaigns(id);
```

---

## New Services Required

### 1. leadService.ts

```typescript
// Core lead management operations
- getLeads(filters: LeadFilters): Lead[]
- updateLeadStatus(contactId, status, notes?): Lead
- scoreL ead(contactId, score): Lead
- convertToClient(contactId, clientData): { client: Client, contact: Contact }
- getLeadActivities(contactId): Activity[]
- addLeadActivity(contactId, activity): Activity
- getLeadPipeline(): PipelineStats
```

### 2. leadConversionService.ts

```typescript
// Contact → Client conversion workflow
async convertLeadToClient(contactId: string, options: ConversionOptions) {
  // 1. Fetch contact
  // 2. Validate conversion eligibility
  // 3. Create new client with contact data
  // 4. Update contact.client_id = new client ID
  // 5. Update contact.lead_status = 'won'
  // 6. Update contact.converted_at = NOW()
  // 7. Optionally create first case
  // 8. Log conversion activity
  // 9. Return both client and updated contact
}
```

---

## New UI Components

### 1. Lead Pipeline Dashboard

```text
┌─────────────────────────────────────────────────────────────────┐
│  Lead Pipeline                                    [+ New Lead]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────┐  ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌──────┐ │
│  │  NEW   │  │CONTACTED│  │ QUALIFIED │  │PROPOSAL │  │ WON  │ │
│  │   5    │→ │    3    │→ │     2     │→ │    1    │→ │  8   │ │
│  │  ₹10L  │  │   ₹8L   │  │    ₹5L    │  │   ₹2L   │  │ ₹15L │ │
│  └────────┘  └─────────┘  └───────────┘  └─────────┘  └──────┘ │
│                                                                 │
│  [Kanban View]  [Table View]  [Analytics]                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Lead Detail Panel

- Contact information (existing)
- Lead status selector
- Activity timeline
- Conversion button (when qualified)
- Expected value & close date

### 3. Convert to Client Modal

- Pre-filled from contact data
- Additional client fields (GSTIN, PAN, Type)
- Option to create first case
- Confirmation and audit trail

---

## File Structure

```text
src/
├── components/
│   └── crm/
│       ├── LeadPipeline.tsx           # Kanban pipeline view
│       ├── LeadCard.tsx               # Individual lead card
│       ├── LeadDetailDrawer.tsx       # Lead details panel
│       ├── LeadActivityTimeline.tsx   # Activity history
│       ├── ConvertToClientModal.tsx   # Conversion workflow
│       ├── LeadFilters.tsx            # Pipeline filters
│       └── LeadStats.tsx              # Pipeline metrics
├── pages/
│   └── LeadsPage.tsx                  # Main CRM page
├── services/
│   ├── leadService.ts                 # Lead CRUD operations
│   └── leadConversionService.ts       # Conversion logic
└── types/
    └── lead.ts                        # Lead type definitions
```

---

## Integration Points

### 1. Contacts Module Enhancement

- Add "Mark as Lead" action for standalone contacts
- Add lead status column to contacts table
- Quick convert button in contact row actions

### 2. Client Creation

- New clients can be created from converted leads
- Preserve lead history after conversion
- Link back to original contact record

### 3. Case Management

- Option to create first case during conversion
- Pre-populate case with client data

### 4. Dashboard Widgets

- Lead pipeline summary tile
- Conversion rate metrics
- Leads requiring follow-up

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. Add CRM columns to `client_contacts` table
2. Create `leadService.ts` with basic CRUD
3. Add lead status to Contacts table view
4. Create "Mark as Lead" functionality

### Phase 2: Pipeline UI (Week 2-3)
1. Create `LeadsPage.tsx` with pipeline view
2. Implement Kanban drag-and-drop
3. Build `LeadDetailDrawer.tsx`
4. Add activity logging

### Phase 3: Conversion Workflow (Week 3-4)
1. Build `ConvertToClientModal.tsx`
2. Implement `leadConversionService.ts`
3. Auto-populate client creation form
4. Add conversion audit trail

### Phase 4: Analytics & Marketing (Week 4+)
1. Lead pipeline analytics
2. Conversion funnel metrics
3. Source tracking
4. Campaign management (optional)

---

## Technical Considerations

### RLS Policies

Lead data inherits `client_contacts` RLS:
- Owner can see own leads
- Team can see team leads (based on `data_scope`)
- Admin sees all

### Backward Compatibility

- Existing contacts remain unchanged
- `lead_status = NULL` means "not a lead" (regular contact)
- No breaking changes to current workflows

### Performance

- Indexed `lead_status` for pipeline queries
- Pagination for large lead lists
- Realtime updates for pipeline view

