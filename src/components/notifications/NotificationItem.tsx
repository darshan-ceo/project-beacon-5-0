/**
 * Single Notification Item Component
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Notification } from '@/types/notification';
import { notificationSystemService } from '@/services/notificationSystemService';
import { useNavigate } from 'react-router-dom';
import { getNotificationIcon, getNotificationColor } from './notificationUtils';

interface NotificationItemProps {
  notification: Notification;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!notification.read) {
      await notificationSystemService.markAsRead(notification.id);
    }

    if (notification.related_entity_type && notification.related_entity_id) {
      switch (notification.related_entity_type) {
        case 'hearing': navigate(`/hearings/${notification.related_entity_id}`); break;
        case 'case': navigate(`/cases?caseId=${notification.related_entity_id}`); break;
        case 'task': navigate(`/tasks/${notification.related_entity_id}`); break;
        case 'document': navigate('/documents'); break;
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationSystemService.deleteNotification(notification.id);
  };

  return (
    <div
      onClick={handleClick}
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
              onClick={handleDelete}
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
  );
};
