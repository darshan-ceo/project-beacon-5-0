import React from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface IssueNavigatorProps {
  currentIssue: number;
  totalIssues: number;
  issueStatus: ('complete' | 'incomplete' | 'error')[];
  onIssueChange: (issueIndex: number) => void;
  issueProgress: { [key: number]: number };
}

export const IssueNavigator: React.FC<IssueNavigatorProps> = ({
  currentIssue,
  totalIssues,
  issueStatus,
  onIssueChange,
  issueProgress
}) => {
  const getStatusIcon = (status: 'complete' | 'incomplete' | 'error') => {
    switch (status) {
      case 'complete':
        return <Check className="h-3 w-3 text-emerald-600" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: 'complete' | 'incomplete' | 'error', isActive: boolean) => {
    if (isActive) return 'bg-primary text-primary-foreground';
    switch (status) {
      case 'complete':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-background border border-border rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onIssueChange(Math.max(0, currentIssue - 1))}
        disabled={currentIssue === 0}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex gap-1">
        {Array.from({ length: totalIssues }, (_, index) => {
          const isActive = index === currentIssue;
          const status = issueStatus[index] || 'incomplete';
          const progress = issueProgress[index] || 0;

          return (
            <motion.button
              key={index}
              onClick={() => onIssueChange(index)}
              className={cn(
                'relative h-8 min-w-[32px] px-2 rounded-md border text-xs font-medium transition-colors',
                getStatusColor(status, isActive)
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-1">
                <span>{index + 1}</span>
                {getStatusIcon(status)}
              </div>
              
              {/* Progress indicator */}
              {!isActive && progress > 0 && progress < 100 && (
                <div className="absolute bottom-0 left-0 h-0.5 bg-primary rounded-b-md" 
                     style={{ width: `${progress}%` }} />
              )}
            </motion.button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onIssueChange(Math.min(totalIssues - 1, currentIssue + 1))}
        disabled={currentIssue === totalIssues - 1}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="ml-2 text-xs text-muted-foreground">
        Issue {currentIssue + 1} of {totalIssues}
      </div>

      <Badge variant="secondary" className="ml-auto">
        {issueStatus.filter(s => s === 'complete').length} / {totalIssues} Complete
      </Badge>
    </div>
  );
};