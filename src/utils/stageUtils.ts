import { Case, Task } from '@/contexts/AppStateContext';

// Stage progression sequence for legal cases - UPDATED
export const CASE_STAGES = [
  'Assessment',
  'Adjudication',
  'First Appeal',
  'Tribunal',
  'High Court',
  'Supreme Court'
] as const;

export type CaseStage = typeof CASE_STAGES[number];

// Legacy stage mapping for backward compatibility
export const LEGACY_STAGE_MAP: Record<string, CaseStage> = {
  'Scrutiny': 'Assessment',  // Legacy: Scrutiny renamed to Assessment
  'Demand': 'Adjudication',
  'Appeals': 'First Appeal',
  'GSTAT': 'Tribunal',
  'CESTAT': 'Tribunal',
  'HC': 'High Court',
  'SC': 'Supreme Court'
};

// Stage aliases for UI display
export const STAGE_ALIASES: Record<CaseStage, string[]> = {
  'Assessment': ['Scrutiny'],
  'Adjudication': ['Demand'],
  'First Appeal': ['Appeals'],
  'Tribunal': ['GSTAT', 'CESTAT'],
  'High Court': ['HC'],
  'Supreme Court': ['SC']
};

/**
 * Normalize a stage name to its canonical form
 * Handles both legacy and canonical stage names
 */
export function normalizeStage(stage: string): string {
  // Already canonical
  if (CASE_STAGES.includes(stage as CaseStage)) {
    return stage;
  }
  
  // Map legacy to canonical
  return LEGACY_STAGE_MAP[stage] || stage;
}

/**
 * Get stage options with aliases for filter dropdowns
 * Returns array of {value: canonical, label: "Canonical (aka Alias1, Alias2)"}
 */
export function getStageOptionsWithAliases(): Array<{ value: string; label: string }> {
  return CASE_STAGES.map(stage => {
    const aliases = STAGE_ALIASES[stage];
    const label = aliases.length > 0 
      ? `${stage} (aka ${aliases.join(', ')})`
      : stage;
    
    return {
      value: stage,
      label
    };
  });
}

/**
 * Get the next stage in the case lifecycle
 * Supports special routing for Tribunal → Supreme Court (Principal Bench)
 */
export function getNextStage(currentStage: string, tribunalBench?: 'State Bench' | 'Principal Bench'): string | null {
  // Handle legacy stage names
  const mappedStage = LEGACY_STAGE_MAP[currentStage] || currentStage;
  
  const currentIndex = CASE_STAGES.indexOf(mappedStage as CaseStage);
  if (currentIndex === -1 || currentIndex === CASE_STAGES.length - 1) {
    return null; // Invalid stage or already at final stage
  }
  
  // Special routing: Tribunal + Principal Bench → Supreme Court (skip High Court)
  if (mappedStage === 'Tribunal' && tribunalBench === 'Principal Bench') {
    return 'Supreme Court';
  }
  
  return CASE_STAGES[currentIndex + 1];
}

/**
 * Check if a stage can be advanced to the next stage
 */
export function canAdvanceStage(currentStage: string): boolean {
  return getNextStage(currentStage) !== null;
}

/**
 * Get the progress percentage for a stage
 */
export function getStageProgress(stage: string): number {
  const index = CASE_STAGES.indexOf(stage as CaseStage);
  if (index === -1) return 0;
  return ((index + 1) / CASE_STAGES.length) * 100;
}

/**
 * Validate prerequisites for advancing a case stage
 */
export function validateStagePrerequisites(
  caseData: Case, 
  currentStage: string, 
  tasks: Task[] = []
): {
  isValid: boolean;
  missingItems: string[];
  warnings: string[];
} {
  const missingItems: string[] = [];
  const warnings: string[] = [];

  // Get tasks for this case
  const caseTasks = tasks.filter(task => task.caseId === caseData.id);
  const incompleteTasks = caseTasks.filter(task => 
    task.status !== 'Completed' && 
    task.priority === 'High' &&
    task.title.toLowerCase().includes('mandatory')
  );

  // Check for incomplete mandatory tasks
  if (incompleteTasks.length > 0) {
    missingItems.push(`${incompleteTasks.length} mandatory task(s) are still incomplete`);
  }

  // Stage-specific validations
  switch (currentStage) {
    case 'Assessment':
      if (caseData.documents < 1) {
        missingItems.push('At least one document must be uploaded');
      }
      if (!caseData.assignedToName || caseData.assignedToName === 'Unassigned') {
        missingItems.push('Case must be assigned to a team member');
      }
      break;

    case 'Demand':
      if (caseData.documents < 2) {
        warnings.push('Consider uploading demand notice and supporting documents');
      }
      break;

    case 'Adjudication':
      if (!caseData.nextHearing) {
        missingItems.push('Next hearing must be scheduled before advancing');
      }
      break;

    case 'Appeals':
      if (caseData.slaStatus === 'Red') {
        warnings.push('SLA is breached - consider priority handling in next stage');
      }
      break;

    case 'GSTAT':
    case 'HC':
      if (!caseData.nextHearing) {
        warnings.push('Consider scheduling hearing for the next stage');
      }
      break;
  }

  // Priority-based warnings
  if (caseData.priority === 'High' && caseData.slaStatus !== 'Green') {
    warnings.push('High priority case with non-green SLA status requires attention');
  }

  return {
    isValid: missingItems.length === 0,
    missingItems,
    warnings
  };
}

/**
 * Generate auto-tasks for a new stage
 */
export function generateStageDefaults(stage: string): {
  suggestedTasks: string[];
  estimatedDuration: number; // in days
  requiresHearing: boolean;
} {
  // Handle legacy stage names
  const mappedStage = LEGACY_STAGE_MAP[stage] || stage;
  
  switch (mappedStage) {
    case 'Assessment':
      return {
        suggestedTasks: [
          'Review case documents',
          'Verify client information',
          'Assign team members',
          'Set case timeline'
        ],
        estimatedDuration: 7,
        requiresHearing: false
      };

    case 'Adjudication':
      return {
        suggestedTasks: [
          'File petition',
          'Schedule hearing',
          'Prepare case arguments',
          'Submit required documents'
        ],
        estimatedDuration: 30,
        requiresHearing: true
      };

    case 'First Appeal':
      return {
        suggestedTasks: [
          'Review lower court decision',
          'Prepare appeal grounds',
          'File appeal petition',
          'Submit appeal documents'
        ],
        estimatedDuration: 45,
        requiresHearing: true
      };

    case 'Tribunal':
      return {
        suggestedTasks: [
          'Prepare Tribunal application',
          'Submit required documents',
          'Track application status',
          'Coordinate with authorities'
        ],
        estimatedDuration: 60,
        requiresHearing: false
      };

    case 'High Court':
      return {
        suggestedTasks: [
          'Prepare High Court petition',
          'File petition documents',
          'Schedule HC hearing',
          'Prepare arguments'
        ],
        estimatedDuration: 90,
        requiresHearing: true
      };

    case 'Supreme Court':
      return {
        suggestedTasks: [
          'Prepare Supreme Court petition',
          'File SLP/appeal documents',
          'Schedule SC hearing',
          'Final argument preparation'
        ],
        estimatedDuration: 120,
        requiresHearing: true
      };

    default:
      return {
        suggestedTasks: [],
        estimatedDuration: 7,
        requiresHearing: false
      };
  }
}