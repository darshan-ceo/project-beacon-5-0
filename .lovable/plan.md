
# Notice Intake Wizard Upgrade Plan

## Executive Summary

Upgrade the legacy Notice Intake Wizard to align with the current "Create New Case" and "Add Notice (Manual)" forms, supporting both new case creation and adding notices to existing cases with full stage workflow integration.

---

## Current State vs. Target State

| Aspect | Current Wizard | Target State |
|--------|----------------|--------------|
| Entry Mode | Always creates new case | Choice: New Case OR Add to Existing |
| Steps | 7 steps | 9 steps (with decision point) |
| Fields | Legacy extraction format | Aligned with CaseForm + AddNoticeModal |
| Notice Storage | Case-level fields | `stage_notices` table via `stageNoticesService` |
| Validation | Only GSTIN blocks | 6 mandatory fields per Create New Case rules |
| Task Generation | Single bundle trigger | Stage-aware task bundles |
| Case Search | None | Full case search/selection UI |

---

## Implementation Architecture

### Step Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                   NOTICE INTAKE WIZARD v2.0                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Step 0] ──► Entry Decision                                    │
│              "What do you want to do?"                          │
│              ○ Create a New Case from Notice                    │
│              ○ Add this Notice to an Existing Case              │
│                                                                  │
│              ┌─── New Case ───┐    ┌── Existing Case ──┐        │
│              ▼                      ▼                            │
│  [Step 1] ──► Upload Notice PDF (same for both paths)           │
│                                                                  │
│  [Step 2] ──► Extract & Classify Data (OCR/AI)                  │
│              • Notice Type, Reference, Dates                     │
│              • Legal Section, Authority, Jurisdiction           │
│              • Financial Demand Breakdown                        │
│              • Confidence scores per field                       │
│                                                                  │
│  [Step 3] ──► Resolve Data Gaps                                 │
│              • Mandatory: Notice Type, Notice Date, Due Date    │
│              • Mandatory (New Case): Client, Assigned To        │
│              • Optional: Authority, Financial details           │
│                                                                  │
│  [Step 4] ──► Case Mapping                                      │
│              ┌─ New Case ────────────┐ ┌─ Existing Case ────┐   │
│              │ Case Type, Year       │ │ Search/Select Case │   │
│              │ Auto-generate Number  │ │ Preview Summary    │   │
│              │ Client Selection      │ │ Locked Case Info   │   │
│              └───────────────────────┘ └────────────────────┘   │
│                                                                  │
│  [Step 5] ──► Timeline & Assignment                             │
│              • Reply Due Date (mandatory)                        │
│              • Days Remaining/Overdue indicator                  │
│              • Assigned To (mandatory for new case)              │
│              • Priority selection                                │
│                                                                  │
│  [Step 6] ──► Financial & Legal Validation                      │
│              • Demand Breakdown Grid                             │
│              • Applicability flags (Tax/Interest/Penalty)       │
│              • Section invoked summary                           │
│              • Explicit confirmation checkbox                    │
│                                                                  │
│  [Step 7] ──► Create Case / Link Notice                         │
│              ┌─ New Case ────────────┐ ┌─ Existing Case ────┐   │
│              │ Create case record    │ │ Create stage_notice│   │
│              │ Create stage_notice   │ │ Link to case       │   │
│              │ Upload document       │ │ Upload document    │   │
│              └───────────────────────┘ └────────────────────┘   │
│                                                                  │
│  [Step 8] ──► Stage Awareness & Task Generation                 │
│              • Stage tagging (SCN, Reminder, Hearing, Order)    │
│              • Auto-create tasks via taskBundleTriggerService   │
│              • Tasks linked to Case + Notice                     │
│                                                                  │
│  [Step 9] ──► Notes & Completion                                │
│              • Internal notes (optional)                         │
│              • Legal observations (optional)                     │
│              • Success summary + navigation options              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Step Specifications

### Step 0: Entry Decision (NEW)

**Purpose**: Allow user to choose workflow path before upload

**UI Components**:
- Radio button group with 2 options
- Clear descriptions for each path
- "Continue" button to proceed

**State Management**:
```typescript
type WizardMode = 'new_case' | 'existing_case';
const [wizardMode, setWizardMode] = useState<WizardMode | null>(null);
```

### Step 1: Upload Notice (RETAIN + ENHANCE)

**Current**: Working PDF upload with drag-drop

**Enhancements**:
- Keep existing upload functionality
- Use Lovable AI (`notice-ocr` edge function) as primary OCR
- OpenAI Vision as optional enhancement (user-provided key)
- Support multi-page processing (up to 4 pages)

### Step 2: Extract & Classify Data (ENHANCE)

**Field Alignment with AddNoticeModal**:

| Extracted Field | Maps To | Required |
|----------------|---------|----------|
| Notice Type | `notice_type` | Yes (mandatory) |
| Online Reference No | `notice_number` | Yes (mandatory) |
| Offline Reference No | `offline_reference_no` | No |
| Notice Date | `notice_date` | Yes (mandatory) |
| Reply Due Date | `due_date` | Yes (mandatory) |
| Issuing Authority | `issuing_authority` | No |
| Officer Designation | `issuing_designation` | No |
| Section(s) Invoked | `section_invoked` | No |
| Tax Period Start | `tax_period_start` | No |
| Tax Period End | `tax_period_end` | No |
| Financial Year | `financial_year` | No |
| Tax Amount | `tax_amount` | No |
| Interest Amount | `interest_amount` | No |
| Penalty Amount | `penalty_amount` | No |
| Tax Applicable | `tax_applicable` | No (default: true) |
| Interest Applicable | `interest_applicable` | No (default: true) |
| Penalty Applicable | `penalty_applicable` | No (default: true) |
| GSTIN | (for client matching) | Yes (for new case) |
| Taxpayer Name | (for client creation) | No |

**Confidence Scoring**:
- Display color-coded confidence badges per field
- Green (≥85%), Yellow (70-84%), Orange (50-69%), Red (<50%)

### Step 3: Resolve Data Gaps (REFACTOR)

**Mandatory Fields (Block Progress)**:
1. Notice Type (form_type)
2. Notice Date
3. Reply Due Date
4. Client (for new case)
5. Assigned To (for new case)
6. Notice Reference No

**Warning Fields (Non-blocking)**:
- GSTIN (warning if missing for existing case path)
- Financial amounts (optional)
- Authority details (optional)
- Period details (optional)

**UI Changes**:
- Separate "Blocking" vs "Warning" sections (similar to DataGapsResolver)
- Clear labeling: "Required to Continue" vs "Recommended"

### Step 4: Case Mapping (MAJOR ENHANCEMENT)

**New Case Path**:
- Case Type dropdown (default: GST)
- Year auto-fill (current year)
- Sequence auto-generation
- Preview generated case number
- Office File No (optional)
- Primary Issue (optional, relabeled from Issue Type)
- Auto-generated Case Title

**Existing Case Path** (NEW):
- Case search input with fuzzy matching
- Search by: Case Number, Notice No, Client Name, GSTIN
- Results grid with: Case Number, Client, Stage, Last Activity
- Selected case preview card
- Locked case identification fields

**Integration**:
```typescript
// Use Fuse.js for fuzzy search (already in dependencies)
import Fuse from 'fuse.js';

const fuse = new Fuse(state.cases, {
  keys: ['caseNumber', 'noticeNo', 'clientName', 'gstin'],
  threshold: 0.3
});
```

### Step 5: Timeline & Assignment (ENHANCE)

**Required Fields**:
- Reply Due Date (pre-filled from extraction)
- Days remaining/overdue indicator (computed)
- Assigned To (required for new case)

**Optional Fields**:
- Priority dropdown (Low/Medium/High)
- Auto-suggest assignee based on client history (enhancement)

**Visual Elements**:
- Timeline urgency indicator (color-coded)
- Overdue warning alert

### Step 6: Financial & Legal Validation (NEW STEP)

**Demand Breakdown Grid**:
```text
┌─────────────────────────────────────────────────────────┐
│ Component     │ Amount (₹)   │ Applicable │            │
├───────────────┼──────────────┼────────────┤            │
│ Tax           │ 5,50,000     │ [x]        │            │
│ Interest      │ 1,20,000     │ [x]        │            │
│ Penalty       │ 80,000       │ [x]        │            │
├───────────────┼──────────────┼────────────┤            │
│ Total Demand  │ 7,50,000     │ (computed) │            │
└─────────────────────────────────────────────────────────┘
```

**Legal Summary**:
- Section(s) Invoked display
- Issuing Authority
- Jurisdiction

**Confirmation**:
```typescript
const [confirmed, setConfirmed] = useState(false);

// Checkbox: "I confirm the extracted and entered notice details are correct."
```

### Step 7: Create Case / Link Notice (REFACTOR)

**New Case Path**:
1. Create case via `casesService.create()`
2. Create stage_notice via `stageNoticesService.createNotice()`
3. Upload document via `dmsService.files.upload()`
4. Log to timeline

**Existing Case Path** (NEW):
1. Create stage_notice linked to selected case
2. Upload document linked to case
3. Log to timeline

**Stage Notice Data Mapping**:
```typescript
const noticeInput: CreateStageNoticeInput = {
  case_id: caseId,
  stage_instance_id: currentStageInstanceId || null,
  notice_type: extractedData.notice_type,
  notice_number: extractedData.notice_number,
  offline_reference_no: extractedData.offline_reference_no,
  notice_date: extractedData.notice_date,
  due_date: extractedData.due_date,
  issuing_authority: extractedData.issuing_authority,
  issuing_designation: extractedData.issuing_designation,
  section_invoked: extractedData.section_invoked,
  tax_period_start: extractedData.tax_period_start,
  tax_period_end: extractedData.tax_period_end,
  financial_year: extractedData.financial_year,
  tax_amount: extractedData.tax_amount,
  interest_amount: extractedData.interest_amount,
  penalty_amount: extractedData.penalty_amount,
  tax_applicable: extractedData.tax_applicable,
  interest_applicable: extractedData.interest_applicable,
  penalty_applicable: extractedData.penalty_applicable,
  amount_demanded: totalDemand,
  workflow_step: 'notice',
  is_original: wizardMode === 'new_case'
};
```

### Step 8: Stage Awareness & Task Generation (ENHANCE)

**Stage Tagging**:
```typescript
type NoticeStage = 'SCN' | 'Reminder' | 'Hearing' | 'Order';
```

**Task Bundle Trigger**:
```typescript
await taskBundleTriggerService.triggerTaskBundles(
  {
    id: caseId,
    currentStage: currentStage,
    clientId: clientId,
    caseNumber: caseNumber,
    assignedToId: assignedToId,
    assignedToName: assignedToName
  },
  wizardMode === 'new_case' ? 'case_created' : 'notice_added',
  currentStage,
  dispatch
);
```

**Auto-Generated Tasks**:
- Reply Drafting (linked to notice due date)
- Document Collection
- Review & Approval
- Hearing Prep (if applicable)
- Order Follow-up (if applicable)

### Step 9: Notes & Completion (NEW STEP)

**Optional Fields**:
- Internal Notes (textarea)
- Legal Observations (textarea, AI-assist button for future)

**Completion Actions**:
- Success summary card
- "View Case" button
- "Add Another Notice" button
- "Close" button

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/components/notices/NoticeIntakeWizardV2.tsx` | Complete wizard rewrite |
| `src/components/notices/wizard/EntryDecisionStep.tsx` | Step 0 component |
| `src/components/notices/wizard/CaseSearchPanel.tsx` | Existing case search |
| `src/components/notices/wizard/FinancialValidationStep.tsx` | Step 6 component |
| `src/components/notices/wizard/StageAwarenessStep.tsx` | Step 8 component |
| `src/components/notices/wizard/CompletionStep.tsx` | Step 9 component |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/notices/NoticeIntakeWizard.tsx` | Deprecate or redirect to V2 |
| `src/components/documents/DocumentManagement.tsx` | Update wizard import |
| `src/components/cases/CaseManagement.tsx` | Update wizard import |
| `src/lib/notice/dataGapsResolver.ts` | Add new field paths |
| `src/validation/asmt10Resolver.ts` | Align validation rules |

---

## Validation Rules Alignment

### Blocking Validation (Must Pass to Proceed)

| Field | Path | Rule |
|-------|------|------|
| Notice Type | `notice_type` | Not empty |
| Notice Date | `notice_date` | Valid date, not future |
| Reply Due Date | `due_date` | Valid date, after notice date |
| Client | `clientId` | Valid UUID (new case only) |
| Assigned To | `assignedToId` | Valid UUID (new case only) |
| Notice Reference | `notice_number` | Not empty, min 5 chars |

### Warning Validation (Non-blocking)

| Field | Message |
|-------|---------|
| GSTIN | "GSTIN recommended for client matching" |
| Financial amounts | "Demand amounts recommended for tracking" |
| Section invoked | "Legal section recommended for compliance" |
| Period | "Tax period recommended for case context" |

---

## Data Integrity Rules

1. **One Case → Multiple Notices**: `stage_notices` table supports this via `case_id` FK
2. **Notice ≠ Case Data**: Wizard-created notices stored separately from case master fields
3. **Audit Trail**: `created_by`, `created_at` fields + timeline entries
4. **Source Tracking**: `metadata.source = 'notice_intake_wizard_v2'`
5. **Duplicate Prevention**: Check for existing notice with same reference number

---

## Service Integration

### Existing Services to Use

| Service | Method | Purpose |
|---------|--------|---------|
| `noticeExtractionService` | `extractFromPDF()` | OCR/AI extraction |
| `stageNoticesService` | `createNotice()` | Persist notice |
| `casesService` | `create()` | Create new case |
| `clientsService` | `create()` | Create client if needed |
| `dmsService` | `files.upload()` | Upload notice document |
| `taskBundleTriggerService` | `triggerTaskBundles()` | Auto-generate tasks |
| `timelineService` | `addEntry()` | Audit trail |

### Edge Function

| Function | Purpose |
|----------|---------|
| `notice-ocr` | Lovable AI (Gemini) extraction (already exists) |

---

## UI/UX Considerations

### Progress Indicator
- Enhanced timeline stepper (current implementation is good)
- Step count updates based on wizard mode

### Responsive Design
- Max width: `max-w-4xl`
- Mobile-friendly step layout

### Accessibility
- Keyboard navigation
- ARIA labels for screen readers
- Focus management between steps

### Error Handling
- Field-level validation errors
- Toast notifications for service errors
- Retry buttons for failed operations

---

## Migration Strategy

1. **Phase 1**: Create `NoticeIntakeWizardV2.tsx` alongside existing wizard
2. **Phase 2**: Feature flag to toggle between V1 and V2
3. **Phase 3**: Update imports to use V2 when stable
4. **Phase 4**: Deprecate V1 after validation

---

## Success Criteria

1. User can create a case from notice PDF in one guided flow
2. User can add notice to existing case without creating duplicate
3. All CaseForm mandatory fields are enforced in wizard
4. All AddNoticeModal fields are captured
5. Stage notices are created via `stageNoticesService`
6. Tasks are auto-generated and linked to case + notice
7. Documents are properly uploaded and linked
8. Timeline entries track wizard actions
9. No regression to existing case/notice functionality
10. Existing wizard functionality preserved during migration

---

## Implementation Sequence

1. Create base `NoticeIntakeWizardV2.tsx` with step framework
2. Implement Step 0 (Entry Decision)
3. Port Step 1 (Upload) from existing wizard
4. Enhance Step 2 (Extraction) with new field mapping
5. Refactor Step 3 (Data Gaps) with aligned validation
6. Implement Step 4 (Case Mapping) with search for existing case
7. Implement Step 5 (Timeline & Assignment)
8. Create Step 6 (Financial Validation) - new
9. Refactor Step 7 (Create/Link) with dual-path logic
10. Enhance Step 8 (Task Generation) with stage awareness
11. Create Step 9 (Notes & Completion) - new
12. Integration testing with both wizard paths
13. Update parent components to use V2

