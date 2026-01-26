/**
 * Onboarding Step to Content Mapping
 * Maps onboarding step IDs from onboarding-paths.json to actual content
 */

export interface OnboardingContentMapping {
  type: 'article' | 'tour';
  contentId: string;
  fallbackPath?: string;
}

export const onboardingStepToContent: Record<string, OnboardingContentMapping> = {
  // ============ Client Portal Steps ============
  'portal-login': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },
  'view-cases': { 
    type: 'article', 
    contentId: 'case-creation-tutorial',
    fallbackPath: '/help'
  },
  'download-docs': { 
    type: 'article', 
    contentId: 'document-management-guide',
    fallbackPath: '/help'
  },
  'hearing-schedule': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },
  'portal-support': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },

  // ============ Staff Onboarding Steps ============
  'staff-welcome': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },
  'dashboard-tour': { 
    type: 'tour', 
    contentId: 'case-management-tour', // Use existing case management tour as dashboard overview
    fallbackPath: '/dashboard'
  },
  'case-operations-tour': { 
    type: 'tour', 
    contentId: 'case-management-tour',
    fallbackPath: '/cases'
  },
  'daily-workflow-tour': { 
    type: 'tour', 
    contentId: 'task-management-tour',
    fallbackPath: '/tasks'
  },
  'document-upload': { 
    type: 'article', 
    contentId: 'document-management-guide',
    fallbackPath: '/help'
  },

  // ============ Advocate Steps (inherits staff) ============
  'hearing-lifecycle-tour': { 
    type: 'tour', 
    contentId: 'hearing-scheduler-tour',
    fallbackPath: '/hearings'
  },
  'ai-assistant-guide': { 
    type: 'article', 
    contentId: 'getting-started', // Map to existing for now
    fallbackPath: '/help'
  },
  'timeline-navigation': { 
    type: 'article', 
    contentId: 'case-creation-tutorial',
    fallbackPath: '/help'
  },

  // ============ Manager Steps (inherits advocate) ============
  'task-automation-tour': { 
    type: 'tour', 
    contentId: 'task-automation-setup',
    fallbackPath: '/tasks?tab=automation'
  },
  'team-management': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },
  'sla-monitoring': { 
    type: 'article', 
    contentId: 'task-automation-best-practices',
    fallbackPath: '/help'
  },
  'reports-overview': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },

  // ============ Partner Steps (inherits manager) ============
  'analytics-deep-dive': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },
  'client-portfolio': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },
  'quality-review': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },

  // ============ Admin Steps (inherits partner) ============
  'system-settings-tour': { 
    type: 'tour', 
    contentId: 'system-settings-tour',
    fallbackPath: '/settings'
  },
  'access-roles-tour': { 
    type: 'tour', 
    contentId: 'access-roles-setup',
    fallbackPath: '/settings/access-roles'
  },
  'master-data-governance': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },
  'security-best-practices': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },

  // ============ Implementor Steps (inherits admin) ============
  'initial-setup-guide': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },
  'data-migration': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },
  'integration-setup': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },
  'user-training-guide': { 
    type: 'article', 
    contentId: 'getting-started',
    fallbackPath: '/help'
  },
};

/**
 * Get content mapping for an onboarding step
 * @param stepId - The step ID from onboarding-paths.json
 * @returns The content mapping or a default fallback
 */
export const getOnboardingContent = (stepId: string): OnboardingContentMapping => {
  return onboardingStepToContent[stepId] || {
    type: 'article',
    contentId: 'getting-started',
    fallbackPath: '/help'
  };
};

/**
 * Check if a step has a valid tour mapping
 */
export const hasTourMapping = (stepId: string): boolean => {
  const mapping = onboardingStepToContent[stepId];
  return mapping?.type === 'tour';
};

/**
 * Get available tour IDs from the mapping
 */
export const getMappedTourIds = (): string[] => {
  return Object.entries(onboardingStepToContent)
    .filter(([_, mapping]) => mapping.type === 'tour')
    .map(([_, mapping]) => mapping.contentId);
};
