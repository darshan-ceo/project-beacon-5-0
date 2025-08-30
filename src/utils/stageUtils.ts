import { Case, Task } from '@/contexts/AppStateContext';

// Stage progression sequence for legal cases
export const CASE_STAGES = [
  'Scrutiny',
  'Demand', 
  'Adjudication',
  'Appeals',
  'GSTAT',
  'HC',
  'SC'
] as const;

export type CaseStage = typeof CASE_STAGES[number];

/**
 * Get the next stage in the case lifecycle
 */
export function getNextStage(currentStage: string): string | null {
  const currentIndex = CASE_STAGES.indexOf(currentStage as CaseStage);
  if (currentIndex === -1 || currentIndex === CASE_STAGES.length - 1) {
    return null; // Invalid stage or already at final stage
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
    case 'Scrutiny':
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
  switch (stage) {
    case 'Scrutiny':
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

    case 'Demand':
      return {
        suggestedTasks: [
          'Draft demand notice',
          'Gather supporting evidence',
          'Send demand to opposing party',
          'Set response deadline'
        ],
        estimatedDuration: 14,
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

    case 'Appeals':
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

    case 'GSTAT':
      return {
        suggestedTasks: [
          'Prepare GSTAT application',
          'Submit required documents',
          'Track application status',
          'Coordinate with authorities'
        ],
        estimatedDuration: 60,
        requiresHearing: false
      };

    case 'HC':
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

    case 'SC':
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