/**
 * Notification List Component
 * Enhanced with Unread/Today/All tabs, date grouping, and type filters
 */

import React, { useState, useMemo } from 'react';
import { isToday, isYesterday, isThisWeek, startOfDay } from 'date-fns';
import { 
  Bell, CheckCheck, Trash2, CheckCircle2, PartyPopper,
  Filter, Calendar, CheckSquare, FileText, FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Notification, NotificationType } from '@/types/notification';
import { NotificationItem } from './NotificationItem';

interface NotificationListProps {
  notifications: Notification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

type FilterType = 'all' | 'hearing' | 'task' | 'case' | 'document';

const FILTER_CONFIG: { key: FilterType; label: string; icon: React.ReactNode; types: NotificationType[] }[] = [
  { key: 'hearing', label: 'Hearings', icon: <Calendar className="h-3 w-3" />, types: ['hearing_reminder', 'hearing_scheduled', 'hearing_updated', 'hearing_outcome'] },
  { key: 'task', label: 'Tasks', icon: <CheckSquare className="h-3 w-3" />, types: ['task_assigned', 'task_due', 'task_completed', 'task_overdue'] },
  { key: 'case', label: 'Cases', icon: <FolderOpen className="h-3 w-3" />, types: ['case_update', 'case_created', 'case_stage_changed', 'case_reassigned'] },
  { key: 'document', label: 'Documents', icon: <FileText className="h-3 w-3" />, types: ['document_shared'] },
];

const groupByDate = (notifications: Notification[]) => {
  const groups: { label: string; items: Notification[] }[] = [];
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const thisWeek: Notification[] = [];
  const older: Notification[] = [];

  notifications.forEach(n => {
    const date = new Date(n.created_at);
    if (isToday(date)) today.push(n);
    else if (isYesterday(date)) yesterday.push(n);
    else if (isThisWeek(date)) thisWeek.push(n);
    else older.push(n);
  });

  if (today.length) groups.push({ label: 'Today', items: today });
  if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday });
  if (thisWeek.length) groups.push({ label: 'This Week', items: thisWeek });
  if (older.length) groups.push({ label: 'Older', items: older });

  return groups;
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="p-8 text-center">
    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
      <CheckCircle2 className="h-7 w-7 text-green-500" />
    </div>
    <h4 className="font-semibold text-foreground mb-1 text-sm">All Caught Up!</h4>
    <p className="text-xs text-muted-foreground">{message}</p>
    <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center justify-center gap-1">
      <PartyPopper className="h-3 w-3" />
      You're doing great!
    </p>
  </div>
);

const NotificationGroup = ({ label, items }: { label: string; items: Notification[] }) => (
  <div>
    <div className="px-4 py-2 bg-muted/30 border-b sticky top-0 z-10">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    <div className="divide-y">
      {items.map(n => <NotificationItem key={n.id} notification={n} />)}
    </div>
  </div>
);

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAllAsRead,
  onClearAll,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    const config = FILTER_CONFIG.find(f => f.key === activeFilter);
    if (!config) return notifications;
    return notifications.filter(n => config.types.includes(n.type));
  }, [notifications, activeFilter]);

  const unreadNotifications = useMemo(() => filtered.filter(n => !n.read), [filtered]);
  const todayNotifications = useMemo(() => filtered.filter(n => isToday(new Date(n.created_at))), [filtered]);
  const allGrouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 min-w-[20px] text-xs px-1.5">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onMarkAllAsRead} className="h-7 text-xs px-2">
              <CheckCheck className="h-3 w-3 mr-1" />
              Read all
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 text-xs px-2 text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex items-center gap-1 px-3 py-2 border-b overflow-x-auto">
        <Button
          variant={activeFilter === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-6 text-xs px-2 shrink-0"
          onClick={() => setActiveFilter('all')}
        >
          All
        </Button>
        {FILTER_CONFIG.map(f => (
          <Button
            key={f.key}
            variant={activeFilter === f.key ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 text-xs px-2 gap-1 shrink-0"
            onClick={() => setActiveFilter(f.key)}
          >
            {f.icon}
            {f.label}
          </Button>
        ))}
      </div>

      {notifications.length === 0 ? (
        <EmptyState message="No new notifications" />
      ) : (
        <Tabs defaultValue="unread" className="w-full">
          <div className="px-3 pt-2">
            <TabsList className="w-full h-8">
              <TabsTrigger value="unread" className="flex-1 text-xs h-7">
                Unread {unreadNotifications.length > 0 && `(${unreadNotifications.length})`}
              </TabsTrigger>
              <TabsTrigger value="today" className="flex-1 text-xs h-7">
                Today {todayNotifications.length > 0 && `(${todayNotifications.length})`}
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1 text-xs h-7">
                All
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="unread" className="mt-0">
            <ScrollArea className="h-[350px]">
              {unreadNotifications.length === 0 ? (
                <EmptyState message="No unread notifications" />
              ) : (
                <div className="divide-y">
                  {unreadNotifications.map(n => <NotificationItem key={n.id} notification={n} />)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="today" className="mt-0">
            <ScrollArea className="h-[350px]">
              {todayNotifications.length === 0 ? (
                <EmptyState message="No notifications today" />
              ) : (
                <div className="divide-y">
                  {todayNotifications.map(n => <NotificationItem key={n.id} notification={n} />)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-[350px]">
              {allGrouped.length === 0 ? (
                <EmptyState message="No notifications" />
              ) : (
                allGrouped.map(group => (
                  <NotificationGroup key={group.label} label={group.label} items={group.items} />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
