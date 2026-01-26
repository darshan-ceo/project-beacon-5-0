
# Fix Get Started Tab - Onboarding Wizard Functionality

## Problem Summary
The "Get Started" tab in the Help & Knowledge Base shows onboarding steps but they don't work:
1. Clicking "Article" or "Start" on article-type steps shows "Article Not Found"
2. Clicking "Start" on tour-type steps does nothing (only logs to console)
3. Most steps appear grayed out (this is intentional sequential unlock behavior)

## Root Causes

### 1. Missing Article Content
The onboarding steps reference article IDs that don't exist in `content.json`:
- Step ID `staff-welcome` → No article exists
- Step ID `document-upload` → No article exists
- Step ID `master-data-governance` → No article exists
- (30+ total missing articles)

### 2. Tour Integration Not Implemented
The `handleStepClick` function in `OnboardingWizard.tsx` only logs tour requests:
```typescript
if (step.type === 'tour') {
  console.log('[Onboarding] Start tour:', step.id);
  // TODO: Actually start the tour!
}
```

### 3. Step ID Mismatch
Onboarding paths use step IDs like `dashboard-tour` but tours in `tours.json` have matching IDs - they just need to be triggered.

## Solution Approach

### Task 1: Create Article ID Mapping
Instead of creating 30+ new articles, map onboarding step IDs to existing articles:

**File**: `src/components/help/OnboardingWizard.tsx`

Create a mapping object:
```typescript
const stepToArticleMap: Record<string, string> = {
  'staff-welcome': 'getting-started',
  'document-upload': 'document-management-guide',
  'master-data-governance': 'getting-started',
  // ... other mappings
};
```

Update `handleStepClick` to use the mapping:
```typescript
const handleStepClick = (step: OnboardingStep) => {
  if (step.type === 'tour') {
    // Start tour using Shepherd
    startTour(step.id);
  } else if (step.type === 'article') {
    const articleSlug = stepToArticleMap[step.id] || step.id;
    navigate(`/help/articles/${articleSlug}`);
  }
};
```

### Task 2: Implement Tour Integration
Connect to the existing Shepherd.js tour system.

**File**: `src/components/help/OnboardingWizard.tsx`

Import the tour hook and implement tour starting:
```typescript
import { useShepherdTour } from '@/hooks/useShepherdTour';

// In component:
const { startTour } = useShepherdTour();

const handleStepClick = (step: OnboardingStep) => {
  if (step.type === 'tour') {
    // Map step ID to tour ID if needed
    const tourId = step.id; // e.g., 'dashboard-tour'
    startTour(tourId);
  }
  // ...
};
```

### Task 3: Add Missing Core Articles
Create essential onboarding articles that don't have good existing alternatives.

**File**: `public/help/content.json`

Add these new articles:
1. `staff-welcome` - Welcome article for new users
2. `ai-assistant-guide` - AI features overview  
3. `timeline-navigation` - Case timeline usage
4. `team-management` - Team workload management
5. `sla-monitoring` - SLA compliance guide
6. `reports-overview` - Reports and analytics
7. `analytics-deep-dive` - Strategic metrics
8. `security-best-practices` - Security guide
9. `initial-setup-guide` - System setup checklist
10. `data-migration` - Data import guide

### Task 4: Update Step ID to Content Mapping
Create a comprehensive mapping file to connect onboarding steps to content.

**File**: `src/config/onboardingContentMap.ts` (new file)

```typescript
export const onboardingStepToContent: Record<string, {
  type: 'article' | 'tour';
  contentId: string;
  fallbackPath?: string;
}> = {
  // Client Portal steps
  'portal-login': { type: 'article', contentId: 'getting-started' },
  'view-cases': { type: 'article', contentId: 'case-creation-tutorial' },
  
  // Staff steps
  'staff-welcome': { type: 'article', contentId: 'getting-started' },
  'dashboard-tour': { type: 'tour', contentId: 'dashboard-tour' },
  'case-operations-tour': { type: 'tour', contentId: 'case-operations-tour' },
  
  // ... complete mappings for all 30+ steps
};
```

### Task 5: Enhance OnboardingWizard Error Handling
Add graceful fallback when content is missing.

**File**: `src/components/help/OnboardingWizard.tsx`

- Show toast notification if tour not found
- Navigate to help center with search if article not found
- Add loading state during navigation

## Implementation Order

1. **Task 4**: Create onboarding content mapping config
2. **Task 2**: Implement tour integration in OnboardingWizard
3. **Task 1**: Update handleStepClick with article mapping
4. **Task 3**: Add essential missing articles to content.json
5. **Task 5**: Add error handling and fallbacks

## Files to Modify/Create

| File | Action | Purpose |
|------|--------|---------|
| `src/config/onboardingContentMap.ts` | Create | Central mapping of step IDs to content |
| `src/components/help/OnboardingWizard.tsx` | Modify | Implement tour start + article mapping |
| `public/help/content.json` | Modify | Add 10 essential onboarding articles |

## Expected Outcome

After implementation:
- Clicking "Start" on article steps opens the correct article (or mapped alternative)
- Clicking "Start" on tour steps launches the Shepherd.js guided tour
- If content is missing, user sees helpful feedback instead of "Not Found"
- All 19 admin onboarding steps become functional

## Technical Notes

- The Shepherd.js tour system exists in `src/hooks/useShepherdTour.ts`
- Tours are defined in `public/help/tours.json` 
- The sequential unlock behavior is intentional UX - don't remove it
- Step IDs in `onboarding-paths.json` should ideally match content IDs in `content.json`
