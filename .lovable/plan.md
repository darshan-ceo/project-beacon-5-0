

# Module-wise FAQ Section in Help & Knowledge Center

## Overview

Add a dedicated **FAQ tab** to the Help & Knowledge Center page that organizes frequently asked questions by module (aligned with the sidebar: Overview, Practice, CRM, Insights, Masters, Settings). Each module will have 10-15 curated FAQs covering beginner to advanced usage, ensuring users understand both the "how" and the "why" behind each feature.

## What Gets Built

### 1. FAQ Data Files (JSON) -- one per module

Create 6 new JSON FAQ files under `public/help/faqs/modules/`:

| File | Module | FAQ Count | Coverage |
|------|--------|-----------|----------|
| `overview.json` | Dashboard & Compliance | 12 | KPIs, SLA tracking, compliance health, filters, export, daily routine |
| `practice.json` | Cases, Hearings, Tasks, Documents | 15 | Case lifecycle, stage transitions, hearing prep, task automation, document templates, notice intake, DRC forms |
| `crm.json` | Clients, Contacts, Inquiries | 12 | GSTIN autofill, client groups, contact roles, inquiry pipeline, portal access, communication tracking |
| `insights.json` | Reports | 10 | Report types, filters, scheduled reports, export formats, SLA reports, custom reports |
| `masters.json` | Authorities, Judges, Deadlines, Employees | 12 | Authority hierarchy, judge bench setup, statutory deadline calculation, employee-role mapping, data quality |
| `settings.json` | System Settings & Access/Roles | 10 | RBAC setup, custom roles, permission matrix, data scope, audit trail, notification config |

**Total: ~71 FAQs** across all modules.

### 2. FAQ Display Component

Create `src/components/help/ModuleFAQSection.tsx`:
- Accordion-based FAQ display (using existing Radix Accordion component)
- Module selector tabs/cards at the top (icons matching sidebar)
- Search/filter within FAQs
- Tags on each FAQ for quick scanning
- "Was this helpful?" feedback (optional, UI-only for now)

### 3. Integration into Help Center

Add a new **"FAQs"** tab to the existing Help Center page (`src/pages/HelpCenter.tsx`) alongside Discover, What's New, Get Started, Modules, and Glossary.

### 4. Search Integration

Register FAQ entries in the help discovery service (`src/services/helpDiscoveryService.ts`) so FAQs appear in the unified Discover search results.

## Sample FAQs (Philosophy-Aligned)

**Practice Module -- Cases:**
1. What is the case lifecycle and why does it matter?
2. How do I create a case from a GST notice (DRC-01)?
3. What is the difference between case stages and case status?
4. How does SLA tracking work and what triggers a breach?
5. Can I merge or link related cases?
6. How do I advance a case stage and what auto-tasks are created?
7. What documents are auto-required at each stage?
8. How does the AI Case Assistant help during case work?
9. What is the "From Notice" auto-fill and OCR feature?
10. How do I track tax demand vs. recovery across cases?

**CRM Module:**
1. How does GSTIN autofill work and what data does it fetch?
2. What is the difference between a Client and a Contact?
3. How do I organize clients into groups?
4. Can a client have multiple GSTINs?
5. How do I grant portal access to a client?
6. What is the inquiry pipeline and how do leads convert to clients?
7. How are communications (Email/WhatsApp) linked to clients?
8. What data scope rules apply to client visibility?
9. How do I bulk-import client data?
10. What happens when a client's GST registration is cancelled?

**Masters Module:**
1. What is the authority hierarchy (Adjudication > First Appeal > Tribunal > HC > SC)?
2. How do I add a new bench or judge?
3. How are statutory deadlines auto-calculated?
4. What is the difference between RBAC roles and Employee Master roles?
5. How do I configure holiday calendars for deadline calculations?

(Full set of ~71 FAQs will be written in the JSON files.)

## Technical Details

### New Files
| File | Purpose |
|------|---------|
| `public/help/faqs/modules/overview.json` | Dashboard & Compliance FAQs |
| `public/help/faqs/modules/practice.json` | Cases, Hearings, Tasks, Documents FAQs |
| `public/help/faqs/modules/crm.json` | Clients, Contacts, Inquiries FAQs |
| `public/help/faqs/modules/insights.json` | Reports FAQs |
| `public/help/faqs/modules/masters.json` | Masters FAQs |
| `public/help/faqs/modules/settings.json` | Settings & RBAC FAQs |
| `src/components/help/ModuleFAQSection.tsx` | FAQ display component with accordion + module tabs |

### Modified Files
| File | Change |
|------|--------|
| `src/pages/HelpCenter.tsx` | Add "FAQs" tab (6th tab) with ModuleFAQSection component |
| `src/services/helpDiscoveryService.ts` | Index FAQ entries so they appear in Discover search |

### JSON Structure per FAQ file:
```json
{
  "moduleId": "practice",
  "moduleLabel": "Practice",
  "icon": "Briefcase",
  "description": "Cases, Hearings, Tasks & Documents",
  "faqs": [
    {
      "id": "practice-faq-1",
      "question": "What is the case lifecycle and why does it matter?",
      "answer": "The case lifecycle represents...",
      "tags": ["lifecycle", "stages", "beginner"],
      "level": "beginner",
      "relatedModule": "cases"
    }
  ]
}
```

### Component Structure:
```text
ModuleFAQSection
  +-- Module selector (6 icon cards, one per sidebar section)
  +-- Search input (filters within selected module)
  +-- FAQ count badge
  +-- Accordion
       +-- AccordionItem (per FAQ)
            +-- Question (trigger)
            +-- Answer + tags + level badge (content)
```

## User Experience

- New users: Browse beginner-tagged FAQs to understand each module's purpose
- Advanced users: Search or filter by tags to find specific answers
- All FAQs are written from the perspective of a GST litigation practitioner in India
- Answers reference the correct navigation paths (e.g., "Go to Practice > Cases > New Case")
- FAQ content explains the "why" (design philosophy) not just the "how"

