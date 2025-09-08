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
    'assignee': {
      title: 'Task Assignee',
      content: 'Select the person responsible for completing this task. Tasks can be reassigned later if needed.',
    },
    'priority': {
      title: 'Task Priority',
      content: 'High: Urgent deadlines, court dates. Medium: Standard work. Low: Administrative tasks.',
    },
    'due-date': {
      title: 'Due Date',
      content: 'Set realistic deadlines accounting for complexity and dependencies. Consider court schedules.',
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
  'create-hearing': {
    'date': {
      title: 'Hearing Date',
      content: 'Exact date and time as scheduled by court. Double-check court calendar for conflicts.',
    },
    'type': {
      title: 'Hearing Type',
      content: 'Select appropriate hearing type: Motion, Trial, Status Conference, etc. Affects preparation needs.',
    },
    'judge': {
      title: 'Presiding Judge',
      content: 'Select the judge assigned to hear this matter. Judge preferences may affect strategy.',
    },
    'location': {
      title: 'Hearing Location',
      content: 'Courtroom number and address. Include virtual meeting details if applicable.',
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