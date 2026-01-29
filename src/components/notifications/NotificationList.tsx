/**
 * Notification List Component
 * Displays a list of notifications with actions
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, CheckCheck, Trash2, FileText, Calendar, CheckSquare, FolderOpen, AlertCircle,
  Clock, AlertTriangle, XCircle, CalendarPlus, CheckCircle2, Timer, PartyPopper
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Notification, NotificationType } from '@/types/notification';
import { notificationSystemService } from '@/services/notificationSystemService';
import { useNavigate } from 'react-router-dom';

interface NotificationListProps {
  notifications: Notification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'hearing_reminder':
    case 'hearing_scheduled':
    case 'hearing_updated':
    case 'hearing_outcome':
      return <Calendar className="h-4 w-4" />;
    case 'task_assigned':
    case 'task_due':
      return <CheckSquare className="h-4 w-4" />;
    case 'document_shared':
      return <FileText className="h-4 w-4" />;
    case 'case_update':
      return <FolderOpen className="h-4 w-4" />;
    case 'system':
      return <AlertCircle className="h-4 w-4" />;
    // Statutory deadline notification types
    case 'statutory_deadline_approaching':
      return <Clock className="h-4 w-4" />;
    case 'statutory_deadline_tomorrow':
      return <Timer className="h-4 w-4" />;
    case 'statutory_deadline_today':
      return <AlertTriangle className="h-4 w-4" />;
    case 'statutory_deadline_breached':
      return <XCircle className="h-4 w-4" />;
    case 'statutory_deadline_extended':
      return <CalendarPlus className="h-4 w-4" />;
    case 'statutory_deadline_completed':
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'hearing_reminder':
      return 'text-orange-500';
    case 'hearing_scheduled':
      return 'text-blue-500';
    case 'task_assigned':
    case 'task_due':
      return 'text-purple-500';
    case 'document_shared':
      return 'text-green-500';
    case 'case_update':
      return 'text-cyan-500';
    case 'system':
      return 'text-yellow-500';
    // Statutory deadline notification colors
    case 'statutory_deadline_approaching':
      return 'text-blue-500';
    case 'statutory_deadline_tomorrow':
      return 'text-amber-500';
    case 'statutory_deadline_today':
      return 'text-orange-500';
    case 'statutory_deadline_breached':
      return 'text-destructive';
    case 'statutory_deadline_extended':
      return 'text-green-500';
    case 'statutory_deadline_completed':
      return 'text-green-600';
    default:
      return 'text-muted-foreground';
  }
};

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAllAsRead,
  onClearAll,
}) => {
  const navigate = useNavigate();

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await notificationSystemService.markAsRead(notification.id);
    }

    // Navigate to related entity
    if (notification.related_entity_type && notification.related_entity_id) {
      switch (notification.related_entity_type) {
        case 'hearing':
          navigate(`/hearings/calendar`);
          break;
        case 'case':
          navigate(`/cases`);
          break;
        case 'task':
          navigate(`/tasks`);
          break;
        case 'document':
          navigate(`/documents`);
          break;
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await notificationSystemService.deleteNotification(notificationId);
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Notifications</h3>
          </div>
        </div>
        {/* Empty State */}
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h4 className="font-semibold text-foreground mb-1">All Caught Up!</h4>
          <p className="text-sm text-muted-foreground">No new notifications</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center justify-center gap-1">
            <PartyPopper className="h-3 w-3" />
            You're doing great!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Notifications</h3>
        </div>
        <div className="flex gap-2">
          {notifications.some(n => !n.read) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-8 text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      </div>

      {/* Notification List */}
      <ScrollArea className="h-[400px]">
        <div className="divide-y">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={cn(
                'p-4 hover:bg-muted/50 cursor-pointer transition-colors',
                !notification.read && 'bg-primary/5 border-l-2 border-l-primary'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('mt-1', getNotificationColor(notification.type))}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      'text-sm font-medium',
                      notification.read && 'text-muted-foreground'
                    )}>
                      {notification.title}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => handleDelete(e, notification.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
