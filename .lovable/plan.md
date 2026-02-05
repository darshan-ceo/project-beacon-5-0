
# Add Notice Workflow Alignment Plan

## Current State Analysis

The Stage Workflow micro-workflow infrastructure is already implemented with:

| Component | Status | Gap |
|-----------|--------|-----|
| `stage_notices` table | Complete | Missing: `offline_reference_no`, `issuing_authority`, `issuing_designation`, `tax_period`, `financial_year`, demand breakdown fields |
| `stage_replies` table | Complete | Missing: `mode` (Portal/Physical/Email) field |
| `stage_workflow_steps` table | Complete | No gaps |
| `AddNoticeModal.tsx` | Basic form | Needs expanded fields per requirements |
| `StageNoticesPanel.tsx` | Card list view | Needs current workflow step indicator |
| `FileReplyModal.tsx` | Working | Needs filing mode field |
| `StageHearingsPanel.tsx` | Working | Needs hearing purpose, outcome options |
| `StageClosurePanel.tsx` | Working | Already has configurable outcomes |

---

## Implementation Scope

### 1. Database Schema Enhancement

**Add new columns to `stage_notices`:**

| Column | Type | Purpose |
|--------|------|---------|
| `offline_reference_no` | varchar | Offline/Physical reference number |
| `issuing_authority` | varchar | Authority name |
| `issuing_designation` | varchar | Designation of issuing officer |
| `tax_period_start` | date | Start of tax period |
| `tax_period_end` | date | End of tax period |
| `financial_year` | varchar | e.g., "2023-24" |
| `tax_amount` | numeric | Tax component of demand |
| `interest_amount` | numeric | Interest component |
| `penalty_amount` | numeric | Penalty component |
| `tax_applicable` | boolean | Flag for "As Applicable" |
| `interest_applicable` | boolean | Flag for "As Applicable" |
| `penalty_applicable` | boolean | Flag for "As Applicable" |
| `workflow_step` | varchar | Current notice workflow step: 'notice', 'reply', 'hearing', 'closed' |

**Add new column to `stage_replies`:**

| Column | Type | Purpose |
|--------|------|---------|
| `filing_mode` | varchar | 'Portal' / 'Physical' / 'Email' |

---

### 2. Enhanced AddNoticeModal Form

Reorganize the modal into logical sections with all required fields:

**Section 1: Notice Identification**
- Online Reference No (existing `notice_number`)
- Offline Reference No (new)
- Notice Type (existing - dropdown)
- Notice Date (existing)
- Reply Due Date (existing)

**Section 2: Issuing Authority**
- Authority Name (new dropdown or text)
- Officer Designation (new)

**Section 3: Legal & Compliance**
- Section(s) Invoked (existing - multi-select)
- Tax Period From/To (new date range)
- Financial Year (new dropdown)

**Section 4: Demand Details**
Grid layout with "As Applicable" checkboxes:
- Tax Amount + checkbox
- Interest Amount + checkbox
- Penalty Amount + checkbox
- Total (computed, read-only)

**Section 5: Documents**
- Drag-drop upload zone for scanned notice
- Support multiple attachments

**Section 6: Save Options**
- "Save as Draft" vs "Submit" status

---

### 3. Notice Micro-Workflow Tracking

Each notice will track its own 4-step internal workflow status via the new `workflow_step` column:

| Step | Description | Transition Logic |
|------|-------------|------------------|
| `notice` | Notice metadata captured | Auto-set on create |
| `reply` | One or more replies filed | Auto-advance when first reply created |
| `hearing` | Hearings in progress | Auto-advance when first hearing linked |
| `closed` | Notice closed with outcome | Manual closure via UI |

**Visual Indicator**: Show mini-stepper or status chip on each notice card

---

### 4. Notice Card Enhancements (StageNoticesPanel)

Update each notice card to display:

```text
┌──────────────────────────────────────────────────────┐
│ [ASMT-10] ABC/2024/12345                   [Replied] │
│ ───────────────────────────────────────────────────  │
│ 📅 15 Jan 2025  ⏰ Due: 15 Feb (28 days)  ₹5,50,000 │
│ ───────────────────────────────────────────────────  │
│ Current Step: ● Notice → ○ Reply → ○ Hearing → ○    │
│ ───────────────────────────────────────────────────  │
│ [Add Reply]  [Schedule Hearing]  [Close Notice]  ▼  │
└──────────────────────────────────────────────────────┘
```

**New CTAs per notice:**
- "Add Reply" - Opens FileReplyModal
- "Schedule Hearing" - Opens HearingModal linked to this notice
- "Close Notice" - Opens NoticeClosureModal (new)

---

### 5. Notice Closure Flow (New Component)

Create `NoticeClosureModal.tsx` with selectable outcomes:

| Outcome | Description | Next Action |
|---------|-------------|-------------|
| Order Passed | Authority issued an order | Show appeal limitation timer |
| Notice Dropped | Authority dropped the notice | Close without action |
| Time-barred | Limitation period expired | Close without action |
| Moved to Next Stage | Case promoted to appeal stage | Trigger stage advancement |

On closure:
- Update notice `status` to 'Closed'
- Update notice `workflow_step` to 'closed'
- If "Order Passed" → populate order metadata and show appeal deadline
- If "Moved to Next Stage" → prompt for stage advancement

---

### 6. FileReplyModal Enhancement

Add "Filing Mode" field:

```typescript
const FILING_MODES = [
  { value: 'Portal', label: 'Online Portal', description: 'Filed via GST portal' },
  { value: 'Physical', label: 'Physical', description: 'Submitted in person/by post' },
  { value: 'Email', label: 'Email', description: 'Filed via email' }
];
```

---

### 7. Hearing-Notice Linkage

Update `HearingModal` and `hearingsService` to support optional `notice_id` foreign key:

- When scheduling hearing from a notice card, pass `notice_id`
- Display linked notice reference in hearing details
- Track hearing purpose and outcomes:
  - Purpose: Initial / Adjourned / Final
  - Outcome: Adjourned / Heard / Order Reserved

---

### 8. Stage Closure Integration

**Validation Rule (configurable warning, not hard block):**
- Show warning if open notices exist when attempting stage closure
- Allow override with confirmation

**Visibility Rule:**
- Original notice data visible in higher stages as read-only reference
- Query notices by `case_id` regardless of `stage_instance_id`

---

### 9. Backward Compatibility

**Existing cases:**
- Cases with single notices (from original `cases` table fields) continue working
- `stageNoticesService.ensureOriginalNotice()` already handles migration
- No data migration required

**Field mapping:**
- `cases.notice_no` → `stage_notices.notice_number` (for original)
- `cases.notice_date` → `stage_notices.notice_date` (for original)
- `cases.tax_demand` → `stage_notices.amount_demanded` (for original)

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database** | |
| SQL Migration | Add new columns to `stage_notices` and `stage_replies` |
| **Types** | |
| `src/types/stageWorkflow.ts` | Add new fields to `StageNotice`, `CreateStageNoticeInput`, `StageReply` |
| **Components** | |
| `src/components/modals/AddNoticeModal.tsx` | Expand form with new sections and fields |
| `src/components/modals/FileReplyModal.tsx` | Add filing mode field |
| `src/components/modals/NoticeClosureModal.tsx` | **New** - Notice-level closure flow |
| `src/components/lifecycle/StageNoticesPanel.tsx` | Add mini-workflow stepper per notice, new CTAs |
| `src/components/lifecycle/StageHearingsPanel.tsx` | Add purpose/outcome fields |
| **Services** | |
| `src/services/stageNoticesService.ts` | Handle new fields, add workflow step transitions |
| `src/services/stageRepliesService.ts` | Handle filing mode |

---

## Implementation Sequence

1. **Database Migration** - Add new columns (non-breaking, nullable)
2. **Type Updates** - Extend TypeScript interfaces
3. **Service Updates** - Handle new fields in CRUD operations
4. **AddNoticeModal Expansion** - Reorganize into sections with new fields
5. **NoticeClosureModal** - Create new component for notice-level closure
6. **StageNoticesPanel Updates** - Mini-workflow indicator + new CTAs
7. **FileReplyModal Enhancement** - Add filing mode
8. **Integration Testing** - End-to-end workflow validation

---

## Success Criteria

1. Users can add multiple notices per stage with all required metadata
2. Each notice shows its current workflow step visually
3. Users can file replies with mode selection and document upload
4. Users can schedule hearings linked to specific notices
5. Notice closure triggers appropriate outcomes including appeal timelines
6. Stage closure shows warning (not block) for open notices
7. Original notice data visible as read-only in higher stages
8. All existing cases continue to function without migration

---

## Technical Notes

### Notice Workflow Step Auto-Transitions

```typescript
// In stageNoticesService after reply creation:
async autoAdvanceWorkflowStep(noticeId: string, toStep: 'reply' | 'hearing') {
  const notice = await this.getNotice(noticeId);
  if (!notice) return;
  
  // Only advance if currently at earlier step
  const stepOrder = ['notice', 'reply', 'hearing', 'closed'];
  const currentIndex = stepOrder.indexOf(notice.workflow_step || 'notice');
  const targetIndex = stepOrder.indexOf(toStep);
  
  if (targetIndex > currentIndex) {
    await this.updateNotice(noticeId, { workflow_step: toStep });
  }
}
```

### Demand Breakdown Computation

```typescript
// Total demand = Tax + Interest + Penalty (only if applicable flags are set)
const totalDemand = 
  (formData.tax_applicable ? (formData.tax_amount || 0) : 0) +
  (formData.interest_applicable ? (formData.interest_amount || 0) : 0) +
  (formData.penalty_applicable ? (formData.penalty_amount || 0) : 0);
```
