/**
 * Notification Bell Component
 * Displays notification count and dropdown with recent notifications
 * Updated for Supabase realtime (Phase 3)
 */

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { notificationSystemService } from '@/services/notificationSystemService';
import { NotificationList } from './NotificationList';
import { Notification } from '@/types/notification';
import { supabase } from '@/integrations/supabase/client';

interface NotificationBellProps {
  userId: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Immediately fetch notifications on mount
    const loadInitial = async () => {
      const initial = await notificationSystemService.getNotifications(userId);
      setNotifications(initial);
      setUnreadCount(initial.filter(n => !n.read).length);
    };
    loadInitial();

    // Subscribe to notification updates via service
    const unsubscribe = notificationSystemService.subscribe((updatedNotifications) => {
      const userNotifications = updatedNotifications.filter(n => n.user_id === userId);
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.read).length);
    });

    // Also set up Supabase realtime for immediate updates
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        async () => {
          // Refresh notifications when changes occur
          const fresh = await notificationSystemService.getNotifications(userId);
          setNotifications(fresh);
          setUnreadCount(fresh.filter(n => !n.read).length);
        }
      )
      .subscribe();

    return () => {
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleMarkAllAsRead = async () => {
    await notificationSystemService.markAllAsRead(userId);
  };

  const handleClearAll = async () => {
    await notificationSystemService.clearAll(userId);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={`Notifications (${unreadCount} unread)`}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center px-1 text-xs"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        <NotificationList
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClearAll={handleClearAll}
        />
      </PopoverContent>
    </Popover>
  );
};
