# Help Documentation Governance

> **Version**: 1.0  
> **Last Updated**: 2025-01-26  
> **Status**: ENFORCED

## Overview

This document defines the governance rules for help documentation in Beacon Essential 5.0. Every feature **must** have corresponding help documentation before it can be released to production.

---

## Core Principle

### "No Feature Without Help"

Every new module or significant feature MUST include:

1. **Module Registration** in `src/registry/moduleRegistry.ts`
2. **Tooltips** in `public/help/ui-tooltips.json`
3. **At least one Guided Tour** in `public/help/tours.json`
4. **Operations Help** in `public/help/operations/`
5. **Page-level Help** in `public/help/pages/`
6. **FAQ Coverage** in `public/help/faqs/`
7. **Manifest Entry** in `public/help/manifest.json`

---

## Minimum Coverage Thresholds

| Documentation Type | Minimum Coverage | Rationale |
|-------------------|------------------|-----------|
| Tooltips | 80% of UI elements | Core buttons, fields, and status indicators |
| Tours | 100% of core workflows | User must be able to learn any workflow |
| Operations Help | 100% of modules | Every module needs operational guidance |
| Page-level Help | 100% of pages | Every page needs context-sensitive help |
| FAQ | 70% of common questions | Most frequent user questions covered |

---

## Module Registration Requirements

### Required Fields

```typescript
interface ModuleRegistration {
  id: string;                    // Unique module identifier
  name: string;                  // Display name
  routes: string[];              // Associated routes
  description: string;           // Brief description
  helpRequired: {
    tooltips: boolean;           // Requires tooltip coverage
    operationsHelp: boolean;     // Requires operations help file
    tour: boolean;               // Requires guided tour
    faq: boolean;                // Requires FAQ coverage
    pagesHelp: boolean;          // Requires page-level help
  };
  featureFlag?: string;          // Associated feature flag
  roles?: string[];              // Roles with access
}
```

### Example Registration

```typescript
this.register({
  id: 'new-feature',
  name: 'New Feature',
  routes: ['/new-feature'],
  description: 'Description of new feature',
  helpRequired: {
    tooltips: true,
    operationsHelp: true,
    tour: true,
    faq: true,
    pagesHelp: true
  },
  featureFlag: 'new_feature_v1',
  roles: ['all']
});
```

---

## Enforcement Levels

### Development Environment

- **Level**: Soft Warning
- **Behavior**: 
  - Console warnings for incomplete help
  - Toast notifications when navigating to undocumented modules
  - Non-blocking (development continues)

### QA/UAT Environment

- **Level**: Hard Warning
- **Behavior**:
  - Coverage dashboard shows incomplete modules in red
  - "Ready for UAT" status blocked until coverage meets thresholds
  - Audit report required before release

### Production Environment

- **Level**: Feature Gate
- **Behavior**:
  - Feature flags cannot be enabled if help is incomplete
  - Deployment proceeds but feature remains disabled
  - Automatic notification to documentation team

---

## Help Audit Process

### Before Release

1. Navigate to `/qa` dashboard
2. Open "Help Coverage Audit" section
3. Click "Run Audit"
4. Verify all modules show 100% coverage
5. Export audit report for release documentation

### Audit Report Contents

- Overall coverage percentage
- Per-module coverage breakdown
- Missing documentation items
- Warnings and recommendations
- Timestamp and version

---

## File Structure

```
public/help/
├── manifest.json              # Master help requirements
├── ui-tooltips.json          # All UI tooltips (300+)
├── tours.json                # Guided tours (20+)
├── glossary.json             # Legal/technical terms
├── changelog.json            # Feature updates
├── onboarding-paths.json     # Role-based learning
├── ui-locations.json         # UI navigation mapping
├── operations/               # Operational help per module
│   ├── case-management-ops.json
│   ├── hearings-ops.json
│   └── ...
├── pages/                    # Page-level help
│   ├── dashboard.json
│   ├── case-management.json
│   └── ...
├── masters/                  # Master data help
│   ├── courts-help.json
│   └── ...
├── faqs/                     # FAQ markdown files
│   ├── getting-started.md
│   └── ...
└── sections/                 # Section-specific help
```

---

## Adding Help for New Features

### Step 1: Register Module

```typescript
// src/registry/moduleRegistry.ts
this.register({
  id: 'your-feature',
  name: 'Your Feature',
  routes: ['/your-feature'],
  // ...
});
```

### Step 2: Add Tooltips

```json
// public/help/ui-tooltips.json
"your-feature": {
  "buttons": [
    {
      "id": "yf_action_btn",
      "label": "Action Button",
      "tooltip": {
        "title": "Action",
        "content": "Description of what this does"
      }
    }
  ]
}
```

### Step 3: Create Tour

```json
// public/help/tours.json
{
  "id": "your-feature-tour",
  "title": "Your Feature Tour",
  "module": "your-feature",
  "steps": [...]
}
```

### Step 4: Add Operations Help

```json
// public/help/operations/your-feature-ops.json
{
  "moduleId": "your-feature",
  "workflows": [...],
  "bestPractices": [...]
}
```

### Step 5: Add Page Help

```json
// public/help/pages/your-feature.json
{
  "pageId": "your-feature",
  "tabs": [...],
  "contextualHelp": [...]
}
```

### Step 6: Update Manifest

```json
// public/help/manifest.json
"your-feature": {
  "name": "Your Feature",
  "requiredTooltips": ["yf_action_btn"],
  "requiredTours": ["your-feature-tour"],
  "requiredOperations": "your-feature-ops.json",
  "requiredPagesHelp": "your-feature.json",
  "requiredFAQTopics": ["your-feature"]
}
```

---

## Validation Commands

### Run Audit (Development)

```typescript
import { helpValidationService } from '@/services/helpValidationService';

// Validate single module
const result = await helpValidationService.validateModule('your-feature');
console.log(result);

// Generate full report
const report = await helpValidationService.generateCoverageReport();
console.log(report);
```

### Check from QA Dashboard

1. Navigate to `/qa`
2. Scroll to "Help Coverage Audit" section
3. Click "Run Audit"

---

## Consequences of Non-Compliance

| Severity | Scenario | Consequence |
|----------|----------|-------------|
| Critical | No help for core workflow | Feature cannot be enabled in production |
| High | Missing tours | Feature flagged for UAT but release delayed |
| Medium | Incomplete tooltips | Warning issued, must fix before next release |
| Low | Missing FAQ topics | Documentation debt tracked |

---

## Exceptions

### When Exceptions Apply

- **Internal/Debug Features**: QA dashboard, dev tools (no user-facing help needed)
- **Infrastructure Modules**: Auth, storage, API clients (technical documentation only)
- **Help Module Itself**: The help center doesn't need help about itself

### Requesting an Exception

1. Document the reason in the module registration
2. Set `helpRequired` fields to `false` for non-applicable items
3. Add comment explaining exception

---

## Contacts

- **Help System Owner**: Implementation Team
- **Documentation Standards**: Product Team
- **Technical Questions**: Development Team

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-26 | 1.0 | Initial governance document |
