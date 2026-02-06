

# Phase 3: Lead Detail Drawer & Conversion Modal

## Overview

This phase completes the CRM module by adding:
1. **LeadDetailDrawer** - A comprehensive slide-over for viewing/editing lead details and activities
2. **LeadActivityTimeline** - Chronological activity feed with inline add capability  
3. **ConvertToClientModal** - Full conversion workflow using the existing `leadConversionService`

---

## Components to Create

| Component | Description |
|-----------|-------------|
| `LeadDetailDrawer.tsx` | Main detail view using `LargeSlideOver` pattern |
| `LeadActivityTimeline.tsx` | Activity feed with type icons |
| `AddActivityModal.tsx` | Modal for logging new activities |
| `ConvertToClientModal.tsx` | Conversion workflow with client form |

---

## Step 1: LeadActivityTimeline Component

**File:** `src/components/crm/LeadActivityTimeline.tsx`

A chronological activity feed displaying all interactions:

- Activity type icon mapping (Phone for call, Mail for email, Users for meeting, StickyNote for note, CheckSquare for task, ArrowRightCircle for status_change, UserCheck for conversion)
- Timestamp formatting using `date-fns`
- Creator name display (from joined `profiles.full_name`)
- Subject and description display
- Next action indicator if present
- Uses `leadService.getActivities(contactId)` for data

```text
┌──────────────────────────────────────┐
│ ○ Call - Discussed pricing           │
│   Yesterday · John Doe               │
│   "Client interested in tax..."      │
│   Next: Send proposal by Feb 10      │
├──────────────────────────────────────┤
│ ○ Status changed to Contacted        │
│   3 days ago · System                │
└──────────────────────────────────────┘
```

---

## Step 2: AddActivityModal Component

**File:** `src/components/crm/AddActivityModal.tsx`

Simple dialog for logging new activities:

- Activity type selector (call, email, meeting, note, task)
- Subject input (required)
- Description textarea
- Outcome input (optional)
- Next action with date picker (optional)
- Calls `leadService.addActivity()` on submit

---

## Step 3: LeadDetailDrawer Component

**File:** `src/components/crm/LeadDetailDrawer.tsx`

Using the `LargeSlideOver` pattern for a rich detail view:

**Structure:**
```text
┌─────────────────────────────────────────────────┐
│ [X]  Lead Details                               │ ← Header
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ Overview Card                               │ │
│ │ Name: John Smith                            │ │
│ │ Designation: CFO                            │ │
│ │ Email: john@example.com                     │ │
│ │ Phone: +91 98765 43210                      │ │
│ │                                             │ │
│ │ Lead Source: Referral    Score: 75 (Warm)   │ │
│ │ Expected Value: ₹5L      Close: Feb 28     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Status & Actions                            │ │
│ │ [New] [Contacted] [Qualified] ...           │ │ ← Quick status buttons
│ │                                             │ │
│ │ [Log Activity]  [Edit Lead]  [Convert ▶]   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Activity Timeline                           │ │
│ │ ○ Call - Discussed pricing                  │ │
│ │ ○ Email - Sent intro materials              │ │
│ │ ○ Status changed to Contacted               │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ [Mark as Lost]                    [Close]       │ ← Footer
└─────────────────────────────────────────────────┘
```

**Features:**
- Overview card with contact details, email/phone display
- Lead metadata: source, score (with color badge), expected value, close date
- Status quick-change buttons (row of status badges, click to change)
- Action buttons: Log Activity, Edit Lead, Convert to Client
- Embedded `LeadActivityTimeline` component
- Footer: Mark as Lost (triggers `leadService.updateLeadStatus(id, 'lost')`) and Close

**Data Fetching:**
- Uses `leadService.getLead(contactId)` for lead data
- Uses `leadService.getActivities(contactId)` for timeline
- TanStack Query for caching and refetch on mutation

---

## Step 4: ConvertToClientModal Component

**File:** `src/components/crm/ConvertToClientModal.tsx`

A focused conversion workflow using `AdaptiveFormShell`:

**Step 1: Eligibility Check**
- On mount, calls `leadConversionService.checkConversionEligibility(contactId)`
- If not eligible, shows reason and disables form
- If eligible, pre-fills form from `leadConversionService.getConversionPreview()`

**Step 2: Client Form**
Pre-filled from contact data:
- Client Name (from `lead.name`, editable)
- Client Type selector (Individual/Company/Proprietorship/etc.)
- GSTIN input (optional)
- PAN input (optional)
- Email (from primary email)
- Phone (from primary phone)
- State/City selectors

**Step 3: Optional First Case**
- Checkbox: "Create first case for this client"
- If checked, show:
  - Case Title input (required)
  - Case Description textarea (optional)

**Step 4: Confirmation & Submit**
- Summary panel showing:
  - Lead name → Client name
  - Email, Phone
  - Will create case: Yes/No
- Submit button calls `leadConversionService.convertToClient()`

**On Success:**
- Toast: "Lead converted successfully"
- Navigate to new client view OR refresh leads list
- Close drawer and modal

---

## Step 5: Integrate with LeadsPage

**Modifications to:** `src/pages/LeadsPage.tsx`

1. Import new components:
   - `LeadDetailDrawer`
   - `ConvertToClientModal`

2. Add state:
   ```tsx
   const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
   const [isDrawerOpen, setIsDrawerOpen] = useState(false);
   const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
   const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
   ```

3. Update handlers:
   ```tsx
   const handleViewLead = (lead: Lead) => {
     setSelectedLead(lead);
     setIsDrawerOpen(true);
   };

   const handleConvertLead = (lead: Lead) => {
     setConvertingLead(lead);
     setIsConvertModalOpen(true);
   };
   ```

4. Render modals at page bottom:
   ```tsx
   <LeadDetailDrawer
     lead={selectedLead}
     isOpen={isDrawerOpen}
     onClose={() => setIsDrawerOpen(false)}
     onConvert={handleConvertLead}
   />
   
   <ConvertToClientModal
     lead={convertingLead}
     isOpen={isConvertModalOpen}
     onClose={() => setIsConvertModalOpen(false)}
     onSuccess={() => {
       refetchLeads();
       refetchStats();
       setIsConvertModalOpen(false);
       setIsDrawerOpen(false);
     }}
   />
   ```

---

## Step 6: Enable "Convert" from LeadCard

**Modifications to:** `src/components/crm/LeadCard.tsx`

The `onConvert` callback is already wired - no changes needed. It will now open the real conversion modal.

---

## Technical Details

### Data Flow

```text
LeadsPage
├── LeadPipeline
│   └── LeadCard
│       ├── onView → opens LeadDetailDrawer
│       └── onConvert → opens ConvertToClientModal
│
├── LeadDetailDrawer
│   ├── useQuery → leadService.getLead(id)
│   ├── LeadActivityTimeline
│   │   └── useQuery → leadService.getActivities(id)
│   ├── AddActivityModal
│   │   └── useMutation → leadService.addActivity()
│   └── [Convert] button → opens ConvertToClientModal
│
└── ConvertToClientModal
    ├── useQuery → leadConversionService.getConversionPreview()
    └── useMutation → leadConversionService.convertToClient()
```

### Patterns Reused

| Pattern | Source | Usage |
|---------|--------|-------|
| LargeSlideOver | `src/components/ui/large-slide-over.tsx` | LeadDetailDrawer container |
| Card sections | `ClientModal.tsx` | Overview, Status, Timeline cards |
| Timeline styling | `StageWorkflowTimeline.tsx` | Activity feed layout |
| Form validation | `ClientModal.tsx` | Conversion form validation |
| Service + TanStack Query | `LeadsPage.tsx` | Data fetching pattern |

### Activity Type Icons

```tsx
const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: StickyNote,
  task: CheckSquare,
  status_change: ArrowRightCircle,
  conversion: UserCheck,
};
```

---

## Files to Create

| File | Description | Est. Lines |
|------|-------------|------------|
| `src/components/crm/LeadActivityTimeline.tsx` | Activity feed component | ~120 |
| `src/components/crm/AddActivityModal.tsx` | Log activity dialog | ~150 |
| `src/components/crm/LeadDetailDrawer.tsx` | Main detail drawer | ~350 |
| `src/components/crm/ConvertToClientModal.tsx` | Conversion workflow | ~400 |

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/LeadsPage.tsx` | Add drawer/modal state and render |

---

## Implementation Sequence

1. **Create LeadActivityTimeline** - Standalone component for activity display
2. **Create AddActivityModal** - Dialog for logging new activities  
3. **Create LeadDetailDrawer** - Combines overview, status controls, and timeline
4. **Create ConvertToClientModal** - Complete conversion workflow
5. **Update LeadsPage** - Wire everything together

---

## Edge Cases Handled

1. **Already converted leads**: ConvertToClientModal checks eligibility and shows error
2. **Lost leads**: Convert button hidden, can be reopened via status change
3. **Empty activities**: Show "No activities yet" with prompt to log first activity
4. **Conversion rollback**: If contact update fails, client creation is rolled back (already in service)
5. **First case optional**: Checkbox controls whether case is created

---

## Outcome

After implementation:
1. Click any lead card → Opens detailed drawer with full info
2. View/edit lead score, expected value, close date
3. Log activities (calls, emails, meetings, notes)
4. One-click status changes from within drawer
5. "Convert to Client" opens guided conversion flow
6. Optional first case creation during conversion
7. Seamless lead → client → case lifecycle

