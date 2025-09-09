/**
 * Context Split Button for Stage Management
 * Primary action opens Context in new tab, dropdown provides legacy inline option
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ExternalLink, PanelRight } from 'lucide-react';

interface ContextSplitButtonProps {
  caseId: string;
  stageInstanceId: string;
  onOpenInline: () => void;
  isInlineOpen: boolean;
}

export const ContextSplitButton: React.FC<ContextSplitButtonProps> = ({
  caseId,
  stageInstanceId,
  onOpenInline,
  isInlineOpen
}) => {
  const handleOpenNewTab = () => {
    const url = `/cases/${caseId}/stages/${stageInstanceId}/context`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <TooltipProvider>
      <div className="flex items-center">
        {/* Primary Button - Open in New Tab */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenNewTab}
              className="rounded-r-none border-r-0"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Context
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Open tasks, hearings, docs & contacts for this stage (new tab)</p>
          </TooltipContent>
        </Tooltip>

        {/* Dropdown for Legacy Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-l-none px-2"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onOpenInline}>
              <PanelRight className="w-4 h-4 mr-2" />
              {isInlineOpen ? 'Close inline panel' : 'Open inline panel'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
};