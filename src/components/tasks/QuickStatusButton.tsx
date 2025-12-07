import React from 'react';
import { Check, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TASK_STATUS_OPTIONS } from '@/types/taskMessages';
import { cn } from '@/lib/utils';

interface QuickStatusButtonProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

export const QuickStatusButton: React.FC<QuickStatusButtonProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  size = 'default',
}) => {
  const getQuickAction = () => {
    switch (currentStatus?.toLowerCase()) {
      case 'not started':
        return { label: 'Start', icon: Play, nextStatus: 'In Progress' };
      case 'in progress':
        return { label: 'Complete', icon: Check, nextStatus: 'Completed' };
      case 'review':
        return { label: 'Approve', icon: Check, nextStatus: 'Completed' };
      case 'completed':
        return { label: 'Reopen', icon: RotateCcw, nextStatus: 'In Progress' };
      default:
        return { label: 'Start', icon: Play, nextStatus: 'In Progress' };
    }
  };

  const quickAction = getQuickAction();
  const Icon = quickAction.icon;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="default"
        size={size}
        onClick={() => onStatusChange(quickAction.nextStatus)}
        disabled={disabled}
        className="gap-1.5"
      >
        <Icon className={cn('h-3.5 w-3.5', size === 'sm' && 'h-3 w-3')} />
        {quickAction.label}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size} disabled={disabled} className="px-2">
            ▼
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {TASK_STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              className={cn(
                'gap-2',
                currentStatus === option.value && 'bg-muted'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full', option.color.split(' ')[0])} />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
