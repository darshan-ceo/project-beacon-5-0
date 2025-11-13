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
      title: 'Legal Forum Name',
      content: 'Official legal forum name as recognized legally. Include full designation and location.',
    },
    'authorityLevel': {
      title: 'GST Authority Level',
      content: `Select the hierarchical level of this authority in GST litigation:
      
**Adjudication** → Original assessment/order issuing authority (Superintendent, Asst. Commissioner, Dy. Commissioner, Joint Commissioner)

**First Appeal** → Commissioner (Appeals) - First level of review

**Revisional** → Revisional Authority under S.108 GST Act / AAAR

**Tribunal (State)** → GSTAT State Bench - Second appellate authority

**Tribunal (Principal)** → GSTAT Principal Bench - Larger bench matters

**High Court** → Constitutional remedy under Article 226

**Supreme Court** → Final appeal under Article 136`,
      learnMoreUrl: 'https://www.cbic.gov.in/resources//htdocs-cbec/gst/chapter20.pdf'
    },
    'type': {
      title: 'Legacy Forum Type',
      content: 'Historical classification maintained for backward compatibility. Use Authority Level for GST hierarchy.',
    },
    'city': {
      title: 'City / District Location',
      content: `Primary city where this authority is physically located. This field is mandatory for data quality and helps in travel planning and logistics.

**Examples:**
• Ahmedabad
• Vadodara
• Surat
• New Delhi (for Supreme Court / Principal Bench)

Enter the city name without PIN code or state.`,
    },
    'jurisdiction': {
      title: 'Territorial Jurisdiction',
      content: `The geographic area or taxpayer category this authority has power over.

**Examples:**
• Adjudication: "Ahmedabad South Division"
• Commissioner Appeals: "Gujarat State - Zone 1"
• Tribunal: "Gujarat State" or "All India" (Principal Bench)
• High Court: "Gujarat State"
• Supreme Court: "All India"

For Commissionerates, use the official jurisdictional name (e.g., "Ahmedabad North GST Commissionerate").`,
      learnMoreUrl: 'https://cbic-gst.gov.in/jurisdiction-pdf/jurisdiction.html'
    },
    'benchLocation': {
      title: 'Bench Location',
      content: `Physical location where this bench/authority sits for hearings.

**For Tribunals:**
• State Bench → Usually at State capital (e.g., "Ahmedabad")
• Principal Bench → Delhi

**For Commissioner Appeals:**
Specify the city where hearings are conducted (may differ from commissionerate HQ).

This helps in travel planning and hearing logistics.`
    },
    'digitalFiling': {
      title: 'Digital Filing Enabled',
      content: `Whether this authority accepts electronic filing of appeals/replies.

**Enabled:** Authority uses ACES (Automation of Central Excise and Service Tax) portal or GST portal for e-filing.

**Not Enabled:** Physical filing required (paper submissions at counter).

Note: Most authorities post-2020 have digital filing. Check the authority's official website for confirmation.`,
      learnMoreUrl: 'https://www.aces.gov.in/'
    },
    'status': {
      title: 'Authority Status',
      content: `Operational status of this legal forum:

**Active:** Authority is currently operational and accepting new cases. Shows in all active listings.

**Inactive:** Authority is closed, merged, or temporarily suspended. Hidden from active listings but preserved for:
• Historical case reference
• Completed case records
• Organizational restructuring history

Use 'Inactive' for merged Commissioner Appeals offices or abolished authorities without losing data.`
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
      title: 'Legal Forum/Jurisdiction',
      content: 'Select the legal forum where case will be heard. This affects filing rules and procedures.',
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
  },
  'automation-rule-form': {
    'ruleName': {
      title: 'Rule Name',
      content: 'Descriptive name for this automation rule. Use clear naming like "Hearing Reminder - 3 Days" or "Order Upload - Client Notification".',
      learnMoreUrl: '/help/articles/task-automation-best-practices'
    },
    'trigger': {
      title: 'Trigger Event',
      content: 'System event that starts this automation. Common triggers: Case Created, Hearing Updated, Document Uploaded, Task Overdue.',
      learnMoreUrl: '/help/articles/automation-triggers-guide'
    },
    'conditions': {
      title: 'Rule Conditions',
      content: 'Filters that must be true for the rule to execute. Use conditions to target specific cases, priorities, or timeframes.',
      learnMoreUrl: '/help/articles/task-automation-best-practices'
    },
    'actions': {
      title: 'Actions to Execute',
      content: 'What the system should do when triggered. Can create tasks, send notifications, update status, or assign ownership.',
      learnMoreUrl: '/help/articles/task-automation-best-practices'
    },
    'enabled': {
      title: 'Enable Rule',
      content: 'Toggle to activate or deactivate this automation rule. Always test rules before enabling for live cases.',
      learnMoreUrl: '/help/articles/task-automation-best-practices'
    }
  },
  'task-template-form': {
    'templateName': {
      title: 'Template Name',
      content: 'Name for this task template. Use descriptive names like "Hearing Preparation Bundle" or "Appeal Filing Checklist".',
      learnMoreUrl: '/help/articles/task-template-guide'
    },
    'stage': {
      title: 'Associated Stage',
      content: 'Legal case stage where this template applies (Demand, Adjudication, Appeals, etc.). Templates auto-trigger for matching stages.',
      learnMoreUrl: '/help/articles/task-template-guide'
    },
    'tasks': {
      title: 'Template Tasks',
      content: 'List of tasks included in this template. Each task will be created when the template is applied to a case.',
      learnMoreUrl: '/help/articles/task-template-guide'
    },
    'autoTrigger': {
      title: 'Auto-Trigger',
      content: 'Automatically create these tasks when a case reaches the associated stage. Helps ensure consistency.',
      learnMoreUrl: '/help/articles/task-template-guide'
    },
    'sequenceRequired': {
      title: 'Sequence Required',
      content: 'Whether tasks must be completed in order. Enable for dependent workflows like document review → approval → filing.',
      learnMoreUrl: '/help/articles/task-template-guide'
    }
  },
  'task-bundle': {
    'name': {
      title: 'Bundle Name',
      content: 'Unique identifier for this task bundle template'
    },
    'stage': {
      title: 'Target Stage',
      content: 'Case stage where this bundle will be triggered automatically'
    },
    'description': {
      title: 'Description',
      content: 'Brief overview of what this bundle accomplishes'
    },
    'execution': {
      title: 'Execution Mode',
      content: 'Sequential creates tasks one after another; Parallel creates all tasks simultaneously'
    },
    'autoTrigger': {
      title: 'Auto-trigger',
      content: 'Automatically create these tasks when entering the target stage'
    },
    'task-title': {
      title: 'Task Title',
      content: 'Clear, actionable name for the task to be created'
    },
    'assigned-role': {
      title: 'Assigned Role',
      content: 'Team member role responsible for completing this task'
    },
    'task-description': {
      title: 'Task Description',
      content: 'Detailed instructions for completing this task'
    },
    'due-offset': {
      title: 'Due Offset',
      content: 'Time from bundle creation to task deadline (e.g., +2d = 2 days later)'
    },
    'priority': {
      title: 'Priority Level',
      content: 'Task urgency level affecting scheduling and notifications'
    },
    'estimated-hours': {
      title: 'Estimated Hours',
      content: 'Expected time needed to complete this task for workload planning'
    }
  },
  
  'hearing-form': {
    'case_id': {
      title: 'Case Selection',
      content: 'Select the case for which this hearing is scheduled. The case should be created before scheduling hearings.',
      learnMoreUrl: '/help/case-management/overview'
    },
    'date': {
      title: 'Hearing Date',
      content: 'Select the date when the hearing is scheduled. Ensure the date is accurate to avoid conflicts and missed appearances.',
      learnMoreUrl: '/help/hearings/calendar'
    },
    'start_time': {
      title: 'Hearing Time',
      content: 'Set the time when the hearing begins. Use 24-hour format for clarity. Consider travel time when scheduling multiple hearings.',
      learnMoreUrl: '/help/hearings/calendar'
    },
    'court_id': {
      title: 'Court Selection',
      content: 'Choose the court where the hearing will take place. Ensure the correct jurisdiction and court hierarchy.',
      learnMoreUrl: '/help/masters/courts'
    },
    'judge_ids': {
      title: 'Judge Assignment',
      content: 'Select the judge who will preside over the hearing. This information helps in case preparation and strategy.',
      learnMoreUrl: '/help/masters/judges'
    },
    'purpose': {
      title: 'Hearing Purpose',
      content: 'Specify the purpose of the hearing (Mention, Final Hearing, etc.). This affects preparation requirements and expected outcomes.',
      learnMoreUrl: '/help/hearings/preparation'
    },
    'notes': {
      title: 'Hearing Notes',
      content: 'Add any additional information relevant to the hearing such as special instructions, preparation reminders, or case-specific details.',
      learnMoreUrl: '/help/hearings/preparation'
    }
  },
  'stage-management': {
    'transition-type': {
      title: 'Stage Transition Type',
      content: 'Choose how to move this case: Forward (advance), Send Back (corrections needed), or Remand (restart current stage).',
    },
    'current-stage': {
      title: 'Current Case Stage',
      content: 'The stage where this case currently resides. Each stage has specific requirements and SLA timelines.',
    },
    'next-stage': {
      title: 'Next Stage Selection',
      content: 'Select the target stage. Available options depend on current stage and transition type.',
    },
    'stage-comments': {
      title: 'Stage Transition Notes',
      content: 'Document the reason for this transition, key decisions, and instructions for next stage owner.',
    },
    'prerequisites': {
      title: 'Stage Prerequisites',
      content: 'Required conditions that must be met before stage advancement. Ensures compliance and work completeness.',
    },
    'checklist-item': {
      title: 'Checklist Requirement',
      content: 'Task or requirement for stage completion. Auto-checked by system or requires manual attestation.',
    },
    'reason-send-back': {
      title: 'Reason for Reversal',
      content: 'Select why this case is returning to an earlier stage. Helps track quality and process improvements.',
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
  const [isOpen, setIsOpen] = React.useState(false);

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
    <TooltipProvider delayDuration={500}>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center w-4 h-4 ml-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            aria-label={`Help for ${helpContent.title || fieldId}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <HelpCircle className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] break-words">
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