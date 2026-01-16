import React from 'react';
import { format } from 'date-fns';
import {
  MessageSquare,
  RefreshCw,
  UserCheck,
  Package,
  Zap,
  Settings,
  Eye,
  Paperclip
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TaskActivityEvent } from '@/types/taskContext';
import { TASK_STATUS_OPTIONS } from '@/types/taskMessages';
import { ClientVisibilityToggle } from './ClientVisibilityToggle';
import { cn } from '@/lib/utils';

interface TaskActivityTimelineProps {
  events: TaskActivityEvent[];
  currentUserId: string;
  onToggleClientVisibility?: (eventId: string, isVisible: boolean) => void;
  showClientVisibilityToggle?: boolean;
  className?: string;
}

export const TaskActivityTimeline: React.FC<TaskActivityTimelineProps> = ({
  events,
  currentUserId,
  onToggleClientVisibility,
  showClientVisibilityToggle = true,
  className
}) => {
  const getEventConfig = (type: TaskActivityEvent['type']) => {
    switch (type) {
      case 'status_change':
        return {
          icon: RefreshCw,
          color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
          label: 'Status Update'
        };
      case 'assignment':
        return {
          icon: UserCheck,
          color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
          label: 'Reassignment'
        };
      case 'bundle_creation':
        return {
          icon: Package,
          color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
          label: 'Bundle'
        };
      case 'stage_trigger':
        return {
          icon: Zap,
          color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
          label: 'Stage Trigger'
        };
      case 'system':
        return {
          icon: Settings,
          color: 'bg-muted text-muted-foreground',
          label: 'System'
        };
      case 'client_visible':
        return {
          icon: Eye,
          color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
          label: 'Client Visible'
        };
      case 'message':
      default:
        return {
          icon: MessageSquare,
          color: 'bg-primary/10 text-primary',
          label: 'Message'
        };
    }
  };

  const getStatusConfig = (status?: string) => {
    if (!status) return null;
    const option = TASK_STATUS_OPTIONS.find(
      (opt) => opt.value.toLowerCase() === status.toLowerCase()
    );
    return option || null;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (events.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-16', className)}>
        <div className="text-center space-y-3">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto" />
          <div>
            <p className="font-medium text-foreground">No activity yet</p>
            <p className="text-sm text-muted-foreground">
              Updates and messages will appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {events.map((event) => {
        const config = getEventConfig(event.type);
        const Icon = config.icon;
        const isOwnEvent = event.userId === currentUserId;
        const isSystemEvent = event.type === 'system' || event.type === 'status_change' || 
                             event.type === 'assignment' || event.type === 'bundle_creation' ||
                             event.type === 'stage_trigger';
        const statusConfig = getStatusConfig(event.metadata?.newStatus);

        return (
          <div
            key={event.id}
            className={cn(
              'relative flex gap-3 p-3 rounded-lg transition-colors',
              isSystemEvent ? 'bg-muted/30' : 'bg-card hover:bg-muted/50',
              event.metadata?.isClientVisible && 'ring-1 ring-cyan-200 dark:ring-cyan-800'
            )}
          >
            {/* Icon/Avatar Column */}
            <div className="flex-shrink-0">
              {isSystemEvent ? (
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  config.color
                )}>
                  <Icon className="h-4 w-4" />
                </div>
              ) : (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={cn(
                    'text-xs',
                    isOwnEvent ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {getInitials(event.userName)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>

            {/* Content Column */}
            <div className="flex-1 min-w-0">
              {/* Header Row */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">
                    {event.userName}
                  </span>
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.color)}>
                    {config.label}
                  </Badge>
                  {event.metadata?.isClientVisible && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30">
                      <Eye className="h-2.5 w-2.5 mr-0.5" />
                      Client
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                </span>
              </div>

              {/* Content */}
              {event.type === 'status_change' && statusConfig ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status changed to</span>
                  <Badge className={cn('text-xs', statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>
                </div>
              ) : (
                event.content && (
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {event.content}
                  </p>
                )
              )}

              {/* Attachments */}
              {event.metadata?.attachments && event.metadata.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {event.metadata.attachments.map((att, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs gap-1 cursor-pointer hover:bg-muted"
                    >
                      <Paperclip className="h-3 w-3" />
                      {att.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Client Visibility Toggle */}
              {showClientVisibilityToggle && !isSystemEvent && onToggleClientVisibility && (
                <div className="mt-2">
                  <ClientVisibilityToggle
                    isVisible={event.metadata?.isClientVisible || false}
                    onToggle={(visible) => onToggleClientVisibility(event.id, visible)}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
