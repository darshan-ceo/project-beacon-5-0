import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { featureFlagService } from '@/services/featureFlagService';

interface FieldTooltipProps {
  formId: string;
  fieldId: string;
  title?: string;
  content?: string;
  learnMoreUrl?: string;
}

// Registry of field help content
const fieldHelpRegistry: Record<string, Record<string, { title: string; content: string; learnMoreUrl?: string }>> = {
  'create-task': {
    'title': {
      title: 'Task Title',
      content: 'Use a clear, descriptive title that explains what needs to be done. Include case reference if applicable.',
    },
    'description': {
      title: 'Task Description',
      content: 'Provide detailed instructions or context for the task. Include relevant deadlines and dependencies.',
    },
    'assignee': {
      title: 'Task Assignee',
      content: 'Select the person responsible for completing this task. Tasks can be reassigned later if needed.',
    },
    'priority': {
      title: 'Task Priority',
      content: 'Critical: Court deadlines. High: Urgent matters. Medium: Standard work. Low: Administrative tasks.',
    },
    'status': {
      title: 'Task Status',
      content: 'Track progress: Not Started → In Progress → Review → Completed. Overdue status is automatic.',
    },
    'estimated-hours': {
      title: 'Estimated Hours',
      content: 'Approximate time needed to complete the task. Used for workload planning and billing estimates.',
    },
    'due-date': {
      title: 'Due Date',
      content: 'Set realistic deadlines accounting for complexity and dependencies. Consider court schedules.',
    },
  },
  'create-hearing': {
    'date': {
      title: 'Hearing Date',
      content: 'Exact date and time as scheduled by court. Double-check court calendar for conflicts.',
    },
    'time': {
      title: 'Hearing Time',
      content: 'Start time as scheduled by court. System assumes 1-hour duration unless specified.',
    },
    'type': {
      title: 'Hearing Type',
      content: 'Select appropriate hearing type: Preliminary, Final, Argued, or Adjourned. Affects preparation needs.',
    },
    'judge': {
      title: 'Presiding Judge',
      content: 'Select the judge assigned to hear this matter. Judge preferences may affect strategy.',
    },
    'agenda': {
      title: 'Hearing Agenda',
      content: 'Outline what will be discussed or argued. Include motion details and expected outcomes.',
    },
  },
  'upload-document': {
    'name': {
      title: 'Document Name',
      content: 'Use descriptive names with case references. Avoid generic names like "document1.pdf".',
    },
    'folder': {
      title: 'Document Folder',
      content: 'Organize documents in folders by case, type, or date. Create folders for better organization.',
    },
    'case-association': {
      title: 'Case Association',
      content: 'Link documents to specific cases for easy access. Documents can be linked to multiple cases.',
    },
    'tags': {
      title: 'Document Tags',
      content: 'Add keywords for searchability: "motion", "evidence", "correspondence", etc.',
    },
    'file': {
      title: 'File Selection',
      content: 'Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG. Max file size: 50MB.',
    },
  },
  'create-employee': {
    'name': {
      title: 'Employee Name',
      content: 'Full legal name as it appears on official documents and employment records.',
    },
    'role': {
      title: 'Employee Role',
      content: 'Select appropriate role: Partner, CA, Advocate, Staff, RM, Finance, or Admin.',
    },
    'email': {
      title: 'Email Address',
      content: 'Primary work email for system notifications and communications. Must be unique.',
    },
    'department': {
      title: 'Department',
      content: 'Assign to appropriate department for reporting and workflow organization.',
    },
    'workload': {
      title: 'Workload Capacity',
      content: 'Weekly hours capacity for task assignment and resource planning. Standard: 40 hours.',
    },
  },
  'create-court': {
    'name': {
      title: 'Court Name',
      content: 'Official court name as recognized legally. Include full designation and location.',
    },
    'type': {
      title: 'Court Type',
      content: 'Hierarchy level: Supreme Court > High Court > District Court > Tribunal > Commission.',
    },
    'jurisdiction': {
      title: 'Jurisdiction',
      content: 'Geographic or subject matter jurisdiction. Defines which cases can be filed here.',
    },
    'total-judges': {
      title: 'Total Judges',
      content: 'Number of judges currently serving. Used for hearing availability and scheduling.',
    },
  },
  'create-signatory': {
    'name': {
      title: 'Signatory Name',
      content: 'Full legal name of the authorized signatory as it appears on official documents.',
    },
    'email': {
      title: 'Email Address',
      content: 'Official email for document delivery and communications. Must be unique per signatory.',
    },
    'scope': {
      title: 'Scope of Authority',
      content: 'Define what matters this signatory can authorize: All, GST Filings, Litigation, or Appeals.',
    },
  },
  'create-action-item': {
    'title': {
      title: 'Action Item Title',
      content: 'Clear, actionable title describing what needs to be done to address the SLA breach.',
    },
    'description': {
      title: 'Action Description',
      content: 'Detailed steps or context for resolving the issue. Include any specific requirements.',
    },
    'assignee': {
      title: 'Assign To',
      content: 'Select the team member best suited to handle this urgent action item.',
    },
  },
  'create-case': {
    'title': {
      title: 'Case Title',
      content: 'Use format: Client Name vs Opposing Party or descriptive case name. Keep it searchable.',
    },
    'case-number': {
      title: 'Case Number',
      content: 'Court-assigned case number. Leave blank if not yet assigned - system can auto-generate internal ID.',
    },
    'client': {
      title: 'Client Selection',
      content: 'Choose existing client or create new. Ensure client profile is complete before case creation.',
    },
    'court': {
      title: 'Court/Jurisdiction',
      content: 'Select the court where case will be heard. This affects filing rules and procedures.',
    },
    'priority': {
      title: 'Case Priority',
      content: 'High: Urgent matters, injunctions. Medium: Standard litigation. Low: Administrative matters.',
    },
  },
  'client-master': {
    'name': {
      title: 'Client Name',
      content: 'Full legal name as it appears on official documents. Use individual or entity name.',
    },
    'type': {
      title: 'Client Type',
      content: 'Individual: Personal clients. Entity: Corporations, partnerships, etc. Affects legal requirements.',
    },
    'contact': {
      title: 'Primary Contact',
      content: 'Main point of contact for case communications. Must have valid email and phone.',
    },
    'billing': {
      title: 'Billing Information',
      content: 'Billing contact and preferences. May differ from primary contact for corporate clients.',
    },
  }
};

export const FieldTooltip: React.FC<FieldTooltipProps> = ({
  formId,
  fieldId,
  title,
  content,
  learnMoreUrl
}) => {
  // Check if tooltips are enabled
  if (!featureFlagService.isEnabled('tooltips_v1')) {
    return null;
  }

  // Get help content from registry or use provided props
  const helpContent = fieldHelpRegistry[formId]?.[fieldId] || { title, content, learnMoreUrl };

  if (!helpContent.content) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center w-4 h-4 ml-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Help for ${helpContent.title || fieldId}`}
          >
            <HelpCircle className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            {helpContent.title && (
              <p className="font-medium text-sm">{helpContent.title}</p>
            )}
            <p className="text-xs leading-relaxed">{helpContent.content}</p>
            {helpContent.learnMoreUrl && (
              <p className="text-xs">
                <a 
                  href={helpContent.learnMoreUrl} 
                  className="text-primary hover:underline"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Learn more →
                </a>
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};