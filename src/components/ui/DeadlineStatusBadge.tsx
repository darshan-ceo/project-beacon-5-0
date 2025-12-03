import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DeadlineStatusBadgeProps {
  deadline: string | Date;
  showDays?: boolean;
  showDate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isStatutory?: boolean;
}

export const DeadlineStatusBadge: React.FC<DeadlineStatusBadgeProps> = ({
  deadline,
  showDays = true,
  showDate = false,
  size = 'md',
  className,
  isStatutory = false
}) => {
  const deadlineDate = typeof deadline === 'string' ? parseISO(deadline) : deadline;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysRemaining = differenceInDays(deadlineDate, today);

  // Determine status
  let status: 'overdue' | 'critical' | 'warning' | 'safe';
  let statusColor: string;
  let bgColor: string;
  let borderColor: string;
  let Icon: React.ElementType;
  let label: string;
  let description: string;

  if (daysRemaining < 0) {
    status = 'overdue';
    statusColor = 'text-red-700 dark:text-red-300';
    bgColor = 'bg-red-100 dark:bg-red-900/30';
    borderColor = 'border-red-300 dark:border-red-700';
    Icon = AlertCircle;
    label = `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} overdue`;
    description = 'This deadline has passed. Immediate action required.';
  } else if (daysRemaining === 0) {
    status = 'critical';
    statusColor = 'text-red-700 dark:text-red-300';
    bgColor = 'bg-red-100 dark:bg-red-900/30';
    borderColor = 'border-red-300 dark:border-red-700';
    Icon = AlertCircle;
    label = 'Due Today';
    description = 'This deadline is due today. Take action immediately.';
  } else if (daysRemaining <= 7) {
    status = 'critical';
    statusColor = 'text-red-600 dark:text-red-400';
    bgColor = 'bg-red-50 dark:bg-red-900/20';
    borderColor = 'border-red-200 dark:border-red-800';
    Icon = AlertTriangle;
    label = `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`;
    description = 'Critical deadline approaching. Prioritize this task.';
  } else if (daysRemaining <= 15) {
    status = 'warning';
    statusColor = 'text-orange-700 dark:text-orange-300';
    bgColor = 'bg-orange-50 dark:bg-orange-900/20';
    borderColor = 'border-orange-200 dark:border-orange-800';
    Icon = Clock;
    label = `${daysRemaining} days left`;
    description = 'Deadline approaching. Plan your work accordingly.';
  } else {
    status = 'safe';
    statusColor = 'text-green-700 dark:text-green-300';
    bgColor = 'bg-green-50 dark:bg-green-900/20';
    borderColor = 'border-green-200 dark:border-green-800';
    Icon = CheckCircle2;
    label = `${daysRemaining} days left`;
    description = 'Sufficient time available. Continue as planned.';
  }

  // Size variants
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const content = (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border',
        bgColor,
        statusColor,
        borderColor,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showDays && <span>{label}</span>}
      {showDate && (
        <span className="opacity-75">
          ({format(deadlineDate, 'dd MMM yyyy')})
        </span>
      )}
      {isStatutory && (
        <span className="ml-1 opacity-60 text-[10px] uppercase tracking-wide">
          Statutory
        </span>
      )}
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{description}</p>
            <p className="text-xs text-muted-foreground">
              Deadline: {format(deadlineDate, 'EEEE, dd MMMM yyyy')}
            </p>
            {isStatutory && (
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Auto-generated based on statutory rules
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Simple text-based deadline indicator for table cells
export const DeadlineText: React.FC<{ deadline: string | Date; className?: string }> = ({
  deadline,
  className
}) => {
  const deadlineDate = typeof deadline === 'string' ? parseISO(deadline) : deadline;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysRemaining = differenceInDays(deadlineDate, today);

  let colorClass: string;
  if (daysRemaining < 0) {
    colorClass = 'text-red-600 dark:text-red-400 font-semibold';
  } else if (daysRemaining <= 7) {
    colorClass = 'text-red-500 dark:text-red-400';
  } else if (daysRemaining <= 15) {
    colorClass = 'text-orange-600 dark:text-orange-400';
  } else {
    colorClass = 'text-green-600 dark:text-green-400';
  }

  return (
    <span className={cn(colorClass, className)}>
      {format(deadlineDate, 'dd MMM yyyy')}
    </span>
  );
};
