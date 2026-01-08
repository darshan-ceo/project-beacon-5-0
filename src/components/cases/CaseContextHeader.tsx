import React from 'react';
import { motion } from 'framer-motion';
import { X, Scale, Users, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Case } from '@/contexts/AppStateContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CaseContextHeaderProps {
  selectedCase: Case;
  onClearSelection: () => void;
  clientName?: string;
  courtName?: string;
  onMarkComplete?: (caseData: Case) => void;
}

export const CaseContextHeader: React.FC<CaseContextHeaderProps> = ({
  selectedCase,
  onClearSelection,
  clientName,
  courtName,
  onMarkComplete
}) => {
  const isCompleted = selectedCase.status === 'Completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Case title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="font-semibold text-base text-gray-900 dark:text-gray-100">
              {selectedCase.title}
            </span>
            <Badge variant="outline" className="text-xs">
              {selectedCase.caseNumber}
            </Badge>
            {isCompleted && (
              <Badge variant="secondary" className="text-xs bg-success/20 text-success border-success/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
          
          {/* Metadata row */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-gray-300">
            {clientName && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 flex-shrink-0" />
                <span>{clientName}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">
                {selectedCase.currentStage}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {selectedCase.status}
              </Badge>
            </div>
            {selectedCase.priority && (
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  selectedCase.priority === 'High' 
                    ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400' 
                    : selectedCase.priority === 'Medium'
                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-400'
                    : 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400'
                }`}
              >
                {selectedCase.priority}
              </Badge>
            )}
            {selectedCase.nextHearing && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">
                  Next: {new Date(selectedCase.nextHearing.date).toLocaleDateString()}
                  {courtName && ` at ${courtName}`}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isCompleted && onMarkComplete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMarkComplete(selectedCase)}
                    className="text-success border-success/30 hover:bg-success/10"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Mark Complete
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Completed cases are matters where the legal lifecycle is fully concluded.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
