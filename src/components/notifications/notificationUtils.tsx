/**
 * Notification icon and color utilities
 */

import React from 'react';
import {
  Bell, FileText, Calendar, CheckSquare, FolderOpen, AlertCircle,
  Clock, AlertTriangle, XCircle, CalendarPlus, CheckCircle2, Timer,
  UserPlus, MessageSquare, ArrowUpRight, BarChart3
} from 'lucide-react';
import { NotificationType } from '@/types/notification';

export const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'hearing_reminder':
    case 'hearing_scheduled':
    case 'hearing_updated':
    case 'hearing_outcome':
      return <Calendar className="h-4 w-4" />;
    case 'task_assigned':
    case 'task_due':
      return <CheckSquare className="h-4 w-4" />;
    case 'task_completed':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'task_overdue':
      return <AlertTriangle className="h-4 w-4" />;
    case 'document_shared':
      return <FileText className="h-4 w-4" />;
    case 'case_update':
    case 'case_stage_changed':
      return <FolderOpen className="h-4 w-4" />;
    case 'case_created':
      return <BarChart3 className="h-4 w-4" />;
    case 'case_reassigned':
      return <UserPlus className="h-4 w-4" />;
    case 'client_message':
      return <MessageSquare className="h-4 w-4" />;
    case 'system':
      return <AlertCircle className="h-4 w-4" />;
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

export const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'hearing_reminder':
      return 'text-orange-500';
    case 'hearing_scheduled':
      return 'text-blue-500';
    case 'task_assigned':
    case 'task_due':
      return 'text-purple-500';
    case 'task_completed':
      return 'text-green-600';
    case 'task_overdue':
      return 'text-destructive';
    case 'document_shared':
      return 'text-green-500';
    case 'case_update':
    case 'case_stage_changed':
      return 'text-cyan-500';
    case 'case_created':
      return 'text-blue-600';
    case 'case_reassigned':
      return 'text-indigo-500';
    case 'client_message':
      return 'text-teal-500';
    case 'system':
      return 'text-yellow-500';
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
