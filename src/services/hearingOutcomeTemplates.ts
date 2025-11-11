import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

/**
 * Template for auto-generating tasks based on hearing outcome
 */
export interface OutcomeTaskTemplate {
  title: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  dueInDays: number; // Days from hearing date
  stage: string;
  estimatedHours: number;
}

/**
 * Outcome template defines tasks to create for each hearing outcome type
 */
export interface HearingOutcomeTemplate {
  outcomeType: string;
  description: string;
  tasks: OutcomeTaskTemplate[];
}

/**
 * Predefined outcome templates
 */
export const OUTCOME_TEMPLATES: HearingOutcomeTemplate[] = [
  {
    outcomeType: 'Adjournment',
    description: 'Hearing has been adjourned to a future date',
    tasks: [
      {
        title: 'Prepare submission for next hearing',
        description: 'Review case status and prepare written submission for the adjourned hearing date',
        priority: 'High',
        dueInDays: 7,
        stage: 'Preparation',
        estimatedHours: 4
      },
      {
        title: 'Update client on adjournment',
        description: 'Inform client about the adjournment and next hearing date',
        priority: 'High',
        dueInDays: 1,
        stage: 'Communication',
        estimatedHours: 1
      },
      {
        title: 'Review and update case documents',
        description: 'Ensure all necessary documents are ready for the next hearing',
        priority: 'Medium',
        dueInDays: 5,
        stage: 'Documentation',
        estimatedHours: 2
      }
    ]
  },
  {
    outcomeType: 'Submission Done',
    description: 'Submissions have been completed, awaiting order',
    tasks: [
      {
        title: 'File submission documents',
        description: 'Organize and file all submission documents in case record',
        priority: 'High',
        dueInDays: 2,
        stage: 'Documentation',
        estimatedHours: 2
      },
      {
        title: 'Update client on submission status',
        description: 'Brief client on submissions made and expected timeline for order',
        priority: 'Medium',
        dueInDays: 1,
        stage: 'Communication',
        estimatedHours: 1
      },
      {
        title: 'Monitor order status',
        description: 'Follow up with court/forum on order pronouncement date',
        priority: 'Medium',
        dueInDays: 7,
        stage: 'Follow-up',
        estimatedHours: 1
      },
      {
        title: 'Prepare for possible next steps',
        description: 'Review possible outcomes and prepare strategy for each scenario',
        priority: 'Low',
        dueInDays: 14,
        stage: 'Planning',
        estimatedHours: 3
      }
    ]
  },
  {
    outcomeType: 'Order Passed',
    description: 'Final order has been passed by the authority',
    tasks: [
      {
        title: 'Collect copy of order',
        description: 'Obtain certified/digital copy of the order from court/forum',
        priority: 'Critical',
        dueInDays: 1,
        stage: 'Documentation',
        estimatedHours: 1
      },
      {
        title: 'Analyze order and determine next steps',
        description: 'Review order in detail, assess implications, and determine appeal/compliance strategy',
        priority: 'Critical',
        dueInDays: 2,
        stage: 'Analysis',
        estimatedHours: 4
      },
      {
        title: 'Brief client on order outcome',
        description: 'Schedule meeting with client to explain order and discuss next steps',
        priority: 'Critical',
        dueInDays: 2,
        stage: 'Communication',
        estimatedHours: 2
      },
      {
        title: 'Calculate appeal limitation period',
        description: 'Determine last date for filing appeal if order is unfavorable',
        priority: 'High',
        dueInDays: 1,
        stage: 'Compliance',
        estimatedHours: 1
      },
      {
        title: 'Update case status and close if final',
        description: 'Update case management system with final outcome and close case if no further action',
        priority: 'Medium',
        dueInDays: 3,
        stage: 'Administration',
        estimatedHours: 1
      }
    ]
  },
  {
    outcomeType: 'Closed',
    description: 'Case/hearing has been closed or withdrawn',
    tasks: [
      {
        title: 'Obtain closure/withdrawal order',
        description: 'Get official documentation confirming case closure or withdrawal',
        priority: 'High',
        dueInDays: 2,
        stage: 'Documentation',
        estimatedHours: 1
      },
      {
        title: 'Update client on case closure',
        description: 'Inform client about case closure and final outcome',
        priority: 'High',
        dueInDays: 1,
        stage: 'Communication',
        estimatedHours: 1
      },
      {
        title: 'Archive case documents',
        description: 'Organize all case files and documents for archival',
        priority: 'Medium',
        dueInDays: 7,
        stage: 'Administration',
        estimatedHours: 2
      },
      {
        title: 'Close case in system',
        description: 'Update case status to closed and complete all administrative formalities',
        priority: 'Medium',
        dueInDays: 3,
        stage: 'Administration',
        estimatedHours: 1
      }
    ]
  }
];

/**
 * Get outcome template by outcome type
 */
export function getOutcomeTemplate(outcomeType: string): HearingOutcomeTemplate | null {
  // Check custom templates first via manager
  try {
    const { outcomeTemplateManager } = require('./outcomeTemplateManager');
    return outcomeTemplateManager.getTemplate(outcomeType);
  } catch {
    // Fallback to defaults if manager not available
    return OUTCOME_TEMPLATES.find(t => t.outcomeType === outcomeType) || null;
  }
}

/**
 * Generate tasks from outcome template
 */
export async function generateOutcomeTasks(
  outcomeType: string,
  hearingId: string,
  caseId: string,
  clientId: string,
  caseNumber: string,
  hearingDate: string,
  assignedToId: string,
  assignedToName: string,
  currentUserId: string,
  currentUserName: string,
  dispatch: React.Dispatch<AppAction>
): Promise<void> {
  const template = getOutcomeTemplate(outcomeType);
  
  if (!template) {
    console.log(`[OutcomeTemplates] No template found for outcome: ${outcomeType}`);
    return;
  }

  console.log(`[OutcomeTemplates] Generating ${template.tasks.length} tasks for outcome: ${outcomeType}`);

  const hearingDateObj = new Date(hearingDate);
  const createdTasks: string[] = [];

  for (const taskTemplate of template.tasks) {
    try {
      // Calculate due date
      const dueDate = new Date(hearingDateObj);
      dueDate.setDate(dueDate.getDate() + taskTemplate.dueInDays);

      const newTask = {
        id: uuidv4(),
        title: taskTemplate.title,
        description: taskTemplate.description,
        caseId,
        clientId,
        caseNumber,
        stage: taskTemplate.stage,
        priority: taskTemplate.priority,
        status: 'Not Started' as const,
        assignedToId,
        assignedToName,
        assignedById: currentUserId,
        assignedByName: currentUserName,
        createdDate: new Date().toISOString(),
        dueDate: dueDate.toISOString().split('T')[0],
        estimatedHours: taskTemplate.estimatedHours,
        isAutoGenerated: true,
        hearing_id: hearingId,
        hearingDate: hearingDate.split('T')[0],
        timezone: 'Asia/Kolkata',
        dueDateValidated: true,
        escalationLevel: 0 as const,
        attachments: [],
        audit_trail: {
          created_by: currentUserId,
          created_at: new Date().toISOString(),
          updated_by: currentUserId,
          updated_at: new Date().toISOString(),
          change_log: []
        }
      };

      dispatch({ type: 'ADD_TASK', payload: newTask });
      createdTasks.push(taskTemplate.title);
      
      console.log(`[OutcomeTemplates] Created task: ${taskTemplate.title}`);
    } catch (error) {
      console.error(`[OutcomeTemplates] Failed to create task: ${taskTemplate.title}`, error);
    }
  }

  if (createdTasks.length > 0) {
    toast({
      title: "Action Items Generated",
      description: `${createdTasks.length} task(s) auto-generated based on hearing outcome`,
    });
  }
}

/**
 * Get preview of tasks that will be created for an outcome
 */
export function previewOutcomeTasks(outcomeType: string): OutcomeTaskTemplate[] {
  const template = getOutcomeTemplate(outcomeType);
  return template ? template.tasks : [];
}

/**
 * Get all available outcome types (default + custom)
 */
export function getAllOutcomeTypes(): string[] {
  try {
    const { outcomeTemplateManager } = require('./outcomeTemplateManager');
    return outcomeTemplateManager.getAllTemplates().map((t: HearingOutcomeTemplate) => t.outcomeType);
  } catch {
    return OUTCOME_TEMPLATES.map(t => t.outcomeType);
  }
}
